import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import { getUnavailableBuildMessage, readBuildResponse } from "@/lib/build-response";
import { makeRestartBuildInput } from "@/lib/restart-build";
import { notifyBuildOutcome } from "@/lib/build-notifications";
import { DEFAULT_APP_VERSION, getGeneratedPackageName, readAppIdentity } from "@/shared/app-identity";
import { getExpectedArtifactUrl, type BuildArtifactType } from "@/shared/build-delivery";
import { canDeleteBuildFromHistory, getLocalArtifactFileUri, getLocalBuildDirectory } from "@/shared/build-history";
import { shouldNotifyBuildStatus } from "@/shared/build-notifications";
import { normalizeBuildProgress, readBuildProgressEvents, type BuildProgressEvent } from "@/shared/build-progress";
import { getKeyBackupStorageKey } from "@/shared/secure-storage-key";

export type ProjectType = "expo" | "android" | "html";
export type BuildStatus = "draft" | "ready" | "queued" | "building" | "complete" | "failed";
export type BuildMode = "debug" | "signed" | "aab";

export type BuildQuota = {
  remaining: number;
  max: number;
};

export interface BuildJob {
  id: string;
  projectName: string;
  projectType: ProjectType;
  sourceName: string;
  sourceSize: number | null;
  sourceUri: string;
  iconName?: string;
  iconSize?: number | null;
  iconUri?: string;
  packageName?: string;
  appVersion?: string;
  versionCode?: number;
  buildMode: BuildMode;
  artifactType?: BuildArtifactType;
  artifactUri?: string;
  keyBackupAvailable?: boolean;
  /** Confirmation locale choisie par le propriétaire après avoir exporté le ZIP privé. */
  keyBackupSavedAt?: string;
  status: BuildStatus;
  createdAt: string;
  updatedAt: string;
  message?: string;
  progress?: number;
  events?: BuildProgressEvent[];
  apkUri?: string;
}

export function getBuildArtifactType(buildMode: BuildMode): BuildArtifactType {
  return buildMode === "aab" ? "aab" : "apk";
}

export const PROJECT_TYPES: Array<{
  id: ProjectType;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  expected: string;
}> = [
  {
    id: "expo",
    label: "Expo / React Native",
    shortLabel: "Expo",
    icon: "⚛️",
    description: "Pour un projet mobile React Native avec Expo.",
    expected: "ZIP avec package.json et app.json ou app.config.*",
  },
  {
    id: "android",
    label: "Android natif",
    shortLabel: "Android",
    icon: "🤖",
    description: "Pour un projet Android avec Gradle et le module app.",
    expected: "ZIP avec settings.gradle et build.gradle",
  },
  {
    id: "html",
    label: "HTML / CSS / JavaScript",
    shortLabel: "HTML",
    icon: "🌐",
    description: "Pour un site statique à empaqueter en application Android.",
    expected: "ZIP avec index.html et ses ressources",
  },
];

const STORAGE_KEY = "one-app-build-jobs-v1";
const listeners = new Set<(jobs: BuildJob[]) => void>();
const quotaListeners = new Set<(quota: BuildQuota | null) => void>();
let cache: BuildJob[] | null = null;
let quotaCache: BuildQuota | null = null;

