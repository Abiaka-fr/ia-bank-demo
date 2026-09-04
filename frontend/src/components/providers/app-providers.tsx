"use client";

import { MockProvider } from "./mock-provider";
import { QueryProvider } from "./query-provider";
import { SessionProvider } from "./session-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MockProvider>
      <QueryProvider>
        <SessionProvider>{children}</SessionProvider>
      </QueryProvider>
    </MockProvider>
  );
}
