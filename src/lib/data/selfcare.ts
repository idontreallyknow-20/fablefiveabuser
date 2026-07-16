"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/types";

export type SelfcareLog = Tables<"selfcare_logs">;
export type Checkin = Tables<"checkins">;
export type RelationshipItem = Tables<"relationship_items">;

/** kinds that are a simple done / not-done for the day */
export const DONE_KINDS = ["skincare_am", "skincare_pm", "mobility", "outdoor"] as const;
export type DoneKind = (typeof DONE_KINDS)[number];

/** kinds that carry a number for the day */
export const VALUE_KINDS = ["sleep", "water", "protein", "calories"] as const;
export type ValueKind = (typeof VALUE_KINDS)[number];

async function userId() {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

/* ---------------------------------------------------------------------------
   Self-care logs
--------------------------------------------------------------------------- */

export function useSelfcareLogs(date: string) {
  return useQuery({
    queryKey: ["selfcare_logs", date],
    queryFn: async (): Promise<SelfcareLog[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("selfcare_logs")
        .select("*")
        .eq("date", date);
      if (error) throw error;
      return data ?? [];
    },
  });
}

async function findLog(date: string, kind: string): Promise<SelfcareLog | null> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("selfcare_logs")
    .select("*")
    .eq("date", date)
    .eq("kind", kind)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** flip a done-kind for the day: insert a done row, or remove the existing one */
export function useToggleSelfcare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, kind }: { date: string; kind: DoneKind }) => {
      const supabase = supabaseBrowser();
      const existing = await findLog(date, kind);
      if (existing) {
        const { error } = await supabase.from("selfcare_logs").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const uid = await userId();
        const { error } = await supabase
          .from("selfcare_logs")
          .insert({ date, kind, done: true, user_id: uid });
        if (error) throw error;
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["selfcare_logs"] }),
  });
}

/** set today's number for a value-kind: update the day's row or insert one */
export function useSetSelfcareValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      kind,
      value,
    }: {
      date: string;
      kind: ValueKind;
      value: number;
    }) => {
      const supabase = supabaseBrowser();
      const existing = await findLog(date, kind);
      if (existing) {
        const { error } = await supabase
          .from("selfcare_logs")
          .update({ value })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const uid = await userId();
        const { error } = await supabase
          .from("selfcare_logs")
          .insert({ date, kind, value, user_id: uid });
        if (error) throw error;
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["selfcare_logs"] }),
  });
}

/** the day's journal lives as one selfcare row of kind "journal" with a note */
export function useSaveJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, note }: { date: string; note: string }) => {
      const supabase = supabaseBrowser();
      const existing = await findLog(date, "journal");
      if (existing) {
        const { error } = await supabase
          .from("selfcare_logs")
          .update({ note })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const uid = await userId();
        const { error } = await supabase
          .from("selfcare_logs")
          .insert({ date, kind: "journal", note, user_id: uid });
        if (error) throw error;
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["selfcare_logs"] }),
  });
}

export function useJournalEntries(limit = 8) {
  return useQuery({
    queryKey: ["selfcare_logs", "journal", limit],
    queryFn: async (): Promise<SelfcareLog[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("selfcare_logs")
        .select("*")
        .eq("kind", "journal")
        .neq("note", "")
        .order("date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------------------------------------------------------------------------
   Check-ins
--------------------------------------------------------------------------- */

export function useCheckin(date: string) {
  return useQuery({
    queryKey: ["checkins", date],
    queryFn: async (): Promise<Checkin | null> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("checkins")
        .select("*")
        .eq("date", date)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCheckins(days = 14) {
  return useQuery({
    queryKey: ["checkins", "range", days],
    queryFn: async (): Promise<Checkin[]> => {
      const supabase = supabaseBrowser();
      const since = new Date();
      since.setDate(since.getDate() - (days - 1));
      const { data, error } = await supabase
        .from("checkins")
        .select("*")
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** write today's check-in: update the day's row if it exists, insert otherwise */
export function useUpsertCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      patch,
    }: {
      date: string;
      patch: Omit<TablesUpdate<"checkins">, "id" | "user_id" | "date">;
    }) => {
      const supabase = supabaseBrowser();
      const { data: existing, error: findError } = await supabase
        .from("checkins")
        .select("id")
        .eq("date", date)
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;
      if (existing) {
        const { error } = await supabase.from("checkins").update(patch).eq("id", existing.id);
        if (error) throw error;
      } else {
        const uid = await userId();
        const { error } = await supabase
          .from("checkins")
          .insert({ ...patch, date, user_id: uid });
        if (error) throw error;
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["checkins"] }),
  });
}

/* ---------------------------------------------------------------------------
   Relationship items
--------------------------------------------------------------------------- */

export function useRelationshipItems() {
  return useQuery({
    queryKey: ["relationship_items"],
    queryFn: async (): Promise<RelationshipItem[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("relationship_items")
        .select("*")
        .order("done", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateRelationshipItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"relationship_items">, "user_id">) => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const { error } = await supabase
        .from("relationship_items")
        .insert({ ...input, user_id: uid });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["relationship_items"] }),
  });
}

export function useUpdateRelationshipItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"relationship_items">;
    }) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("relationship_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["relationship_items"] }),
  });
}

export function useDeleteRelationshipItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("relationship_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["relationship_items"] }),
  });
}
