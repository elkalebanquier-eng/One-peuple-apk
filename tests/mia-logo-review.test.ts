import { describe, expect, it } from "vitest";

import {
  normalizeMiaLogoRequest,
  readMiaLogoDraft,
  readMiaLogoResponse,
} from "../shared/mia-logo";
import {
  normalizeMiaCodeReviewRequest,
  readMiaCodeReview,
} from "../shared/mia-code-review";

describe("logo et vérification MIA", () => {
  it("normalise une demande de logo et refuse une description vide", () => {
    expect(normalizeMiaLogoRequest({
      appName: "  Mon application  ",
      description: "  Un symbole simple et doré  ",
      primaryColor: "#d4af37",
      secondaryColor: "bleu",
    })).toEqual({
      appName: "Mon application",
      description: "Un symbole simple et doré",
      primaryColor: "#D4AF37",
      secondaryColor: undefined,
    });
    expect(normalizeMiaLogoRequest({ appName: "MIA", description: "" })).toBeNull();
  });

  it("lit uniquement une réponse de logo image valide et un brouillon local sûr", () => {
    expect(readMiaLogoResponse(JSON.stringify({
      imageBase64: "aGVsbG8=",
      mimeType: "image/png",
      promptSummary: "Icône carrée pour MIA",
    }))).toEqual({
      imageBase64: "aGVsbG8=",
      mimeType: "image/png",
      promptSummary: "Icône carrée pour MIA",
    });
    expect(readMiaLogoResponse('{"imageBase64":"data:image/png;base64,aGVsbG8=","mimeType":"image/png","promptSummary":"x"}')).toBeNull();
    expect(readMiaLogoDraft({
      id: "logo-1",
      appName: "MIA",
      description: "Symbole simple",
      uri: "file:///logo.png",
      name: "mia-logo.png",
      createdAt: "2026-08-19T16:00:00.000Z",
    })?.uri).toBe("file:///logo.png");
  });

  it("accepte un diagnostic court pour les trois types de projet", () => {
    for (const projectType of ["html", "expo", "android"] as const) {
      expect(normalizeMiaCodeReviewRequest({ code: "  console.log('ok');  ", projectType })).toEqual({
        code: "console.log('ok');",
        projectType,
      });
    }
    expect(normalizeMiaCodeReviewRequest({ code: "", projectType: "html" })).toBeNull();
  });

  it("sépare les blocages, avertissements et corrections du diagnostic", () => {
    expect(readMiaCodeReview(JSON.stringify({
      summary: "Un blocage est à corriger.",
      blockers: [{ title: "Dépendance manquante", detail: "Ajoutez le paquet demandé.", line: 12 }],
      warnings: [{ title: "Icône absente", detail: "Ajoutez une icône avant publication." }],
      fixes: ["Installez la dépendance."],
    }))).toEqual({
      summary: "Un blocage est à corriger.",
      blockers: [{ severity: "blocker", title: "Dépendance manquante", detail: "Ajoutez le paquet demandé.", line: 12 }],
      warnings: [{ severity: "warning", title: "Icône absente", detail: "Ajoutez une icône avant publication.", line: undefined }],
      fixes: ["Installez la dépendance."],
    });
  });

  it("garde une correction complète seulement comme proposition à relire", () => {
    const review = readMiaCodeReview(JSON.stringify({
      summary: "Une correction est proposée.",
      blockers: [],
      warnings: [],
      fixes: ["Relisez la proposition."],
      suggestedCode: "<!doctype html><html lang=\"fr\"><body><button>Bonjour</button></body></html>",
      suggestedCodeSummary: "Le bouton est conservé dans un fichier HTML complet.",
    }));

    expect(review?.suggestedCode).toContain("<!doctype html>");
    expect(review?.suggestedCodeSummary).toContain("bouton");
  });
});
