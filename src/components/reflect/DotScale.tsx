"use client";

import { useRef } from "react";

/**
 * A quiet 1 to 5 scale: five round buttons behaving as a radiogroup.
 * The selected dot fills with the accent; arrow keys move the selection.
 * No numbers are shown; screen readers get "3 of 5" style labels.
 */
export function DotScale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (n: number) => {
    const next = Math.min(5, Math.max(1, n));
    onChange(next);
    refs.current[next - 1]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-sm text-ink-dim">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-2"
        onKeyDown={(e) => {
          const cur = value ?? 0;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            select(cur === 0 ? 1 : cur + 1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            select(cur === 0 ? 1 : cur - 1);
          } else if (e.key === "Home") {
            e.preventDefault();
            select(1);
          } else if (e.key === "End") {
            e.preventDefault();
            select(5);
          }
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label} ${n} of 5`}
              tabIndex={selected || (value == null && n === 1) ? 0 : -1}
              ref={(el) => {
                refs.current[n - 1] = el;
              }}
              onClick={() => onChange(n)}
              className={[
                "h-7 w-7 rounded-full border transition-colors duration-[var(--dur-base)]",
                selected
                  ? "border-(--accent) bg-accent"
                  : value != null && n < value
                    ? "border-(--accent)/40 bg-accent-soft"
                    : "border-line bg-bg1 hover:border-line-strong",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
