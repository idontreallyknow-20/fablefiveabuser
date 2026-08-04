"use client";

import { IconCheck } from "@/components/ui/Icons";

/** Numbered step row: completed steps get a check, the active step is accent. */
export function Stepper({
  steps,
  current,
  label,
}: {
  steps: string[];
  current: number;
  label: string;
}) {
  return (
    <ol aria-label={label} className="mb-4 flex flex-wrap items-center gap-1.5">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="flex items-center gap-1.5"
          >
            {i > 0 && (
              <span
                className={`h-px w-4 ${done || active ? "bg-(--accent)/40" : "bg-line"}`}
                aria-hidden
              />
            )}
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                done
                  ? "border-(--accent)/40 bg-accent-soft text-accent"
                  : active
                    ? "border-(--accent) bg-accent-soft text-accent"
                    : "border-line text-ink-faint",
              ].join(" ")}
            >
              {done ? <IconCheck size={11} /> : i + 1}
            </span>
            <span
              className={[
                "font-mono text-[11px] tracking-[0.14em] uppercase",
                active ? "text-accent" : done ? "text-ink-dim" : "text-ink-faint",
              ].join(" ")}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Missing env keys as mono chips plus a link to Vercel env settings. One line. */
export function EnvKeys({ keys }: { keys: string[] }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5">
      {keys.map((k) => (
        <code
          key={k}
          className="rounded-md border border-line bg-bg1 px-1.5 py-0.5 font-mono text-[11px] text-ink-dim"
        >
          {k}
        </code>
      ))}
      <a
        href="https://vercel.com/dashboard"
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[11px] text-accent hover:underline"
      >
        Vercel env
      </a>
    </p>
  );
}

/** Anchor styled like the primary Button, for OAuth redirects. */
export function ConnectLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-9 items-center rounded-xl border border-(--accent)/35 bg-accent-soft px-3.5 text-[13px] font-medium text-accent transition-colors duration-[var(--dur-base)] hover:bg-(--accent)/22"
    >
      {children}
    </a>
  );
}
