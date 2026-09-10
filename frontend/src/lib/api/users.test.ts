import { describe, expect, it } from "vitest";

import { fetchUsers, updateUserRole } from "./users";
import { ApiError } from "./client";

describe("changement de rôle (v1.5)", () => {
  it("met à jour le rôle d'un utilisateur existant", async () => {
    const users = await fetchUsers();
    const target = users[0];

    const updated = await updateUserRole(target.user_id, { role: "Analyste Senior" });

    expect(updated.user_id).toBe(target.user_id);
    expect(updated.role).toBe("Analyste Senior");

    const refreshed = await fetchUsers();
    expect(refreshed.find((user) => user.user_id === target.user_id)?.role).toBe(
      "Analyste Senior",
    );
  });

  it("rejette un identifiant d'utilisateur inconnu", async () => {
    await expect(
      updateUserRole("USR-inexistant", { role: "Analyste Senior" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
