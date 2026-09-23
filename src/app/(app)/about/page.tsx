import type { Metadata } from "next";
import Link from "next/link";
import { AUTHOR, pageMeta } from "@/lib/site";

const meta = pageMeta(
  "/about",
  "About",
  "Orbit is a free, private daily dashboard built by Joseph Leung, a student founder and former national-level chess player from Richmond Hill, Ontario.",
);

export const metadata: Metadata = {
  ...meta,
  title: { absolute: "About Orbit | built by Joseph Leung" },
};

const FEATURES = [
  ["Today", "Three priorities, a backlog, what's due soon, and a live clock over real Richmond Hill weather."],
  ["Calendar", "Month, week and agenda views that merge scheduled tasks, due dates, repeats and routines."],
  ["Projects", "Lists and boards with colour, tags, checklists and milestones."],
  ["Train", "Calisthenics and gym logging with personal records and recovery notes."],
  ["Reflect", "Quick check-ins for mood, energy and sleep, plus self-care and nutrition."],
  ["Focus", "One task, a timer, and a generative lofi soundscape."],
  ["Ambient", "A full-screen clock and living scene for a spare monitor."],
];

const extLink =
  "text-accent underline decoration-(--accent)/35 underline-offset-4 transition-colors hover:decoration-(--accent)";

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl pb-8">
      <header className="rise mb-10 mt-[3vh]">
        <p className="eyebrow mb-3">About</p>
        <h1 className="display text-4xl font-light leading-tight text-ink">
          A calm place for the day
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-dim">
          Orbit is a daily dashboard that sits behind glass: a rainy city, a snowy
          night or a slow aurora that follows the real weather and the real sky. On
          top of it are the few things that matter today.
        </p>
      </header>

      <section className="rise mb-10" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        <h2 className="eyebrow mb-4">What&apos;s inside</h2>
        <dl className="surface divide-y divide-line/60">
          {FEATURES.map(([name, body]) => (
            <div key={name} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6">
              <dt className="w-24 shrink-0 text-[15px] font-medium text-ink">{name}</dt>
              <dd className="text-[15px] leading-relaxed text-ink-dim">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rise mb-10" style={{ "--stagger-i": 2 } as React.CSSProperties}>
        <h2 className="eyebrow mb-4">Free and private</h2>
        <p className="text-[15px] leading-relaxed text-ink-dim">
          There&apos;s no sign-up. Open Orbit and it&apos;s yours: everything you add is
          stored in your browser on your device, and nothing is sent to a server. To
          move to another device, export a backup in{" "}
          <Link href="/space/data" className={extLink}>
            Space → Data
          </Link>{" "}
          and restore it there.
        </p>
      </section>

      <section className="rise surface p-6" style={{ "--stagger-i": 3 } as React.CSSProperties}>
        <h2 className="eyebrow mb-4">Built by Joseph Leung</h2>
        <p className="text-[15px] leading-relaxed text-ink-dim">
          Orbit is designed and built by{" "}
          <a href={AUTHOR.url} className={extLink}>
            Joseph Leung
          </a>{" "}
          (Joseph Wah Sing Leung), a student founder in Richmond Hill, Ontario. He&apos;s
          a former national-level chess player and the maker of{" "}
          <a href="https://nerfchess.com" className={extLink}>
            NerfChess
          </a>
          , trains calisthenics, and writes the{" "}
          <a href="https://dailybriefhq.com" className={extLink}>
            Daily Brief HQ
          </a>{" "}
          newsletter. Orbit started as the dashboard he wanted for school, training and
          his startups.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={AUTHOR.url}
            className="rounded-xl border border-(--accent)/35 bg-accent-soft px-4 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-(--accent)/22"
          >
            More from Joseph
          </a>
          <a
            href="https://github.com/idontreallyknow-20/fablefiveabuser"
            className="rounded-xl border border-line px-4 py-2 text-[13px] text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
          >
            Source on GitHub
          </a>
        </div>
      </section>

      <p className="mt-8 text-[12px] text-ink-faint">
        Weather data by{" "}
        <a href="https://open-meteo.com" className="underline underline-offset-4 hover:text-ink-dim">
          Open-Meteo.com
        </a>{" "}
        (CC BY 4.0).
      </p>
    </article>
  );
}
