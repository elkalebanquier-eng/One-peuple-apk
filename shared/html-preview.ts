const MAX_PREVIEW_HTML_BYTES = 512 * 1024;

export type LocalHtmlPreview = {
  /** Texte sélectionné, utilisé uniquement pour l’aperçu local ou, après confirmation, la revue MIA. */
  code: string;
  html: string;
  title: string;
  hasUnloadedZipResources: boolean;
};

function isEmbeddedPreviewUrl(value: string) {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized.startsWith("#") || normalized.startsWith("data:") || normalized.startsWith("blob:");
}

/** Refuse toute navigation hors du document HTML injecté dans la WebView. */
export function isAllowedPreviewRequest(url: string) {
  const normalized = url.trim().toLowerCase();
  return normalized === "about:blank" || normalized.startsWith("data:text/html");
}

/** Prépare le HTML pour un aperçu isolé, sans ressources réseau ou fichiers locaux. */
export function createIsolatedPreviewHtml(html: string) {
  const blockedExternalAttributes = html.replace(
    /\s(src|href|action|poster)\s*=\s*(["'])([^"']*)\2/gi,
    (whole, attribute: string, quote: string, value: string) => isEmbeddedPreviewUrl(value)
      ? whole
      : ` data-mia-blocked-${attribute}=${quote}${value}${quote}`,
  );
  const withoutBaseOrRefresh = blockedExternalAttributes
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv\s*=\s*(["'])?refresh\1?[^>]*>/gi, "")
    .replace(/<script\b[^>]*\bsrc\s*=\s*[^>]*>[\s\S]*?<\/script>/gi, "");
  const policy = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
  const securityMeta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;

  if (/<head\b[^>]*>/i.test(withoutBaseOrRefresh)) {
    return withoutBaseOrRefresh.replace(/<head\b[^>]*>/i, (head) => `${head}${securityMeta}`);
  }

  return `<!doctype html><html><head><meta charset="utf-8">${securityMeta}</head><body>${withoutBaseOrRefresh}</body></html>`;
}

export function getPreviewTitle(html: string) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return title || "Aperçu HTML local";
}

export function createLocalHtmlPreview(html: string, hasUnloadedZipResources = false): LocalHtmlPreview {
  if (!html.trim()) throw new Error("Le fichier index.html est vide.");
  if (new TextEncoder().encode(html).byteLength > MAX_PREVIEW_HTML_BYTES) {
    throw new Error("index.html est trop grand pour un aperçu local. Vous pouvez tout de même le compiler.");
  }
  return { code: html, html: createIsolatedPreviewHtml(html), title: getPreviewTitle(html), hasUnloadedZipResources };
}

export { MAX_PREVIEW_HTML_BYTES };
