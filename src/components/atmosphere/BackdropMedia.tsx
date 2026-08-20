"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/settings/store";
import { useBackgrounds, useBackgroundUrl } from "@/lib/backgrounds/data";
import { getBuiltinBackground, isBuiltinBackgroundId } from "@/lib/backgrounds/builtins";
import { backdropFilter } from "@/lib/backgrounds/filters";

/**
 * Custom background media, rendered under the atmosphere canvas. Paints the
 * row's average color immediately so nothing flashes while the signed URL
 * and the media itself stream in.
 */
export function BackdropMedia() {
  const background = useSettings((s) => s.settings.background);
  const builtin = getBuiltinBackground(background.id);
  const wantsRow = Boolean(background.id) && !isBuiltinBackgroundId(background.id);
  const { data: rows } = useBackgrounds({ enabled: wantsRow });
  const row = wantsRow ? rows?.find((r) => r.id === background.id) : undefined;
  const { data: signedUrl } = useBackgroundUrl(row?.path);

  const kind: "image" | "video" = builtin ? "image" : row?.kind === "video" ? "video" : "image";
  const src = builtin ? builtin.path : signedUrl ?? null;
  const avgColor = builtin ? builtin.avgColor : row?.avg_color ?? "#101014";

  // fade in once THIS src has loaded; a src change resets it implicitly
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc !== null && loadedSrc === src;

  // pause the loop while the tab is hidden
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (kind !== "video" || !src) return;
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [kind, src]);

  if (!background.id) return null;
  if (!builtin && !row) return null;

  const filter = backdropFilter(background);
  const mediaStyle: React.CSSProperties = {
    filter,
    opacity: loaded ? 1 : 0,
    transition: "opacity 600ms ease",
  };

  return (
    <div
      className="fixed inset-0 -z-20 overflow-hidden"
      style={{ backgroundColor: avgColor }}
      aria-hidden
    >
      {src && kind === "video" ? (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setLoadedSrc(src)}
          className="h-full w-full object-cover"
          style={mediaStyle}
        />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onLoad={() => setLoadedSrc(src)}
          className="h-full w-full object-cover"
          style={mediaStyle}
        />
      ) : null}
    </div>
  );
}
