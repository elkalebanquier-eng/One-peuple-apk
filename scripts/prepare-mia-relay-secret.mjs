import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const secretPath = "/home/ubuntu/kiko-native-app/.mia-build-relay-secret";
const inputPath = "/home/ubuntu/kiko-native-app/.mia-relay-secret-input.json";
const secret = randomBytes(32).toString("hex");

const mcpCode = `async () => cloudflare.request({
  method: "PUT",
  path: \`/accounts/\${accountId}/workers/scripts/mia-build-relay/secrets\`,
  body: { name: "RELAY_SECRET", text: ${JSON.stringify(secret)}, type: "secret_text" }
})`;

await writeFile(secretPath, secret, { mode: 0o600 });
await writeFile(inputPath, JSON.stringify({ code: mcpCode, account_id: "1c2eaafa439ac988d44ff3d00da39c76" }), { mode: 0o600 });
