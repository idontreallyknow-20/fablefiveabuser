"use client";

// A small, Supabase-shaped client over on-device storage. Orbit has no
// accounts: every browser gets its own private space and nothing leaves
// the device. The query surface matches the subset of supabase-js the app
// uses, so data hooks read like ordinary PostgREST code.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { backend, type Row } from "@/lib/local/store";
import { EMBEDS, ON_DELETE, TABLES, UNIQUE, seedRows } from "@/lib/local/schema";

type Value = unknown;
type Filter = (row: Row) => boolean;
export interface LocalError {
  message: string;
  code: string;
}
interface Result<T> {
  data: T;
  error: LocalError | null;
}

const USER_KEY = "orbit-device-id";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let deviceId: string | null = null;
/** stable per-browser id that stands in for a user id */
export function localUserId(): string {
  if (deviceId) return deviceId;
  try {
    deviceId = localStorage.getItem(USER_KEY);
    if (!deviceId) {
      deviceId = uuid();
      localStorage.setItem(USER_KEY, deviceId);
    }
  } catch {
    deviceId = uuid();
  }
  return deviceId;
}

// ------------------------------------------------------------- change feed --

type ChangeListener = (table: string) => void;
const listeners = new Set<ChangeListener>();
let bus: BroadcastChannel | null = null;

function channelBus(): BroadcastChannel | null {
  if (bus || typeof BroadcastChannel === "undefined") return bus;
  bus = new BroadcastChannel("orbit-local");
  bus.onmessage = (e: MessageEvent<{ table: string }>) => {
    listeners.forEach((l) => l(e.data.table));
  };
  return bus;
}

function emit(table: string) {
  listeners.forEach((l) => l(table));
  channelBus()?.postMessage({ table });
}

// ------------------------------------------------------------------ seeding --

let ready: Promise<void> | null = null;

/** first visit on a device creates the profile and starter rows */
function ensureSeeded(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = await backend();
      const uid = localUserId();
      const profiles = await db.all("profiles");
      if (profiles.some((p) => p.id === uid)) return;
      await db.put("profiles", [{ ...TABLES.profiles.defaults(), id: uid } as Row]);
      for (const [table, rows] of Object.entries(seedRows())) {
        const existing = await db.all(table);
        if (existing.length > 0) continue;
        await db.put(
          table,
          rows.map((r) => ({ ...TABLES[table].defaults(), id: uuid(), user_id: uid, ...r }) as Row),
        );
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

// --------------------------------------------------------------- comparison --

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T/;

function comparable(v: Value): number | string | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && ISO_DATETIME.test(v)) {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  if (typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}

function compare(a: Value, b: Value): number {
  const x = comparable(a);
  const y = comparable(b);
  if (x === y) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  const xs = String(x);
  const ys = String(y);
  return xs < ys ? -1 : xs > ys ? 1 : 0;
}

function equal(a: Value, b: Value): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a) === String(b);
}

// -------------------------------------------------------------------- query --

type Mode = "select" | "insert" | "update" | "upsert" | "delete";

class LocalQuery<T = unknown> implements PromiseLike<Result<T>> {
  private mode: Mode = "select";
  private cols = "*";
  private returning = false;
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private max: number | null = null;
  private one: "single" | "maybe" | null = null;
  private payload: Record<string, Value>[] = [];
  private patch: Record<string, Value> = {};
  private conflict: string[] = ["id"];

  constructor(private table: string) {}

