"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AtmosphereCanvas } from "@/components/atmosphere/AtmosphereCanvas";
import { BackdropMedia } from "@/components/atmosphere/BackdropMedia";
import {
  IconAmbient,
  IconCalendar,
  IconInsights,
  IconProjects,
  IconReflect,
  IconSound,
  IconSpace,
  IconToday,
  IconTrain,
} from "@/components/ui/Icons";
import { useSettings } from "@/lib/settings/store";
import { useProfile } from "@/lib/data/profile";
import { PinGate } from "@/components/shell/PinGate";
import { AutoTheme } from "@/components/shell/AutoTheme";
import { NotificationEngine } from "@/components/shell/NotificationEngine";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { AUTHOR } from "@/lib/site";

const NAV = [
  { href: "/today", label: "Today", icon: IconToday },
  { href: "/projects", label: "Projects", icon: IconProjects },
  { href: "/calendar", label: "Calendar", icon: IconCalendar },
  { href: "/insights", label: "Insights", icon: IconInsights, desktopOnly: true },
  { href: "/train", label: "Train", icon: IconTrain, module: "train" },
  { href: "/reflect", label: "Reflect", icon: IconReflect, module: "reflect" },
  { href: "/sounds", label: "Sounds", icon: IconSound, module: "sounds" },
  { href: "/space", label: "Space", icon: IconSpace },
] as const;

/** navigates to ambient mode after configured idle time */
function useIdleAmbient() {
  const router = useRouter();
  const pathname = usePathname();
  const ambient = useSettings((s) => s.settings.ambient);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ambient.autoAfterMin || pathname === "/ambient" || pathname === "/focus") return;
    const arm = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(
        () => router.push("/ambient?auto=1"),
        ambient.autoAfterMin * 60 * 1000,
      );
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [ambient.autoAfterMin, pathname, router]);
}

/** `c` anywhere (outside inputs) opens quick capture */
function useCaptureKey() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      router.push("/capture");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: profile } = useProfile();
  const modules = useSettings((s) => s.settings.modules);
  useIdleAmbient();
  useCaptureKey();

  const nav = NAV.filter(
    (item) => !("module" in item) || modules[item.module as keyof typeof modules],
  );
  const appName = profile?.app_name || "Orbit";
  const immersive = pathname === "/ambient" || pathname === "/focus" || pathname.startsWith("/display");

  if (immersive) {
    return (
      <div className="relative min-h-dvh">
        <BackdropMedia />
        <AtmosphereCanvas />
        <AutoTheme />
        <NotificationEngine />
        <PinGate />
        <CommandPalette />
        <AssistantPanel />
        {children}
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <BackdropMedia />
      <AtmosphereCanvas />
      <AutoTheme />
      <NotificationEngine />
      <PinGate />
      <CommandPalette />
      <AssistantPanel />

      {/* desktop rail */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center border-r border-line bg-bg0/55 py-6 backdrop-blur-sm md:flex"
      >
        <Link
          href="/today"
          aria-label={`${appName}, today`}
          className="display mb-8 text-[15px] font-medium tracking-tight text-ink-dim transition-colors hover:text-ink"
        >
          {appName.slice(0, 1)}
        </Link>
        <div className="flex flex-1 flex-col gap-1.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-[var(--dur-base)]",
                  active ? "bg-bg2 text-accent" : "text-ink-faint hover:bg-bg1 hover:text-ink-dim",
                ].join(" ")}
              >
                <Icon size={19} />
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg surface-overlay px-2.5 py-1 text-[12px] text-ink opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
        <Link
          href="/ambient"
          aria-label="Ambient mode"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-bg1 hover:text-ink-dim"
        >
          <IconAmbient size={19} />
        </Link>
      </nav>

      {/* mobile tab bar — icon-only so every module fits without clipping */}
      <nav
        aria-label="Primary"
        className="floating fixed inset-x-4 bottom-3 z-40 flex items-center rounded-[22px] px-1.5 py-1 md:hidden"
        style={{ paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}
      >
        {nav
          .filter((item) => !("desktopOnly" in item && item.desktopOnly))
          .map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex h-12 flex-1 flex-col items-center justify-center rounded-2xl transition-colors duration-[var(--dur-base)]",
                  active ? "text-accent" : "text-ink-faint active:text-ink-dim",
                ].join(" ")}
              >
                <Icon size={21} />
                <span
                  aria-hidden
                  className={[
                    "absolute bottom-1.5 h-1 w-1 rounded-full bg-accent transition-opacity duration-[var(--dur-base)]",
                    active ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                />
              </Link>
            );
          })}
      </nav>

      <main className="relative z-10 min-h-dvh px-4 pb-28 pt-6 md:pb-10 md:pl-[104px] md:pr-8 md:pt-8">
        <div className="mx-auto w-full max-w-[1560px]">{children}</div>
        <footer className="mx-auto mt-16 flex w-full max-w-[1560px] flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line/60 pt-5 text-[12px] text-ink-faint">
          <span>Free and private. Everything stays on this device.</span>
          <span className="flex items-center gap-3">
            <Link href="/about" className="transition-colors hover:text-ink-dim">
              About
            </Link>
            <span aria-hidden>·</span>
            <span>
              Built by{" "}
              <a href={AUTHOR.url} className="text-ink-dim transition-colors hover:text-accent">
                Joseph Leung
              </a>
            </span>
          </span>
        </footer>
      </main>
    </div>
  );
}
