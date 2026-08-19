import express, { type Express, type Request, type Response } from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import multer from "multer";

import { DEFAULT_APP_VERSION, getGeneratedPackageName, readAppIdentity } from "../shared/app-identity";
import { getExpectedApkUrl } from "../shared/build-delivery";
import { getBuildTimeoutMessage } from "../shared/build-timeout";

const WORKER_OWNER = "elkalebanquier-eng";
const WORKER_REPOSITORY = "one-app-build-worker";
const WORKER_WORKFLOW = ".github/workflows/build-imported-project.yml";
const PUBLISHER_WORKFLOW = ".github/workflows/publish-temporary-apk.yml";
const OIDC_AUDIENCE = "one-app-build-worker";
const MAX_SOURCE_SIZE = 50 * 1024 * 1024;
const MAX_ICON_SIZE = 1024 * 1024;
const MAX_ICON_BASE64_LENGTH = Math.ceil((MAX_ICON_SIZE * 4) / 3) + 4;
const MAX_KEY_BACKUP_SIZE = 96 * 1024;
const MAX_KEY_BACKUP_BASE64_LENGTH = Math.ceil((MAX_KEY_BACKUP_SIZE * 4) / 3) + 4;
const MAX_SUBMISSIONS_PER_HOUR = 6;
// APK releases remain available for 48 hours; keep the matching status record
// for the same duration so a completed download cannot disappear early.
const BUILD_RETENTION_MS = 48 * 60 * 60 * 1000;
const PUBLIC_BUILD_API_URL = (process.env.ONE_APP_PUBLIC_API_URL || "https://kikonative-evby5xxj.manus.space").replace(/\/$/, "");
const submissionTimes = new Map<string, number[]>();
const githubJwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

type ProjectType = "expo" | "android" | "html";
type BuildMode = "debug" | "signed";
type BuildState = "queued" | "building" | "complete" | "failed";

type BuildRecord = {
  id: string;
  projectName: string;
  projectType: ProjectType;
  quotaKey: string;
  sourceUrl: string;
  workerCompletionUrl: string;
  publisherCompletionUrl: string;
  workerAccessToken: string;
  publisherAccessToken: string;
  sourceArchive?: Buffer;
  iconUrl?: string;
  iconArchive?: Buffer;
  buildMode: BuildMode;
  keyBackupUrl?: string;
  keyBackupAccessToken?: string;
  keyBackupArchive?: Buffer;
  packageName: string;
  appVersion: string;
  versionCode: number;
  status: BuildState;
  message: string;
  createdAt: number;
  updatedAt: number;
  apkUrl?: string;
};

const builds = new Map<string, BuildRecord>();
const submissionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SOURCE_SIZE, files: 1, fields: 5, fieldSize: MAX_ICON_BASE64_LENGTH },
}).single("source");
const binarySubmission = express.raw({ type: "application/octet-stream", limit: "50mb" });

class BuildRequestError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