  select(cols = "*") {
    this.cols = cols;
    if (this.mode !== "select") this.returning = true;
    return this;
  }
  insert(values: Record<string, Value> | Record<string, Value>[]) {
    this.mode = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  upsert(values: Record<string, Value> | Record<string, Value>[], opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    if (opts?.onConflict) this.conflict = opts.onConflict.split(",").map((c) => c.trim());
    return this;
  }
  update(values: Record<string, Value>) {
    this.mode = "update";
    this.patch = values;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col: string, v: Value) {
    this.filters.push((r) => equal(r[col], v));
    return this;
  }
  neq(col: string, v: Value) {
    this.filters.push((r) => r[col] != null && !equal(r[col], v));
    return this;
  }
  gt(col: string, v: Value) {
    this.filters.push((r) => r[col] != null && compare(r[col], v) > 0);
    return this;
  }
  gte(col: string, v: Value) {
    this.filters.push((r) => r[col] != null && compare(r[col], v) >= 0);
    return this;
  }
  lt(col: string, v: Value) {
    this.filters.push((r) => r[col] != null && compare(r[col], v) < 0);
    return this;
  }
  lte(col: string, v: Value) {
    this.filters.push((r) => r[col] != null && compare(r[col], v) <= 0);
    return this;
  }
  in(col: string, list: readonly Value[]) {
    this.filters.push((r) => list.some((v) => equal(r[col], v)));
    return this;
  }
  is(col: string, v: null | boolean) {
    this.filters.push((r) => (v === null ? r[col] == null : r[col] === v));
    return this;
  }
  not(col: string, op: string, v: Value) {
    if (op === "is") this.filters.push((r) => (v === null ? r[col] != null : r[col] !== v));
    else if (op === "eq") this.filters.push((r) => !equal(r[col], v));
    else throw new Error(`not.${op} is not supported on this device store`);
    return this;
  }
  match(query: Record<string, Value>) {
    for (const [k, v] of Object.entries(query)) this.eq(k, v);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    const asc = opts?.ascending ?? true;
    this.orders.push({ col, asc, nullsFirst: opts?.nullsFirst ?? !asc });
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }

  then<A = Result<T>, B = never>(
    onfulfilled?: ((value: Result<T>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<Result<T>> {
    try {
      const rows = await this.exec();
      return this.shape(rows);
    } catch (e) {
      const err = e as Partial<LocalError>;
      return {
        data: null as T,
        error: { message: err.message ?? "Something went wrong", code: err.code ?? "local" },
      };
    }
  }

  private shape(rows: Row[] | null): Result<T> {
    if (rows === null) return { data: null as T, error: null };
    const out = rows.map((r) => this.project(r));
    if (this.one) {
      if (out.length === 0 && this.one === "maybe") return { data: null as T, error: null };
      if (out.length !== 1) {
        return {
          data: null as T,
          error: {
            message: out.length === 0 ? "No rows found" : "More than one row returned",
            code: "PGRST116",
          },
        };
      }
      return { data: out[0] as T, error: null };
    }
    return { data: out as T, error: null };
  }

  private project(row: Row): Record<string, Value> {
    const parts = this.cols.split(",").map((c) => c.trim()).filter(Boolean);
    if (parts.length === 0 || parts.includes("*")) return this.embedded(row);
    const out: Record<string, Value> = {};
    for (const p of parts) if (!p.includes("(")) out[p] = row[p];
    return out;
  }

  private embedded(row: Row): Record<string, Value> {
    return { ...row, ...(this.embeds.get(row.id) ?? {}) };
  }

  private embeds = new Map<string, Record<string, Row[]>>();

  private async loadEmbeds(rows: Row[]) {
    const wanted = [...this.cols.matchAll(/(\w+)\(\*\)/g)].map((m) => m[1]);
    if (wanted.length === 0) return;
    const db = await backend();
    for (const child of wanted) {
      const fk = EMBEDS[this.table]?.[child];
      if (!fk) throw new Error(`No relation from ${this.table} to ${child}`);
      const kids = await db.all(child);
      for (const r of rows) {
        const entry = this.embeds.get(r.id) ?? {};
        entry[child] = kids.filter((k) => k[fk] === r.id);
        this.embeds.set(r.id, entry);
      }
    }
  }

  private sorted(rows: Row[]): Row[] {
    const out = [...rows];
    out.sort((a, b) => {
      for (const o of this.orders) {
        const av = a[o.col];
        const bv = b[o.col];
        const an = av === null || av === undefined;
        const bn = bv === null || bv === undefined;
        if (an || bn) {
          if (an && bn) continue;
          return an === o.nullsFirst ? -1 : 1;
        }
        const c = compare(av, bv);
        if (c !== 0) return o.asc ? c : -c;
      }
      return 0;
    });
    return this.max === null ? out : out.slice(0, this.max);
  }

  private matches(row: Row) {
    return this.filters.every((f) => f(row));
  }

  private checkUnique(all: Row[], row: Row) {
    for (const u of UNIQUE[this.table] ?? []) {
      if (u.cols.some((c) => row[c] == null)) continue;
      if (u.where && !u.where(row)) continue;
      const clash = all.find(
        (o) =>
          o.id !== row.id &&
          (!u.where || u.where(o)) &&
          u.cols.every((c) => equal(o[c], row[c])),
      );
      if (clash) {
        throw Object.assign(new Error(`duplicate key value violates unique constraint on ${this.table}`), {
          code: "23505",
        });
      }
    }
  }

  private async exec(): Promise<Row[] | null> {
    const spec = TABLES[this.table];
    if (!spec) throw new Error(`Unknown table ${this.table}`);
    await ensureSeeded();
    const db = await backend();
    const uid = localUserId();
    const all = await db.all(this.table);

    if (this.mode === "select") {
      const rows = this.sorted(all.filter((r) => this.matches(r)));
      await this.loadEmbeds(rows);
      return rows;
    }

    if (this.mode === "insert" || this.mode === "upsert") {
      const written: Row[] = [];
      const working = [...all];
      for (const item of this.payload) {
        const clean = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined));
        const existing =
          this.mode === "upsert"
            ? working.find((r) => this.conflict.every((c) => clean[c] !== undefined && equal(r[c], clean[c])))
            : undefined;
        let row: Row;
        if (existing) {
          row = { ...existing, ...clean } as Row;
          if (spec.touch) row.updated_at = new Date().toISOString();
        } else {
          row = {
            ...spec.defaults(),
            ...(spec.owned ? { user_id: uid } : {}),
            id: uuid(),
            ...clean,
          } as Row;
          if (!existing && working.some((r) => r.id === row.id)) {
            throw Object.assign(new Error(`duplicate key value on ${this.table}`), { code: "23505" });
          }
        }
        this.checkUnique(working, row);
        const idx = working.findIndex((r) => r.id === row.id);
        if (idx >= 0) working[idx] = row;
        else working.push(row);
        written.push(row);
      }
      await db.put(this.table, written);
      emit(this.table);
      return this.returning ? written : null;
    }

    if (this.mode === "update") {
      const targets = all.filter((r) => this.matches(r));
      const clean = Object.fromEntries(Object.entries(this.patch).filter(([, v]) => v !== undefined));
      const stamp = spec.touch && !("updated_at" in clean) ? { updated_at: new Date().toISOString() } : {};
      const updated = targets.map((r) => ({ ...r, ...clean, ...stamp }) as Row);
      const working = all.map((r) => updated.find((u) => u.id === r.id) ?? r);
      for (const u of updated) this.checkUnique(working, u);
      if (updated.length > 0) {
        await db.put(this.table, updated);
        emit(this.table);
      }
      return this.returning ? this.sorted(updated) : null;
    }

    // delete, with the foreign key reactions the schema declares
    const targets = all.filter((r) => this.matches(r));
    if (targets.length > 0) {
      const ids = new Set(targets.map((r) => r.id));
      for (const fk of ON_DELETE[this.table] ?? []) {
        const kids = (await db.all(fk.table)).filter((k) => ids.has(k[fk.col] as string));
        if (kids.length === 0) continue;
        if (fk.action === "cascade") await db.remove(fk.table, kids.map((k) => k.id));
        else await db.put(fk.table, kids.map((k) => ({ ...k, [fk.col]: null }) as Row));
        emit(fk.table);
      }
      await db.remove(this.table, [...ids]);
      emit(this.table);
    }
    return this.returning ? targets : null;
  }
}

// ------------------------------------------------------------------ storage --

const objectUrls = new Map<string, string>();

function bucket(name: string) {
  const key = (path: string) => `${name}/${path}`;
  return {
    async upload(path: string, file: Blob, opts?: { contentType?: string; upsert?: boolean }) {
      try {
        const db = await backend();
        if (!opts?.upsert && (await db.getFile(key(path)))) {
          return { data: null, error: { message: "The resource already exists", code: "409" } };
        }
        await db.putFile(key(path), { blob: file, type: opts?.contentType ?? file.type });
        return { data: { path }, error: null };
      } catch (e) {
        return { data: null, error: { message: (e as Error).message || "Could not save the file", code: "local" } };
      }
    },
    async download(path: string) {
      const db = await backend();
      const f = await db.getFile(key(path));
      if (!f) return { data: null, error: { message: "Object not found", code: "404" } };
      return { data: f.blob, error: null };
    },
    async remove(paths: string[]) {
      const db = await backend();
      for (const p of paths) {
        await db.removeFile(key(p));
        const url = objectUrls.get(key(p));
        if (url) URL.revokeObjectURL(url);
        objectUrls.delete(key(p));
      }
      return { data: [], error: null };
    },
    /** object URL for a stored file; cached so repeated reads share one */
    async createSignedUrl(path: string, ttl?: number) {
      void ttl;
      const hit = objectUrls.get(key(path));
      if (hit) return { data: { signedUrl: hit }, error: null };
      const db = await backend();
      const f = await db.getFile(key(path));
      if (!f) return { data: null, error: { message: "Object not found", code: "404" } };
      const url = URL.createObjectURL(f.blob);
      objectUrls.set(key(path), url);
      return { data: { signedUrl: url }, error: null };
    },
  };
}

// --------------------------------------------------------------------- auth --

function localUser() {
  return {
    id: localUserId(),
    aud: "local",
    role: "authenticated",
    email: "",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date(0).toISOString(),
  };
}

const auth = {
  async getUser() {
    await ensureSeeded();
    return { data: { user: localUser() }, error: null };
  },
  async getSession() {
    await ensureSeeded();
    return { data: { session: { user: localUser(), access_token: "" } }, error: null };
  },
};

// ------------------------------------------------------------------ realtime --

interface Subscription {
  table: string;
  cb: () => void;
}

function channel(name: string) {
  void name;
  const subs: Subscription[] = [];
  let listener: ChangeListener | null = null;
  const ch = {
    on(_type: string, filter: { table: string }, cb: () => void) {
      subs.push({ table: filter.table, cb });
      return ch;
    },
    subscribe() {
      channelBus();
      listener = (table) => subs.filter((s) => s.table === table).forEach((s) => s.cb());
      listeners.add(listener);
      return ch;
    },
    unsubscribe() {
      if (listener) listeners.delete(listener);
      listener = null;
    },
  };
  return ch;
}

// ------------------------------------------------------------------- client --

const client = {
  from: (table: string) => new LocalQuery(table),
  storage: { from: bucket },
  auth,
  channel,
  removeChannel(ch: ReturnType<typeof channel>) {
    ch.unsubscribe();
  },
};

/**
 * The app's data client. Typed as the Supabase client it replaces so every
 * query keeps its row types; only the subset implemented above is valid.
 */
export function localDb(): SupabaseClient<Database> {
  return client as unknown as SupabaseClient<Database>;
}

/** raw access for backup and restore */
export const localAdmin = {
  tables: () => Object.keys(TABLES),
  async dump(): Promise<Record<string, Row[]>> {
    await ensureSeeded();
    const db = await backend();
    const out: Record<string, Row[]> = {};
    for (const t of Object.keys(TABLES)) out[t] = await db.all(t);
    return out;
  },
  /** merge rows from a backup; the backup's owner becomes this device */
  async restore(data: Record<string, unknown[]>): Promise<number> {
    await ensureSeeded();
    const db = await backend();
    const uid = localUserId();
    let count = 0;
    for (const [table, rows] of Object.entries(data)) {
      const spec = TABLES[table];
      if (!spec || !Array.isArray(rows)) continue;
      const clean = rows
        .filter((r): r is Row => typeof r === "object" && r !== null && typeof (r as Row).id === "string")
        .map((r) => {
          const row = { ...spec.defaults(), ...r } as Row;
          if (table === "profiles") row.id = uid;
          else if (spec.owned) row.user_id = uid;
          return row;
        });
      if (clean.length === 0) continue;
      if (table === "profiles") {
        const current = (await db.all("profiles")).find((p) => p.id === uid);
        await db.put("profiles", [{ ...current, ...clean[0], id: uid } as Row]);
      } else {
        await db.put(table, clean);
      }
      count += clean.length;
      emit(table);
    }
    return count;
  },
  async erase() {
    const db = await backend();
    await db.clear();
    ready = null;
    for (const t of Object.keys(TABLES)) emit(t);
  },
};
