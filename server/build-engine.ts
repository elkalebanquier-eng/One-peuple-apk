import type { Express, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { storageCreateUploadUrl, storagePut } from "./storage";

const WORKER_OWNER = "elkalebanquier-eng";
const WORKER_REPOSITORY = "one-app-build-worker";
const WORKER_WORKFLOW = ".github/workflows/build-imported-project.yml";
const OIDC_AUDIENCE = "one-app-build-worker";
const MAX_SOURCE_SIZE = 50 * 1024 * 1024;
const MAX_SUBMISSIONS_PER_HOUR = 2;
const BUILD_RETENTION_MS = 24 * 60 * 60 * 1000;
const submissionTimes = new Map<string, number[]>();
const githubJwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

type ProjectType = "expo" | "android" | "html";
type BuildState = "queued" | "building" | "complete" | "failed";

type BuildRecord = {
  id: string;
  projectName: string;
  projectType: ProjectType;
  sourceUrl: string;
  status: BuildState;
  message: string;
  createdAt: number;
  updatedAt: number;
  apkUrl?: string;
};

const builds = new Map<string, BuildRecord>();

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

function getPublicBaseUrl(request: Request) {
  const forwardedProtocol = request.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || request.protocol || "https";
  return `${protocol}://${request.get("host")}`;
}

function isZip(buffer: Buffer) {
  if (buffer.length < 4) return false;
  return ["504b0304", "504b0506", "504b0708"].includes(buffer.subarray(0, 4).toString("hex"));
}

function parseProjectType(value: string): ProjectType {
  if (value === "expo" || value === "android" || value === "html") return value;
  throw new BuildRequestError("Choisissez d’abord le type de projet.", 400);
}

function parseBuildId(value: string) {
  if (!/^build-[a-zA-Z0-9-]{12,90}$/.test(value)) {
    throw new BuildRequestError("Identifiant de build invalide. Recommencez l’envoi.", 400);
  }
  return value;
}

function checkRateLimit(request: Request) {
  const key = request.ip || request.socket.remoteAddress || "unknown";
  const now = Date.now();
  const validTimes = (submissionTimes.get(key) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  if (validTimes.length >= MAX_SUBMISSIONS_PER_HOUR) {
    throw new BuildRequestError("Vous avez déjà lancé deux compilations récemment. Attendez une heure avant de recommencer.", 429);
  }
  validTimes.push(now);
  submissionTimes.set(key, validTimes);
}

function cleanExpiredBuilds() {
  const threshold = Date.now() - BUILD_RETENTION_MS;
  for (const [id, job] of builds) {
    if (job.updatedAt < threshold) builds.delete(id);
  }
}

async function verifyWorker(request: Request) {
  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new BuildRequestError("Accès réservé au moteur de compilation.", 401);

  try {
    const { payload } = await jwtVerify(token, githubJwks, {
      issuer: "https://token.actions.githubusercontent.com",
      audience: OIDC_AUDIENCE,
    });
    const expectedRepository = `${WORKER_OWNER}/${WORKER_REPOSITORY}`;
    const expectedWorkflow = `${expectedRepository}/${WORKER_WORKFLOW}@refs/heads/main`;
    if (
      payload.repository !== expectedRepository
      || payload.ref !== "refs/heads/main"
      || payload.workflow_ref !== expectedWorkflow
      || (payload.event_name !== "schedule" && payload.event_name !== "workflow_dispatch")
    ) {
      throw new BuildRequestError("Identité du moteur de compilation non reconnue.", 403);
    }
  } catch (error) {
    if (error instanceof BuildRequestError) throw error;
    throw new BuildRequestError("Identité du moteur de compilation non reconnue.", 403);
  }
}

function sendJob(response: Response, job: BuildRecord) {
  response.json({
    id: job.id,
    projectName: job.projectName,
    status: job.status,
    message: job.message,
    apkUrl: job.status === "complete" ? job.apkUrl : undefined,
  });
}

export function registerBuildRoutes(app: Express) {
  app.post(
    "/api/builds/submit",
    require("express").raw({ type: "application/octet-stream", limit: "50mb" }),
    async (request: Request, response: Response) => {
      try {
        cleanExpiredBuilds();
        checkRateLimit(request);
        const buildId = parseBuildId(getHeaderValue(request, "x-one-app-build-id"));
        const projectType = parseProjectType(getHeaderValue(request, "x-one-app-project-type"));
        const projectName = getHeaderValue(request, "x-one-app-project-name").trim().slice(0, 80) || "Mon projet";
        const sourceName = getHeaderValue(request, "x-one-app-source-name").trim().replace(/[^a-zA-Z0-9._-]/g, "_") || "projet.zip";
        const archive = request.body as Buffer;

        if (!Buffer.isBuffer(archive) || archive.length === 0) {
          throw new BuildRequestError("Le fichier ZIP est vide ou n’a pas été reçu.", 400);
        }
        if (archive.length > MAX_SOURCE_SIZE) throw new BuildRequestError("Le ZIP dépasse la limite de 50 Mo.", 413);
        if (!isZip(archive)) throw new BuildRequestError("Le fichier envoyé n’est pas une archive ZIP valide.", 400);
        if (builds.has(buildId)) throw new BuildRequestError("Cette compilation a déjà été reçue.", 409);

        const source = await storagePut(`one-app/sources/${buildId}/${sourceName}`, archive, "application/zip");
        const now = Date.now();
        const job: BuildRecord = {
          id: buildId,
          projectName,
          projectType,
          sourceUrl: `${getPublicBaseUrl(request)}${source.url}`,
          status: "queued",
          message: "Votre projet a été reçu. La compilation commencera bientôt.",
          createdAt: now,
          updatedAt: now,
        };
        builds.set(buildId, job);
        response.status(202);
        sendJob(response, job);
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

  app.get("/api/builds/next", async (request: Request, response: Response) => {
    try {
      await verifyWorker(request);
      cleanExpiredBuilds();
      const job = [...builds.values()].find((candidate) => candidate.status === "queued");
      if (!job) {
        response.status(204).end();
        return;
      }
      const output = await storageCreateUploadUrl(`one-app/apks/${job.id}.apk`);
      job.status = "building";
      job.message = "One App fabrique votre APK. Cette étape peut prendre plusieurs minutes.";
      job.apkUrl = `${getPublicBaseUrl(request)}${output.url}`;
      job.updatedAt = Date.now();
      response.json({
        id: job.id,
        projectType: job.projectType,
        sourceUrl: job.sourceUrl,
        outputUrl: output.uploadUrl,
      });
    } catch (error) {
      const buildError = error instanceof BuildRequestError ? error : new BuildRequestError("La file de compilation est indisponible.", 500);
      response.status(buildError.statusCode).json({ message: buildError.message });
    }
  });

  app.post(
    "/api/builds/:buildId/complete",
    require("express").json({ limit: "32kb" }),
    async (request: Request, response: Response) => {
      try {
        await verifyWorker(request);
        const buildId = parseBuildId(request.params.buildId);
        const job = builds.get(buildId);
        if (!job) throw new BuildRequestError("Compilation introuvable.", 404);
        const outcome = request.body?.outcome;
        if (outcome !== "complete" && outcome !== "failed") {
          throw new BuildRequestError("Résultat de compilation invalide.", 400);
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
