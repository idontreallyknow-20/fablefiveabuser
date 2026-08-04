"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState } from "react";
import { SettingsSync } from "@/lib/settings/SettingsSync";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import { createIdbPersister, shouldPersistQuery } from "@/lib/offline/persister";
import { armOutboxFlush } from "@/lib/offline/outbox";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
            gcTime: 24 * 60 * 60 * 1000,
          },
        },
      }),
  );
  const [persister] = useState(() => createIdbPersister());

  useEffect(() => armOutboxFlush(), []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: "orbit-v2",
        dehydrateOptions: {
          shouldDehydrateQuery: (q) =>
            q.state.status === "success" && shouldPersistQuery(q.queryKey),
        },
      }}
    >
      <ToastProvider>
        <SettingsSync />
        <ServiceWorker />
        {children}
      </ToastProvider>
    </PersistQueryClientProvider>
  );
}
