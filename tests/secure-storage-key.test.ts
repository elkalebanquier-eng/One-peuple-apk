import { describe, expect, it } from "vitest";

import { getKeyBackupStorageKey } from "../shared/secure-storage-key";

describe("private key backup SecureStore identifier", () => {
  it("uses only Android-safe characters for a standard build id", () => {
    const key = getKeyBackupStorageKey("build-1724270400000-a1b2c3");

    expect(key).toBe("mia_key_backup_url_build-1724270400000-a1b2c3");
    expect(key).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("normalizes unexpected characters before accessing SecureStore", () => {
    expect(getKeyBackupStorageKey("build:old.id/unsafe")).toBe("mia_key_backup_url_build_old_id_unsafe");
  });
});
