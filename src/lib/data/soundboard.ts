"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/types";

export type SoundPad = Tables<"soundboard_pads">;

async function userId() {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

export function usePads() {
  return useQuery({
    queryKey: ["soundboard"],
    queryFn: async (): Promise<SoundPad[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("soundboard_pads")
        .select("*")
        .order("slot");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"soundboard_pads">, "user_id">) => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const { data, error } = await supabase
        .from("soundboard_pads")
        .insert({ ...input, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["soundboard"] }),
  });
}

export function useUpdatePad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"soundboard_pads"> }) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("soundboard_pads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["soundboard"] }),
  });
}

export function useDeletePad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("soundboard_pads").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["soundboard"] }),
  });
}
