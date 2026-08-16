import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

export type ProjectType = "expo" | "android" | "html";
export type BuildStatus = "draft" | "ready" | "queued" | "building" | "complete" | "failed";

export interface BuildJob {
  id: string;
  projectName: string;
  projectType: ProjectType;
  sourceName: string;
  sourceSize: number | null;
  sourceUri: string;
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

  const now = new Date().toISOString();
  const job: BuildJob = {
    id,
    projectName: input.projectName.trim(),
    projectType: input.projectType,
    sourceName,
    sourceSize: input.sourceSize ?? null,
    sourceUri: targetUri,
    status: "ready",
    createdAt: now,
    updatedAt: now,
    message: "Archive enregistrée sur cet appareil. Prête pour l’envoi sécurisé.",
  };

  const jobs = await readJobs();
  await writeJobs([job, ...jobs]);
  return job;
}

export function getProjectType(type: ProjectType) {
  return PROJECT_TYPES.find((item) => item.id === type) ?? PROJECT_TYPES[0];
}

export function formatBytes(size: number | null | undefined) {
  if (!size || size <= 0) return "Taille inconnue";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}
