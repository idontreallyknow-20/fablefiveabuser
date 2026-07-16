"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/types";

export type Project = Tables<"projects">;

export const DEFAULT_STATUSES = ["todo", "doing", "done"];
export const NERF_PRODUCT_STATUSES = [
  "inbox",
  "next",
  "building",
  "testing",
  "shipped",
  "archived",
];

async function userId() {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

export function useProjects(includeArchived = false) {
  return useQuery({
    queryKey: ["projects", includeArchived],
    queryFn: async (): Promise<Project[]> => {
      const supabase = supabaseBrowser();
      let q = supabase.from("projects").select("*").order("sort_order").order("created_at");
      if (!includeArchived) q = q.eq("archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", "one", id],
    queryFn: async (): Promise<Project | null> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"projects">, "user_id">) => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"projects"> }) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function projectStatuses(p: Project): string[] {
  if (Array.isArray(p.statuses) && p.statuses.length > 0) {
    return p.statuses.filter((s): s is string => typeof s === "string");
  }
  return p.kind === "nerf_product" ? NERF_PRODUCT_STATUSES : DEFAULT_STATUSES;
}
