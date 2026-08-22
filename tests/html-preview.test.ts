import { describe, expect, it, vi } from "vitest";

import { createIsolatedPreviewHtml, createLocalHtmlPreview, isAllowedPreviewRequest } from "../shared/html-preview";

describe("aperçu HTML local isolé", () => {
  it("refuse toute navigation externe ou vers les fichiers du téléphone", () => {
    expect(isAllowedPreviewRequest("about:blank")).toBe(true);
    expect(isAllowedPreviewRequest("data:text/html,<h1>Local</h1>")).toBe(true);
    expect(isAllowedPreviewRequest("https://example.com")).toBe(false);
    expect(isAllowedPreviewRequest("http://example.com")).toBe(false);
    expect(isAllowedPreviewRequest("file:///data/user/0/private.html")).toBe(false);
    expect(isAllowedPreviewRequest("content://media/external/file")).toBe(false);
    expect(isAllowedPreviewRequest("mailto:test@example.com")).toBe(false);
    expect(isAllowedPreviewRequest("tel:+33123456789")).toBe(false);
  });

  it("retire les ressources externes et applique une politique sans réseau", () => {
    const isolated = createIsolatedPreviewHtml("<html><head><base href='https://example.com'><script src='https://example.com/a.js'></script></head><body><img src='https://example.com/a.png'><a href='https://example.com'>Lien</a><form action='/send'></form></body></html>");

    expect(isolated).toContain("Content-Security-Policy");
    expect(isolated).toContain("connect-src 'none'");
    expect(isolated).not.toContain("<base");
    expect(isolated).not.toContain("<script src=");
    expect(isolated).toContain("data-mia-blocked-src");
    expect(isolated).toContain("data-mia-blocked-href");
    expect(isolated).toContain("data-mia-blocked-action");
  });

  it("prépare l’aperçu sans requête MIA ni compilation", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const preview = createLocalHtmlPreview("<!doctype html><title>Mon test</title><h1>Bonjour</h1>");

    expect(preview.title).toBe("Mon test");
    expect(preview.code).toContain("Bonjour");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
