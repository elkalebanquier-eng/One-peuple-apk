import { describe, expect, it } from "vitest";

import { BUILD_TIMEOUT_MS, QUEUE_TIMEOUT_MS, getBuildTimeoutMessage } from "../shared/build-timeout";

describe("délais du moteur de build", () => {
  it("transforme une file bloquée en instruction de relance", () => {
    const now = 1_000_000;
    expect(getBuildTimeoutMessage("queued", now - QUEUE_TIMEOUT_MS, now, now)).toContain("Relancer");
  });

  it("laisse une compilation active dans son délai normal", () => {
    const now = 1_000_000;
    expect(getBuildTimeoutMessage("building", now - BUILD_TIMEOUT_MS, now - 10_000, now)).toBeNull();
  });
});
