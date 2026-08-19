import { describe, expect, it } from "vitest";

describe("Gemini server credential", () => {
  it("accepts a lightweight KIA request without exposing the key", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey ?? "")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Réponds uniquement : OK" }] }],
          generationConfig: { maxOutputTokens: 8, temperature: 0 },
        }),
      },
    );

    expect(response.ok).toBe(true);
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    expect(payload.candidates?.[0]?.content?.parts?.[0]?.text).toContain("OK");
  }, 20_000);
});
