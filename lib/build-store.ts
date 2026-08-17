import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import { getUnavailableBuildMessage, readBuildResponse } from "@/lib/build-response";
import { makeRestartBuildInput } from "@/lib/restart-build";

export type ProjectType = "expo" | "android" | "html";
export type BuildStatus = "draft" | "ready" | "queued" | "building" | "complete" | "failed";

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
  status: BuildStatus;
  createdAt: string;
  updatedAt: string;
  message?: string;
  apkUri?: string;
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
let cache: BuildJob[] | null = null;

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

async function updateJob(id: string, patch: Partial<BuildJob>) {
  const jobs = await readJobs();
  const updated = jobs.map((job) => job.id === id
    ? { ...job, ...patch, updatedAt: new Date().toISOString() }
    : job);
  await writeJobs(updated);
  return updated.find((job) => job.id === id);
}

function buildApiUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Le service de compilation n’est pas encore prêt. Réessayez après la publication de One App.");
  }
  return `${baseUrl}${path}`;
}

function buildHeaders(job: BuildJob) {
  return {
    "x-one-app-build-id": encodeURIComponent(job.id),
    "x-one-app-project-type": encodeURIComponent(job.projectType),
    "x-one-app-project-name": encodeURIComponent(job.projectName),
    "x-one-app-source-name": encodeURIComponent(job.sourceName),
  };
}

export async function loadBuildJobs() {
  return [...(await readJobs())].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function subscribeToBuildJobs(listener: (jobs: BuildJob[]) => void) {
  listeners.add(listener);
  void loadBuildJobs().then(listener);
  return () => {
    listeners.delete(listener);
  };
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
}) {
  if (!FileSystem.documentDirectory) {
    throw new Error("Le stockage privé de l’application est indisponible.");
  }

  const id = makeId();
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
    status: "ready",
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

    const payload = responseBody ? JSON.parse(responseBody) as { message?: string; apkUrl?: string } : {};
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(payload.message || "L’envoi n’a pas pu être terminé.");
    }

    return await updateJob(job.id, {
      status: "queued",
      message: payload.message || "Votre projet attend le démarrage de la compilation.",
      apkUri: payload.apkUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "L’envoi a échoué. Vérifiez votre connexion puis réessayez.";
    await updateJob(job.id, { status: "failed", message });
    throw error;
  }
}

/**
 * Recrée un build à partir de la copie locale déjà conservée par One App.
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
    const payload = readBuildResponse(await response.text(), response.status) as { status?: BuildStatus; message?: string; apkUrl?: string };
    const unavailableMessage = getUnavailableBuildMessage(response.status, payload.message);
    if (unavailableMessage) {
      return await updateJob(job.id, { status: "failed", message: unavailableMessage });
    }
    if (!response.ok || !payload.status) {
      throw new Error(payload.message || "Le statut est indisponible.");
    }
    return await updateJob(job.id, {
      status: payload.status,
      message: payload.message || job.message,
      apkUri: payload.apkUrl || job.apkUri,
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
