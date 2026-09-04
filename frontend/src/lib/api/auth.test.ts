import { describe, expect, it } from "vitest";

import { DEMO_PASSWORD } from "@/lib/mocks/data/users";

import { fetchUsers, login } from "./auth";
import { ApiError } from "./client";
import {
  fetchRegulations,
  updateRegulationAssignee,
  uploadRegulation,
} from "./regulations";

const KNOWN_EMAIL = "marie.lefevre@iabank.fr";

function docx(name = "Instruction_test.docx") {
  return new File(["contenu factice"], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

describe("authentification (v1.1)", () => {
  it("retourne l'utilisateur et un jeton pour des identifiants connus", async () => {
    const result = await login({
      email: KNOWN_EMAIL,
      password: DEMO_PASSWORD,
    });

    expect(result.user.email).toBe(KNOWN_EMAIL);
    expect(result.token).not.toBe("");
  });

  it("rejette un mot de passe incorrect avec le code INVALID_CREDENTIALS", async () => {
    await expect(
      login({ email: KNOWN_EMAIL, password: "mauvais" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("rejette une adresse inconnue", async () => {
    await expect(
      login({ email: "inconnu@iabank.fr", password: DEMO_PASSWORD }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("expose les utilisateurs assignables", async () => {
    const users = await fetchUsers();
    expect(users.length).toBeGreaterThan(1);
  });
});

describe("upload d'une régulation (v1.1)", () => {
  it("n'accepte que les fichiers Word", async () => {
    const notWord = new File(["texte"], "regulation.pdf", {
      type: "application/pdf",
    });

    await expect(
      uploadRegulation({ file: notWord }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE_TYPE" });
  });

  it("crée une régulation NOT_ANALYZED sans inventer d'exigence", async () => {
    const created = await uploadRegulation({
      file: docx(),
      assigneeId: "USR-003",
      uploadedById: "USR-001",
    });

    // Le backend n'extrait pas encore : aucune exigence n'est fabriquée côté mock.
    expect(created.status).toBe("NOT_ANALYZED");
    expect(created.assignee_id).toBe("USR-003");
    expect(created.uploaded_by_id).toBe("USR-001");

    const all = await fetchRegulations();
    expect(all.some((r) => r.document_id === created.document_id)).toBe(true);
  });

  it("permet de changer l'assignation après coup", async () => {
    const created = await uploadRegulation({ file: docx(), assigneeId: "USR-003" });
    const updated = await updateRegulationAssignee(created.document_id, "USR-004");

    expect(updated.assignee_id).toBe("USR-004");
  });
});
