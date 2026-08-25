const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

const CALLBACK_URL = "https://mia-github-oauth.oneapp-kikokalok.workers.dev/callback";
const APP_RETURN_URI = "manusbuilder://oauth/callback";
const STATE_TTL_SECONDS = 10 * 60;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function randomValue() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function unavailable() {
  return json({ message: "La connexion GitHub est en préparation. Aucun compte n’a été relié." }, 503);
}

function appRedirect(result, state, details = "") {
  const url = new URL(APP_RETURN_URI);
  url.searchParams.set("connector", "github");
  url.searchParams.set("result", result);
  if (state) url.searchParams.set("state", state);
  if (details) url.searchParams.set("details", details.slice(0, 120));
  return Response.redirect(url.toString(), 302);
}

function configured(env) {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.OAUTH_STATES);
}

async function beginAuthorization(env) {
  if (!configured(env)) return unavailable();

  const state = randomValue();
  const verifier = randomValue() + randomValue();
  const challenge = await pkceChallenge(verifier);
  await env.OAUTH_STATES.put(`state:${state}`, JSON.stringify({ verifier, createdAt: new Date().toISOString() }), {
    expirationTtl: STATE_TTL_SECONDS,
  });

  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", CALLBACK_URL);
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("allow_signup", "true");
  return json({ authorizationUrl: url.toString() });
}

async function finishAuthorization(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const pending = state ? await env.OAUTH_STATES.get(`state:${state}`, "json") : null;
  if (!pending?.verifier) return appRedirect("failed", "", "Session expirée. Recommencez depuis MIA.");

  if (url.searchParams.get("error")) {
    await env.OAUTH_STATES.delete(`state:${state}`);
    return appRedirect("cancelled", state, "Autorisation annulée dans GitHub.");
  }

  const code = url.searchParams.get("code") || "";
  if (!code) {
    await env.OAUTH_STATES.delete(`state:${state}`);
    return appRedirect("failed", state, "Code GitHub manquant.");
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: CALLBACK_URL,
      code_verifier: pending.verifier,
    }),
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || typeof tokenPayload.access_token !== "string") {
    await env.OAUTH_STATES.delete(`state:${state}`);
    return appRedirect("failed", state, "GitHub a refusé l’autorisation.");
  }

  const userResponse = await fetch(GITHUB_USER_URL, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${tokenPayload.access_token}`,
      "user-agent": "MIA-Connectors",
    },
  });
  const user = await userResponse.json().catch(() => ({}));
  await env.OAUTH_STATES.delete(`state:${state}`);
  if (!userResponse.ok || typeof user.login !== "string") {
    return appRedirect("failed", state, "Le profil GitHub n’a pas pu être vérifié.");
  }

  // Le jeton GitHub est volontairement supprimé après la vérification du profil.
  // Le relais ne conserve que le résultat temporaire, jamais un token utilisable.
  await env.OAUTH_STATES.put(`result:${state}`, JSON.stringify({ login: user.login, avatarUrl: user.avatar_url || "" }), {
    expirationTtl: STATE_TTL_SECONDS,
  });
  return appRedirect("success", state);
}

async function readResult(request, env) {
  const state = new URL(request.url).searchParams.get("state") || "";
  if (!state) return json({ message: "Résultat manquant." }, 400);
  const result = await env.OAUTH_STATES.get(`result:${state}`, "json");
  if (!result?.login) return json({ message: "Résultat expiré. Recommencez depuis MIA." }, 404);
  await env.OAUTH_STATES.delete(`result:${state}`);
  return json({ status: "authorized", account: { login: result.login, avatarUrl: result.avatarUrl } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    if (request.method === "GET" && url.pathname === "/health") return json({ ready: configured(env) });
    if (request.method === "POST" && url.pathname === "/start") return beginAuthorization(env);
    if (request.method === "GET" && url.pathname === "/callback") return finishAuthorization(request, env);
    if (request.method === "GET" && url.pathname === "/result") return readResult(request, env);
    return json({ message: "Route inconnue." }, 404);
  },
};
