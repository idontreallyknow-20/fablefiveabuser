"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/db/types";
import { runOrQueue } from "@/lib/offline/outbox";

export type Meal = Tables<"meals">;

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

async function userId() {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

export function useMeals(date: string) {
  return useQuery({
    queryKey: ["meals", date],
    queryFn: async (): Promise<Meal[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("date", date)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function macroTotals(meals: Meal[]): MacroTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories || 0),
      protein: acc.protein + Number(m.protein_g || 0),
      carbs: acc.carbs + Number(m.carbs_g || 0),
      fat: acc.fat + Number(m.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/**
 * "chicken rice 650 45p 70c 12f" -> named meal with macros; bare numbers
 * are calories. Returns null when no numbers are present.
 */
export function parseMealEntry(
  input: string,
): { name: string; calories: number; protein: number; carbs: number; fat: number } | null {
  const text = input.trim();
  if (!text) return null;
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let matched = false;
  const nameParts: string[] = [];
  for (const token of text.split(/\s+/)) {
    const m = token.match(/^(\d+(?:\.\d+)?)(p|c|f|cal|kcal)?$/i);
    if (m) {
      matched = true;
      const v = Number(m[1]);
      const unit = (m[2] ?? "").toLowerCase();
      if (unit === "p") protein = v;
      else if (unit === "c") carbs = v;
      else if (unit === "f") fat = v;
      else calories = v;
    } else {
      nameParts.push(token);
    }
  }
  if (!matched) return null;
  return { name: nameParts.join(" "), calories, protein, carbs, fat };
}

export function useAddMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"meals">, "user_id">) => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const row = { ...input, id: input.id ?? crypto.randomUUID(), user_id: uid };
      await runOrQueue({ table: "meals", op: "insert", payload: row }, async () => {
        const { error } = await supabase.from("meals").insert(row);
        if (error) throw error;
      });
      return row;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("meals").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });
}
