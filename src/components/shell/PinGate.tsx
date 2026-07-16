"use client";

import { useState, useSyncExternalStore } from "react";
import { useSettings } from "@/lib/settings/store";

// session unlock flag as an external store so render stays pure
const unlockListeners = new Set<() => void>();
function readUnlocked() {
  return sessionStorage.getItem("orbit-unlocked") === "1";
}
function setUnlocked() {
  sessionStorage.setItem("orbit-unlocked", "1");
  unlockListeners.forEach((l) => l());
}
function useUnlocked() {
  return useSyncExternalStore(
    (onChange) => {
      unlockListeners.add(onChange);
      return () => unlockListeners.delete(onChange);
    },
    readUnlocked,
    () => true, // server: render nothing until the client knows
  );
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Optional local PIN lock: a light privacy layer for shared rooms.
 * Unlock state lives in sessionStorage, so a fresh tab asks again.
 */
export function PinGate() {
  const pinLock = useSettings((s) => s.settings.pinLock);
  const unlocked = useUnlocked();
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);

  if (!pinLock.enabled || unlocked) return null;

  const tryUnlock = async (value: string) => {
    if ((await sha256(value)) === pinLock.hash) {
      setUnlocked();
    } else {
      setWrong(true);
      setPin("");
      setTimeout(() => setWrong(false), 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-bg0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          tryUnlock(pin);
        }}
        className="flex flex-col items-center gap-5"
      >
        <p className="eyebrow">Locked</p>
        <label className="sr-only" htmlFor="pin-input">
          Enter PIN
        </label>
        <input
          id="pin-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 8);
            setPin(v);
            if (v.length >= 4) tryUnlock(v);
          }}
          className={`tnum h-14 w-44 rounded-xl border bg-bg1 text-center font-mono text-2xl tracking-[0.4em] text-ink focus:outline-none ${
            wrong ? "border-(--danger)/60" : "border-line focus:border-(--accent)/50"
          }`}
        />
        {wrong && <p className="text-[13px] text-danger">Not quite. Try again.</p>}
      </form>
    </div>
  );
}
