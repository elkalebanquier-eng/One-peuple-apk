import { describe, expect, it } from "vitest";

import {
  createMiaPreview,
  readMiaChatResponse,
  readMiaConversations,
  removeMiaConversation,
  upsertMiaConversation,
  type MiaConversation,
} from "../shared/mia-chat";

const firstConversation: MiaConversation = {
  id: "first",
  provider: "mia",
  title: "Créer une page",
  projectType: "html",
  createdAt: "2026-08-19T08:00:00.000Z",
  updatedAt: "2026-08-19T08:01:00.000Z",
  messages: [
    { id: "first-user", role: "user", content: "Crée une page", createdAt: "2026-08-19T08:00:00.000Z" },
    { id: "first-mia", role: "assistant", content: "Voici une page.", code: "<h1>Bonjour</h1>", createdAt: "2026-08-19T08:01:00.000Z" },
  ],
};

describe("conversation MIA", () => {
  it("lit une réponse naturelle, son code et ses vérifications", () => {
    expect(readMiaChatResponse(JSON.stringify({
      message: "Voici le fichier demandé.",
      code: "  <main>Bonjour</main>  ",
      checklist: ["Tester le bouton", "Relire le titre", "", 12, "Vérifier sur téléphone"],
    }))).toEqual({
      message: "Voici le fichier demandé.",
      code: "<main>Bonjour</main>",
      checklist: ["Tester le bouton", "Relire le titre", "Vérifier sur téléphone"],
    });
  });

  it("refuse une réponse conversationnelle vide ou illisible", () => {
    expect(readMiaChatResponse('{"code":"<h1>Sans message</h1>"}')).toBeNull();
    expect(readMiaChatResponse("réponse non JSON")).toBeNull();
  });

  it("garde les discussions locales valides, récentes et triées", () => {
    const conversations = readMiaConversations([
      firstConversation,
      { ...firstConversation, id: "invalid", messages: [] },
      {
        ...firstConversation,
        id: "new",
        title: "Corriger mon projet",
        updatedAt: "2026-08-19T09:00:00.000Z",
      },
    ]);

    expect(conversations.map((conversation) => conversation.id)).toEqual(["new", "first"]);
  });

  it("conserve le fournisseur de chaque assistant pour séparer MIA et KIA", () => {
    const kiaConversation: MiaConversation = {
      ...firstConversation,
      id: "kia",
      provider: "kia",
      title: "KIA corrige mon code",
    };

    expect(readMiaConversations([firstConversation, kiaConversation]).map((conversation) => conversation.provider)).toEqual(["mia", "kia"]);
  });

  it("conserve un brief logo local sans image tant que l’utilisateur ne confirme pas la création", () => {
    const withLogoRequest: MiaConversation = {
      ...firstConversation,
      id: "logo-request",
      messages: [{
        id: "logo-brief",
        role: "assistant",
        content: "Décrivez le logo ici.",
        createdAt: "2026-08-19T08:02:00.000Z",
        logo: {
          kind: "request",
          appName: "Mon application",
          description: "Un symbole simple et lisible.",
          primaryColor: "#d4af37",
          secondaryColor: "#0a0a0f",
        },
      }],
    };

    const message = readMiaConversations([withLogoRequest])[0]?.messages[0];
    expect(message?.logo).toEqual({
      kind: "request",
      appName: "Mon application",
      description: "Un symbole simple et lisible.",
      primaryColor: "#D4AF37",
      secondaryColor: "#0A0A0F",
    });
    expect(message?.logo?.uri).toBeUndefined();
  });

  it("conserve uniquement un résultat logo IA local complet et rejette les sources inconnues", () => {
    const valid: MiaConversation = {
      ...firstConversation,
      id: "logo-result",
      messages: [{
        id: "logo-image",
        role: "assistant",
        content: "Voici votre logo.",
        createdAt: "2026-08-19T08:03:00.000Z",
        logo: {
          kind: "result",
          appName: "Mon application",
          description: "Un symbole simple et lisible.",
          uri: "file:///data/user/0/app/files/mia-logo.png",
          name: "mia-logo.png",
          size: 12345,
          source: "cloudflare-ai",
        },
      }],
    };
    const unsafe: MiaConversation = {
      ...valid,
      id: "unsafe-logo-result",
      messages: [{ ...valid.messages[0]!, logo: { ...valid.messages[0]!.logo!, source: "other" as "cloudflare-ai" } }],
    };

    expect(readMiaConversations([valid])[0]?.messages[0]?.logo?.source).toBe("cloudflare-ai");
    expect(readMiaConversations([unsafe])[0]?.messages[0]?.logo).toBeUndefined();
  });

  it("place une discussion mise à jour en tête sans en créer un doublon", () => {
    const changed = {
      ...firstConversation,
      updatedAt: "2026-08-19T10:00:00.000Z",
      messages: [...firstConversation.messages, { id: "next", role: "user" as const, content: "Merci", createdAt: "2026-08-19T10:00:00.000Z" }],
    };
    const next = upsertMiaConversation([firstConversation], changed);

    expect(next).toHaveLength(1);
    expect(next[0]?.messages).toHaveLength(3);
    expect(next[0]?.updatedAt).toBe("2026-08-19T10:00:00.000Z");
  });

  it("supprime uniquement la discussion choisie", () => {
    const other = { ...firstConversation, id: "keep", title: "À garder" };
    expect(removeMiaConversation([firstConversation, other], "first").map((conversation) => conversation.id)).toEqual(["keep"]);
  });

  it("prépare un aperçu de code borné pour un écran de téléphone", () => {
    expect(createMiaPreview("une\r\ndeux\rtrois\nquatre", 3)).toEqual({
      lines: ["une", "deux", "trois"],
      totalLines: 4,
      isTruncated: true,
    });
  });
});
