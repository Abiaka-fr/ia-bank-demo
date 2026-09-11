import { describe, expect, it } from "vitest";

import {
  accessProfileForUser,
  canAnalyzeProcedures,
  canPrint,
  canSeeKnowledgeBase,
  canSeeUserAdmin,
  canUploadRegulations,
  canValidateFindings,
  landingRouteForUser,
  resolveAccessProfile,
  roleLabel,
} from "./access-profile";

describe("resolveAccessProfile", () => {
  it("associe chaque libellé de rôle démo à son profil", () => {
    // Arrange / Act / Assert
    expect(resolveAccessProfile("Responsable Conformité")).toBe("HEAD_OF_COMPLIANCE");
    expect(resolveAccessProfile("Analyste Conformité")).toBe("COMPLIANCE_OFFICER");
    expect(resolveAccessProfile("Auditeur Interne")).toBe("AUDITOR");
    expect(resolveAccessProfile("Juriste Réglementaire")).toBe("COMPLIANCE_OFFICER");
    expect(resolveAccessProfile("Admin Base de Connaissances")).toBe("COMPLIANCE_ADMIN");
  });

  it("retombe sur COMPLIANCE_OFFICER pour un rôle non reconnu", () => {
    // Arrange
    const unexpectedRole = "Stagiaire Conformité";

    // Act
    const profile = resolveAccessProfile(unexpectedRole);

    // Assert
    expect(profile).toBe("COMPLIANCE_OFFICER");
  });

  it("retombe sur COMPLIANCE_OFFICER quand le rôle est absent", () => {
    // Arrange / Act / Assert
    expect(resolveAccessProfile(null)).toBe("COMPLIANCE_OFFICER");
    expect(resolveAccessProfile(undefined)).toBe("COMPLIANCE_OFFICER");
    expect(resolveAccessProfile("")).toBe("COMPLIANCE_OFFICER");
  });
});

describe("accessProfileForUser", () => {
  it("lit le rôle porté par l'utilisateur en session", () => {
    // Arrange
    const user = {
      user_id: "USR-003",
      full_name: "Claire Dubois",
      email: "claire.dubois@iabank.fr",
      role: "Auditeur Interne",
    };

    // Act
    const profile = accessProfileForUser(user);

    // Assert
    expect(profile).toBe("AUDITOR");
  });

  it("retombe sur le profil par défaut sans utilisateur", () => {
    // Arrange / Act / Assert
    expect(accessProfileForUser(null)).toBe("COMPLIANCE_OFFICER");
  });
});

describe("landingRouteForUser", () => {
  it("envoie le Responsable Conformité vers le tableau de bord", () => {
    // Arrange
    const user = { user_id: "USR-001", full_name: "Marie Lefèvre", email: "m@x.fr", role: "Responsable Conformité" };

    // Act / Assert
    expect(landingRouteForUser(user)).toBe("/dashboard");
  });

  it("envoie un Analyste Conformité vers les régulations", () => {
    // Arrange
    const user = { user_id: "USR-002", full_name: "Thomas Rousseau", email: "t@x.fr", role: "Analyste Conformité" };

    // Act / Assert
    expect(landingRouteForUser(user)).toBe("/regulations");
  });

  it("envoie l'admin base de connaissances vers /knowledge-base", () => {
    // Arrange
    const user = { user_id: "USR-005", full_name: "Admin", email: "a@x.fr", role: "Admin Base de Connaissances" };

    // Act / Assert
    expect(landingRouteForUser(user)).toBe("/knowledge-base");
  });
});

describe("permissions par profil", () => {
  it("interdit à l'auditeur de valider, uploader et imprimer", () => {
    // Arrange / Act / Assert
    expect(canValidateFindings("AUDITOR")).toBe(false);
    expect(canUploadRegulations("AUDITOR")).toBe(false);
    expect(canPrint("AUDITOR")).toBe(false);
    expect(canAnalyzeProcedures("AUDITOR")).toBe(false);
  });

  it("autorise les autres profils à valider, uploader, imprimer et analyser", () => {
    // Arrange / Act / Assert
    for (const profile of ["HEAD_OF_COMPLIANCE", "COMPLIANCE_OFFICER", "COMPLIANCE_ADMIN"] as const) {
      expect(canValidateFindings(profile)).toBe(true);
      expect(canUploadRegulations(profile)).toBe(true);
      expect(canPrint(profile)).toBe(true);
      expect(canAnalyzeProcedures(profile)).toBe(true);
    }
  });

  it("réserve la Knowledge Base à l'admin et au Head of Compliance", () => {
    // Arrange / Act / Assert
    expect(canSeeKnowledgeBase("COMPLIANCE_ADMIN")).toBe(true);
    expect(canSeeKnowledgeBase("HEAD_OF_COMPLIANCE")).toBe(true);
    expect(canSeeKnowledgeBase("COMPLIANCE_OFFICER")).toBe(false);
    expect(canSeeKnowledgeBase("AUDITOR")).toBe(false);
  });

  it("réserve l'écran Utilisateurs à l'admin seul", () => {
    // Arrange / Act / Assert
    expect(canSeeUserAdmin("COMPLIANCE_ADMIN")).toBe(true);
    expect(canSeeUserAdmin("HEAD_OF_COMPLIANCE")).toBe(false);
    expect(canSeeUserAdmin("COMPLIANCE_OFFICER")).toBe(false);
    expect(canSeeUserAdmin("AUDITOR")).toBe(false);
  });
});

describe("roleLabel", () => {
  it("traduit un rôle connu via la fonction t fournie", () => {
    // Arrange
    const t = (key: string) => `EN:${key}`;

    // Act / Assert
    expect(roleLabel("Responsable Conformité", t)).toBe("EN:headOfCompliance");
    expect(roleLabel("Auditeur Interne", t)).toBe("EN:auditor");
  });

  it("affiche un rôle non reconnu tel quel, sans appeler t", () => {
    // Arrange
    const t = () => {
      throw new Error("t ne devrait pas être appelée pour un rôle inconnu");
    };

    // Act / Assert
    expect(roleLabel("Stagiaire Conformité", t)).toBe("Stagiaire Conformité");
  });
});
