"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * One QueryClient per browser session. Verify calls are mutations (POST), so we
 * don't need long-lived query caches — but a single client means future
 * additions (e.g. a list of past verifications) get caching for free.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            // The API already classifies and surfaces typed errors — let the
            // caller decide whether to retry rather than retrying blindly.
            retry: 0,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
