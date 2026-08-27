const MAX_SUBMISSIONS_PER_HOUR = 6;
const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
const MAX_ICON_BYTES = 10 * 1024 * 1024;
const MAX_KEY_BACKUP_BYTES = 10 * 1024 * 1024;
const SOURCE_CHUNK_BYTES = 8 * 1024 * 1024;
const SOURCE_TTL_SECONDS = 2 * 60 * 60;
const JOB_TTL_SECONDS = 48 * 60 * 60;
const MAX_PROGRESS_EVENTS = 8;
const API_PREFIX = "/api";
const OIDC_AUDIENCE = "one-app-build-worker";
const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_JWKS_URL = `${GITHUB_OIDC_ISSUER}/.well-known/jwks`;
const BUILD_WORKER_REPOSITORY = "elkalebanquier-eng/one-app-build-worker";
const BUILD_WORKER_WORKFLOW = `${BUILD_WORKER_REPOSITORY}/.github/workflows/build-imported-project.yml@refs/heads/main`;
const TEMPORARY_ARTIFACT_BASE_URL = `https://github.com/${BUILD_WORKER_REPOSITORY}/releases/download`;
let githubJwksCache;

const ALLOWED_PROJECT_TYPES = new Set(["expo", "android", "html"]);
const ALLOWED_BUILD_MODES = new Set(["debug", "signed", "aab"]);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function error(message, status = 400) {
  return json({ message }, status);
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function header(request, name, fallback = "") {
  return decodeURIComponent(request.headers.get(name) || fallback).trim();
}

function safeFileName(name, fallback) {
  const value = (name || fallback).replace(/[^a-zA-Z0-9._-]/g, "_");
  return value.slice(0, 120) || fallback;
}

function isPng(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  return bytes.byteLength >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function parseBase64Icon(value) {
  if (typeof value !== "string" || !value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error("L’icône personnalisée est invalide. Choisissez une autre image PNG.");
  }
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (!bytes.byteLength || bytes.byteLength > MAX_ICON_BYTES || !isPng(bytes)) {
    throw new Error("L’icône personnalisée doit être une image PNG de 10 Mo maximum.");
  }
  return bytes;
}

function parseKeyBackup(value) {
  const maximumBase64Length = Math.ceil(MAX_KEY_BACKUP_BYTES * 4 / 3) + 4;
  if (typeof value !== "string" || !value || value.length > maximumBase64Length || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error("La sauvegarde de clé de signature est invalide.");
  }
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const isZip = bytes.byteLength >= 4 && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
  if (!bytes.byteLength || bytes.byteLength > MAX_KEY_BACKUP_BYTES || !isZip) {
    throw new Error("La sauvegarde de clé de signature est invalide.");
  }
  return bytes;
}

function buildJobKey(id) {
  return `job:${id}`;
}

function queueKey(createdAt, id) {
  return `queue:${createdAt}:${id}`;
}

function sourceKey(id, index) {
  return `source:${id}:${index}`;
}

function iconKey(id) {
  return `icon:${id}`;
}

function keyBackupKey(id) {
  return `key-backup:${id}`;
}

function expectedArtifactUrl(id, artifactType = "apk") {
  const tag = `one-app-build-${id}`;
  return `${TEMPORARY_ARTIFACT_BASE_URL}/${tag}/one-app-${id}.${artifactType}`;
}

function rateKey(request) {
  const ip = request.headers.get("cf-connecting-ip") || "anonymous";
  const bucket = Math.floor(Date.now() / (60 * 60 * 1000));
  return `rate:${bucket}:${ip}`;
}

function getCorsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  return origin
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "content-type, x-one-app-build-id, x-one-app-project-type, x-one-app-project-name, x-one-app-source-name, x-one-app-package-name, x-one-app-app-version, x-one-app-build-mode",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        vary: "origin",
      }
    : {};
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(getCorsHeaders(request))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

async function readJob(env, id) {
  return env.BUILDS.get(buildJobKey(id), "json");
}

async function writeJob(env, job) {
  await env.BUILDS.put(buildJobKey(job.id), JSON.stringify(job), { expirationTtl: JOB_TTL_SECONDS });
}

function publicJob(job, includeKeyBackupUrl = false) {
  const artifactType = job.artifactType === "aab" || job.buildMode === "aab" ? "aab" : "apk";
  const artifactUrl = job.artifactUrl ?? expectedArtifactUrl(job.id, artifactType);
  const signing = job.buildMode === "signed" || job.buildMode === "aab"
    ? {
        keyBackupAvailable: Boolean(job.keyBackupAvailable),
        ...(includeKeyBackupUrl && job.keyBackupUrl ? { keyBackupUrl: job.keyBackupUrl } : {}),
      }
    : { keyBackupAvailable: false };
  return {
    id: job.id,
    status: job.status,
    message: job.message,
    progress: Number.isFinite(job.progress) ? Math.max(0, Math.min(100, Math.round(job.progress))) : 0,
    events: Array.isArray(job.events) ? job.events.slice(-MAX_PROGRESS_EVENTS) : [],
    artifactType,
    artifactUrl,
    ...(artifactType === "apk" ? { apkUrl: artifactUrl } : { aabUrl: artifactUrl }),
    buildMode: job.buildMode,
    remainingBuilds: job.remainingBuilds,
    maxBuildsPerHour: MAX_SUBMISSIONS_PER_HOUR,
    ...signing,
  };
}

function progressEvent(progress, message) {
  return {
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    message,
    createdAt: new Date().toISOString(),
  };
}

function appendProgress(job, progress, message) {
  const safeProgress = Math.max(Number.isFinite(job.progress) ? job.progress : 0, Math.max(0, Math.min(100, Math.round(progress))));
  const safeMessage = typeof message === "string" ? message.trim().slice(0, 180) : "";
  if (!safeMessage) return false;
  const events = Array.isArray(job.events) ? job.events : [];
  const latest = events[events.length - 1];
  job.progress = safeProgress;
  job.message = safeMessage;
  if (!latest || latest.message !== safeMessage || latest.progress !== safeProgress) {
    job.events = [...events, progressEvent(safeProgress, safeMessage)].slice(-MAX_PROGRESS_EVENTS);
  }
  job.updatedAt = new Date().toISOString();
  return true;
}

async function getRateState(env, request) {
  const key = rateKey(request);
  const state = await env.BUILDS.get(key, "json");
  return { key, count: Number(state?.count || 0) };
}

async function consumeQuota(env, request) {
  const state = await getRateState(env, request);
  if (state.count >= MAX_SUBMISSIONS_PER_HOUR) return { allowed: false, remaining: 0 };
  const count = state.count + 1;
  await env.BUILDS.put(state.key, JSON.stringify({ count }), { expirationTtl: 60 * 60 + 120 });
  return { allowed: true, remaining: MAX_SUBMISSIONS_PER_HOUR - count };
}

function isWorker(request, env) {
  const secret = request.headers.get("x-mia-relay-secret") || "";
  return Boolean(env.RELAY_SECRET) && secret === env.RELAY_SECRET;
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function getGithubJwks() {
  if (!githubJwksCache) {
    githubJwksCache = fetch(GITHUB_JWKS_URL)
      .then((response) => {
        if (!response.ok) throw new Error("GitHub JWKS indisponible");
        return response.json();
      })
      .catch((error) => {
        githubJwksCache = undefined;
        throw error;
      });
  }
  return githubJwksCache;
}

async function isGithubBuildWorker(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return false;
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) return false;
    const jwtHeader = decodeJwtPart(encodedHeader);
    if (jwtHeader.alg !== "RS256" || !jwtHeader.kid) return false;
    const jwks = await getGithubJwks();
    const jwk = jwks.keys?.find((key) => key.kid === jwtHeader.kid && key.kty === "RSA");
    if (!jwk) return false;
    const verificationKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signed = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signature = decodeBase64Url(encodedSignature);
    const validSignature = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", verificationKey, signature, signed);
    if (!validSignature) return false;
    const claims = decodeJwtPart(encodedPayload);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const now = Math.floor(Date.now() / 1000);
    return (
      claims.iss === GITHUB_OIDC_ISSUER
      && audiences.includes(OIDC_AUDIENCE)
      && claims.repository === BUILD_WORKER_REPOSITORY
      && claims.ref === "refs/heads/main"
      && claims.workflow_ref === BUILD_WORKER_WORKFLOW
      && ["schedule", "workflow_dispatch"].includes(claims.event_name)
      && Number(claims.exp) > now
      && Number(claims.nbf || 0) <= now + 60
    );
  } catch {
    return false;
  }
}

