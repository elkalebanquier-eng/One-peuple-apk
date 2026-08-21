import { readFile, writeFile } from "node:fs/promises";

const workerPath = "/home/ubuntu/kiko-native-app/cloudflare/mia-build-relay.js";
const outputPath = "/home/ubuntu/kiko-native-app/.mia-relay-deploy-input.json";
const workerCode = await readFile(workerPath, "utf8");

const mcpCode = `async () => {
  const code = ${JSON.stringify(workerCode)};
  const metadata = {
    main_module: "mia-build-relay.js",
    compatibility_date: "2024-01-01",
    bindings: [{ type: "kv_namespace", name: "BUILDS", namespace_id: "ffd884171b074012a30dbb34afede019" }]
  };
  const boundary = "----miaRelay" + Date.now();
  const body = [
    "--" + boundary,
    'Content-Disposition: form-data; name="metadata"',
    "Content-Type: application/json",
    "",
    JSON.stringify(metadata),
    "--" + boundary,
    'Content-Disposition: form-data; name="mia-build-relay.js"; filename="mia-build-relay.js"',
    "Content-Type: application/javascript+module",
    "",
    code,
    "--" + boundary + "--",
    ""
  ].join("\\r\\n");
  return cloudflare.request({
    method: "PUT",
    path: \`/accounts/\${accountId}/workers/scripts/mia-build-relay\`,
    body,
    contentType: \`multipart/form-data; boundary=\${boundary}\`,
    rawBody: true
  });
}`;

await writeFile(outputPath, JSON.stringify({ code: mcpCode, account_id: "1c2eaafa439ac988d44ff3d00da39c76" }));
