"use client";

// Lofi tile: toggles the singleton generative soundscape. Visually distinct
// from one-shot pads — a slowly spinning record ring marks the running state.

import { useSyncExternalStore } from "react";
import { isLofiRunning, startLofi, stopLofi, subscribeLofi } from "@/lib/sound/lofi";

export function useLofiRunning(): boolean {
  return useSyncExternalStore(subscribeLofi, isLofiRunning, () => false);
}

export function LofiPad() {
  const running = useLofiRunning();
  return (
    <button
      onClick={() => (running ? stopLofi() : startLofi())}
      aria-pressed={running}
      aria-label="Lofi"
      className={`flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-[var(--dur-fast)] active:scale-[0.97] ${
        running
          ? "border-transparent bg-accent-soft shadow-[inset_0_0_0_2px_var(--accent)]"
          : "border-line hover:border-line-strong"
      }`}
    >
      <span
        className={`relative flex h-7 w-7 items-center justify-center ${
          running ? "text-accent" : "text-ink-faint"
        }`}
        aria-hidden
      >
        <svg
          viewBox="0 0 28 28"
          className={`absolute inset-0 ${running ? "animate-[spin_5s_linear_infinite]" : "opacity-50"}`}
        >
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="11 8"
            strokeLinecap="round"
          />
        </svg>
        <span
          className={`h-2 w-2 rounded-full bg-current ${running ? "animate-pulse" : "opacity-50"}`}
        />
      </span>
      <span className={`text-[12px] ${running ? "text-ink" : "text-ink-dim"}`}>Lofi</span>
    </button>
  );
}
