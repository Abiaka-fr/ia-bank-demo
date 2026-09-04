"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Démarre Mock Service Worker avant le premier appel réseau.
 *
 * Le backend de Thư n'existe pas encore : tant que `NEXT_PUBLIC_API_MOCKING` ne vaut
 * pas `disabled`, toutes les requêtes de `docs/api-contract.md` sont servies en local.
 */
const IS_MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING !== "disabled";

/**
 * Le démarrage est mémorisé au niveau du module : React remonte les effets deux fois
 * en développement, et `worker.start()` refuse d'être appelé sur un worker déjà actif.
 */
let workerStartup: Promise<void> | null = null;

function startWorkerOnce(): Promise<void> {
  workerStartup ??= import("@/lib/mocks/browser").then(async ({ worker }) => {
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  });
  return workerStartup;
}

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(!IS_MOCKING_ENABLED);

  useEffect(() => {
    if (!IS_MOCKING_ENABLED) return;

    let isActive = true;

    void startWorkerOnce()
      .catch((error: unknown) => {
        // Sans worker, les écrans afficheront leur état d'erreur : on trace la cause
        // plutôt que de bloquer l'application sur un écran de chargement.
        console.error("Démarrage de la couche de mock impossible", error);
        workerStartup = null;
      })
      .finally(() => {
        if (isActive) setIsReady(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (!isReady) {
    return (
      <div className="flex h-svh flex-col gap-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
