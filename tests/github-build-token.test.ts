import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("One App build worker security", () => {
  it("uses GitHub OIDC instead of a personal GitHub token", async () => {
    const engine = await readFile("server/build-engine.ts", "utf8");
    const workflow = await readFile("../one-app-build-worker/.github/workflows/build-imported-project.yml", "utf8");

    expect(engine).toContain("jwtVerify");
    expect(engine).toContain("token.actions.githubusercontent.com");
    expect(engine).not.toContain("GITHUB_BUILD_TOKEN");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("audience=one-app-build-worker");
  });
});
