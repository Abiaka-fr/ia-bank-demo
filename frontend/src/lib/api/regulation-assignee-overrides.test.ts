import { describe, expect, it } from "vitest";

import {
  getRegulationAssigneeOverride,
  setRegulationAssigneeOverride,
} from "./regulation-assignee-overrides";

describe("regulation-assignee-overrides", () => {
  it("ne renvoie rien tant qu'aucune assignation n'a été posée", () => {
    expect(getRegulationAssigneeOverride("EXT-EU-AML-001")).toBeUndefined();
  });

  it("renvoie l'assigné posé pour cette régulation, et pour elle seule", () => {
    setRegulationAssigneeOverride("EXT-EU-AML-001", "USR-002");

    expect(getRegulationAssigneeOverride("EXT-EU-AML-001")).toBe("USR-002");
    expect(getRegulationAssigneeOverride("EXT-EBA-KYC-002")).toBeUndefined();
  });

  it("remplace l'assigné précédent plutôt que de l'accumuler", () => {
    setRegulationAssigneeOverride("EXT-EU-AML-001", "USR-002");
    setRegulationAssigneeOverride("EXT-EU-AML-001", "USR-003");

    expect(getRegulationAssigneeOverride("EXT-EU-AML-001")).toBe("USR-003");
  });
});
