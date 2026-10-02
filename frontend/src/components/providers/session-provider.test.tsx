import { render } from "@testing-library/react";
import { useEffect } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it } from "vitest";

import { SESSION_USER_KEY } from "@/lib/api/token";

import { SessionProvider, useSession } from "./session-provider";

afterEach(() => window.localStorage.clear());

it("ne se dit jamais prête sans utilisateur pendant l'hydratation d'une session existante", () => {
  // Ce que voit l'effet d'un composant enfant (la garde de session) à chaque rendu.
  const seen: string[] = [];
  function Probe() {
    const { user, isReady } = useSession();
    useEffect(() => {
      seen.push(`${isReady}:${user?.user_id ?? "none"}`);
    });
    return null;
  }
  const ui = (
    <SessionProvider>
      <Probe />
    </SessionProvider>
  );

  const container = document.body.appendChild(document.createElement("div"));
  container.innerHTML = renderToString(ui);
  window.localStorage.setItem(
    SESSION_USER_KEY,
    JSON.stringify({ user_id: "USR-001", full_name: "Marie", email: "m@iabank.fr", role: "r" }),
  );
  render(ui, { container, hydrate: true });

  expect(seen[0]).toBe("false:none");
  expect(seen.at(-1)).toBe("true:USR-001");
  // « prête et sans utilisateur » = redirection vers /login : ne doit jamais arriver ici.
  expect(seen).not.toContain("true:none");
});
