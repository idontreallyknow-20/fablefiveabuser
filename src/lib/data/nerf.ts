"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/lib/db/types";

export type NerfItem = Tables<"nerf_content">;

export const NERF_STAGES = [
  "idea",
  "script",
  "record",
  "edit",
  "ready",
  "posted",
  "review",
  "repurpose",
] as const;
export type NerfStage = (typeof NERF_STAGES)[number];

/** stages whose items count as published for analytics */
export const POSTED_STAGES: readonly string[] = ["posted", "review", "repurpose"];

export const NERF_PLATFORMS = ["tiktok", "instagram", "youtube"] as const;
export type NerfPlatform = (typeof NERF_PLATFORMS)[number];

export function stageIndex(stage: string): number {
  return NERF_STAGES.indexOf(stage as NerfStage);
}

async function userId() {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

/* ---------------------------------------------------------------------------
   Queries and mutations
--------------------------------------------------------------------------- */

/** live invalidation across displays through supabase realtime */
export function useNerfRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("nerf-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nerf_content" },
        () => {
          qc.invalidateQueries({ queryKey: ["nerf"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

/** all content items, or only the items in one stage */
export function useNerfItems(stage?: string) {
  return useQuery({
    queryKey: ["nerf", stage ?? "all"],
    queryFn: async (): Promise<NerfItem[]> => {
      const supabase = supabaseBrowser();
      let q = supabase
        .from("nerf_content")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(1000);
      if (stage) q = q.eq("stage", stage);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["nerf"] });
}

export function useCreateNerfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"nerf_content">, "user_id">) => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const { data, error } = await supabase
        .from("nerf_content")
        .insert({ ...input, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => invalidate(qc),
  });
}

export function useUpdateNerfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"nerf_content">;
    }) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("nerf_content").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["nerf"] });
      const snapshots = qc.getQueriesData<NerfItem[]>({ queryKey: ["nerf"] });
      for (const [key, items] of snapshots) {
        if (!items) continue;
        qc.setQueryData(
          key,
          items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
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

export function useDeleteNerfItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("nerf_content").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => invalidate(qc),
  });
}

/** move an item to another pipeline stage */
export function useMoveNerfStage() {
  const update = useUpdateNerfItem();
  return {
    move: (item: NerfItem, stage: NerfStage) =>
      update.mutateAsync({ id: item.id, patch: { stage } }),
    isPending: update.isPending,
  };
}

/* ---------------------------------------------------------------------------
   Pure analytics. No hooks, no IO; unit-testable in isolation.
   Metrics live in nerf_content.metrics jsonb:
   { views, likes, comments, shares, saves, followers_gained } as numbers.
--------------------------------------------------------------------------- */

export type NerfMetrics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followers_gained: number;
};

export const EMPTY_METRICS: NerfMetrics = {
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  followers_gained: 0,
};

function num(v: Json | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function parseMetrics(json: Json | null | undefined): NerfMetrics {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ...EMPTY_METRICS };
  }
  const o = json as { [key: string]: Json | undefined };
  return {
    views: num(o.views),
    likes: num(o.likes),
    comments: num(o.comments),
    shares: num(o.shares),
    saves: num(o.saves),
    followers_gained: num(o.followers_gained),
  };
}

export function hasMetrics(m: NerfMetrics): boolean {
  return (
    m.views > 0 ||
    m.likes > 0 ||
    m.comments > 0 ||
    m.shares > 0 ||
    m.saves > 0 ||
    m.followers_gained > 0
  );
}

/** (likes + comments + shares + saves) / views, 0 when views is 0 */
export function engagementRate(m: NerfMetrics): number {
  if (m.views <= 0) return 0;
  return (m.likes + m.comments + m.shares + m.saves) / m.views;
}

/** followers_gained / views, 0 when views is 0 */
export function followConversion(m: NerfMetrics): number {
  if (m.views <= 0) return 0;
  return m.followers_gained / m.views;
}

