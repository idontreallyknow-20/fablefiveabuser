import { beforeEach, describe, expect, it } from "vitest";
import { localAdmin, localDb, localUserId } from "@/lib/local/client";

// jsdom has no IndexedDB, so the client runs on its in-memory backend here;
// query semantics are identical on both.

const db = () => localDb();

beforeEach(async () => {
  await localAdmin.erase();
});

describe("local client", () => {
  it("seeds a profile and starter rows on first use", async () => {
    const { data: user } = await db().auth.getUser();
    expect(user.user?.id).toBe(localUserId());
    const { data: profile } = await db().from("profiles").select("*").eq("id", localUserId()).single();
    expect(profile?.app_name).toBe("Orbit");
    const { data: routines } = await db().from("routines").select("*");
    expect(routines?.length).toBe(10);
  });

  it("inserts with defaults, filters, orders and limits", async () => {
    await db().from("tasks").insert([
      { title: "b", user_id: localUserId(), importance: 1 },
      { title: "a", user_id: localUserId(), importance: 3, due_date: "2026-09-01" },
      { title: "c", user_id: localUserId(), importance: 2, due_date: "2026-08-01" },
    ]);
    const { data: all } = await db().from("tasks").select("*").order("title");
    expect(all?.map((t) => t.title)).toEqual(["a", "b", "c"]);
    expect(all?.[0].status).toBe("todo");
    expect(all?.[0].tags).toEqual([]);

    const { data: dated } = await db()
      .from("tasks")
      .select("title")
      .not("due_date", "is", null)
      .order("due_date", { ascending: false })
      .limit(1);
    expect(dated).toEqual([{ title: "a" }]);

    const { data: some } = await db().from("tasks").select("*").in("title", ["b", "c"]).gte("importance", 2);
    expect(some?.map((t) => t.title)).toEqual(["c"]);
  });

  it("updates, returns rows, and touches updated_at", async () => {
    const { data: row } = await db()
      .from("tasks")
      .insert({ title: "x", user_id: localUserId() })
      .select()
      .single();
    const before = row!.updated_at;
    await new Promise((r) => setTimeout(r, 5));
    const { data: updated } = await db()
      .from("tasks")
      .update({ title: "y" })
      .eq("id", row!.id)
      .select()
      .single();
    expect(updated?.title).toBe("y");
    expect(updated!.updated_at > before).toBe(true);
  });

  it("enforces the one-task-per-priority-slot rule", async () => {
    const base = { user_id: localUserId(), priority_date: "2026-09-23", priority_slot: 1 };
    const first = await db().from("tasks").insert({ ...base, title: "one" });
    expect(first.error).toBeNull();
    const second = await db().from("tasks").insert({ ...base, title: "two" });
    expect(second.error?.code).toBe("23505");
  });

  it("single() errors on no rows while maybeSingle() returns null", async () => {
    const one = await db().from("tasks").select("*").eq("id", "missing").single();
    expect(one.error?.code).toBe("PGRST116");
    const maybe = await db().from("tasks").select("*").eq("id", "missing").maybeSingle();
    expect(maybe.error).toBeNull();
    expect(maybe.data).toBeNull();
  });

  it("cascades and nulls foreign keys on delete, and embeds children", async () => {
    const { data: session } = await db()
      .from("workout_sessions")
      .insert({ user_id: localUserId() })
      .select()
      .single();
    await db().from("workout_entries").insert([
      { user_id: localUserId(), session_id: session!.id, reps: 5 },
      { user_id: localUserId(), session_id: session!.id, reps: 8 },
    ]);
    const { data: withEntries } = await db()
      .from("workout_sessions")
      .select("*, workout_entries(*)")
      .eq("id", session!.id)
      .single();
    expect((withEntries as unknown as { workout_entries: unknown[] }).workout_entries).toHaveLength(2);

    await db().from("workout_sessions").delete().eq("id", session!.id);
    const { data: left } = await db().from("workout_entries").select("*");
    expect(left).toEqual([]);

    const { data: project } = await db()
      .from("projects")
      .insert({ user_id: localUserId(), name: "P" })
      .select()
      .single();
    await db().from("tasks").insert({ user_id: localUserId(), title: "t", project_id: project!.id });
    await db().from("projects").delete().eq("id", project!.id);
    const { data: orphan } = await db().from("tasks").select("*").eq("title", "t").single();
    expect(orphan?.project_id).toBeNull();
  });

  it("round-trips a backup onto this device", async () => {
    await db().from("tasks").insert({ user_id: localUserId(), title: "keep me" });
    const dump = await localAdmin.dump();
    await localAdmin.erase();
    const restored = await localAdmin.restore({
      ...dump,
      tasks: dump.tasks.map((t) => ({ ...t, user_id: "someone-else" })),
    });
    expect(restored).toBeGreaterThan(0);
    const { data } = await db().from("tasks").select("*").eq("title", "keep me").single();
    expect(data?.user_id).toBe(localUserId());
  });

  it("stores files and serves them back", async () => {
    const blob = new Blob(["hi"], { type: "text/plain" });
    const up = await db().storage.from("sounds").upload("a/b.txt", blob);
    expect(up.error).toBeNull();
    const again = await db().storage.from("sounds").upload("a/b.txt", blob);
    expect(again.error).not.toBeNull();
    const down = await db().storage.from("sounds").download("a/b.txt");
    expect(await down.data?.text()).toBe("hi");
    await db().storage.from("sounds").remove(["a/b.txt"]);
    const gone = await db().storage.from("sounds").download("a/b.txt");
    expect(gone.data).toBeNull();
  });
});
