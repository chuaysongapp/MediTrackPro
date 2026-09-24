import { Medicine, IntakeLog, MealTime } from "../types";

export const MEAL_ORDER: MealTime[] = ["morning", "noon", "evening", "bedtime"];
export const MEAL_SHORT_TH: Record<MealTime, string> = {
  morning: "มื้อเช้า",
  noon: "มื้อกลางวัน",
  evening: "มื้อเย็น",
  bedtime: "ก่อนนอน",
};

export interface MealSummary {
  meal: MealTime;
  total: number;
  taken: number;
}

export interface DaySummary {
  total: number; // scheduled items (medicine × meal)
  taken: number;
  skipped: number;
  unrecorded: number;
  mealsScheduled: number; // meals that have at least one medicine
  mealsComplete: number; // meals where every medicine was taken
  perMeal: MealSummary[]; // only meals that have medicines, in meal order
  pct: number; // taken / total, 100 when nothing is scheduled
}

/** Summarise one day of intake. `meds` and `logs` must already be filtered to the profile. */
export function summarizeDay(meds: Medicine[], logs: IntakeLog[], date: string): DaySummary {
  const dayLogs = logs.filter((l) => l.date === date);
  let total = 0, taken = 0, skipped = 0;
  const perMeal: MealSummary[] = [];

  for (const meal of MEAL_ORDER) {
    const mealMeds = meds.filter((m) => m.schedules.includes(meal));
    if (mealMeds.length === 0) continue;
    let mealTaken = 0;
    for (const med of mealMeds) {
      const log = dayLogs.find((l) => l.medicineId === med.id && l.meal === meal);
      if (log?.status === "taken") mealTaken++;
      else if (log?.status === "skipped") skipped++;
    }
    total += mealMeds.length;
    taken += mealTaken;
    perMeal.push({ meal, total: mealMeds.length, taken: mealTaken });
  }

  return {
    total,
    taken,
    skipped,
    unrecorded: total - taken - skipped,
    mealsScheduled: perMeal.length,
    mealsComplete: perMeal.filter((m) => m.taken === m.total).length,
    perMeal,
    pct: total > 0 ? Math.round((taken / total) * 100) : 100,
  };
}

/** e.g. "มื้อเช้าครบ 5/5" or "มื้อเช้าครบ 5/5 · มื้อเย็นครบ 2/2" */
export function describeCompleteMeals(s: DaySummary): string {
  const done = s.perMeal.filter((m) => m.taken === m.total);
  return done.map((m) => `${MEAL_SHORT_TH[m.meal]}ครบ ${m.taken}/${m.total}`).join(" · ");
}

/** e.g. "มื้อเย็น 0/2" — only meals that are not complete */
export function describeIncompleteMeals(s: DaySummary): string {
  const open = s.perMeal.filter((m) => m.taken < m.total);
  return open.map((m) => `${MEAL_SHORT_TH[m.meal]} ${m.taken}/${m.total}`).join(" · ");
}
