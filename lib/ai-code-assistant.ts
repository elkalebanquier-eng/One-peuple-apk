import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { type ProjectType } from "@/lib/build-store";
import { prepareDirectHtmlSource, type PreparedHtmlSource } from "@/lib/html-direct-import";
import {
  addAiCodeHistoryEntry,
  getAiFailureMessage,
  readAiCodeHistory,
  readAiCodeResponse,
  removeAiCodeHistoryEntry,
  type AiCodeHistoryEntry,
  type AiCodeResponse,
} from "@/shared/ai-code";
import {
  readMiaChatResponse,
  readMiaConversations,
  removeMiaConversation,
  upsertMiaConversation,
  type MiaChatResponse,
  type MiaConversation,
  type MiaMessage,
} from "@/shared/mia-chat";

const ASSISTANT_URL = "https://one-app-ai.oneapp-kikokalok.workers.dev/api/code";
const ASSISTANT_CLIENT_KEY = "one-app-ai-client-v1";
const ASSISTANT_DRAFT_KEY = "one-app-ai-draft-v1";
const ASSISTANT_HISTORY_KEY = "one-app-ai-history-v1";
const MIA_CONVERSATIONS_KEY = "one-app-mia-conversations-v1";

export type AiCodeDraft = AiCodeResponse & {
  projectType: ProjectType;
  projectName: string;
  prompt: string;
  createdAt: string;
};

export type NewAiHistoryEntry = Omit<AiCodeHistoryEntry, "id">;

export type MiaChatInput = {
  message: string;
  projectType: ProjectType;
  history: MiaMessage[];
};

async function getAssistantClientId() {
  const saved = await AsyncStorage.getItem(ASSISTANT_CLIENT_KEY);
  if (saved) return saved;

  const clientId = `one-app-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(ASSISTANT_CLIENT_KEY, clientId);
  return clientId;
}

/** Ancien appel unitaire maintenu pour les anciens brouillons du téléphone. */
export async function generateAssistantCode(input: {
  prompt: string;
  projectType: ProjectType;
  context?: string;
}): Promise<AiCodeResponse> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Décrivez ce que vous voulez créer ou corriger.");

  const response = await fetch(ASSISTANT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-one-app-client": await getAssistantClientId(),
    },
    body: JSON.stringify({
      mode: "code",
      prompt: prompt.slice(0, 3500),
      projectType: input.projectType,
      context: input.context?.trim().slice(0, 7000) || undefined,
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(getAiFailureMessage(text, response.status));

  const payload = readAiCodeResponse(text);
  if (!payload) throw new Error("Le code reçu est incomplet. Réessayez avec une demande plus simple.");
  return payload;
}

/** Envoie uniquement le contexte récent de la discussion ; les conversations complètes restent sur le téléphone. */
export async function sendMiaMessage(input: MiaChatInput): Promise<MiaChatResponse> {
  const message = input.message.trim();
  if (!message) throw new Error("Écrivez un message pour MIA.");

  const response = await fetch(ASSISTANT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-one-app-client": await getAssistantClientId(),
    },
    body: JSON.stringify({
      mode: "chat",
      message: message.slice(0, 3500),
      projectType: input.projectType,
      history: input.history.slice(-8).map((entry) => ({
        role: entry.role,
        content: entry.content.slice(0, 1400),
      })),
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(getAiFailureMessage(text, response.status));

  const payload = readMiaChatResponse(text);
  if (!payload) throw new Error("MIA a envoyé une réponse incomplète. Réessayez avec un message plus simple.");
  return payload;
}

export async function saveAssistantDraft(draft: AiCodeDraft) {
  await AsyncStorage.setItem(ASSISTANT_DRAFT_KEY, JSON.stringify(draft));
}

/** Historique de l’ancien format : il reste lisible, mais les nouvelles discussions utilisent MIA. */
export async function loadAssistantHistory(): Promise<AiCodeHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(ASSISTANT_HISTORY_KEY);
  if (!raw) return [];
  try {
    return readAiCodeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveAssistantHistory(entry: NewAiHistoryEntry): Promise<AiCodeHistoryEntry[]> {
  const current = await loadAssistantHistory();
  const next = addAiCodeHistoryEntry(current, {
    ...entry,
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  });
  await AsyncStorage.setItem(ASSISTANT_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function deleteAssistantHistoryEntry(id: string): Promise<AiCodeHistoryEntry[]> {
  const current = await loadAssistantHistory();
  const next = removeAiCodeHistoryEntry(current, id);
  await AsyncStorage.setItem(ASSISTANT_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function loadMiaConversations(): Promise<MiaConversation[]> {
  const raw = await AsyncStorage.getItem(MIA_CONVERSATIONS_KEY);
  if (!raw) return [];
  try {
    return readMiaConversations(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveMiaConversation(conversation: MiaConversation): Promise<MiaConversation[]> {
  const current = await loadMiaConversations();
  const next = upsertMiaConversation(current, conversation);
  await AsyncStorage.setItem(MIA_CONVERSATIONS_KEY, JSON.stringify(next));
  return next;
}

export async function deleteMiaConversation(id: string): Promise<MiaConversation[]> {
  const current = await loadMiaConversations();
  const next = removeMiaConversation(current, id);
  await AsyncStorage.setItem(MIA_CONVERSATIONS_KEY, JSON.stringify(next));
  return next;
}

export async function takeAssistantDraft(): Promise<AiCodeDraft | null> {
  const raw = await AsyncStorage.getItem(ASSISTANT_DRAFT_KEY);
  await AsyncStorage.removeItem(ASSISTANT_DRAFT_KEY);
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw) as Partial<AiCodeDraft>;
    if (typeof draft.code !== "string" || !draft.code.trim() || draft.projectType !== "html") return null;
    return {
      code: draft.code,
      explanation: typeof draft.explanation === "string" ? draft.explanation : "",
      projectType: "html",
      projectName: typeof draft.projectName === "string" && draft.projectName.trim() ? draft.projectName : "Mon application MIA",
      prompt: typeof draft.prompt === "string" ? draft.prompt : "",
      createdAt: typeof draft.createdAt === "string" ? draft.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Crée un index.html temporaire puis réutilise le ZIP HTML standard de One App. */
export async function prepareAssistantHtmlSource(code: string): Promise<PreparedHtmlSource> {
  if (!FileSystem.cacheDirectory) throw new Error("Le stockage temporaire du téléphone est indisponible.");

  const directory = `${FileSystem.cacheDirectory}one-app-ai/`;
  const htmlUri = `${directory}index-${Date.now()}.html`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.writeAsStringAsync(htmlUri, code, { encoding: FileSystem.EncodingType.UTF8 });
  const info = await FileSystem.getInfoAsync(htmlUri);
  if (!info.exists || typeof info.size !== "number" || info.size === 0) {
    throw new Error("Le fichier HTML généré n’a pas pu être préparé.");
  }

  return prepareDirectHtmlSource({
    name: "index.html",
    size: info.size,
    uri: htmlUri,
  } as Parameters<typeof prepareDirectHtmlSource>[0]);
}
