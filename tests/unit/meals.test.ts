import { describe, expect, it } from "vitest";
import { macroTotals, parseMealEntry, type Meal } from "@/lib/data/meals";

const meal = (over: Partial<Meal>): Meal => ({
  id: "m1",
  user_id: "u1",
  date: "2026-08-04",
  name: "Meal",
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  note: "",
  created_at: "2026-08-04T12:00:00Z",
  ...over,
});

describe("parseMealEntry", () => {
  it("parses name + macros", () => {
    expect(parseMealEntry("chicken rice 650 45p 70c 12f")).toEqual({
      name: "chicken rice",
      calories: 650,
      protein: 45,
      carbs: 70,
      fat: 12,
    });
  });
  it("bare number is calories", () => {
    expect(parseMealEntry("banana 105")).toMatchObject({ name: "banana", calories: 105 });
  });
  it("accepts kcal suffix and decimals", () => {
    expect(parseMealEntry("shake 320kcal 30.5p")).toMatchObject({
      calories: 320,
      protein: 30.5,
    });
  });
  it("rejects entries without numbers", () => {
    expect(parseMealEntry("just words")).toBeNull();
    expect(parseMealEntry("")).toBeNull();
  });
});

describe("macroTotals", () => {
  it("sums across meals", () => {
    const totals = macroTotals([
      meal({ calories: 500, protein_g: 40, carbs_g: 50, fat_g: 10 }),
      meal({ id: "m2", calories: 300, protein_g: 20, carbs_g: 30, fat_g: 8 }),
    ]);
    expect(totals).toEqual({ calories: 800, protein: 60, carbs: 80, fat: 18 });
  });
});
