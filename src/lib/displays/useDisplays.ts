"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/lib/db/types";

export type Display = Tables<"displays">;
export type DisplayRole = Display["role"];

const LOCAL_KEY = "orbit-display-id";
const localIdListeners = new Set<() => void>();

export function getLocalDisplayId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOCAL_KEY);
}

export function setLocalDisplayId(id: string | null) {
  if (id) localStorage.setItem(LOCAL_KEY, id);
  else localStorage.removeItem(LOCAL_KEY);
  localIdListeners.forEach((l) => l());
}

/** render-safe access to this screen's registration */
export function useLocalDisplayId(): string | null {
  return useSyncExternalStore(
    (onChange) => {
      localIdListeners.add(onChange);
      window.addEventListener("storage", onChange);
      return () => {
        localIdListeners.delete(onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    getLocalDisplayId,
    () => null,
  );
}

export function useDisplays() {
  return useQuery({
    queryKey: ["displays"],
    queryFn: async (): Promise<Display[]> => {
      const { data, error } = await supabaseBrowser()
        .from("displays")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDisplay(id: string | null) {
  return useQuery({
    queryKey: ["displays", "one", id],
    queryFn: async (): Promise<Display | null> => {
      if (!id) return null;
      const { data, error } = await supabaseBrowser()
        .from("displays")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useRegisterDisplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, role }: { name: string; role: string }) => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("displays")
        .insert({ user_id: user.id, name, role, last_seen_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      setLocalDisplayId(data.id);
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["displays"] }),
  });
}

export function useUpdateDisplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"displays"> }) => {
      const { error } = await supabaseBrowser().from("displays").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["displays"] });
      const prev = qc.getQueryData<Display[]>(["displays"]);
      if (prev) {
        qc.setQueryData(
          ["displays"],
          prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["displays"], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["displays"] }),
  });
}

export function useDeleteDisplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser().from("displays").delete().eq("id", id);
      if (error) throw error;
      if (getLocalDisplayId() === id) setLocalDisplayId(null);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["displays"] }),
  });
}

/** live updates so role/theme changes land on the other screens instantly */
export function useDisplaysRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("displays-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "displays" }, () => {
        qc.invalidateQueries({ queryKey: ["displays"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

/** heartbeat so Space can show which screens are online */
export function useDisplayHeartbeat(id: string | null) {
  useEffect(() => {
    if (!id) return;
    const beat = async () => {
      await supabaseBrowser()
        .from("displays")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", id);
    };
    beat();
    const iv = setInterval(beat, 60_000);
    return () => clearInterval(iv);
  }, [id]);
}

export const ROLE_LABELS: Record<string, string> = {
  command: "Command Center",
  calendar: "Calendar",
  spotify: "Spotify",
  priorities: "Priorities",
  nerfchess: "NerfChess",
  focus: "Focus",
  ambient: "Ambient",
  fitness: "Fitness",
  custom: "Custom",
};
