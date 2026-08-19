import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("One App free compilation quota", () => {
  it("allows six compilation submissions per hour before rate limiting", async () => {
    const engine = await readFile("server/build-engine.ts", "utf8");

    expect(engine).toContain("const MAX_SUBMISSIONS_PER_HOUR = 6;");
    expect(engine).toContain("six compilations récemment");
    expect(engine).not.toContain("deux compilations récemment");
  });
});
