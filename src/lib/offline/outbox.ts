"use client";

// Offline mutation outbox: when a write fails because the network is
// gone, it queues in idb, applies optimistically, and replays when the
// connection returns. Last-write-wins; a newer server row drops the op.

import { openDB, type IDBPDatabase } from "idb";
import { create } from "zustand";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface OutboxOp {
  id: string;
  table: "tasks" | "routine_logs" | "selfcare_logs" | "meals";
  op: "insert" | "update" | "delete";
  /** row id for update/delete */
  rowId?: string;
  payload?: Record<string, unknown>;
  /** updated_at of the row when the op was queued, for conflict checks */
  baseUpdatedAt?: string | null;
  at: number;
}

interface OutboxState {
  pending: number;
  setPending: (n: number) => void;
}

export const useOutboxStore = create<OutboxState>((set) => ({
  pending: 0,
  setPending: (pending) => set({ pending }),
}));

let dbPromise: Promise<IDBPDatabase> | null = null;
function idb() {
  if (!dbPromise) {
    dbPromise = openDB("orbit-outbox", 1, {
      upgrade(db) {
        db.createObjectStore("ops", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

async function refreshCount() {
  const count = await (await idb()).count("ops");
  useOutboxStore.getState().setPending(count);
}

/** true when the failure smells like lost connectivity, not a server error */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /failed to fetch|network|load failed|fetch failed/i.test(msg);
}

export async function enqueue(op: Omit<OutboxOp, "id" | "at">) {
  const row: OutboxOp = { ...op, id: crypto.randomUUID(), at: Date.now() };
  await (await idb()).put("ops", row);
  await refreshCount();
}

let flushing = false;

export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const db = await idb();
    const ops = ((await db.getAll("ops")) as OutboxOp[]).sort((a, b) => a.at - b.at);
    const supabase = supabaseBrowser();
    for (const op of ops) {
      try {
        if (op.op === "insert") {
          const { error } = await supabase
            .from(op.table)
            .insert(op.payload as never);
          if (error && !/duplicate/i.test(error.message)) throw error;
        } else if (op.op === "update" && op.rowId) {
          // conflict check: a newer server row wins over the queued patch
          if (op.baseUpdatedAt) {
            const { data } = await supabase
              .from(op.table)
              .select("updated_at")
              .eq("id", op.rowId)
              .maybeSingle();
            const serverAt = (data as { updated_at?: string } | null)?.updated_at;
            if (serverAt && serverAt > op.baseUpdatedAt) {
              await db.delete("ops", op.id);
              continue;
            }
          }
          const { error } = await supabase
            .from(op.table)
            .update(op.payload as never)
            .eq("id", op.rowId);
          if (error) throw error;
        } else if (op.op === "delete" && op.rowId) {
          const { error } = await supabase.from(op.table).delete().eq("id", op.rowId);
          if (error) throw error;
        }
        await db.delete("ops", op.id);
      } catch (e) {
        if (isNetworkError(e)) break; // still offline; keep the rest queued
        await db.delete("ops", op.id); // poison op; drop it
      }
    }
  } finally {
    flushing = false;
    await refreshCount();
  }
}

/** run a write now, or queue it for replay when the network is gone */
export async function runOrQueue(
  op: Omit<OutboxOp, "id" | "at">,
  exec: () => Promise<void>,
): Promise<void> {
  try {
    await exec();
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await enqueue(op);
  }
}

/** call once from the shell: replays on reconnect and on focus */
export function armOutboxFlush(): () => void {
  const onOnline = () => void flushOutbox();
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onOnline);
  void refreshCount();
  void flushOutbox();
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onOnline);
  };
}
