import { describe, expect, it, vi } from "vitest";

import { SESSION_USER_KEY, clearToken, readToken, writeToken } from "./token";

describe("token", () => {
  it("purge le jeton ET l'utilisateur, et prévient la session de l'onglet courant", () => {
    writeToken("jwt");
    window.localStorage.setItem(SESSION_USER_KEY, "{}");
    const onStorage = vi.fn();
    window.addEventListener("storage", onStorage);

    clearToken();

    expect(readToken()).toBeNull();
    expect(window.localStorage.getItem(SESSION_USER_KEY)).toBeNull();
    expect(onStorage).toHaveBeenCalled();
    window.removeEventListener("storage", onStorage);
  });
});
