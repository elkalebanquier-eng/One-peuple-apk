import { readFile, writeFile } from "node:fs/promises";

const workerPath = new URL("../cloudflare/one-app-ai-worker.js", import.meta.url);
const payloadPath = new URL("../cloudflare/one-app-ai-worker-deploy.json", import.meta.url);
const source = await readFile(workerPath, "utf8");

const executeCode = [
  "async () => {",
  `  const source = ${JSON.stringify(source)};`,
  "  const metadata = { main_module: 'one-app-ai-worker.js', compatibility_date: '2025-01-01', bindings: [{ name: 'AI', type: 'ai' }] };",
  "  const boundary = '----oneapp-' + Date.now();",
  "  const body = [",
  "    '--' + boundary,",
  "    'Content-Disposition: form-data; name=\"metadata\"',",
  "    'Content-Type: application/json',",
  "    '',",
  "    JSON.stringify(metadata),",
  "    '--' + boundary,",
  "    'Content-Disposition: form-data; name=\"one-app-ai-worker.js\"; filename=\"one-app-ai-worker.js\"',",
  "    'Content-Type: application/javascript+module',",
  "    '',",
  "    source,",
  "    '--' + boundary + '--',",
  "    '',",
  "  ].join('\\r\\n');",
  "  return cloudflare.request({ method: 'PUT', path: '/accounts/' + accountId + '/workers/scripts/one-app-ai', body, contentType: 'multipart/form-data; boundary=' + boundary, rawBody: true });",
  "}",
].join("\n");

await writeFile(payloadPath, `${JSON.stringify({ code: executeCode })}\n`, "utf8");
console.log("Payload Cloudflare prêt :", payloadPath.pathname);
