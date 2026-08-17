import { describe, expect, it } from "vitest";

import { makeRestartBuildInput } from "../lib/restart-build";

describe("makeRestartBuildInput", () => {
  it("réutilise le fichier conservé sans demander une nouvelle sélection", () => {
    const input = makeRestartBuildInput({
      id: "build-original",
      projectName: "Ma première application",
      projectType: "html",
      sourceName: "index.html.zip",
      sourceSize: 2048,
      sourceUri: "file:///private/one-app/build-original/index.html.zip",
      status: "complete",
      createdAt: "2026-08-17T08:00:00.000Z",
      updatedAt: "2026-08-17T08:05:00.000Z",
    });

    expect(input).toEqual({
      projectName: "Ma première application",
      projectType: "html",
      sourceName: "index.html.zip",
      sourceSize: 2048,
      sourceUri: "file:///private/one-app/build-original/index.html.zip",
    });
  });
});