function projectHeaders(request) {
  const projectType = header(request, "x-one-app-project-type");
  const buildMode = header(request, "x-one-app-build-mode", "debug");
  const projectName = header(request, "x-one-app-project-name", "Mon application").slice(0, 80);
  const packageName = header(request, "x-one-app-package-name", "com.mia.generated").slice(0, 160);
  const appVersion = header(request, "x-one-app-app-version", "1.0.0").slice(0, 32);
  const id = header(request, "x-one-app-build-id");
  if (!id || !ALLOWED_PROJECT_TYPES.has(projectType) || !ALLOWED_BUILD_MODES.has(buildMode)) return null;
  return {
    id: id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100),
    projectType,
    buildMode,
    projectName,
    packageName,
    appVersion,
    sourceName: safeFileName(header(request, "x-one-app-source-name", "projet.zip"), "projet.zip"),
  };
}

async function saveSource(env, id, source) {
  const bytes = new Uint8Array(await source.arrayBuffer());
  const chunkCount = Math.ceil(bytes.byteLength / SOURCE_CHUNK_BYTES);
  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * SOURCE_CHUNK_BYTES;
    const end = Math.min(start + SOURCE_CHUNK_BYTES, bytes.byteLength);
    await env.BUILDS.put(sourceKey(id, index), bytes.slice(start, end), { expirationTtl: SOURCE_TTL_SECONDS });
  }
  return { size: bytes.byteLength, chunkCount };
}

