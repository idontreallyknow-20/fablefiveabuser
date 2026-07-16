"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings/store";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * The clock lockup: Orbit's signature element. Oversized Fraunces figures
 * with a monospace metadata line. Sizes fluidly from phone to ultrawide.
 */
export function Clock({
  size = "hero",
  meta,
}: {
  size?: "hero" | "ambient" | "compact";
  meta?: React.ReactNode;
}) {
  const now = useNow();
  const timezone = useSettings((s) => s.settings.location.timezone);

  if (!now) {
    return (
      <div aria-hidden className={size === "compact" ? "h-12" : "h-[clamp(72px,12vw,176px)]"} />
    );
  }

  const timeFmt = new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
  const [hh, mm] = timeFmt.format(now).split(":");
  const seconds = now.getSeconds();

  const sizeClass =
    size === "hero"
      ? "text-[clamp(64px,11vw,164px)]"
      : size === "ambient"
        ? "text-[clamp(88px,16vw,260px)]"
        : "text-[clamp(40px,6vw,64px)]";

  return (
    <div className={size === "ambient" ? "text-center" : ""}>
      <time
        dateTime={now.toISOString()}
        className={`display tnum block font-light leading-[0.95] tracking-tight text-ink ${sizeClass}`}
      >
        {hh}
        <span
          className="inline-block text-ink-dim"
          style={{ opacity: seconds % 2 === 0 ? 0.85 : 0.4, transition: "opacity 0.4s" }}
        >
          :
        </span>
        {mm}
      </time>
      <div
        className={`tnum mt-2 flex items-center gap-3 font-mono text-[13px] text-ink-dim ${
          size === "ambient" ? "justify-center" : ""
        }`}
      >
        <span>{dateFmt.format(now)}</span>
        {meta}
      </div>
    </div>
  );
}