export function isPosted(item: Pick<NerfItem, "stage">): boolean {
  return POSTED_STAGES.includes(item.stage);
}

/** published items that actually carry metrics */
export function postedWithMetrics(items: NerfItem[]): NerfItem[] {
  return items.filter((i) => isPosted(i) && hasMetrics(parseMetrics(i.metrics)));
}

export function averageViews(items: NerfItem[]): number {
  const posted = postedWithMetrics(items);
  if (posted.length === 0) return 0;
  const total = posted.reduce((s, i) => s + parseMetrics(i.metrics).views, 0);
  return total / posted.length;
}

/** view-weighted engagement rate across all published items */
export function overallEngagementRate(items: NerfItem[]): number {
  const ms = postedWithMetrics(items).map((i) => parseMetrics(i.metrics));
  const views = ms.reduce((s, m) => s + m.views, 0);
  if (views <= 0) return 0;
  const engaged = ms.reduce((s, m) => s + m.likes + m.comments + m.shares + m.saves, 0);
  return engaged / views;
}

/** view-weighted follow conversion across all published items */
export function overallFollowConversion(items: NerfItem[]): number {
  const ms = postedWithMetrics(items).map((i) => parseMetrics(i.metrics));
  const views = ms.reduce((s, m) => s + m.views, 0);
  if (views <= 0) return 0;
  const gained = ms.reduce((s, m) => s + m.followers_gained, 0);
  return gained / views;
}

export type HookStat = { id: string; hook: string; rate: number; views: number };

/** top published items by engagement, with their hook text */
export function bestHooks(items: NerfItem[], limit = 3): HookStat[] {
  return postedWithMetrics(items)
    .map((i) => {
      const m = parseMetrics(i.metrics);
      return { id: i.id, hook: i.hook.trim(), rate: engagementRate(m), views: m.views };
    })
    .filter((x) => x.hook.length > 0 && x.views > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit);
}

export type FormatStat = { format: string; avgEngagement: number; count: number };

/** formats grouped, ranked by average engagement */
export function bestFormats(items: NerfItem[]): FormatStat[] {
  const groups = new Map<string, number[]>();
  for (const i of postedWithMetrics(items)) {
    const format = i.format.trim();
    const m = parseMetrics(i.metrics);
    if (!format || m.views <= 0) continue;
    const list = groups.get(format) ?? [];
    list.push(engagementRate(m));
    groups.set(format, list);
  }
  return [...groups.entries()]
    .map(([format, rates]) => ({
      format,
      avgEngagement: rates.reduce((s, r) => s + r, 0) / rates.length,
      count: rates.length,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

/** average posts per week over the last 8 weeks, by publish date */
export function postingConsistency(items: NerfItem[], now: Date = new Date()): number {
  const weeks = 8;
  const end = now.getTime();
  const start = end - weeks * 7 * 86400000;
  let count = 0;
  for (const i of items) {
    if (!isPosted(i)) continue;
    const t = new Date(i.publish_date ?? i.created_at).getTime();
    if (Number.isFinite(t) && t >= start && t <= end) count++;
  }
  return count / weeks;
}

export type PlatformStat = { platform: string; followers: number };

/**
 * followers gained per platform. An item posted to several platforms splits
 * its gain evenly between them so nothing is double counted.
 */
export function platformGrowth(items: NerfItem[]): PlatformStat[] {
  const totals = new Map<string, number>();
  for (const i of items) {
    if (!isPosted(i)) continue;
    const gained = parseMetrics(i.metrics).followers_gained;
    if (gained <= 0) continue;
    const platforms = i.platforms.length > 0 ? i.platforms : ["unassigned"];
    const share = gained / platforms.length;
    for (const p of platforms) totals.set(p, (totals.get(p) ?? 0) + share);
  }
  return [...totals.entries()]
    .map(([platform, followers]) => ({ platform, followers }))
    .sort((a, b) => b.followers - a.followers);
}
