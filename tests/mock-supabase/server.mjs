// Local development adapter: a small in-memory stand-in for Supabase
// (GoTrue password auth + a PostgREST subset) so Orbit can be developed and
// end-to-end tested where the real project is unreachable. It implements
// only what Orbit uses and is NEVER part of the production deployment.
//
// Usage:
//   node tests/mock-supabase/server.mjs           # listens on :54321
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 npm run dev

import http from "node:http";
import crypto from "node:crypto";

const PORT = process.env.MOCK_SUPABASE_PORT || 54321;

// ---------------------------------------------------------------- state --

const users = new Map(); // email -> {id, email, password, meta}
const sessions = new Map(); // access_token -> user id
const tables = new Map(); // name -> rows[]

const TABLES = [
  "profiles",
  "projects",
  "tasks",
  "nerf_content",
  "exercises",
  "workout_sessions",
  "workout_entries",
  "recovery_notes",
  "selfcare_logs",
  "checkins",
  "relationship_items",
  "routines",
  "routine_logs",
  "displays",
  "integration_accounts",
  "integration_secrets",
  "calendar_events",
  "teams",
  "team_members",
  "team_days",
  "soundboard_pads",
  "user_backgrounds",
  "meals",
  "calendar_links",
  "notification_prefs",
  "notification_log",
  "push_subscriptions",
];
for (const t of TABLES) tables.set(t, []);

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

