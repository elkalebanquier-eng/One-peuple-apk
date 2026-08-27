import type { AiCodeProjectType } from "@/shared/ai-code";

export const MIA_REVIEW_CODE_LIMIT = 60_000;
export const MIA_REVIEW_ITEM_LIMIT = 4;

export type MiaReviewSeverity = "blocker" | "warning";

export type MiaReviewItem = {
  severity: MiaReviewSeverity;
  title: string;
  detail: string;
  line?: number;
};

export type MiaCodeReview = {
  summary: string;
  blockers: MiaReviewItem[];
  warnings: MiaReviewItem[];
  fixes: string[];
  /** Fichier complet facultatif, proposé par MIA mais jamais appliqué automatiquement. */
  suggestedCode?: string;
  suggestedCodeSummary?: string;
};

export type MiaCodeReviewRequest = {
  code: string;
  projectType: AiCodeProjectType;
};

function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readItem(value: unknown, expectedSeverity: MiaReviewSeverity): MiaReviewItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<MiaReviewItem>;
  const title = readText(item.title, 120);
  const detail = readText(item.detail, 420);
  if (!title || !detail) return null;
  return {
    severity: expectedSeverity,
    title,
    detail,
    line: typeof item.line === "number" && Number.isInteger(item.line) && item.line > 0 && item.line < 100_000 ? item.line : undefined,
  };
}

function readItems(value: unknown, severity: MiaReviewSeverity) {
  return Array.isArray(value)
    ? value.map((item) => readItem(item, severity)).filter((item): item is MiaReviewItem => Boolean(item)).slice(0, MIA_REVIEW_ITEM_LIMIT)
    : [];
}

function readFixes(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => readText(item, 240)).filter(Boolean).slice(0, MIA_REVIEW_ITEM_LIMIT)
    : [];
}

export function normalizeMiaCodeReviewRequest(value: MiaCodeReviewRequest): MiaCodeReviewRequest | null {
  const code = readText(value.code, MIA_REVIEW_CODE_LIMIT);
  if (!code || !["html", "expo", "android"].includes(value.projectType)) return null;
  return { code, projectType: value.projectType };
}

export function readMiaCodeReview(text: string): MiaCodeReview | null {
  try {
    const payload = JSON.parse(text) as Partial<MiaCodeReview>;
    const summary = readText(payload.summary, 700);
    if (!summary) return null;
    return {
      summary,
      blockers: readItems(payload.blockers, "blocker"),
      warnings: readItems(payload.warnings, "warning"),
      fixes: readFixes(payload.fixes),
      ...(readText(payload.suggestedCode, 120000) ? {
        suggestedCode: readText(payload.suggestedCode, 120000),
        suggestedCodeSummary: readText(payload.suggestedCodeSummary, 240) || "MIA propose ce fichier à relire avant toute utilisation.",
      } : {}),
    };
  } catch {
    return null;
  }
}
