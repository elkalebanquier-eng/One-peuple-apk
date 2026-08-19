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
