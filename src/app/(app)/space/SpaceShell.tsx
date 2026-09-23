"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/space", label: "All" },
  { href: "/space/appearance", label: "Appearance" },
  { href: "/space/displays", label: "Displays" },
  { href: "/space/connections", label: "Connections" },
  { href: "/space/notifications", label: "Notifications" },
  { href: "/space/routines", label: "Routines" },
  { href: "/space/guide", label: "Guide" },
  { href: "/space/profile", label: "Profile" },
  { href: "/space/data", label: "Data" },
  { href: "/about", label: "About" },
];

export function SpaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-4xl">
      <header className="rise mb-8">
        <h1 className="display text-3xl font-light text-ink">Space</h1>
      </header>
      <nav aria-label="Settings sections" className="rise mb-8 flex flex-wrap gap-1.5" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        {SECTIONS.map((s) => {
          const active =
            s.href === "/space" ? pathname === "/space" : pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors duration-[var(--dur-base)] ${
                active
                  ? "bg-bg2 text-ink border border-line-strong"
                  : "text-ink-faint border border-transparent hover:bg-bg1 hover:text-ink-dim"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
      <div className="rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}
