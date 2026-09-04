"use client";

import { createContext, use, useCallback, useMemo, useSyncExternalStore } from "react";

import { userSchema, type User } from "@/types/api";

const STORAGE_KEY = "ia-bank.session";

type SessionContextValue = {
  user: User | null;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Session de démonstration conservée en `sessionStorage`.
 *
 * Ce n'est PAS un mécanisme de sécurité : aucune donnée sensible n'existe dans ce POC
 * et le backend d'authentification reste à construire. L'objectif est uniquement de
 * savoir qui agit (auteur d'un upload, liste des assignés).
 */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const parsed = userSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = useMemo(() => parseUser(raw), [raw]);

  const signIn = useCallback((nextUser: User, token: string) => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      window.sessionStorage.setItem("ia-bank.token", token);
    } catch {
      // Sans persistance, la session ne survivra pas au rechargement.
    }
    notify();
  }, []);

  const signOut = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem("ia-bank.token");
    } catch {
      // Rien à nettoyer si le stockage est indisponible.
    }
    notify();
  }, []);

  const value = useMemo(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const context = use(SessionContext);
  if (!context) {
    throw new Error("useSession doit être utilisé dans un SessionProvider");
  }
  return context;
}
