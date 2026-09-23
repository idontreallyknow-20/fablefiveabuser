"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localDb } from "@/lib/local/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/types";
import { useToast } from "@/components/ui/Toast";

export type Task = Tables<"tasks">;

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function userId() {
  const supabase = localDb();
  // session is local-first, so this also works while offline
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not signed in");
  return session.user.id;
}

/** live invalidation across displays through supabase realtime */
export function useTasksRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = localDb();
    const channel = supabase
      .channel("tasks-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        qc.invalidateQueries({ queryKey: ["tasks"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useTasks(filter?: {
  projectId?: string;
  status?: string;
  backlog?: boolean;
}) {
  return useQuery({
    queryKey: ["tasks", filter ?? {}],
    queryFn: async (): Promise<Task[]> => {
      const supabase = localDb();
      let q = supabase
        .from("tasks")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(500);
      if (filter?.projectId) q = q.eq("project_id", filter.projectId);
      if (filter?.status) q = q.eq("status", filter.status);
      if (filter?.backlog) q = q.is("completed_at", null).is("priority_slot", null);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** the three priorities for a given date, keyed by slot */
export function usePriorities(date: string) {
  return useQuery({
    queryKey: ["tasks", "priorities", date],
    queryFn: async (): Promise<Task[]> => {
      const supabase = localDb();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("priority_date", date)
        .not("priority_slot", "is", null)
        .order("priority_slot");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["tasks"] });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"tasks">, "user_id">) => {
      const supabase = localDb();
      const uid = await userId();
      // client-generated id so follow-up edits can target it right away
      const row = { ...input, id: input.id ?? crypto.randomUUID(), user_id: uid };
      const { error } = await supabase.from("tasks").insert(row);
      if (error) throw error;
      return row;
    },
    onSettled: () => invalidate(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"tasks"> }) => {
      const supabase = localDb();
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const snapshots = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      for (const [key, tasks] of snapshots) {
        if (!tasks) continue;
        qc.setQueryData(
          key,
          tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        );
      }
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => invalidate(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (task: Task) => {
      const supabase = localDb();
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
      toast(task.title, "info", {
        label: "Undo",
        onClick: () => {
          void Promise.resolve(supabase.from("tasks").insert(task)).then(() => invalidate(qc));
        },
      });
    },
    onSettled: () => invalidate(qc),
  });
}

/** task actions used across Today and Focus */
export function useTaskActions() {
  const update = useUpdateTask();
  const { toast } = useToast();

  return {
    complete: (task: Task) => {
      const p = update.mutateAsync({
        id: task.id,
        patch: { completed_at: new Date().toISOString(), status: "done" },
      });
      toast(task.title, "success", {
        label: "Undo",
        onClick: () =>
          void update.mutateAsync({
            id: task.id,
            patch: { completed_at: null, status: task.status === "done" ? "todo" : task.status },
          }),
      });
      return p;
    },
    uncomplete: (task: Task) =>
      update.mutateAsync({
        id: task.id,
        patch: { completed_at: null, status: "todo" },
      }),
    defer: (task: Task) =>
      update.mutateAsync({
        id: task.id,
        patch: {
          priority_slot: null,
          priority_date: null,
          deferral_count: task.deferral_count + 1,
        },
      }),
    moveToTomorrow: (task: Task) =>
      update.mutateAsync({
        id: task.id,
        patch: {
          priority_date: tomorrowISO(),
          deferral_count: task.deferral_count + 1,
        },
      }),
    promote: (task: Task, slot: number, date: string) =>
      update.mutateAsync({
        id: task.id,
        patch: { priority_slot: slot, priority_date: date },
      }),
    demote: (task: Task) =>
      update.mutateAsync({
        id: task.id,
        patch: { priority_slot: null, priority_date: null },
      }),
    setNote: (task: Task, note: string) =>
      update.mutateAsync({ id: task.id, patch: { note } }),
    schedule: (task: Task, at: string | null, end: string | null) =>
      update.mutateAsync({
        id: task.id,
        patch: { scheduled_at: at, scheduled_end_at: end },
      }),
  };
}
