import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("One App free APK delivery", () => {
  it("keeps source ZIPs only in memory and isolates GitHub publication", async () => {
    const engine = await readFile("server/build-engine.ts", "utf8");
    const relay = await readFile("cloudflare/mia-build-relay.js", "utf8");
    const worker = await readFile("../one-app-build-worker/.github/workflows/build-imported-project.yml", "utf8");
    const publisher = await readFile("../one-app-build-worker/.github/workflows/publish-temporary-apk.yml", "utf8");

    expect(engine).toContain("sourceArchive?: Buffer");
    expect(engine).toContain('"/api/builds/:buildId/source"');
    expect(engine).toContain("job.sourceArchive = undefined");
    expect(engine).not.toContain("storagePut(");
    expect(engine).toContain("PUBLISHER_WORKFLOW");

    expect(worker).toContain("id-token: write");
    expect(worker).not.toContain("contents: write");
    expect(worker).toContain("actions/upload-artifact@v4");
    expect(worker).toContain('Authorization: Bearer $OIDC_TOKEN');
    expect(worker).toContain('TASK="bundleRelease"');

    expect(publisher).toContain("workflow_run:");
    expect(publisher).toContain("contents: write");
    expect(publisher).toContain("gh release create");
    expect(publisher).toContain("jarsigner");
    expect(publisher).toContain("artifactType");
    expect(publisher).toContain('unzip -tq "$ARTIFACT"');
    expect(publisher).toContain("BundleConfig.pb");
    expect(publisher).toContain("base/manifest/AndroidManifest.xml");
    expect(publisher).toContain("^base/dex/[^/]+\\.dex$");
    expect(publisher).toContain("48 hours ago");
    expect(relay).toContain("Votre fichier AAB est prêt à envoyer à Google Play. Play Console effectue ensuite la validation finale.");
    expect(relay).not.toContain("Votre fichier AAB est prêt pour Google Play.");
  });
});