function seedUserDefaults(userId, displayName) {
  tables.get("profiles").push({
    id: userId,
    display_name: displayName ?? "",
    app_name: "Orbit",
    settings: {},
    onboarded_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const exercises = [
    ["Handstand push-up", "skill", ["reps"]],
    ["Muscle-up", "skill", ["reps"]],
    ["Handstand balance", "skill", ["hold_seconds"]],
    ["Pull-up", "pull", ["reps", "weight_kg"]],
    ["Push-up", "push", ["reps"]],
    ["Bench press", "push", ["reps", "weight_kg"]],
    ["Vertical jump", "legs", ["distance_m"]],
    ["Run", "run", ["distance_m", "time_seconds"]],
  ];
  for (const [name, category, metrics] of exercises) {
    tables.get("exercises").push({
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      category,
      metrics,
      is_default: true,
      archived: false,
      created_at: nowIso(),
    });
  }
  const routines = [
    ["room_reset", "Five-minute room reset", "reset", ["21:00"]],
    ["clear_desk", "Clear desk", "reset", ["18:00"]],
    ["clothes_away", "Put clothes away", "reset", ["21:15"]],
    ["dishes_out", "Remove dishes", "reset", ["20:45"]],
    ["refill_water", "Refill water", "reset", ["09:00", "15:00"]],
    ["skincare_am", "Morning skincare", "skincare", ["08:30"]],
    ["skincare_pm", "Evening skincare", "skincare", ["22:30"]],
    ["prep_tomorrow", "Prepare for tomorrow", "prep", ["21:30"]],
    ["mobility", "Mobility", "movement", ["17:30"]],
    ["nightly_reflection", "Nightly reflection", "reflect", ["22:00"]],
  ];
  routines.forEach(([slug, name, category, times], i) => {
    tables.get("routines").push({
      id: crypto.randomUUID(),
      user_id: userId,
      slug,
      name,
      category,
      schedule: { times, days: [0, 1, 2, 3, 4, 5, 6] },
      enabled: true,
      sort_order: i + 1,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  });
  for (const cat of [
    "tasks", "calendar", "focus", "nerfchess", "workouts",
    "skincare", "resets", "checkins", "review",
  ]) {
    tables.get("notification_prefs").push({
      id: crypto.randomUUID(),
      user_id: userId,
      category: cat,
      enabled: true,
      updated_at: nowIso(),
    });
  }
}

// ------------------------------------------------------------- postgrest --

function parseFilter(value) {
  // "eq.abc" -> {op:'eq', v:'abc'}
  const dot = value.indexOf(".");
  return { op: value.slice(0, dot), v: value.slice(dot + 1) };
}

function coerce(v) {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

function matches(row, key, filter) {
  const { op, v } = filter;
  const val = row[key];
  switch (op) {
    case "eq":
      return String(val) === v;
    case "neq":
      return String(val) !== v;
    case "is":
      return coerce(v) === null ? val === null || val === undefined : Boolean(val) === coerce(v);
    case "not.is":
      return coerce(v) === null ? val !== null && val !== undefined : Boolean(val) !== coerce(v);
    case "gte":
      return val !== null && String(val) >= v;
    case "lte":
      return val !== null && String(val) <= v;
    case "gt":
      return val !== null && String(val) > v;
    case "lt":
      return val !== null && String(val) < v;
    case "in": {
      const list = v.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      return list.includes(String(val));
    }
    default:
      return true;
  }
}

function applyQuery(rows, url) {
  let out = [...rows];
  const order = [];
  let limit = null;
  for (const [key, raw] of url.searchParams.entries()) {
    if (key === "select" || key === "on_conflict") continue;
    if (key === "order") {
      for (const part of raw.split(",")) {
        const [col, ...mods] = part.split(".");
        order.push({ col, desc: mods.includes("desc") });
      }
      continue;
    }
    if (key === "limit") {
      limit = Number(raw);
      continue;
    }
    if (key === "not") continue; // handled via not.is composite below
    out = out.filter((r) => matches(r, key, parseFilter(raw)));
  }
  for (const o of [...order].reverse()) {
    out.sort((a, b) => {
      const av = a[o.col];
      const bv = b[o.col];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : 1;
      return o.desc ? -cmp : cmp;
    });
  }
  if (limit !== null) out = out.slice(0, limit);
  return out;
}

// PostgREST embeds: "*, workout_entries(*)" — join child rows by session_id
function applyEmbeds(rows, select, tableName) {
  if (!select || !select.includes("(")) return rows;
  const embeds = [...select.matchAll(/(\w+)\(\*\)/g)].map((m) => m[1]);
  if (embeds.length === 0) return rows;
  return rows.map((row) => {
    const clone = { ...row };
    for (const child of embeds) {
      const childRows = tables.get(child) ?? [];
      const fk = tableName === "workout_sessions" ? "session_id" : `${tableName.replace(/s$/, "")}_id`;
      clone[child] = childRows.filter((c) => c[fk] === row.id);
    }
    return clone;
  });
}

// ------------------------------------------------------------------ http --

function json(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "*",
    ...headers,
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

function bearerUser(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const uid = sessions.get(token);
  if (!uid) return null;
  for (const u of users.values()) if (u.id === uid) return u;
  return null;
}

function makeSession(user) {
  const access = `mock-access-${crypto.randomUUID()}`;
  const refresh = `mock-refresh-${crypto.randomUUID()}`;
  sessions.set(access, user.id);
  return {
    access_token: access,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: refresh,
    user: gotrueUser(user),
  };
}

function gotrueUser(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: nowIso(),
    app_metadata: { provider: "email" },
    user_metadata: user.meta ?? {},
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") return json(res, 204, {});

  // test-only: wipe all state so e2e runs start clean
  if (url.pathname === "/__reset" && req.method === "POST") {
    users.clear();
    sessions.clear();
    for (const t of TABLES) tables.set(t, []);
    return json(res, 200, { reset: true });
  }

  // ---- auth ----
  if (url.pathname === "/auth/v1/signup" && req.method === "POST") {
    const body = await readBody(req);
    if (users.has(body.email)) return json(res, 400, { error_description: "User already registered" });
    const user = {
      id: crypto.randomUUID(),
      email: body.email,
      password: body.password,
      meta: body.data ?? {},
    };
    users.set(body.email, user);
    seedUserDefaults(user.id, body.data?.display_name);
    const session = makeSession(user);
    return json(res, 200, { ...session, user: gotrueUser(user) });
  }

  if (url.pathname === "/auth/v1/token" && req.method === "POST") {
    const body = await readBody(req);
    if (url.searchParams.get("grant_type") === "password") {
      const user = users.get(body.email);
      if (!user || user.password !== body.password) {
        return json(res, 400, { error_code: "invalid_credentials", error_description: "Invalid login credentials", msg: "Invalid login credentials" });
      }
      return json(res, 200, makeSession(user));
    }
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const anyUser = [...users.values()][0];
      if (!anyUser) return json(res, 400, { error_description: "no user" });
      return json(res, 200, makeSession(anyUser));
    }
    return json(res, 400, { error_description: "unsupported grant" });
  }

  if (url.pathname === "/auth/v1/user" && req.method === "GET") {
    const user = bearerUser(req);
    if (!user) return json(res, 401, { msg: "invalid token" });
    return json(res, 200, gotrueUser(user));
  }

  if (url.pathname === "/auth/v1/user" && req.method === "PUT") {
    const user = bearerUser(req);
    if (!user) return json(res, 401, { msg: "invalid token" });
    const body = await readBody(req);
    if (body.password) user.password = body.password;
    return json(res, 200, gotrueUser(user));
  }

  if (url.pathname === "/auth/v1/logout") return json(res, 204, {});
  if (url.pathname === "/auth/v1/recover") return json(res, 200, {});

  // ---- rpc ----
  if (url.pathname === "/rest/v1/rpc/profile_count") {
    return json(res, 200, tables.get("profiles").length);
  }

  if (url.pathname.startsWith("/rest/v1/rpc/")) {
    const fn = url.pathname.slice("/rest/v1/rpc/".length);
    const user = bearerUser(req);
    if (!user) return json(res, 401, { message: "not signed in" });
    const body = await readBody(req);
    const teams = tables.get("teams");
    const members = tables.get("team_members");
    const days = tables.get("team_days");
    const isMember = (t) => members.some((m) => m.team_id === t && m.user_id === user.id);

    if (fn === "create_team") {
      const team = {
        id: crypto.randomUUID(),
        name: body.team_name ?? "",
        accent: "",
        notes: "",
        invite_code: Math.random().toString(36).slice(2, 10),
        created_by: user.id,
        created_at: nowIso(),
      };
      teams.push(team);
      members.push({
        team_id: team.id, user_id: user.id, role: "owner",
        display_name: body.member_name ?? "", joined_at: nowIso(),
      });
      return json(res, 200, team);
    }
    if (fn === "join_team") {
      const team = teams.find((t) => t.invite_code === body.code);
      if (!team) return json(res, 400, { message: "invalid code" });
      if (!members.some((m) => m.team_id === team.id && m.user_id === user.id)) {
        members.push({
          team_id: team.id, user_id: user.id, role: "member",
          display_name: body.member_name ?? "", joined_at: nowIso(),
        });
      }
      return json(res, 200, team);
    }
    if (fn === "team_today") {
      if (!isMember(body.t)) return json(res, 400, { message: "not a member" });
      const out = members
        .filter((m) => m.team_id === body.t)
        .map((m) => {
          const pri = tables.get("tasks").filter(
            (k) => k.user_id === m.user_id && k.priority_date === body.d && k.priority_slot != null,
          );
          return {
            user_id: m.user_id,
            display_name: m.display_name,
            priorities_total: pri.length,
            priorities_done: pri.filter((k) => k.completed_at).length,
          };
        });
      return json(res, 200, out);
    }
    if (fn === "team_streak") {
      if (!isMember(body.t)) return json(res, 400, { message: "not a member" });
      const dates = new Set(days.filter((x) => x.team_id === body.t && x.bonus_at).map((x) => x.date));
      let streak = 0;
      const cursor = new Date();
      if (!dates.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
      while (dates.has(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return json(res, 200, streak);
    }
    if (fn === "claim_team_day") {
      if (!isMember(body.t)) return json(res, 400, { message: "not a member" });
      const summary = members
        .filter((m) => m.team_id === body.t)
        .map((m) => {
          const pri = tables.get("tasks").filter(
            (k) => k.user_id === m.user_id && k.priority_date === body.d && k.priority_slot != null,
          );
          return { total: pri.length, done: pri.filter((k) => k.completed_at).length };
        });
      if (summary.some((s) => s.total === 0 || s.done < s.total)) {
        return json(res, 400, { message: "not aligned yet" });
      }
      let row = days.find((x) => x.team_id === body.t && x.date === body.d);
      if (!row) {
        row = { team_id: body.t, date: body.d, bonus_at: nowIso() };
        days.push(row);
      } else if (!row.bonus_at) {
        row.bonus_at = nowIso();
      }
      return json(res, 200, row);
    }
    return json(res, 404, { message: `rpc ${fn} not implemented in mock` });
  }

  // ---- rest ----
  const restMatch = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
  if (restMatch) {
    const tableName = restMatch[1];
    if (!tables.has(tableName)) return json(res, 404, { message: `table ${tableName} not found` });
    const user = bearerUser(req);
    // emulate RLS: own rows, plus team visibility where policies allow it
    const myTeams = user
      ? new Set(tables.get("team_members").filter((m) => m.user_id === user.id).map((m) => m.team_id))
      : new Set();
    const owns = (r) => {
      if (!user) return false;
      if (tableName === "profiles") return r.id === user.id;
      if (tableName === "teams") return myTeams.has(r.id);
      if (tableName === "team_members" || tableName === "team_days") return myTeams.has(r.team_id);
      if (tableName === "tasks") return r.user_id === user.id || (r.team_id && myTeams.has(r.team_id));
      return r.user_id === user.id;
    };
    const rows = tables.get(tableName);
    const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");

    if (req.method === "GET") {
      const visible = rows.filter(owns);
      let out = applyQuery(visible, url);
      out = applyEmbeds(out, url.searchParams.get("select"), tableName);
      if (single) return out.length > 0 ? json(res, 200, out[0]) : json(res, 200, null);
      return json(res, 200, out);
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const items = Array.isArray(body) ? body : [body];
      const created = items.map((item) => {
        const row = {
          id: crypto.randomUUID(),
          created_at: nowIso(),
          updated_at: nowIso(),
          date: item.date ?? (["checkins", "selfcare_logs", "workout_sessions", "routine_logs", "recovery_notes"].includes(tableName) ? today() : undefined),
          ...defaultsFor(tableName),
          ...item,
        };
        // upsert support
        const conflictKey = url.searchParams.get("on_conflict");
        if (conflictKey) {
          const keys = conflictKey.split(",");
          const existing = rows.find((r) => keys.every((k) => String(r[k]) === String(row[k])));
          if (existing) {
            Object.assign(existing, item, { updated_at: nowIso() });
            return existing;
          }
        }
        rows.push(row);
        return row;
      });
      const wantsRep = (req.headers.prefer ?? "").includes("return=representation");
      if (single) return json(res, 201, created[0]);
      return json(res, 201, wantsRep ? created : []);
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      const targets = applyQuery(rows.filter(owns), url);
      for (const t of targets) Object.assign(t, body, { updated_at: nowIso() });
      if (single) return json(res, 200, targets[0] ?? null);
      return json(res, 200, targets);
    }

    if (req.method === "DELETE") {
      const targets = new Set(applyQuery(rows.filter(owns), url).map((r) => r.id));
      const kept = rows.filter((r) => !targets.has(r.id));
      tables.set(tableName, kept);
      return json(res, 200, []);
    }
  }

  // realtime websocket handshake: reject politely; the client copes
  if (url.pathname.startsWith("/realtime")) return json(res, 404, {});

  json(res, 404, { message: "not implemented in mock" });
});

function defaultsFor(tableName) {
  switch (tableName) {
    case "tasks":
      return { note: "", status: "todo", importance: 2, deferral_count: 0, links: [], depends_on: [], custom: {}, sort_order: 0, completed_at: null, priority_slot: null, priority_date: null, due_date: null, project_id: null, duration_min: null, energy: null, scheduled_at: null, scheduled_end_at: null };
    case "projects":
      return { kind: "general", description: "", statuses: [], priority: 2, archived: false, milestones: [], custom_fields: [], sort_order: 0, color: null, icon: null };
    case "nerf_content":
      return { stage: "idea", platforms: [], format: "", hook: "", concept: "", caption: "", cta: "", link: "", metrics: {}, notes: "", repurpose_status: "", next_action: "", sort_order: 0, publish_date: null };
    case "workout_sessions":
      return { split: "", notes: "", duration_min: null };
    case "workout_entries":
      return { exercise_name: "", set_number: 1, reps: null, weight_kg: null, hold_seconds: null, distance_m: null, time_seconds: null, rpe: null, form_note: "", is_pr: false, exercise_id: null };
    case "recovery_notes":
      return { kind: "recovery", body_area: "", severity: null, note: "" };
    case "selfcare_logs":
      return { value: null, note: "", done: true };
    case "checkins":
      return { mood: null, energy: null, stress: null, sleep_quality: null, note: "", what_helped: "", what_was_hard: "" };
    case "relationship_items":
      return { kind: "note", note: "", date: null, done: false };
    case "routines":
      return { slug: null, category: "reset", schedule: { times: [], days: [0, 1, 2, 3, 4, 5, 6] }, enabled: true, sort_order: 0 };
    case "routine_logs":
      return { status: "done", at: nowIso() };
    case "teams":
      return { name: "", accent: "", notes: "", invite_code: Math.random().toString(36).slice(2, 10) };
    case "displays":
      return { name: "Display", role: "command", theme: null, variant: null, motion: "balanced", brightness: 1, density: "comfortable", ambient: {}, layout: {}, last_seen_at: null };
    default:
      return {};
  }
}

// Accept realtime websocket upgrades so the browser client doesn't spam
// console errors; frames are read and dropped (no realtime in the mock).
server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key || !req.url?.startsWith("/realtime/")) {
    socket.destroy();
    return;
  }
  const accept = crypto
    .createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  socket.on("data", () => {});
  socket.on("error", () => {});
});

server.listen(PORT, () => {
  console.log(`mock supabase listening on :${PORT}`);
});
