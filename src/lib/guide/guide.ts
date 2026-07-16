// Orbit Guide: deterministic priority recommendations. No AI involved.
// Scores are explainable; every recommendation carries its reasons.

import type { Task } from "@/lib/data/tasks";

export interface GuideContext {
  now: Date;
  /** minutes of free calendar time remaining today, null when unknown */
  freeMinutes: number | null;
  /** user-selected current energy, if they set it */
  energy: "low" | "medium" | "high" | null;
  /** project priority lookup */
  projectPriority: Map<string, number>;
  /** ids of completed tasks, to resolve dependencies */
  completedIds: Set<string>;
  focusProjectIds: Set<string>;
}

export interface GuideRecommendation {
  task: Task;
  score: number;
  reasons: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function scoreTask(task: Task, ctx: GuideContext): GuideRecommendation {
  let score = 0;
  const reasons: string[] = [];

  // due date pressure
  if (task.due_date) {
    const due = new Date(`${task.due_date}T23:59:59`);
    const days = Math.floor((due.getTime() - ctx.now.getTime()) / DAY_MS);
    if (days < 0) {
      score += 40;
      reasons.push(`overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`);
    } else if (days === 0) {
      score += 34;
      reasons.push("due today");
    } else if (days === 1) {
      score += 24;
      reasons.push("due tomorrow");
    } else if (days <= 3) {
      score += 14;
      reasons.push(`due in ${days} days`);
    } else if (days <= 7) {
      score += 6;
    }
  }

  // importance
  if (task.importance === 3) {
    score += 18;
    reasons.push("marked important");
  } else if (task.importance === 2) {
    score += 8;
  }

  // project priority
  if (task.project_id) {
    const pp = ctx.projectPriority.get(task.project_id);
    if (pp === 3) {
      score += 10;
      reasons.push("high-priority project");
    } else if (pp === 2) {
      score += 4;
    }
    if (ctx.focusProjectIds.has(task.project_id)) {
      score += 8;
      reasons.push("in a focus area");
    }
  }

  // fits available time
  if (ctx.freeMinutes !== null && task.duration_min) {
    if (task.duration_min <= ctx.freeMinutes) {
      score += 6;
      reasons.push(`fits the ${Math.round(ctx.freeMinutes / 60)}h you have free`);
    } else {
      score -= 10;
      reasons.push("longer than today's free time");
    }
  }

  // repeated deferral: gently resurface
  if (task.deferral_count >= 2) {
    score += Math.min(12, task.deferral_count * 4);
    reasons.push(`deferred ${task.deferral_count} times`);
  }

  // energy match
  if (ctx.energy && task.energy) {
    if (ctx.energy === task.energy) {
      score += 6;
      reasons.push("matches your energy");
    } else if (ctx.energy === "low" && task.energy === "high") {
      score -= 8;
      reasons.push("needs more energy than you have");
    }
  }

  // time of day: late evening favors low-energy tasks
  const hour = ctx.now.getHours();
  if (hour >= 21 && task.energy === "high") score -= 4;
  if (hour >= 21 && task.energy === "low") score += 3;

  // blocked by dependencies
  const blocked = (task.depends_on ?? []).some((id) => !ctx.completedIds.has(id));
  if (blocked) {
    score -= 100;
    reasons.length = 0;
    reasons.push("waiting on another task");
  }

  return { task, score, reasons: reasons.slice(0, 3) };
}

export function recommendPriorities(
  backlog: Task[],
  ctx: GuideContext,
  count = 3,
): GuideRecommendation[] {
  return backlog
    .filter((t) => !t.completed_at && t.priority_slot === null)
    .map((t) => scoreTask(t, ctx))
    .filter((r) => r.score > -50)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}
