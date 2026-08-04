"use client";

// Quiet offline indicator: shows queued write count until they replay.

import { useOutboxStore } from "@/lib/offline/outbox";

export function OutboxDot() {
  const pending = useOutboxStore((s) => s.pending);
  if (pending === 0) return null;
  return (
    <div
      className="fixed bottom-20 right-3 z-50 flex h-7 items-center gap-1.5 rounded-full border border-line bg-bg1/90 px-2.5 md:bottom-3"
      role="status"
      aria-label={`${pending} queued changes`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--accent)" aria-hidden />
      <span className="tnum font-mono text-[11px] text-ink-dim">{pending}</span>
    </div>
  );
}
