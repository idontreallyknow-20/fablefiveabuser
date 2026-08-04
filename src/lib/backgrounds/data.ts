"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Tables } from "@/lib/db/types";

export type UserBackground = Tables<"user_backgrounds">;

export const BACKGROUNDS_KEY = ["backgrounds"] as const;

/** the current user's uploaded backgrounds, newest first */
export function useBackgrounds(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: BACKGROUNDS_KEY,
    enabled: opts?.enabled ?? true,
    queryFn: async (): Promise<UserBackground[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("user_backgrounds")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** removes both the row and the storage object */
export function useDeleteBackground() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bg: Pick<UserBackground, "id" | "path">) => {
      const supabase = supabaseBrowser();
      const { error: storageError } = await supabase.storage
        .from("backgrounds")
        .remove([bg.path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("user_backgrounds").delete().eq("id", bg.id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BACKGROUNDS_KEY }),
  });
}

const SIGNED_URL_TTL_S = 3600;
const SIGNED_URL_STALE_MS = 45 * 60 * 1000;

/**
 * Signed URL for a private backgrounds object, cached well inside its 1h
 * validity; errors retry and a failed cache entry refetches on next use.
 */
export function useBackgroundUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["background-url", path],
    enabled: Boolean(path),
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_STALE_MS,
    retry: 2,
    queryFn: async (): Promise<string> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.storage
        .from("backgrounds")
        .createSignedUrl(path!, SIGNED_URL_TTL_S);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
