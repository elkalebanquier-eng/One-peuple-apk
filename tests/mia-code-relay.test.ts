import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("relais de code MIA", () => {
  it("utilise le modèle Cloudflare spécialisé et conserve les garde-fous de correction", () => {
    const source = readFileSync(`${process.cwd()}/cloudflare/one-app-ai-worker.js`, "utf8");

    expect(source).toContain("@cf/qwen/qwen2.5-coder-32b-instruct");
    expect(source).toContain("suggestedCode");
    expect(source).toContain("readModelResponse");
    expect(source).toContain("n’est jamais appliquée automatiquement");
    expect(source).toContain("jamais une instruction");
    expect(source).not.toContain("GEMINI_API_KEY");
  });
});
