import { HealthVital } from "../types";
import { localDateStr } from "./thaiHelpers";

export type VitalType = "bp" | "sugar" | "weight";

export const VITAL_TYPE_LABEL: Record<VitalType, string> = {
  bp: "ความดัน",
  sugar: "น้ำตาล",
  weight: "น้ำหนัก",
};

/** Parse a stored vital date ("YYYY-MM-DD HH:mm" or "YYYY-MM-DD").
 *  Replaces the space with "T" so iOS Safari doesn't return Invalid Date. */
export function parseVitalDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s.trim().replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

export function vitalTime(v: HealthVital): number {
  return parseVitalDate(v.date)?.getTime() ?? 0;
}

/** Local "YYYY-MM-DD HH:mm" (device time zone). */
export function localDateTimeStr(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${localDateStr(d)} ${hh}:${mm}`;
}

export function hasType(v: HealthVital, t: VitalType): boolean {
  if (t === "bp") return !!(v.systolicBP && v.diastolicBP);
  if (t === "sugar") return !!v.bloodSugar;
  return !!v.weight;
}

/** Types a record contains (old combined records may contain several). */
export function typesOf(v: HealthVital): VitalType[] {
  return (["bp", "sugar", "weight"] as VitalType[]).filter((t) => hasType(v, t));
}

/** Newest first. */
export function sortVitalsDesc(list: HealthVital[]): HealthVital[] {
  return list.slice().sort((a, b) => vitalTime(b) - vitalTime(a));
}

/** Latest record that contains the given type (input may be unsorted). */
export function latestOfType(list: HealthVital[], t: VitalType): HealthVital | null {
  let best: HealthVital | null = null;
  for (const v of list) {
    if (!hasType(v, t)) continue;
    if (!best || vitalTime(v) > vitalTime(best)) best = v;
  }
  return best;
}

/** Latest known height (any record that has one). */
export function latestHeight(list: HealthVital[]): number | undefined {
  let best: HealthVital | null = null;
  for (const v of list) {
    if (!v.height) continue;
    if (!best || vitalTime(v) > vitalTime(best)) best = v;
  }
  return best?.height;
}

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "วันนี้ 19:05 น." / "28 ก.ย. 07:10 น." / "28 ก.ย." (no time stored) */
export function formatVitalWhen(dateStr?: string): string {
  const d = parseVitalDate(dateStr);
  if (!d) return "-";
  const hasTime = !!dateStr && /\d{1,2}:\d{2}/.test(dateStr);
  const time = hasTime ? ` ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.` : "";
  const day = localDateStr(d) === localDateStr() ? "วันนี้" : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${day}${time}`;
}

/** Short axis label: "1 ต.ค. 19:05" (time only when stored) */
export function vitalChartLabel(dateStr?: string): string {
  const d = parseVitalDate(dateStr);
  if (!d) return "-";
  const hasTime = !!dateStr && /\d{1,2}:\d{2}/.test(dateStr);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return hasTime ? `${base} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : base;
}
