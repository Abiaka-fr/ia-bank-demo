import { describe, expect, it } from "vitest";

import { matchesDocumentFilters, NO_DOCUMENT_FILTER } from "./document-filters";

describe("matchesDocumentFilters", () => {
  const kyc = { domain: ["KYC", "AML/CFT"], assignee_id: "USR-1" };
  const unassigned = { domain: ["DORA"] };

  it("filtre par domaine et par personne en charge, « non assigné » compris", () => {
    expect(matchesDocumentFilters(kyc, NO_DOCUMENT_FILTER)).toBe(true);
    expect(matchesDocumentFilters(kyc, { domain: "AML/CFT", assignee: "USR-1" })).toBe(true);
    expect(matchesDocumentFilters(kyc, { domain: "DORA", assignee: "ALL" })).toBe(false);
    expect(matchesDocumentFilters(kyc, { domain: "ALL", assignee: "USR-2" })).toBe(false);
    expect(matchesDocumentFilters(unassigned, { domain: "ALL", assignee: "UNASSIGNED" })).toBe(true);
    expect(matchesDocumentFilters(kyc, { domain: "ALL", assignee: "UNASSIGNED" })).toBe(false);
  });
});
