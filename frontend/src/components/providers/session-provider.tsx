"use client";

import { createContext, use, useCallback, useMemo, useSyncExternalStore } from "react";

import { clearToken, writeToken } from "@/lib/api/token";
import { userSchema, type User } from "@/types/api";

const STORAGE_KEY = "ia-bank.session";

type SessionContextValue = {
  user: User | null;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Session conservée en `sessionStorage` : l'utilisateur courant ici, le jeton dans
 * `lib/api/token.ts` (la couche API doit pouvoir le lire sans passer par React).
 *
 * Le niveau de garantie dépend du mode (voir `lib/api/backend/config.ts`) :
 * en mode mock, c'est une simulation — aucun contrôle d'accès réel ; en mode backend
 * réel, le jeton est un vrai JWT signé, exigé par le serveur sur toutes les routes
 * `/api/**` et expirant au bout de 60 minutes.
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
    } catch {
      // Sans persistance, la session ne survivra pas au rechargement.
    }
    writeToken(token);
    notify();
  }, []);

  const signOut = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Rien à nettoyer si le stockage est indisponible.
    }
    clearToken();
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
