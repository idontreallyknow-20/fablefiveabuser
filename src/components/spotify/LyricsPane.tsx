"use client";

import { useEffect, useMemo, useRef } from "react";
import type { SyncedLine } from "@/lib/lyrics/lrc";

/**
 * The lyrics stage for /music. Synced lyrics track playback: the active
 * line renders large in the display face and auto-centers; plain lyrics
 * become a calm scrollable column; nothing found is a single mono line.
 * Lines are text, not controls (no seek endpoint is guaranteed).
 */
export function LyricsPane({
  synced,
  plain,
  loading,
  progressS,
  reducedMotion,
}: {
  synced: SyncedLine[] | null;
  plain: string | null;
  loading: boolean;
  progressS: number;
  reducedMotion: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  const activeIndex = useMemo(() => {
    if (!synced) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i += 1) {
      if (synced[i].t <= progressS) idx = i;
      else break;
    }
    return idx;
  }, [synced, progressS]);

  useEffect(() => {
    const container = scrollRef.current;
    const el = activeRef.current;
    if (!container || !el) return;
    const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  }, [activeIndex, reducedMotion]);

  if (loading) {
    return <div className="min-h-[40dvh] flex-1" aria-hidden />;
  }

  if (synced && synced.length > 0) {
    return (
      <div
        ref={scrollRef}
        className="min-h-0 w-full flex-1 overflow-y-auto py-[34dvh] [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)] [scrollbar-width:none]"
        style={{ maxHeight: "min(72dvh, 760px)" }}
      >
        {synced.map((l, i) => {
          const active = i === activeIndex;
          return (
            <p
              key={`${l.t}-${i}`}
              ref={active ? activeRef : undefined}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "display my-4 text-balance text-[clamp(26px,3.2vw,44px)] font-medium leading-[1.15] tracking-tight text-ink opacity-100 transition-opacity duration-[var(--dur-base)]"
                  : "my-4 text-[17px] leading-[1.5] text-ink-dim opacity-35 transition-opacity duration-[var(--dur-base)]"
              }
            >
              {l.line || "\u00A0"}
            </p>
          );
        })}
      </div>
    );
  }

  if (plain) {
    return (
      <div
        className="min-h-0 w-full flex-1 overflow-y-auto pr-2"
        style={{ maxHeight: "min(72dvh, 760px)" }}
      >
        <p className="whitespace-pre-wrap text-[17px] leading-[1.9] text-ink-dim">{plain}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40dvh] flex-1 items-center justify-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">no lyrics</p>
    </div>
  );
}