function makeId() {
  return `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function readJobs() {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  cache = raw ? (JSON.parse(raw) as BuildJob[]) : [];
  return cache;
}

async function writeJobs(jobs: BuildJob[]) {
  cache = jobs;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  listeners.forEach((listener) => listener(jobs));
}

function saveBuildQuota(remaining: unknown, max: unknown) {
  if (
    typeof remaining !== "number"
    || typeof max !== "number"
    || !Number.isFinite(remaining)
    || !Number.isFinite(max)
    || max <= 0
  ) return quotaCache;

  quotaCache = {
    remaining: Math.max(0, Math.min(Math.floor(remaining), Math.floor(max))),
    max: Math.floor(max),
  };
  quotaListeners.forEach((listener) => listener(quotaCache));
  return quotaCache;
}

async function updateJob(id: string, patch: Partial<BuildJob>) {
  const jobs = await readJobs();
  const previous = jobs.find((job) => job.id === id);
  const updated = jobs.map((job) => job.id === id
    ? { ...job, ...patch, updatedAt: new Date().toISOString() }
    : job);
  await writeJobs(updated);
  const next = updated.find((job) => job.id === id);
  if (next && shouldNotifyBuildStatus(previous?.status, next.status)) {
    void notifyBuildOutcome(next);
  }
  return next;
}

function buildApiUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Le service de compilation n’est pas encore prêt. Réessayez dans quelques minutes.");
  }
  return `${baseUrl}${path}`;
}

/** Vérifie l’artefact temporaire seulement si le statut serveur a été perdu après un redémarrage. */
async function findPublishedArtifact(job: BuildJob) {
  const artifactType = job.artifactType ?? getBuildArtifactType(job.buildMode);
  const artifactUri = job.artifactUri ?? job.apkUri ?? getExpectedArtifactUrl(job.id, artifactType);
  try {
    const response = await fetch(artifactUri, { method: "HEAD" });
    return response.ok ? artifactUri : undefined;
  } catch {
    return undefined;
  }
}

function buildHeaders(job: BuildJob) {
  return {
    "x-one-app-build-id": encodeURIComponent(job.id),
    "x-one-app-project-type": encodeURIComponent(job.projectType),
    "x-one-app-project-name": encodeURIComponent(job.projectName),
    "x-one-app-source-name": encodeURIComponent(job.sourceName),
    "x-one-app-package-name": encodeURIComponent(job.packageName ?? getGeneratedPackageName(job.id)),
    "x-one-app-app-version": encodeURIComponent(job.appVersion ?? DEFAULT_APP_VERSION),
    "x-one-app-build-mode": encodeURIComponent(job.buildMode),
  };
}

function keyBackupStorageKey(buildId: string) {
  return getKeyBackupStorageKey(buildId);
}

/** The key link is private: it never enters AsyncStorage or the build history. */
export async function getPrivateKeyBackupUrl(buildId: string) {
  return SecureStore.getItemAsync(keyBackupStorageKey(buildId));
}

export async function clearPrivateKeyBackupUrl(buildId: string) {
  await SecureStore.deleteItemAsync(keyBackupStorageKey(buildId));
}

/**
 * Mémorise uniquement la confirmation de l’utilisateur. Le ZIP, la clé, le mot
 * de passe et l’URL privée restent hors de l’historique local.
 */
export async function markPrivateKeyBackupSaved(buildId: string) {
  return updateJob(buildId, { keyBackupSavedAt: new Date().toISOString() });
}

async function savePrivateKeyBackupUrl(buildId: string, url: string | undefined) {
  if (!url) return;
  await SecureStore.setItemAsync(keyBackupStorageKey(buildId), url);
}

export async function loadBuildJobs() {
  return [...(await readJobs())].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Retire une ancienne entrée de l’historique uniquement sur ce téléphone.
 * Les APK déjà installées, partagées ou copiées dans Fichiers ne sont jamais concernées.
 */
export async function deleteBuildJob(job: BuildJob) {
  if (!canDeleteBuildFromHistory(job.status)) {
    throw new Error("Une compilation en cours ne peut pas être supprimée. Attendez qu’elle soit terminée.");
  }

  const rootDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (rootDirectory) {
    const localDirectory = getLocalBuildDirectory(rootDirectory, job.id);
    const artifactType = job.artifactType ?? getBuildArtifactType(job.buildMode);
    const localArtifactUri = getLocalArtifactFileUri(rootDirectory, job.projectName, job.id, artifactType);
    await Promise.allSettled([
      FileSystem.deleteAsync(localDirectory, { idempotent: true }),
      FileSystem.deleteAsync(localArtifactUri, { idempotent: true }),
    ]);
  }

  // The private link is removed from the encrypted store; any exported backup stays in the user’s Files app.
  await clearPrivateKeyBackupUrl(job.id).catch(() => undefined);
  const jobs = await readJobs();
  await writeJobs(jobs.filter((candidate) => candidate.id !== job.id));
}

/**
 * Nettoie seulement les entrées qui ne sont plus en cours, avec leurs fichiers locaux.
 * Les compilations en file ou en construction restent intactes et continueront leur suivi.
 */
export async function deleteFinishedBuildJobs() {
  const jobs = await readJobs();
  const deletableJobs = jobs.filter((job) => canDeleteBuildFromHistory(job.status));
  if (deletableJobs.length === 0) return 0;

  await Promise.all(deletableJobs.map(async (job) => {
    const rootDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (rootDirectory) {
      await Promise.allSettled([
        FileSystem.deleteAsync(getLocalBuildDirectory(rootDirectory, job.id), { idempotent: true }),
        FileSystem.deleteAsync(getLocalArtifactFileUri(rootDirectory, job.projectName, job.id, job.artifactType ?? getBuildArtifactType(job.buildMode)), { idempotent: true }),
      ]);
    }
    await clearPrivateKeyBackupUrl(job.id).catch(() => undefined);
  }));

  await writeJobs(jobs.filter((job) => !canDeleteBuildFromHistory(job.status)));
  return deletableJobs.length;
}

export function subscribeToBuildJobs(listener: (jobs: BuildJob[]) => void) {
  listeners.add(listener);
  void loadBuildJobs().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeToBuildQuota(listener: (quota: BuildQuota | null) => void) {
  quotaListeners.add(listener);
  listener(quotaCache);
  return () => {
    quotaListeners.delete(listener);
  };
}

export async function refreshBuildQuota() {
  try {
    const response = await fetch(buildApiUrl("/api/quota"));
    const payload = readBuildResponse(await response.text(), response.status);
    if (!response.ok) return quotaCache;
    return saveBuildQuota(payload.remaining, payload.max);
  } catch {
    return quotaCache;
  }
}

export async function createLocalBuildDraft(input: {
  projectName: string;
  projectType: ProjectType;
  sourceName: string;
  sourceSize?: number;
  sourceUri: string;
  iconName?: string;
  iconSize?: number;
  iconUri?: string;
  packageName?: string;
  appVersion?: string;
  buildMode?: BuildMode;
}) {
  if (!FileSystem.documentDirectory) {
    throw new Error("Le stockage privé de l’application est indisponible.");
  }

  const id = makeId();
  const identity = readAppIdentity(
    input.packageName ?? getGeneratedPackageName(id),
    input.appVersion ?? DEFAULT_APP_VERSION,
  );
  if (!identity.valid) throw new Error(identity.message);
  const directory = `${FileSystem.documentDirectory}one-app/${id}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const sourceName = sanitizeFileName(input.sourceName || "projet.zip");
  const targetUri = `${directory}${sourceName}`;
  await FileSystem.copyAsync({ from: input.sourceUri, to: targetUri });

  let iconName: string | undefined;
  let iconUri: string | undefined;
  if (input.iconUri) {
    iconName = sanitizeFileName(input.iconName || "icone-personnalisee.png");
    iconUri = `${directory}icone-${iconName}`;
    await FileSystem.copyAsync({ from: input.iconUri, to: iconUri });
  }

  const now = new Date().toISOString();
  const job: BuildJob = {
    id,
    projectName: input.projectName.trim(),
    projectType: input.projectType,
    sourceName,
    sourceSize: input.sourceSize ?? null,
    sourceUri: targetUri,
    iconName,
    iconSize: iconUri ? input.iconSize ?? null : undefined,
    iconUri,
    packageName: identity.packageName,
    appVersion: identity.appVersion,
    versionCode: identity.versionCode,
    buildMode: input.buildMode ?? "debug",
    artifactType: getBuildArtifactType(input.buildMode ?? "debug"),
    status: "ready",
    progress: 0,
    events: [],
    createdAt: now,
    updatedAt: now,
    message: "Archive enregistrée sur cet appareil. Prête pour l’envoi sécurisé.",
  };

  const jobs = await readJobs();
  await writeJobs([job, ...jobs]);
  return job;
}

