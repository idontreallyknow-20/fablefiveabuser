import { beforeEach, describe, expect, it, vi } from "vitest";

// in-memory stand-ins for idb and supabase so the queue logic is testable
const store = new Map<string, unknown>();
vi.mock("idb", () => ({
  openDB: async () => ({
    put: async (_s: string, v: { id: string }) => void store.set(v.id, v),
    getAll: async () => [...store.values()],
    delete: async (_s: string, k: string) => void store.delete(k),
    count: async () => store.size,
  }),
}));

const calls: { table: string; op: string }[] = [];
let failNextInsert = false;
vi.mock("@/lib/supabase/client", () => ({
  supabaseBrowser: () => ({
    from: (table: string) => ({
      insert: async () => {
        calls.push({ table, op: "insert" });
        if (failNextInsert) {
          failNextInsert = false;
          return { error: new Error("Failed to fetch") };
        }
        return { error: null };
      },
      update: () => ({
        eq: async () => {
          calls.push({ table, op: "update" });
          return { error: null };
        },
      }),
      delete: () => ({
        eq: async () => {
          calls.push({ table, op: "delete" });
          return { error: null };
        },
      }),
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { updated_at: "2000-01-01" } }),
        }),
      }),
    }),
  }),
}));

import { enqueue, flushOutbox, isNetworkError, runOrQueue } from "@/lib/offline/outbox";

beforeEach(() => {
  store.clear();
  calls.length = 0;
});

describe("isNetworkError", () => {
  it("matches fetch failures", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("fetch failed"))).toBe(true);
    expect(isNetworkError(new Error("duplicate key value"))).toBe(false);
  });
});

describe("runOrQueue", () => {
  it("does not queue when the write succeeds", async () => {
    await runOrQueue({ table: "tasks", op: "insert", payload: {} }, async () => {});
    expect(store.size).toBe(0);
  });
  it("queues network failures and rethrows real errors", async () => {
    await runOrQueue({ table: "tasks", op: "insert", payload: {} }, async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(store.size).toBe(1);
    await expect(
      runOrQueue({ table: "tasks", op: "insert", payload: {} }, async () => {
        throw new Error("row violates policy");
      }),
    ).rejects.toThrow("policy");
    expect(store.size).toBe(1);
  });
});

describe("flushOutbox", () => {
  it("replays queued ops in order and clears them", async () => {
    await enqueue({ table: "tasks", op: "insert", payload: { title: "a" } });
    await enqueue({ table: "tasks", op: "update", rowId: "x", payload: { note: "b" } });
    await enqueue({ table: "meals", op: "delete", rowId: "y" });
    await flushOutbox();
    expect(calls.map((c) => c.op)).toEqual(["insert", "update", "delete"]);
    expect(store.size).toBe(0);
  });
  it("keeps ops queued when still offline", async () => {
    await enqueue({ table: "tasks", op: "insert", payload: { title: "a" } });
    failNextInsert = true;
    await flushOutbox();
    expect(store.size).toBe(1);
  });
});
