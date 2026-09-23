"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localDb } from "@/lib/local/client";
import { todayISO } from "@/lib/data/tasks";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/types";

export type Routine = Tables<"routines">;
export type RoutineLog = Tables<"routine_logs">;

async function userId() {
  const supabase = localDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

export function useRoutines() {
  return useQuery({
    queryKey: ["routines"],
    queryFn: async (): Promise<Routine[]> => {
      const supabase = localDb();
      const { data, error } = await supabase.from("routines").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRoutineLogs(date: string) {
  return useQuery({
    queryKey: ["routine_logs", date],
    queryFn: async (): Promise<RoutineLog[]> => {
      const supabase = localDb();
      const { data, error } = await supabase.from("routine_logs").select("*").eq("date", date);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRoutineHistory(days = 30) {
  return useQuery({
    queryKey: ["routine_logs", "history", days],
    queryFn: async (): Promise<RoutineLog[]> => {
      const supabase = localDb();
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("routine_logs")
        .select("*")
        .gte("date", since.toISOString().slice(0, 10))
        .order("at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLogRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      routineId,
      status,
    }: {
      routineId: string;
      status: "done" | "skipped" | "snoozed";
    }) => {
      const supabase = localDb();
      const uid = await userId();
      const row = {
        routine_id: routineId,
        status,
        user_id: uid,
        date: todayISO(),
      };
      const { error } = await supabase.from("routine_logs").insert(row);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["routine_logs"] }),
  });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"routines">, "user_id">) => {
      const supabase = localDb();
      const uid = await userId();
      const { error } = await supabase.from("routines").insert({ ...input, user_id: uid });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

export function useUpdateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"routines"> }) => {
      const supabase = localDb();
      const { error } = await supabase.from("routines").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = localDb();
      const { error } = await supabase.from("routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}
