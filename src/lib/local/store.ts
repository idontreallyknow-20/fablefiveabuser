"use client";

// On-device row storage. Every table lives in one IndexedDB object store,
// keyed by [table, id], so writes from separate tabs never clobber each
// other. When IndexedDB is unavailable (some private modes) it falls back
// to memory for the session so the app still works.

import { openDB, type IDBPDatabase } from "idb";

export type Row = Record<string, unknown> & { id: string };

interface RowRecord {
  t: string;
  id: string;
  row: Row;
}

interface FileRecord {
  blob: Blob;
  type: string;
}

export interface Backend {
  all(table: string): Promise<Row[]>;
  put(table: string, rows: Row[]): Promise<void>;
  remove(table: string, ids: string[]): Promise<void>;
  clear(): Promise<void>;
  getFile(key: string): Promise<FileRecord | undefined>;
  putFile(key: string, file: FileRecord): Promise<void>;
  removeFile(key: string): Promise<void>;
}

function memoryBackend(): Backend {
  const rows = new Map<string, Map<string, Row>>();
  const files = new Map<string, FileRecord>();
  const table = (t: string) => {
    let m = rows.get(t);
    if (!m) rows.set(t, (m = new Map()));
    return m;
  };
  return {
    all: async (t) => [...table(t).values()].map((r) => structuredClone(r)),
    put: async (t, list) => {
      for (const r of list) table(t).set(r.id, structuredClone(r));
    },
    remove: async (t, ids) => {
      for (const id of ids) table(t).delete(id);
    },
    clear: async () => {
      rows.clear();
      files.clear();
    },
    getFile: async (k) => files.get(k),
    putFile: async (k, f) => {
      files.set(k, f);
    },
    removeFile: async (k) => {
      files.delete(k);
    },
  };
}

function idbBackend(db: IDBPDatabase): Backend {
  return {
    all: async (t) =>
      ((await db.getAllFromIndex("rows", "t", t)) as RowRecord[]).map((r) => r.row),
    put: async (t, list) => {
      const tx = db.transaction("rows", "readwrite");
      await Promise.all([
        ...list.map((row) => tx.store.put({ t, id: row.id, row } satisfies RowRecord)),
        tx.done,
      ]);
    },
    remove: async (t, ids) => {
      const tx = db.transaction("rows", "readwrite");
      await Promise.all([...ids.map((id) => tx.store.delete([t, id])), tx.done]);
    },
    clear: async () => {
      await db.clear("rows");
      await db.clear("files");
    },
    getFile: async (k) => (await db.get("files", k)) as FileRecord | undefined,
    putFile: async (k, f) => {
      await db.put("files", f, k);
    },
    removeFile: async (k) => {
      await db.delete("files", k);
    },
  };
}

let backendPromise: Promise<Backend> | null = null;

export function backend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (typeof indexedDB === "undefined") return memoryBackend();
      try {
        const db = await openDB("orbit-local", 1, {
          upgrade(d) {
            const rows = d.createObjectStore("rows", { keyPath: ["t", "id"] });
            rows.createIndex("t", "t");
            d.createObjectStore("files");
          },
        });
        return idbBackend(db);
      } catch {
        return memoryBackend();
      }
    })();
  }
  return backendPromise;
}
