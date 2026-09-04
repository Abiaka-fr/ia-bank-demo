"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "ia-bank.selected-regulation";

type SelectedRegulationContextValue = {
  selectedRegulationId: string | null;
  selectRegulation: (regulationId: string) => void;
};

const SelectedRegulationContext =
  createContext<SelectedRegulationContextValue | null>(null);

/**
 * localStorage exposé comme store externe : `useSyncExternalStore` évite le
 * setState-dans-un-effet au montage et synchronise les onglets ouverts.
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
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible (navigation privée, permissions) : on repart à vide.
    return null;
  }
}

/** Rien de persisté côté serveur : le premier rendu part sans sélection. */
function getServerSnapshot(): string | null {
  return null;
}

export function SelectedRegulationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const selectedRegulationId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const selectRegulation = useCallback((regulationId: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, regulationId);
    } catch {
      // Sans persistance, la sélection ne survivra pas au rechargement.
    }
    notify();
  }, []);

  const value = useMemo(
    () => ({ selectedRegulationId, selectRegulation }),
    [selectedRegulationId, selectRegulation],
  );

  return (
    <SelectedRegulationContext value={value}>
      {children}
    </SelectedRegulationContext>
  );
}

export function useSelectedRegulation(): SelectedRegulationContextValue {
  const context = use(SelectedRegulationContext);
  if (!context) {
    throw new Error(
      "useSelectedRegulation doit être utilisé dans un SelectedRegulationProvider",
    );
  }
  return context;
}
