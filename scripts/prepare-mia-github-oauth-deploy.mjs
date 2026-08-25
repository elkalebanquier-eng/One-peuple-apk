import { readFile, writeFile } from "node:fs/promises";

const workerPath = "/home/ubuntu/kiko-native-app/cloudflare/mia-github-oauth.js";
const outputPath = "/home/ubuntu/kiko-native-app/.mia-github-oauth-deploy-input.json";
const stateNamespaceId = "a48b5b11197e4a53ac3befdf108dcd09";
const workerCode = await readFile(workerPath, "utf8");
const metadata = {
  main_module: "mia-github-oauth.js",
  compatibility_date: "2026-08-25",
  bindings: [{ type: "kv_namespace", name: "OAUTH_STATES", namespace_id: stateNamespaceId }],
};
const boundary = `----miaGithubOauth${Date.now()}`;
const body = [
  `--${boundary}`,
  'Content-Disposition: form-data; name="metadata"',
  "Content-Type: application/json",
  "",
  JSON.stringify(metadata),
  `--${boundary}`,
  'Content-Disposition: form-data; name="mia-github-oauth.js"; filename="mia-github-oauth.js"',
  "Content-Type: application/javascript+module",
  "",
  workerCode,
  `--${boundary}--`,
  "",
].join("\r\n");
const code = `async () => cloudflare.request({ method: "PUT", path: \`/accounts/\${accountId}/workers/scripts/mia-github-oauth\`, body: ${JSON.stringify(body)}, contentType: ${JSON.stringify(`multipart/form-data; boundary=${boundary}`)}, rawBody: true })`;

await writeFile(outputPath, JSON.stringify({ code }), { mode: 0o600 });
console.log(outputPath);
