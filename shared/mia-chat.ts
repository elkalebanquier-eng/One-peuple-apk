import type { AiCodeProjectType } from "@/shared/ai-code";

export const MIA_CONVERSATION_LIMIT = 10;
export const MIA_MESSAGES_PER_CONVERSATION_LIMIT = 30;
export const MIA_MESSAGE_CONTENT_LIMIT = 8_000;

export const MIA_PROVIDERS = ["mia", "kia"] as const;
export type MiaProvider = (typeof MIA_PROVIDERS)[number];
export type MiaMessageRole = "user" | "assistant";

export type MiaMessage = {
  id: string;
  role: MiaMessageRole;
  content: string;
  createdAt: string;
  code?: string;
  checklist?: string[];
};

export type MiaConversation = {
  id: string;
  provider: MiaProvider;
  title: string;
  projectType: AiCodeProjectType;
  createdAt: string;
  updatedAt: string;
  messages: MiaMessage[];
};

export type MiaChatResponse = {
  message: string;
  code?: string;
  checklist?: string[];
};

export function isMiaProvider(value: unknown): value is MiaProvider {
  return value === "mia" || value === "kia";
}

function isProjectType(value: unknown): value is AiCodeProjectType {
  return value === "expo" || value === "android" || value === "html";
}

function isMessageRole(value: unknown): value is MiaMessageRole {
  return value === "user" || value === "assistant";
}

function cleanChecklist(value: unknown) {
  return Array.isArray(value)
    ? value
      .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .map((item) => item.trim().slice(0, 240))
      .slice(0, 4)
    : [];
}

export function makeMiaTitle(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 44 ? `${compact.slice(0, 44)}…` : compact || "Nouvelle discussion";
}

export function createMiaPreview(text: string, maxLines = 600) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const limit = Math.max(1, Math.floor(maxLines));
  return { lines: lines.slice(0, limit), totalLines: lines.length, isTruncated: lines.length > limit };
}

export function readMiaChatResponse(text: string): MiaChatResponse | null {
  try {
    const payload = JSON.parse(text) as Partial<MiaChatResponse>;
    const message = typeof payload.message === "string" ? payload.message.trim().slice(0, 3_000) : "";
    if (!message) return null;
    const code = typeof payload.code === "string" && payload.code.trim()
      ? payload.code.trim().slice(0, 120_000)
      : undefined;
    return { message, code, checklist: cleanChecklist(payload.checklist) };
  } catch {
    return null;
  }
}

function readMessage(value: unknown): MiaMessage | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MiaMessage>;
  if (
    typeof candidate.id !== "string" || !candidate.id.trim() ||
    !isMessageRole(candidate.role) ||
    typeof candidate.content !== "string" || !candidate.content.trim() ||
    typeof candidate.createdAt !== "string" || Number.isNaN(Date.parse(candidate.createdAt))
  ) return null;

  return {
    id: candidate.id.trim().slice(0, 90),
    role: candidate.role,
    content: candidate.content.trim().slice(0, MIA_MESSAGE_CONTENT_LIMIT),
    createdAt: candidate.createdAt,
    code: typeof candidate.code === "string" && candidate.code.trim()
      ? candidate.code.trim().slice(0, 120_000)
      : undefined,
    checklist: cleanChecklist(candidate.checklist),
  };
}

export function readMiaConversations(value: unknown): MiaConversation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): MiaConversation[] => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<MiaConversation>;
    if (
      typeof candidate.id !== "string" || !candidate.id.trim() ||
      typeof candidate.title !== "string" || !candidate.title.trim() ||
      !isProjectType(candidate.projectType) ||
      typeof candidate.createdAt !== "string" || Number.isNaN(Date.parse(candidate.createdAt)) ||
      typeof candidate.updatedAt !== "string" || Number.isNaN(Date.parse(candidate.updatedAt))
    ) return [];
    const messages = Array.isArray(candidate.messages)
      ? candidate.messages.map(readMessage).filter((message): message is MiaMessage => Boolean(message)).slice(-MIA_MESSAGES_PER_CONVERSATION_LIMIT)
      : [];
    if (!messages.length) return [];
    return [{
      id: candidate.id.trim().slice(0, 90),
      // Existing MIA conversations remain available after adding KIA.
      provider: isMiaProvider(candidate.provider) ? candidate.provider : "mia",
      title: candidate.title.trim().slice(0, 90),
      projectType: candidate.projectType,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      messages,
    }];
  }).sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)).slice(0, MIA_CONVERSATION_LIMIT);
}

export function upsertMiaConversation(conversations: MiaConversation[], conversation: MiaConversation) {
  return readMiaConversations([conversation, ...conversations.filter((existing) => existing.id !== conversation.id)]);
}

export function removeMiaConversation(conversations: MiaConversation[], id: string) {
  return readMiaConversations(conversations.filter((conversation) => conversation.id !== id));
}