function sourceStream(env, id, chunkCount) {
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      if (index >= chunkCount) {
        controller.close();
        return;
      }
      const chunk = await env.BUILDS.get(sourceKey(id, index), "arrayBuffer");
      index += 1;
      if (!chunk) {
        controller.error(new Error("Archive temporaire expirée."));
        return;
      }
      controller.enqueue(new Uint8Array(chunk));
    },
  });
}

async function submitBuild(request, env, origin) {
  const fields = projectHeaders(request);
  if (!fields?.id) return error("Les informations de compilation sont incomplètes.");
  const existing = await readJob(env, fields.id);
  if (existing?.status === "queued" || existing?.status === "building") return json(publicJob(existing));

  const quota = await consumeQuota(env, request);
  if (!quota.allowed) return error("Vous avez atteint la limite gratuite de 6 compilations cette heure. Réessayez un peu plus tard.", 429);

  let form;
  try {
    form = await request.formData();
  } catch {
    return error("Le fichier de projet n’a pas pu être lu.");
  }
  const source = form.get("source");
  if (!(source instanceof File) || source.size <= 0) return error("Choisissez un ZIP ou un fichier HTML valide.");
  if (source.size > MAX_SOURCE_BYTES) return error("Le ZIP dépasse 50 Mo. Réduisez sa taille avant de réessayer.");
  const uploadedIcon = form.get("icon");
  const encodedIcon = form.get("iconBase64");
  let icon;
  try {
    if (uploadedIcon instanceof File && uploadedIcon.size > 0) {
      if (uploadedIcon.size > MAX_ICON_BYTES) return error("L’icône dépasse 10 Mo. Choisissez une image plus légère.");
      const bytes = new Uint8Array(await uploadedIcon.arrayBuffer());
      if (!isPng(bytes)) return error("L’icône personnalisée doit être une image PNG.");
      icon = { bytes, name: uploadedIcon.name };
    } else if (typeof encodedIcon === "string" && encodedIcon) {
      icon = { bytes: parseBase64Icon(encodedIcon), name: "icone-personnalisee.png" };
    }
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : "L’icône personnalisée est invalide.");
  }

  const now = new Date().toISOString();
  const sourceInfo = await saveSource(env, fields.id, source);
  let iconName;
  if (icon) {
    await env.BUILDS.put(iconKey(fields.id), icon.bytes, { expirationTtl: SOURCE_TTL_SECONDS });
    iconName = safeFileName(icon.name, "icone.png");
  }
  const job = {
    ...fields,
    sourceName: safeFileName(source.name || fields.sourceName, fields.sourceName),
    sourceSize: sourceInfo.size,
    sourceChunks: sourceInfo.chunkCount,
    iconName,
    status: "queued",
    progress: 5,
    message: "Projet reçu. Il attend une machine de compilation.",
    events: [progressEvent(5, "Projet reçu. Il attend une machine de compilation.")],
    createdAt: now,
    updatedAt: now,
    remainingBuilds: quota.remaining,
    sourceToken: randomToken(),
    workerToken: randomToken(),
    publisherToken: randomToken(),
    artifactType: fields.buildMode === "aab" ? "aab" : "apk",
    keyBackupToken: fields.buildMode === "signed" || fields.buildMode === "aab" ? randomToken() : undefined,
    keyBackupUrl: undefined,
    keyBackupAvailable: false,
  };
  if (job.keyBackupToken) {
    job.keyBackupUrl = `${origin}${API_PREFIX}/builds/${encodeURIComponent(job.id)}/key-backup?t=${job.keyBackupToken}`;
  }
  await writeJob(env, job);
  await env.BUILDS.put(queueKey(now, job.id), job.id, { expirationTtl: SOURCE_TTL_SECONDS });
  return json(publicJob(job, true), 202);
}

