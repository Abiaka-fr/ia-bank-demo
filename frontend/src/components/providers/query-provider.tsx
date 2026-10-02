"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { onOtherTabChange } from "@/lib/api/cross-tab";

const STALE_TIME_MS = 30_000;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Un client par montage : évite de partager le cache entre utilisateurs en SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: STALE_TIME_MS, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  // ponytail: tout le cache est invalidé à chaque changement venu d'un autre onglet (seules
  // les requêtes affichées sont rechargées) ; cibler par clé si cela devient trop coûteux.
  useEffect(
    () => onOtherTabChange(() => void queryClient.invalidateQueries()),
    [queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