export async function submitBuildJob(job: BuildJob) {
  await updateJob(job.id, {
    status: "queued",
    message: "Envoi sécurisé du ZIP vers le moteur de compilation…",
    progress: 2,
    events: [{ progress: 2, message: "Envoi sécurisé du ZIP vers le moteur de compilation…", createdAt: new Date().toISOString() }],
  });

  try {
    const url = buildApiUrl("/api/builds/submit");
    let responseBody = "";
    let statusCode = 0;
    const iconBase64 = job.iconUri
      ? await FileSystem.readAsStringAsync(job.iconUri, { encoding: FileSystem.EncodingType.Base64 })
      : undefined;

    if (Platform.OS === "web") {
      const sourceResponse = await fetch(job.sourceUri);
      if (!sourceResponse.ok) throw new Error("Le ZIP enregistré sur cet appareil ne peut pas être lu.");
      const archive = await sourceResponse.blob();
      const formData = new FormData();
      formData.append("source", archive, job.sourceName);
      if (iconBase64) formData.append("iconBase64", iconBase64);
      const response = await fetch(url, { method: "POST", headers: buildHeaders(job), body: formData });
      statusCode = response.status;
      responseBody = await response.text();
    } else {
      const response = await FileSystem.uploadAsync(url, job.sourceUri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "source",
        parameters: iconBase64 ? { iconBase64 } : undefined,
        headers: buildHeaders(job),
      });
      statusCode = response.status;
      responseBody = response.body;
    }

    const payload = responseBody
      ? readBuildResponse(responseBody, statusCode) as {
        message?: string;
        apkUrl?: string;
        aabUrl?: string;
        artifactUrl?: string;
        artifactType?: BuildArtifactType;
        buildMode?: BuildMode;
        keyBackupUrl?: string;
        keyBackupAvailable?: boolean;
        remainingBuilds?: number;
        maxBuildsPerHour?: number;
        progress?: number;
        events?: unknown;
      }
      : {};
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(payload.message || "L’envoi n’a pas pu être terminé.");
    }

    if ((payload.buildMode === "signed" || payload.buildMode === "aab") && payload.keyBackupUrl) {
      await savePrivateKeyBackupUrl(job.id, payload.keyBackupUrl);
    }
    saveBuildQuota(payload.remainingBuilds, payload.maxBuildsPerHour);
    const buildMode = payload.buildMode ?? job.buildMode;
    const artifactType = payload.artifactType ?? getBuildArtifactType(buildMode);
    const artifactUri = payload.artifactUrl ?? payload.aabUrl ?? payload.apkUrl ?? getExpectedArtifactUrl(job.id, artifactType);

    return await updateJob(job.id, {
      status: "queued",
      message: payload.message || "Votre projet attend le démarrage de la compilation.",
      apkUri: artifactType === "apk" ? artifactUri : undefined,
      artifactUri,
      artifactType,
      buildMode,
      keyBackupAvailable: payload.keyBackupAvailable ?? false,
      progress: normalizeBuildProgress(payload.progress, 5),
      events: readBuildProgressEvents(payload.events),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "L’envoi a échoué. Vérifiez votre connexion puis réessayez.";
    await updateJob(job.id, { status: "failed", message });
    throw error;
  }
}

