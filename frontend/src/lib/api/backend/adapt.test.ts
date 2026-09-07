import { describe, expect, it } from "vitest";

import type { BackendDocument, BackendDocumentContent, BackendUser } from "./schemas";
import {
  adaptAuthority,
  adaptDocument,
  adaptDocumentStatus,
  adaptDocumentType,
  adaptDomain,
  adaptExtractedText,
  adaptLanguage,
  adaptRequirement,
  adaptUser,
} from "./adapt";

function backendDocument(overrides: Partial<BackendDocument> = {}): BackendDocument {
  return {
    document_id: "EXT-EU-AML-001",
    title: "EU AML/CFT Customer Due Diligence Demo Standard",
    category: "EXTERNAL",
    document_type: "REGULATORY_STANDARD",
    origin_code: "EU",
    origin_name: "European Union",
    domain: "AML/CFT",
    language: "EN",
    current_version: "2.0",
    current_file_path: null,
    data_classification: "SYNTHETIC_DEMO",
    created_at: "2024-03-25T09:00:00",
    ...overrides,
  };
}

describe("adaptLanguage", () => {
  it("reconnaît EN indépendamment de la casse", () => {
    // Arrange / Act / Assert
    expect(adaptLanguage("en")).toBe("EN");
    expect(adaptLanguage("EN")).toBe("EN");
  });

  it("retombe sur FR pour une valeur absente ou inconnue", () => {
    // Arrange / Act / Assert
    expect(adaptLanguage(null)).toBe("FR");
    expect(adaptLanguage(undefined)).toBe("FR");
    expect(adaptLanguage("DE")).toBe("FR");
  });
});

describe("adaptDomain", () => {
  it("enveloppe une chaîne unique dans un tableau", () => {
    // Arrange / Act / Assert
    expect(adaptDomain("AML/CFT")).toEqual(["AML/CFT"]);
  });

  it("renvoie un tableau vide plutôt qu'un domaine inventé", () => {
    // Arrange / Act / Assert
    expect(adaptDomain(null)).toEqual([]);
    expect(adaptDomain("")).toEqual([]);
    expect(adaptDomain("   ")).toEqual([]);
  });
});

describe("adaptAuthority", () => {
  it("préfère le nom complet au code", () => {
    // Arrange
    const document = backendDocument({ origin_name: "European Union", origin_code: "EU" });
    // Act / Assert
    expect(adaptAuthority(document)).toBe("European Union");
  });

  it("retombe sur le code si le nom est absent", () => {
    // Arrange
    const document = backendDocument({ origin_name: null, origin_code: "EU" });
    // Act / Assert
    expect(adaptAuthority(document)).toBe("EU");
  });
});

describe("adaptDocumentType", () => {
  it("mappe EXTERNAL sur REGULATION", () => {
    expect(adaptDocumentType("EXTERNAL")).toBe("REGULATION");
  });

  it("mappe tout le reste (INTERNAL, CONTROL, absent) sur INTERNAL_PROCEDURE", () => {
    expect(adaptDocumentType("INTERNAL")).toBe("INTERNAL_PROCEDURE");
    expect(adaptDocumentType("CONTROL")).toBe("INTERNAL_PROCEDURE");
    expect(adaptDocumentType(null)).toBe("INTERNAL_PROCEDURE");
  });
});

describe("adaptDocumentStatus", () => {
  it("renvoie toujours NOT_ANALYZED — le backend ne connaît pas l'avancement de l'analyse", () => {
    // Le backend n'expose aucun champ de statut ni aucun constat : affirmer autre
    // chose que NOT_ANALYZED laisserait croire à une analyse qui n'a pas eu lieu.
    expect(adaptDocumentStatus()).toBe("NOT_ANALYZED");
  });
});

describe("adaptDocument", () => {
  it("traduit un document backend vers la forme du contrat", () => {
    // Arrange
    const document = backendDocument();
    // Act
    const result = adaptDocument(document);
    // Assert
    expect(result).toMatchObject({
      document_id: "EXT-EU-AML-001",
      document_type: "REGULATION",
      authority_or_owner: "European Union",
      domain: ["AML/CFT"],
      language: "EN",
      version: "2.0",
      status: "NOT_ANALYZED",
    });
  });
});

describe("adaptExtractedText", () => {
  it("recolle les chunks dans l'ordre chunk_no, sépare les blocs vides", () => {
    // Arrange
    const content: BackendDocumentContent = {
      version: {
        version_id: "VER-EXT-EU-AML-001-02",
        document_id: "EXT-EU-AML-001",
        version_no: "2.0",
        version_timestamp: null,
        status: "ACTIVE",
        file_path: null,
        sha256: null,
        created_by: null,
        change_reason: null,
      },
      chunks: [
        {
          chunk_id: "CHK-2",
          document_id: "EXT-EU-AML-001",
          version_id: "VER-EXT-EU-AML-001-02",
          chunk_no: 2,
          section_title: null,
          content: "Second paragraphe.",
          language: "EN",
          domain: null,
        },
        {
          chunk_id: "CHK-1",
          document_id: "EXT-EU-AML-001",
          version_id: "VER-EXT-EU-AML-001-02",
          chunk_no: 1,
          section_title: null,
          content: "Premier paragraphe.",
          language: "EN",
          domain: null,
        },
        {
          chunk_id: "CHK-3",
          document_id: "EXT-EU-AML-001",
          version_id: "VER-EXT-EU-AML-001-02",
          chunk_no: 3,
          section_title: null,
          content: null,
          language: "EN",
          domain: null,
        },
      ],
      total_chunks: 3,
    };
    // Act
    const result = adaptExtractedText(content);
    // Assert
    expect(result).toBe("Premier paragraphe.\n\nSecond paragraphe.");
  });
});

describe("adaptRequirement", () => {
  it("traduit une exigence backend, sans inventer les champs absents", () => {
    // Arrange
    const requirement = {
      requirement_id: "REQ-0001",
      source_document_id: "EXT-EU-AML-001",
      title: "Risk classification",
      domain: "AML/CFT",
      language: "EN",
      requirement_text: "Customers must be classified using documented risk factors.",
      risk_level: "MEDIUM",
      source_reference: "Section 3",
      status: "ACTIVE",
    };
    // Act
    const result = adaptRequirement(requirement);
    // Assert
    expect(result).toEqual({
      requirement_id: "REQ-0001",
      source_document_id: "EXT-EU-AML-001",
      source_reference: "Section 3",
      source_text: "Customers must be classified using documented risk factors.",
      normalized_requirement: "Risk classification",
      domain: ["AML/CFT"],
      impacted_activity: [],
      language: "EN",
    });
  });
});

describe("adaptUser", () => {
  it("retombe sur la partie locale de l'e-mail si full_name est absent", () => {
    // Arrange
    const user: BackendUser = {
      user_id: "USR-001",
      email: "marie.lefevre@iabank.fr",
      full_name: null,
      role: "COMPLIANCE_OFFICER",
      is_active: true,
      created_at: "2026-09-07T00:00:00",
    };
    // Act
    const result = adaptUser(user);
    // Assert
    expect(result.full_name).toBe("marie.lefevre");
  });

  it("garde le nom complet quand il est renseigné", () => {
    // Arrange
    const user: BackendUser = {
      user_id: "USR-001",
      email: "marie.lefevre@iabank.fr",
      full_name: "Marie Lefèvre",
      role: "COMPLIANCE_OFFICER",
      is_active: true,
      created_at: "2026-09-07T00:00:00",
    };
    // Act / Assert
    expect(adaptUser(user).full_name).toBe("Marie Lefèvre");
  });
});
