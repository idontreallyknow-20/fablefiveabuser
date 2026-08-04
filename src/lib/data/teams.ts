"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Tables } from "@/lib/db/types";
import { todayISO } from "@/lib/data/tasks";

export type Team = Tables<"teams">;
export type TeamMember = Tables<"team_members">;

export interface TeamMemberToday {
  user_id: string;
  display_name: string;
  priorities_total: number;
  priorities_done: number;
}

/** the user's first team, with members; null when solo */
export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async (): Promise<{ team: Team; members: TeamMember[] } | null> => {
      const supabase = supabaseBrowser();
      const { data: teams, error } = await supabase.from("teams").select("*").limit(1);
      if (error) throw error;
      const team = teams?.[0];
      if (!team) return null;
      const { data: members, error: mErr } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", team.id)
        .order("joined_at");
      if (mErr) throw mErr;
      return { team, members: members ?? [] };
    },
  });
}

export function useTeamToday(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team", "today", teamId, todayISO()],
    queryFn: async (): Promise<TeamMemberToday[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.rpc("team_today", {
        t: teamId!,
        d: todayISO(),
      });
      if (error) throw error;
      return (data ?? []) as TeamMemberToday[];
    },
    enabled: Boolean(teamId),
    refetchInterval: 60_000,
  });
}

export function useTeamStreak(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team", "streak", teamId],
    queryFn: async (): Promise<number> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.rpc("team_streak", { t: teamId! });
      if (error) throw error;
      return data ?? 0;
    },
    enabled: Boolean(teamId),
  });
}

export function useTeamDay(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team", "day", teamId, todayISO()],
    queryFn: async (): Promise<Tables<"team_days"> | null> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("team_days")
        .select("*")
        .eq("team_id", teamId!)
        .eq("date", todayISO())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(teamId),
  });
}

/** realtime: refresh team state when members or bonus days change */
export function useTeamRealtime(teamId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!teamId) return;
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`team-live-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_days", filter: `team_id=eq.${teamId}` },
        () => qc.invalidateQueries({ queryKey: ["team"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members", filter: `team_id=eq.${teamId}` },
        () => qc.invalidateQueries({ queryKey: ["team"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, qc]);
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, memberName }: { name: string; memberName: string }) => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.rpc("create_team", {
        team_name: name,
        member_name: memberName,
      });
      if (error) throw error;
      return data as Team;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useJoinTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, memberName }: { code: string; memberName: string }) => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.rpc("join_team", {
        code,
        member_name: memberName,
      });
      if (error) throw error;
      return data as Team;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useLeaveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useClaimTeamDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.rpc("claim_team_day", {
        t: teamId,
        d: todayISO(),
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}