async function claimBuild(request, env, origin) {
  if (!isWorker(request, env) && !(await isGithubBuildWorker(request))) return error("Accès du worker refusé.", 401);
  const queue = await env.BUILDS.list({ prefix: "queue:", limit: 1 });
  const queueEntry = queue.keys[0];
  if (!queueEntry) return new Response(null, { status: 204 });
  const id = await env.BUILDS.get(queueEntry.name);
  await env.BUILDS.delete(queueEntry.name);
  const job = id ? await readJob(env, id) : null;
  if (!job || job.status !== "queued") return new Response(null, { status: 204 });
  job.status = "building";
  appendProgress(job, 12, "La machine prépare votre projet.");
  await writeJob(env, job);
  return json({
    id: job.id,
    projectType: job.projectType,
    buildMode: job.buildMode,
    artifactType: job.artifactType,
    projectName: job.projectName,
    packageName: job.packageName,
    appVersion: job.appVersion,
    versionCode: 1,
    sourceUrl: `${origin}${API_PREFIX}/builds/${encodeURIComponent(job.id)}/source?t=${job.sourceToken}`,
    iconUrl: job.iconName ? `${origin}${API_PREFIX}/builds/${encodeURIComponent(job.id)}/icon?t=${job.sourceToken}` : undefined,
    workerCompletionUrl: `${origin}${API_PREFIX}/builds/${encodeURIComponent(job.id)}/worker-complete?t=${job.workerToken}`,
    workerProgressUrl: `${origin}${API_PREFIX}/builds/${encodeURIComponent(job.id)}/worker-progress?t=${job.workerToken}`,
    publisherCompletionUrl: `${origin}${API_PREFIX}/builds/${encodeURIComponent(job.id)}/publisher-complete?t=${job.publisherToken}`,
    publisherProgressUrl: `${origin}${API_PREFIX}/builds/${encodeURIComponent(job.id)}/publisher-progress?t=${job.publisherToken}`,
  });
}

async function downloadSource(env, id, token, icon = false) {
  const job = await readJob(env, id);
  if (!job || !token || token !== job.sourceToken || job.status !== "building") return error("Téléchargement temporaire indisponible.", 404);
  if (icon) {
    if (!job.iconName) return error("Aucune icône personnalisée.", 404);
    const body = await env.BUILDS.get(iconKey(id), "arrayBuffer");
    return body
      ? new Response(body, { headers: { "content-type": "image/png", "cache-control": "no-store" } })
      : error("L’icône temporaire a expiré.", 404);
  }
  return new Response(sourceStream(env, id, job.sourceChunks), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${job.sourceName}"`,
      "cache-control": "no-store",
    },
  });
}

async function completeBuild(request, env, id, token, publisher = false) {
  const job = await readJob(env, id);
  const expected = publisher ? job?.publisherToken : job?.workerToken;
  if (!job || !token || token !== expected) return error("Confirmation de build refusée.", 401);
  const payload = await request.json().catch(() => ({}));
  if (payload.outcome === "failed") {
    job.status = "failed";
    job.message = job.buildMode === "aab"
      ? "MIA💻 n’a pas pu créer le fichier AAB. Vérifiez que le ZIP correspond bien au type choisi."
      : "MIA💻 n’a pas pu créer l’APK. Vérifiez que le ZIP correspond bien au type choisi.";
  } else if (publisher) {
    try {
      const expectedArtifactType = job.buildMode === "aab" ? "aab" : "apk";
      if (payload.artifactType && payload.artifactType !== expectedArtifactType) {
        return error("Le format d’artefact publié ne correspond pas au build demandé.");
      }
      if (job.buildMode === "signed" || job.buildMode === "aab") {
        const backup = parseKeyBackup(payload.keyBackupBase64);
        await env.BUILDS.put(keyBackupKey(id), backup, { expirationTtl: JOB_TTL_SECONDS });
        job.keyBackupAvailable = true;
      }
    } catch (caught) {
      return error(caught instanceof Error ? caught.message : "La sauvegarde de clé de signature est invalide.");
    }
    job.status = "complete";
    job.artifactType = job.buildMode === "aab" ? "aab" : "apk";
    job.artifactUrl = expectedArtifactUrl(id, job.artifactType);
    if (job.artifactType === "aab") {
      appendProgress(job, 100, "Votre fichier AAB est prêt à envoyer à Google Play. Play Console effectue ensuite la validation finale.");
    } else {
      appendProgress(job, 100, "Votre APK est prête à être téléchargée.");
    }
  } else {
    job.status = "building";
    appendProgress(job, 90, job.buildMode === "aab" ? "Fichier AAB créé. Sa publication sécurisée est en cours." : "APK créée. Sa publication sécurisée est en cours.");
  }
  await writeJob(env, job);
  return json(publicJob(job));
}

