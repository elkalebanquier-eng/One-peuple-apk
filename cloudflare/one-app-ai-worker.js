const MAX_REQUESTS_PER_HOUR = 20;
const MAX_PROMPT_LENGTH = 3500;
const MAX_CONTEXT_LENGTH = 7000;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
// Modèle testé avec succès sur le compte Cloudflare de One App.
const MODEL = "@cf/meta/llama-3.1-8b-fast-v2";

const recentRequests = new Map();

function responseHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders() });
}

function readText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function consumeRequest(request) {
  const clientId = readText(request.headers.get("x-one-app-client"), 100);
  const ip = readText(request.headers.get("cf-connecting-ip"), 100);
  const key = clientId.length >= 12 ? clientId : ip || "anonymous";
  const now = Date.now();
  const requests = (recentRequests.get(key) ?? []).filter((timestamp) => now - timestamp < REQUEST_WINDOW_MS);

  if (requests.length >= MAX_REQUESTS_PER_HOUR) return false;

  requests.push(now);
  recentRequests.set(key, requests);
  return true;
}

function projectInstructions(projectType) {
  if (projectType === "expo") {
    return "Retourne le contenu complet d’un fichier App.tsx React Native/Expo. Utilise uniquement des composants React Native et aucun WebView. Le code doit pouvoir être collé dans un projet Expo existant.";
  }

  if (projectType === "android") {
    return "Retourne un exemple complet et cohérent de code Android natif Kotlin, prêt à être placé dans le projet existant. Indique clairement le nom de fichier concerné dans l’explication.";
  }

  return "Retourne le contenu complet d’un fichier index.html autonome, avec le CSS et le JavaScript nécessaires dans ce même fichier. N’utilise ni WebView ni serveur externe obligatoire.";
}

function removeCodeFence(value) {
  const match = value.match(/```(?:html|tsx|jsx|kotlin|xml|java|json)?\s*([\s\S]*?)```/i);
  return (match?.[1] ?? value).trim();
}

function decodeGeneratedObject(value, depth = 0) {
  if (depth > 3) return null;

  if (typeof value === "string") {
    const cleaned = removeCodeFence(value);
    try {
      return decodeGeneratedObject(JSON.parse(cleaned), depth + 1);
    } catch {
      const objectCandidate = cleaned.match(/\{[\s\S]*\}/)?.[0];
      if (!objectCandidate) return null;
      try {
        return decodeGeneratedObject(JSON.parse(objectCandidate), depth + 1);
      } catch {
        return null;
      }
    }
  }

  if (typeof value?.code !== "string" || !value.code.trim()) return null;
  const nested = decodeGeneratedObject(value.code, depth + 1);
  return nested ?? {
    code: value.code.trim(),
    explanation: typeof value.explanation === "string" && value.explanation.trim()
      ? value.explanation.trim().slice(0, 900)
      : "Le code a été préparé pour votre projet.",
  };
}

function formatGeneratedResponse(raw, projectType) {
  const decoded = decodeGeneratedObject(raw);
  if (decoded) return decoded;

  const typeName = projectType === "html" ? "HTML" : projectType === "expo" ? "Expo" : "Android";
  return {
    code: removeCodeFence(raw),
    explanation: `Voici le code ${typeName} généré. Relisez-le avant de l’utiliser dans votre projet.`,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/api/code") {
      return json({ message: "Cette adresse est réservée à l’assistant de code One App." }, 404);
    }

    if (!consumeRequest(request)) {
      return json({ message: "Vous avez beaucoup utilisé l’assistant. Attendez une heure puis réessayez." }, 429);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ message: "La demande n’est pas lisible. Réessayez." }, 400);
    }

    const prompt = readText(payload?.prompt, MAX_PROMPT_LENGTH);
    const context = readText(payload?.context, MAX_CONTEXT_LENGTH);
    const projectType = payload?.projectType;
    if (!prompt) return json({ message: "Décrivez ce que vous voulez créer ou corriger." }, 400);
    if (projectType !== "html" && projectType !== "expo" && projectType !== "android") {
      return json({ message: "Choisissez le type de projet avant de demander du code." }, 400);
    }

    const contextSection = context
      ? `\n\nCode existant à améliorer ou corriger :\n---\n${context}\n---`
      : "";
    const systemPrompt = [
      "Tu es One App Code, un assistant qui écrit du code directement utilisable par des débutants.",
      "Réponds en français, sans WebView et sans demander de clé, carte bancaire ou installation d’outil.",
      projectInstructions(projectType),
      "Réponds uniquement par le code final, sans phrase avant ou après, sans Markdown, sans bloc ``` et sans objet JSON.",
      "Commence directement par le code du fichier demandé. L’application expliquera ensuite comment l’utiliser.",
    ].join(" ");

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${prompt}${contextSection}` },
        ],
        max_tokens: 1800,
        temperature: 0.15,
      });

      const raw = typeof result?.response === "string"
        ? result.response
        : typeof result?.choices?.[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "";
      if (!raw.trim()) throw new Error("Réponse IA vide");

      return json(formatGeneratedResponse(raw, projectType));
    } catch (error) {
      console.error("One App AI error", error);
      return json({ message: "L’assistant ne répond pas pour le moment. Réessayez dans quelques instants." }, 503);
    }
  },
};
