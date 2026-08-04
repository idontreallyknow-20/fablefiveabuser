"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AtmosphereCanvas } from "@/components/atmosphere/AtmosphereCanvas";
import { BackdropMedia } from "@/components/atmosphere/BackdropMedia";
import {
  IconAmbient,
  IconCalendar,
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
import { OutboxDot } from "@/components/shell/OutboxDot";

const NAV = [
  { href: "/today", label: "Today", icon: IconToday },
  { href: "/projects", label: "Projects", icon: IconProjects },
  { href: "/calendar", label: "Calendar", icon: IconCalendar },
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: profile } = useProfile();
  const modules = useSettings((s) => s.settings.modules);
  useIdleAmbient();

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
        <OutboxDot />
        {children}
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <BackdropMedia />
      <AtmosphereCanvas />
      <AutoTheme />
      <PinGate />
      <OutboxDot />

      {/* desktop rail */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center border-r border-line bg-bg0/55 py-6 backdrop-blur-sm md:flex"
      >
        <Link
          href="/today"
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

      {/* mobile tab bar */}
      <nav
        aria-label="Primary"
        className="floating fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-1 py-1.5 md:hidden"
        style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors duration-[var(--dur-base)]",
                active ? "text-accent" : "text-ink-faint",
              ].join(" ")}
            >
              <Icon size={19} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="relative z-10 min-h-dvh px-4 pb-28 pt-6 md:pb-10 md:pl-[104px] md:pr-8 md:pt-8">
        <div className="mx-auto w-full max-w-[1560px]">{children}</div>
      </main>
    </div>
  );
}