async function reportBuildProgress(request, env, id, token, publisher = false) {
  const job = await readJob(env, id);
  const expectedToken = publisher ? job?.publisherToken : job?.workerToken;
  if (!job || !token || token !== expectedToken || job.status !== "building") return error("Mise à jour de compilation refusée.", 401);
  const payload = await request.json().catch(() => ({}));
  const maximum = publisher ? 99 : 90;
  if (typeof payload.progress !== "number" || payload.progress < 0 || payload.progress > maximum || !appendProgress(job, payload.progress, payload.message)) {
    return error("Mise à jour de compilation invalide.");
  }
  await writeJob(env, job);
  return json(publicJob(job));
}

async function downloadKeyBackup(env, id, token) {
  const job = await readJob(env, id);
  if (!job || !["signed", "aab"].includes(job.buildMode) || !job.keyBackupAvailable || !job.keyBackupToken || token !== job.keyBackupToken) {
    return error("La sauvegarde de clé n’est plus disponible. Gardez toujours ce fichier après le téléchargement.", 410);
  }
  const archive = await env.BUILDS.get(keyBackupKey(id), "arrayBuffer");
  if (!archive) return error("La sauvegarde de clé n’est plus disponible. Gardez toujours ce fichier après le téléchargement.", 410);
  await env.BUILDS.delete(keyBackupKey(id));
  job.keyBackupAvailable = false;
  job.keyBackupToken = undefined;
  job.keyBackupUrl = undefined;
  job.updatedAt = new Date().toISOString();
  await writeJob(env, job);
  return new Response(archive, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="one-app-cle-${id}.zip"`,
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), request);
    const origin = url.origin;
    let response;
    if (request.method === "GET" && url.pathname === `${API_PREFIX}/quota`) {
      const rate = await getRateState(env, request);
      response = json({ remaining: Math.max(0, MAX_SUBMISSIONS_PER_HOUR - rate.count), max: MAX_SUBMISSIONS_PER_HOUR });
    } else if (request.method === "POST" && url.pathname === `${API_PREFIX}/builds/submit`) {
      response = await submitBuild(request, env, origin);
    } else if (request.method === "GET" && url.pathname === `${API_PREFIX}/builds/next`) {
      response = await claimBuild(request, env, origin);
    } else {
      const match = url.pathname.match(/^\/api\/builds\/([^/]+)\/(status|source|icon|key-backup|worker-progress|publisher-progress|worker-complete|publisher-complete)$/);
      if (!match) response = error("Route inconnue.", 404);
      else {
        const [, id, action] = match;
        if (request.method === "GET" && action === "status") {
          const job = await readJob(env, id);
          response = job ? json(publicJob(job)) : error("Cette compilation est introuvable.", 404);
        } else if (request.method === "GET" && action === "source") {
          response = await downloadSource(env, id, url.searchParams.get("t"));
        } else if (request.method === "GET" && action === "icon") {
          response = await downloadSource(env, id, url.searchParams.get("t"), true);
        } else if (request.method === "GET" && action === "key-backup") {
          response = await downloadKeyBackup(env, id, url.searchParams.get("t"));
        } else if (request.method === "POST" && action === "worker-complete") {
          response = await completeBuild(request, env, id, url.searchParams.get("t"));
        } else if (request.method === "POST" && action === "worker-progress") {
          response = await reportBuildProgress(request, env, id, url.searchParams.get("t"));
        } else if (request.method === "POST" && action === "publisher-complete") {
          response = await completeBuild(request, env, id, url.searchParams.get("t"), true);
        } else if (request.method === "POST" && action === "publisher-progress") {
          response = await reportBuildProgress(request, env, id, url.searchParams.get("t"), true);
        } else response = error("Méthode refusée.", 405);
      }
    }
    return withCors(response, request);
  },
};
