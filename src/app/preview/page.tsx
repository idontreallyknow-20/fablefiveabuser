"use client";

import Link from "next/link";
import { useState } from "react";
import { AtmosphereCanvas } from "@/components/atmosphere/AtmosphereCanvas";
import { Clock } from "@/components/today/Clock";
import { WeatherChip } from "@/components/today/WeatherChip";
import { THEME_LIST, type ThemeId } from "@/lib/themes/registry";
import { IconCheck } from "@/components/ui/Icons";

// Example content shown to visitors. Clearly labeled; nothing here is real
// user data and nothing can be edited without an account.
const EXAMPLE_PRIORITIES = [
  { title: "The one thing that matters most today", done: true },
  { title: "The second thing, when the first is done", done: false },
  { title: "A third, if the day allows", done: false },
];

export default function PreviewPage() {
  const [theme, setTheme] = useState<ThemeId>("rainy-city");

  return (
    <div data-theme={theme} className="relative min-h-dvh overflow-x-hidden">
      <AtmosphereCanvas key={theme} themeOverride={theme} />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-8 md:px-8">
        <header className="mb-10 flex items-center justify-between">
          <span className="display text-lg text-ink">Orbit</span>
          <div className="flex items-center gap-2">
            <span className="eyebrow hidden sm:block">Preview</span>
            <Link
              href="/login"
              className="rounded-xl border border-(--accent)/35 bg-accent-soft px-4 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-(--accent)/22"
            >
              Sign in
            </Link>
          </div>
        </header>

        <section className="rise mb-10">
          <Clock
            size="hero"
            meta={
              <>
                <span aria-hidden className="text-ink-faint">·</span>
                <WeatherChip />
              </>
            }
          />
          <p className="mt-4 max-w-md text-sm text-ink-dim">
            A quiet place for the day. Live weather, real sky, your three
            priorities, your music. This is a look around; an account makes it
            yours.
          </p>
        </section>

        <section className="rise mb-10 max-w-xl" style={{ "--stagger-i": 1 } as React.CSSProperties}>
          <h2 className="eyebrow mb-3">Three priorities · example</h2>
          <div className="flex flex-col gap-2" aria-label="Example priorities, not editable">
            {EXAMPLE_PRIORITIES.map((p, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 rounded-xl surface px-4 py-3.5 ${p.done ? "opacity-55" : ""}`}
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border ${
                    p.done
                      ? "border-(--ok)/60 bg-(--ok)/15 text-ok"
                      : "border-line-strong text-transparent"
                  }`}
                  aria-hidden
                >
                  <IconCheck size={12} />
                </span>
                <span className={`text-[15px] text-ink ${p.done ? "line-through" : ""}`}>
                  {p.title}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rise mb-12" style={{ "--stagger-i": 2 } as React.CSSProperties}>
          <h2 className="eyebrow mb-3">Eleven worlds · try them</h2>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Preview theme">
            {THEME_LIST.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(t.id)}
                  className={`rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-colors duration-[var(--dur-base)] ${
                    active
                      ? "border-(--accent)/60 bg-accent-soft text-accent"
                      : "border-line text-ink-faint hover:border-line-strong hover:text-ink-dim"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          <p className="mt-3 max-w-md text-[13px] text-ink-faint">
            Every theme is a living scene that follows real weather and the real
            position of the sun over Richmond Hill.
          </p>
        </section>

        <footer className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-5 text-[13px] text-ink-faint">
          <span>Tasks, projects, training, reflection, Spotify, Google Calendar.</span>
          <Link href="/login" className="text-accent hover:underline">
            Sign in to begin
          </Link>
        </footer>
      </main>
    </div>
  );
}
