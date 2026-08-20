"use client";

import { INSPIRATION_SOURCES } from "@/lib/backgrounds/inspiration";

export function InspirationChips() {
  return (
    <div>
      <h3 className="eyebrow mb-2.5">Inspiration</h3>
      <div className="flex flex-wrap gap-2">
        {INSPIRATION_SOURCES.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg1 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-dim transition-colors duration-[var(--dur-base)] hover:border-line-strong hover:text-ink"
          >
            {s.name}
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path
                d="M2 8L8 2M8 2H3.5M8 2v4.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
