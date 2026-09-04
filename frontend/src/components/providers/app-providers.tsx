"use client";

import { MockProvider } from "./mock-provider";
import { QueryProvider } from "./query-provider";
import { SelectedRegulationProvider } from "./selected-regulation-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MockProvider>
      <QueryProvider>
        <SelectedRegulationProvider>{children}</SelectedRegulationProvider>
      </QueryProvider>
    </MockProvider>
  );
}
