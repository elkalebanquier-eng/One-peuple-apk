import { describe, expect, it } from "vitest";

import config from "../app.config";

describe("One App branding", () => {
  it("expose One App as the application name", () => {
    expect(config.name).toBe("One App");
  });
});
