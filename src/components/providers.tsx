"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SettingsSync } from "@/lib/settings/SettingsSync";
import { UiVars } from "@/components/appearance/UiVars";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/shell/ServiceWorker";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // data lives on this device, so reads are cheap and never stale
            // for reasons outside the app; writes invalidate what they touch
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SettingsSync />
        <UiVars />
        <ServiceWorker />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
