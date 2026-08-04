"use client";

// Nutrition widgets: day macro rings and a quick meal log.
// Entry format: "chicken rice 650 45p 70c 12f" — bare number = calories.

import { useMemo, useState } from "react";
import { todayISO } from "@/lib/data/tasks";
import {
  macroTotals,
  parseMealEntry,
  useAddMeal,
  useDeleteMeal,
  useMeals,
} from "@/lib/data/meals";
import { useSettings } from "@/lib/settings/store";
import { useToast } from "@/components/ui/Toast";

function Ring({
  label,
  value,
  target,
  size = 64,
}: {
  label: string;
  value: number;
  target: number;
  size?: number;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--bg2, rgba(255,255,255,0.06))"
            strokeWidth="4"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <span className="tnum absolute inset-0 flex items-center justify-center font-mono text-[12px] text-ink">
          {Math.round(value)}
        </span>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </span>
    </div>
  );
}

export function MacroRings() {
  const today = todayISO();
  const { data: meals = [] } = useMeals(today);
  const nutrition = useSettings((s) => s.settings.nutrition);
  const totals = useMemo(() => macroTotals(meals), [meals]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Macros</h2>
      <div className="grid flex-1 grid-cols-4 content-center gap-2">
        <Ring label="kcal" value={totals.calories} target={nutrition.calories} />
        <Ring label="p" value={totals.protein} target={nutrition.protein} />
        <Ring label="c" value={totals.carbs} target={nutrition.carbs} />
        <Ring label="f" value={totals.fat} target={nutrition.fat} />
      </div>
    </div>
  );
}

export function MealLog() {
  const today = todayISO();
  const { data: meals = [] } = useMeals(today);
  const addMeal = useAddMeal();
  const deleteMeal = useDeleteMeal();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");

  const add = async () => {
    const parsed = parseMealEntry(draft);
    if (!parsed) {
      toast("Add numbers: 650 45p 70c 12f");
      return;
    }
    setDraft("");
    await addMeal.mutateAsync({
      date: today,
      name: parsed.name || "Meal",
      calories: parsed.calories,
      protein_g: parsed.protein,
      carbs_g: parsed.carbs,
      fat_g: parsed.fat,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Meals</h2>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {meals.map((m) => (
          <li key={m.id} className="group flex items-center gap-2">
            <span className="flex-1 truncate text-[13px] text-ink-dim">{m.name}</span>
            <span className="tnum font-mono text-[11.5px] text-ink-faint">
              {Math.round(Number(m.calories))}
            </span>
            <button
              aria-label={`Remove ${m.name}`}
              onClick={() => void deleteMeal.mutateAsync(m.id)}
              className="rounded-full p-0.5 text-ink-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void add();
          }
        }}
        aria-label="Log a meal"
        placeholder="650 45p 70c 12f"
        className="tnum mt-1.5 h-8 rounded-lg border border-line bg-bg1 px-2 font-mono text-[12px] text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </div>
  );
}
