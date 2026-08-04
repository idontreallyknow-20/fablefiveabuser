"use client";

// React Query cache persistence on idb, so tasks/calendar/routines paint
// instantly and survive being offline.

import { openDB } from "idb";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

const KEY = "query-cache";

export function createIdbPersister(): Persister {
  // SSR renders have no indexedDB; persistence is a client concern
  if (typeof indexedDB === "undefined") {
    return {
      persistClient: async () => {},
      restoreClient: async () => undefined,
      removeClient: async () => {},
    };
  }
  const db = openDB("orbit-query-cache", 1, {
    upgrade(d) {
      d.createObjectStore("cache");
    },
  });
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await (await db).put("cache", client, KEY);
      } catch {
        // storage full or unavailable; persistence is best-effort
      }
    },
    restoreClient: async () => {
      try {
        return (await (await db).get("cache", KEY)) as PersistedClient | undefined;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await (await db).delete("cache", KEY);
      } catch {}
    },
  };
}

/** query keys worth keeping across sessions */
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0];
  return (
    head === "tasks" ||
    head === "routines" ||
    head === "routine_logs" ||
    head === "meals" ||
    head === "team" ||
    head === "soundboard" ||
    head === "weather" ||
    head === "profile"
  );
}