function getHeaderValue(request: Request, name: string) {
  const value = request.get(name);
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function getPublicBaseUrl() {
  return PUBLIC_BUILD_API_URL;
}

function isZip(buffer: Buffer) {
  if (buffer.length < 4) return false;
  return ["504b0304", "504b0506", "504b0708"].includes(buffer.subarray(0, 4).toString("hex"));
}

function isPng(buffer: Buffer) {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

function getCustomIcon(request: Request) {
  const value = request.body && typeof request.body.iconBase64 === "string" ? request.body.iconBase64 : "";
  if (!value) return undefined;
  if (value.length > MAX_ICON_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new BuildRequestError("L’icône personnalisée est invalide. Choisissez une autre image.", 400);
  }
  const icon = Buffer.from(value, "base64");
  if (icon.length === 0 || icon.length > MAX_ICON_SIZE || !isPng(icon)) {
    throw new BuildRequestError("L’icône personnalisée doit être une image PNG de 1 Mo maximum.", 400);
  }
  return icon;
}

function receiveBuildSubmission(request: Request, response: Response, next: () => void) {
  const contentType = request.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    binarySubmission(request, response, next);
    return;
  }
  submissionUpload(request, response, (error) => {
    if (!error) {
      next();
      return;
    }
    response.status(413).json({ message: "Le fichier ou l’icône dépasse la taille autorisée." });
  });
}

function parseProjectType(value: string): ProjectType {
  if (value === "expo" || value === "android" || value === "html") return value;
  throw new BuildRequestError("Choisissez d’abord le type de projet.", 400);
}

function parseBuildMode(value: string): BuildMode {
  if (!value || value === "debug") return "debug";
  if (value === "signed") return "signed";
  throw new BuildRequestError("Le type d’APK choisi est invalide.", 400);
}

function parseBuildId(value: string) {
  if (!/^build-[a-zA-Z0-9-]{12,90}$/.test(value)) {
    throw new BuildRequestError("Identifiant de build invalide. Recommencez l’envoi.", 400);
  }
  return value;
}

type QuotaStatus = {
  key: string;
  remaining: number;
  max: number;
};

function getRateLimitKey(request: Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

function getQuotaStatusForKey(key: string): QuotaStatus {
  const now = Date.now();
  const validTimes = (submissionTimes.get(key) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  if (validTimes.length === 0) {
    submissionTimes.delete(key);
  } else {
    submissionTimes.set(key, validTimes);
  }
  return {
    key,
    remaining: Math.max(0, MAX_SUBMISSIONS_PER_HOUR - validTimes.length),
    max: MAX_SUBMISSIONS_PER_HOUR,
  };
}

function getQuotaStatus(request: Request) {
  return getQuotaStatusForKey(getRateLimitKey(request));
}

function checkRateLimit(request: Request) {
  const key = getRateLimitKey(request);
  const quota = getQuotaStatusForKey(key);
  if (quota.remaining === 0) {
    throw new BuildRequestError("Vous avez déjà lancé six compilations récemment. Attendez une heure avant de recommencer.", 429);
  }
  const validTimes = submissionTimes.get(key) ?? [];
  validTimes.push(Date.now());
  submissionTimes.set(key, validTimes);
  return getQuotaStatusForKey(key);
}

function cleanExpiredBuilds() {
  const now = Date.now();
  const threshold = Date.now() - BUILD_RETENTION_MS;
  for (const [id, job] of builds) {
    const timeoutMessage = getBuildTimeoutMessage(job.status, job.createdAt, job.updatedAt, now);
    if (timeoutMessage) {
      job.status = "failed";
      job.message = timeoutMessage;
      job.sourceArchive = undefined;
      job.iconArchive = undefined;
      job.updatedAt = now;
    }
    if (job.updatedAt < threshold) {
      job.sourceArchive = undefined;
      job.iconArchive = undefined;
      builds.delete(id);
    }
  }
}

async function verifyWorker(
  request: Request,
  allowedWorkflows: string[],
  allowedEvents = ["schedule", "workflow_dispatch"],
) {
  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new BuildRequestError("Accès réservé au moteur de compilation.", 401);

  try {
    const { payload } = await jwtVerify(token, githubJwks, {
      issuer: "https://token.actions.githubusercontent.com",
      audience: OIDC_AUDIENCE,
    });
    const expectedRepository = `${WORKER_OWNER}/${WORKER_REPOSITORY}`;
    const expectedWorkflows = allowedWorkflows.map(
      (workflow) => `${expectedRepository}/${workflow}@refs/heads/main`,
    );
    if (
      payload.repository !== expectedRepository
      || payload.ref !== "refs/heads/main"
      || !expectedWorkflows.includes(String(payload.workflow_ref))
      || !allowedEvents.includes(String(payload.event_name))
    ) {
      throw new BuildRequestError("Identité du moteur de compilation non reconnue.", 403);
    }
  } catch (error) {
    if (error instanceof BuildRequestError) throw error;
    throw new BuildRequestError("Identité du moteur de compilation non reconnue.", 403);
  }
}

function hasValidBuildToken(request: Request, expectedToken: string) {
  const candidate = request.query.accessToken;
  if (typeof candidate !== "string") return false;
  const received = Buffer.from(candidate);
  const expected = Buffer.from(expectedToken);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function verifyWorkerOrBuildToken(
  request: Request,
  token: string,
  allowedWorkflows: string[],
  allowedEvents?: string[],
) {
  if (hasValidBuildToken(request, token)) return;
  await verifyWorker(request, allowedWorkflows, allowedEvents);
}

function sendJob(response: Response, job: BuildRecord, includeKeyBackupUrl = false) {
  const quota = getQuotaStatusForKey(job.quotaKey);
  const signing = job.buildMode === "signed"
    ? {
      buildMode: job.buildMode,
      keyBackupAvailable: Boolean(job.keyBackupArchive),
      ...(includeKeyBackupUrl && job.keyBackupUrl ? { keyBackupUrl: job.keyBackupUrl } : {}),
    }
    : { buildMode: job.buildMode, keyBackupAvailable: false };
  response.json({
    id: job.id,
    projectName: job.projectName,
    status: job.status,
    message: job.message,
    // The release path is deterministic. Returning it early lets the phone
    // recover a completed APK if the in-memory build status vanishes.
    apkUrl: job.apkUrl ?? getExpectedApkUrl(job.id),
    remainingBuilds: quota.remaining,
    maxBuildsPerHour: quota.max,
    ...signing,
  });
}

export function registerBuildRoutes(app: Express) {
  app.get("/api/quota", (request: Request, response: Response) => {
    const quota = getQuotaStatus(request);
    response.json({ remaining: quota.remaining, max: quota.max });
  });

  app.post(
    "/api/builds/submit",
    receiveBuildSubmission,
    async (request: Request, response: Response) => {
      try {
        cleanExpiredBuilds();
        const buildId = parseBuildId(getHeaderValue(request, "x-one-app-build-id"));
        const projectType = parseProjectType(getHeaderValue(request, "x-one-app-project-type"));
        const buildMode = parseBuildMode(getHeaderValue(request, "x-one-app-build-mode"));
        const projectName = getHeaderValue(request, "x-one-app-project-name").trim().slice(0, 80) || "Mon projet";
        const identity = readAppIdentity(
          getHeaderValue(request, "x-one-app-package-name") || getGeneratedPackageName(buildId),
          getHeaderValue(request, "x-one-app-app-version") || DEFAULT_APP_VERSION,
        );
        if (!identity.valid) throw new BuildRequestError(identity.message, 400);
        const archive = (request.file?.buffer ?? request.body) as Buffer;
        const customIcon = getCustomIcon(request);

        if (!Buffer.isBuffer(archive) || archive.length === 0) {
          throw new BuildRequestError("Le fichier ZIP est vide ou n’a pas été reçu.", 400);
        }
        if (archive.length > MAX_SOURCE_SIZE) throw new BuildRequestError("Le ZIP dépasse la limite de 50 Mo.", 413);
        if (!isZip(archive)) throw new BuildRequestError("Le fichier envoyé n’est pas une archive ZIP valide.", 400);
        if (builds.has(buildId)) throw new BuildRequestError("Cette compilation a déjà été reçue.", 409);
        const quota = checkRateLimit(request);

        const now = Date.now();
        const workerAccessToken = randomBytes(32).toString("base64url");
        const publisherAccessToken = randomBytes(32).toString("base64url");
        const keyBackupAccessToken = buildMode === "signed" ? randomBytes(32).toString("base64url") : undefined;
        const buildBaseUrl = `${getPublicBaseUrl()}/api/builds/${buildId}`;
        const job: BuildRecord = {
          id: buildId,
          projectName,
          projectType,
          quotaKey: quota.key,
          sourceUrl: `${buildBaseUrl}/source?accessToken=${workerAccessToken}`,
          workerCompletionUrl: `${buildBaseUrl}/complete?accessToken=${workerAccessToken}`,
          publisherCompletionUrl: `${buildBaseUrl}/complete?accessToken=${publisherAccessToken}`,
          workerAccessToken,
          publisherAccessToken,
          sourceArchive: archive,
          iconUrl: customIcon ? `${buildBaseUrl}/icon?accessToken=${workerAccessToken}` : undefined,
          iconArchive: customIcon,
          buildMode,
          keyBackupAccessToken,
          keyBackupUrl: keyBackupAccessToken ? `${buildBaseUrl}/key-backup?accessToken=${keyBackupAccessToken}` : undefined,
          packageName: identity.packageName,
          appVersion: identity.appVersion,
          versionCode: identity.versionCode,
          status: "queued",
          message: "Votre projet a été reçu. La compilation commencera bientôt.",
          createdAt: now,
          updatedAt: now,
        };
        builds.set(buildId, job);
        response.status(202);
        sendJob(response, job, true);
      } catch (error) {
        const buildError = error instanceof BuildRequestError
          ? error
          : new BuildRequestError("L’envoi a échoué. Vérifiez votre connexion puis réessayez.", 500);
        response.status(buildError.statusCode).json({ message: buildError.message });
      }
    },
  );

  app.get("/api/builds/:buildId/status", (request: Request, response: Response) => {
    try {
      cleanExpiredBuilds();
      const buildId = parseBuildId(request.params.buildId);
      const job = builds.get(buildId);
      if (!job) throw new BuildRequestError("Cette compilation n’est plus disponible. Recommencez avec votre ZIP.", 404);
      sendJob(response, job);
    } catch (error) {
      const buildError = error instanceof BuildRequestError ? error : new BuildRequestError("Le statut est indisponible.", 500);
      response.status(buildError.statusCode).json({ message: buildError.message });
    }
  });

  app.get("/api/builds/:buildId/source", async (request: Request, response: Response) => {
    try {
      cleanExpiredBuilds();
      const buildId = parseBuildId(request.params.buildId);
      const job = builds.get(buildId);
      if (!job || !job.sourceArchive) {
        throw new BuildRequestError("Le ZIP de cette compilation n’est plus disponible.", 410);
      }
      await verifyWorkerOrBuildToken(request, job.workerAccessToken, [WORKER_WORKFLOW]);
      const archive = job.sourceArchive;
      job.sourceArchive = undefined;
      job.updatedAt = Date.now();
      response.type("application/zip");
      response.set("Cache-Control", "no-store");
      response.set("Content-Disposition", `attachment; filename="${job.id}.zip"`);
      response.send(archive);
    } catch (error) {
      const buildError = error instanceof BuildRequestError
        ? error
        : new BuildRequestError("Le ZIP est indisponible.", 500);
      response.status(buildError.statusCode).json({ message: buildError.message });
    }
  });

  app.get("/api/builds/:buildId/icon", async (request: Request, response: Response) => {
    try {
      cleanExpiredBuilds();
      const buildId = parseBuildId(request.params.buildId);
      const job = builds.get(buildId);
      if (!job || !job.iconArchive) {
        throw new BuildRequestError("L’icône de cette compilation n’est plus disponible.", 410);
      }
      await verifyWorkerOrBuildToken(request, job.workerAccessToken, [WORKER_WORKFLOW]);
      const icon = job.iconArchive;
      job.iconArchive = undefined;
      job.updatedAt = Date.now();
      response.type("image/png");
      response.set("Cache-Control", "no-store");
      response.set("Content-Disposition", `attachment; filename="${job.id}-icon.png"`);
      response.send(icon);
    } catch (error) {
      const buildError = error instanceof BuildRequestError ? error : new BuildRequestError("L’icône est indisponible.", 500);
      response.status(buildError.statusCode).json({ message: buildError.message });
    }
  });

  app.get("/api/builds/:buildId/key-backup", (request: Request, response: Response) => {
    try {
      cleanExpiredBuilds();
      const buildId = parseBuildId(request.params.buildId);
      const job = builds.get(buildId);
      if (!job || job.buildMode !== "signed" || !job.keyBackupArchive || !job.keyBackupAccessToken) {
        throw new BuildRequestError("La sauvegarde de clé n’est plus disponible. Gardez toujours ce fichier après le téléchargement.", 410);
      }
      if (!hasValidBuildToken(request, job.keyBackupAccessToken)) {
        throw new BuildRequestError("Accès protégé à la clé de signature refusé.", 403);
      }
      const archive = job.keyBackupArchive;
      job.keyBackupArchive = undefined;
      job.updatedAt = Date.now();
      response.type("application/zip");
      response.set("Cache-Control", "no-store");
      response.set("Content-Disposition", `attachment; filename="one-app-cle-${job.id}.zip"`);
      response.send(archive);
    } catch (error) {
      const buildError = error instanceof BuildRequestError ? error : new BuildRequestError("La sauvegarde de clé est indisponible.", 500);
      response.status(buildError.statusCode).json({ message: buildError.message });
    }
  });

  app.get("/api/builds/next", async (request: Request, response: Response) => {
    try {
      await verifyWorker(request, [WORKER_WORKFLOW]);
      cleanExpiredBuilds();
      const job = [...builds.values()].find((candidate) => candidate.status === "queued");
      if (!job) {
        response.status(204).end();
        return;
      }
      job.status = "building";
      job.message = "One App fabrique votre APK. Cette étape peut prendre plusieurs minutes.";
      job.updatedAt = Date.now();
      response.json({
        id: job.id,
        projectType: job.projectType,
        buildMode: job.buildMode,
        sourceUrl: job.sourceUrl,
        iconUrl: job.iconUrl,
          packageName: job.packageName,
          appVersion: job.appVersion,
          versionCode: job.versionCode,
          workerCompletionUrl: job.workerCompletionUrl,
          publisherCompletionUrl: job.publisherCompletionUrl,
        });
    } catch (error) {
      const buildError = error instanceof BuildRequestError ? error : new BuildRequestError("La file de compilation est indisponible.", 500);
      response.status(buildError.statusCode).json({ message: buildError.message });
    }
  });

  app.post(
    "/api/builds/:buildId/complete",
    express.json({ limit: "128kb" }),
    async (request: Request, response: Response) => {
      try {
        const buildId = parseBuildId(request.params.buildId);
        const job = builds.get(buildId);
        if (!job) throw new BuildRequestError("Compilation introuvable.", 404);
        const outcome = request.body?.outcome;
        if (outcome !== "complete" && outcome !== "failed") {
          throw new BuildRequestError("Résultat de compilation invalide.", 400);
        }
        if (outcome === "complete") {
          await verifyWorkerOrBuildToken(request, job.publisherAccessToken, [PUBLISHER_WORKFLOW], ["workflow_run"]);
          if (job.buildMode === "signed") {
            const keyBackupBase64 = request.body?.keyBackupBase64;
            if (
              typeof keyBackupBase64 !== "string"
              || keyBackupBase64.length === 0
              || keyBackupBase64.length > MAX_KEY_BACKUP_BASE64_LENGTH
              || !/^[A-Za-z0-9+/]+={0,2}$/.test(keyBackupBase64)
            ) {
              throw new BuildRequestError("La sauvegarde de clé de signature est invalide.", 400);
            }
            const keyBackup = Buffer.from(keyBackupBase64, "base64");
            if (keyBackup.length === 0 || keyBackup.length > MAX_KEY_BACKUP_SIZE || !isZip(keyBackup)) {
              throw new BuildRequestError("La sauvegarde de clé de signature est invalide.", 400);
            }
            job.keyBackupArchive = keyBackup;
          }
          job.apkUrl = getExpectedApkUrl(buildId);
        } else {
          await verifyWorkerOrBuildToken(request, job.workerAccessToken, [WORKER_WORKFLOW, PUBLISHER_WORKFLOW]);
        }
        job.status = outcome;
        job.message = outcome === "complete"
          ? "Votre APK est prête à être téléchargée."
          : "One App n’a pas pu créer l’APK. Vérifiez que le ZIP correspond bien au type choisi.";
        job.updatedAt = Date.now();
        sendJob(response, job);
      } catch (error) {
        const buildError = error instanceof BuildRequestError ? error : new BuildRequestError("Le résultat de compilation est indisponible.", 500);
        response.status(buildError.statusCode).json({ message: buildError.message });
      }
    },
  );
}
