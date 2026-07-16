"use client";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-xl border border-line bg-bg0/60 p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={[
              "rounded-[10px] font-medium transition-colors duration-[var(--dur-base)]",
              size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
              active
                ? "bg-bg2 text-ink border border-line-strong"
                : "text-ink-faint hover:text-ink-dim border border-transparent",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1.5">
      <span className="flex flex-col">
        <span className="text-sm text-ink">{label}</span>
        {description && <span className="text-[13px] text-ink-faint">{description}</span>}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-[var(--dur-base)]",
          checked ? "border-(--accent)/50 bg-accent-soft" : "border-line bg-bg1",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-[18px] w-[18px] rounded-full transition-[left,background] duration-[var(--dur-base)] ease-(--ease-out)",
            checked ? "left-[18px] bg-accent" : "left-0.5 bg-ink-faint",
          ].join(" ")}
        />
      </button>
    </label>
  );
}