/**
 * Recrée un build à partir de la copie locale déjà conservée par MIA💻.
 * L’utilisateur ne doit donc pas choisir à nouveau son ZIP ou son index.html.
 */
export async function restartBuildJob(previousJob: BuildJob) {
  const sourceInfo = await FileSystem.getInfoAsync(previousJob.sourceUri);
  if (!sourceInfo.exists) {
    throw new Error("Le fichier original n’est plus disponible sur ce téléphone. Choisissez-le à nouveau pour lancer une nouvelle compilation.");
  }

  const newJob = await createLocalBuildDraft(makeRestartBuildInput(previousJob));

  await submitBuildJob(newJob);
  return newJob;
}

export async function refreshBuildJob(job: BuildJob) {
  if (job.status !== "queued" && job.status !== "building") return job;

  try {
    const response = await fetch(buildApiUrl(`/api/builds/${encodeURIComponent(job.id)}/status`));
    const payload = readBuildResponse(await response.text(), response.status) as {
      status?: BuildStatus;
      message?: string;
      apkUrl?: string;
      aabUrl?: string;
      artifactUrl?: string;
      artifactType?: BuildArtifactType;
      buildMode?: BuildMode;
      keyBackupAvailable?: boolean;
      remainingBuilds?: number;
      maxBuildsPerHour?: number;
      progress?: number;
      events?: unknown;
    };
    const unavailableMessage = getUnavailableBuildMessage(response.status, payload.message);
    if (unavailableMessage) {
      const artifactUri = await findPublishedArtifact(job);
      if (artifactUri) {
        const artifactType = job.artifactType ?? getBuildArtifactType(job.buildMode);
        return await updateJob(job.id, {
          status: "complete",
          apkUri: artifactType === "apk" ? artifactUri : undefined,
          artifactUri,
          artifactType,
          message: artifactType === "aab" ? "Votre fichier AAB est prêt à être téléchargé." : "Votre APK est prête à être téléchargée.",
        });
      }
      return await updateJob(job.id, { status: "failed", message: unavailableMessage });
    }
    if (!response.ok || !payload.status) {
      throw new Error(payload.message || "Le statut est indisponible.");
    }
    saveBuildQuota(payload.remainingBuilds, payload.maxBuildsPerHour);
    const buildMode = payload.buildMode ?? job.buildMode;
    const artifactType = payload.artifactType ?? job.artifactType ?? getBuildArtifactType(buildMode);
    const artifactUri = payload.artifactUrl ?? payload.aabUrl ?? payload.apkUrl ?? job.artifactUri ?? job.apkUri ?? getExpectedArtifactUrl(job.id, artifactType);
    return await updateJob(job.id, {
      status: payload.status,
      message: payload.message || job.message,
      apkUri: artifactType === "apk" ? artifactUri : undefined,
      artifactUri,
      artifactType,
      buildMode,
      keyBackupAvailable: payload.keyBackupAvailable ?? job.keyBackupAvailable ?? false,
      progress: normalizeBuildProgress(payload.progress, job.progress ?? 0),
      events: readBuildProgressEvents(payload.events),
    });
  } catch {
    // A short network issue must not turn a real build into a permanent failure.
    return job;
  }
}

export function getProjectType(type: ProjectType) {
  return PROJECT_TYPES.find((item) => item.id === type) ?? PROJECT_TYPES[0];
}

export function formatBytes(size: number | null | undefined) {
  if (!size || size <= 0) return "Taille inconnue";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}
