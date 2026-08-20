"use client";

// Curated accent swatches. The first swatch clears the override and
// follows the active theme's accent.

export const ACCENT_SWATCHES = [
  "#d9a05b",
  "#d98a6b",
  "#d4899b",
  "#a793d6",
  "#7f9be0",
  "#6fb7c7",
  "#6fc7a8",
  "#9ab87a",
  "#c9a35a",
  "#aab4c0",
] as const;

function ring(selected: boolean) {
  return selected
    ? "ring-2 ring-(--accent) ring-offset-2 ring-offset-bg0"
    : "ring-1 ring-line hover:ring-line-strong";
}

export function AccentSwatches({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (hex: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => onChange(null)}
        aria-label="Theme accent"
        aria-pressed={value === null}
        className={`flex h-8 w-8 items-center justify-center rounded-full bg-bg2 transition-shadow duration-[var(--dur-base)] ${ring(value === null)}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M10 2L2 10" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {ACCENT_SWATCHES.map((hex) => (
        <button
          key={hex}
          onClick={() => onChange(hex)}
          aria-label={hex}
          aria-pressed={value === hex}
          className={`h-8 w-8 rounded-full transition-shadow duration-[var(--dur-base)] ${ring(value === hex)}`}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}
