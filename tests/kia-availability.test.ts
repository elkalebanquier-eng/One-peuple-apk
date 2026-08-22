import { describe, expect, it } from "vitest";

import { getKiaServiceDetail, getKiaUnavailableMessage } from "../shared/kia-availability";

describe("préparation de KIA", () => {
  it("indique que KIA est désactivée sans suggérer de clé dans l’application", () => {
    const message = `${getKiaUnavailableMessage()} ${getKiaServiceDetail()}`.toLocaleLowerCase("fr-FR");

    expect(message).toContain("non activ");
    expect(message).not.toContain("api key");
    expect(message).not.toContain("gemini_api_key");
  });
});
