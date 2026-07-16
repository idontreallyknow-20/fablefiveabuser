import type { Json } from "@/lib/db/types";
import type { Task } from "@/lib/data/tasks";
import type { TablesUpdate } from "@/lib/db/types";

export const TASK_CATEGORIES = [
  "feature",
  "bug",
  "improvement",
  "maintenance",
  "testing",
  "deployment",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export type TaskCustom = { category: string; next_action: string };

/** typed view over task.custom jsonb */
export function taskCustom(task: Task): TaskCustom {
  const c = task.custom;
  if (!c || typeof c !== "object" || Array.isArray(c)) {
    return { category: "", next_action: "" };
  }
  const o = c as { [key: string]: Json | undefined };
  return {
    category: typeof o.category === "string" ? o.category : "",
    next_action: typeof o.next_action === "string" ? o.next_action : "",
  };
}

/** merge a partial custom patch over the existing custom jsonb */
export function customPatch(task: Task, patch: Partial<TaskCustom>): Json {
  const base =
    task.custom && typeof task.custom === "object" && !Array.isArray(task.custom)
      ? (task.custom as { [key: string]: Json | undefined })
      : {};
  return { ...base, ...patch } as Json;
}

/** typed view over task.links jsonb (array of URL strings) */
export function taskLinks(task: Task): string[] {
  if (!Array.isArray(task.links)) return [];
  return task.links.filter((l): l is string => typeof l === "string");
}

/** statuses that count as finished for progress and card styling */
export function isDoneStatus(status: string): boolean {
  return status === "done" || status === "shipped";
}

/** patch for moving a task to a status, keeping completed_at consistent */
export function statusPatch(status: string): TablesUpdate<"tasks"> {
  return {
    status,
    completed_at: isDoneStatus(status) ? new Date().toISOString() : null,
  };
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
