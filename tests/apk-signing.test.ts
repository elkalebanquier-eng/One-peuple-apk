import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("One App APK signing flow", () => {
  it("keeps the signing-key backup behind a one-time private route", async () => {
    const engine = await readFile("server/build-engine.ts", "utf8");

    expect(engine).toContain('type BuildMode = "debug" | "signed"');
    expect(engine).toContain('"/api/builds/:buildId/key-backup"');
    expect(engine).toContain("keyBackupAccessToken");
    expect(engine).toContain("job.keyBackupArchive = undefined");
    expect(engine).toContain("Cache-Control\", \"no-store");
  });

  it("creates a release key only in the trusted publisher workflow", async () => {
    const worker = await readFile("../one-app-build-worker-git/.github/workflows/build-imported-project.yml", "utf8");
    const publisher = await readFile("../one-app-build-worker-git/.github/workflows/publish-temporary-apk.yml", "utf8");

    expect(worker).toContain('TASK="assembleRelease"');
    expect(worker).not.toContain("keytool -genkeypair");
    expect(publisher).toContain("keytool -genkeypair");
    expect(publisher).toContain("apksigner");
    expect(publisher).toContain("keyBackupBase64");
    expect(publisher).toContain("MOT-DE-PASSE-ET-INFOS");
    expect(publisher).toContain("Ne donnez jamais cette clé ni ce mot de passe");
  });
});
