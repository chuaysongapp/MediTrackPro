import { MealTime, FoodRelation } from "../types";

export const MEAL_NAMES_TH: Record<MealTime, string> = {
  morning: "มื้อเช้า",
  noon: "มื้อกลางวัน",
  evening: "มื้อเย็น",
  bedtime: "ก่อนนอน",
};

export const FOOD_RELATION_TH: Record<FoodRelation, string> = {
  before_meal: "ก่อนอาหาร (30 นาที)",
  after_meal: "หลังอาหาร (ทันที/15-30 นาที)",
  with_meal: "พร้อมอาหาร / พร้อมคำแรก",
  anytime: "เวลาใดก็ได้ / ทานเมื่อมีอาการ",
};

export function formatThaiDate(dateStr?: string, includeTime = false): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const day = d.getDate();
    const monthsTh = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const month = monthsTh[d.getMonth()];
    const yearTh = d.getFullYear() + 543;

    if (includeTime) {
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${day} ${month} ${yearTh} เวลา ${hours}:${mins} น.`;
    }
    return `${day} ${month} ${yearTh}`;
  } catch {
    return dateStr;
  }
}

export function formatThaiDateShort(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const monthsTh = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${day} ${monthsTh[d.getMonth()]}`;
  } catch {
    return dateStr;
  }
}

export function calculateBMI(weightKg?: number, heightCm?: number): { bmi: number; text: string; color: string } | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  if (bmi < 18.5) return { bmi, text: "น้ำหนักน้อยกว่าเกณฑ์", color: "text-amber-600 bg-amber-50" };
  if (bmi < 23) return { bmi, text: "สมส่วนปกติ (เกณฑ์เอเชีย)", color: "text-emerald-700 bg-emerald-50" };
  if (bmi < 25) return { bmi, text: "น้ำหนักเกินเกณฑ์ (เริ่มอ้วน)", color: "text-yellow-700 bg-yellow-50" };
  if (bmi < 30) return { bmi, text: "อ้วนระดับ 1", color: "text-orange-700 bg-orange-50" };
  return { bmi, text: "อ้วนระดับ 2 (เสี่ยงสูง)", color: "text-red-700 bg-red-50" };
}

export function evaluateBP(sys?: number, dia?: number): { status: string; color: string; isWarning: boolean } {
  if (!sys || !dia) return { status: "ไม่มีข้อมูล", color: "text-slate-500", isWarning: false };
  if (sys < 120 && dia < 80) {
    return { status: "ปกติสมบูรณ์ (<120/80)", color: "text-emerald-600 bg-emerald-50 border-emerald-200", isWarning: false };
  }
  if (sys <= 129 && dia < 80) {
    return { status: "ความดันเพิ่มขึ้นเล็กน้อย (120-129)", color: "text-teal-600 bg-teal-50 border-teal-200", isWarning: false };
  }
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
    return { status: "ความดันสูงระยะที่ 1 (130-139)", color: "text-amber-700 bg-amber-50 border-amber-200", isWarning: true };
  }
  if ((sys >= 140 && sys <= 179) || (dia >= 90 && dia <= 119)) {
    return { status: "ความดันสูงระยะที่ 2 (≥140/90)", color: "text-orange-700 bg-orange-50 border-orange-200", isWarning: true };
  }
  return { status: "ความดันสูงวิกฤต (≥180/120)", color: "text-red-700 bg-red-100 border-red-300 font-bold", isWarning: true };
}

export function evaluateSugar(sugar?: number, type: "fasting" | "after_meal" | "random" = "fasting"): { status: string; color: string; isWarning: boolean } {
  if (!sugar) return { status: "ไม่มีข้อมูล", color: "text-slate-500", isWarning: false };

  if (type === "fasting") {
    if (sugar < 70) return { status: "น้ำตาลต่ำกว่าเกณฑ์ (<70)", color: "text-purple-700 bg-purple-50 border-purple-200", isWarning: true };
    if (sugar <= 99) return { status: "ปกติตามเกณฑ์งดอาหาร (70-99)", color: "text-emerald-600 bg-emerald-50 border-emerald-200", isWarning: false };
    if (sugar <= 125) return { status: "เสี่ยงเบาหวาน / ค่าน้ำตาลสูงเล็กน้อย (100-125)", color: "text-amber-700 bg-amber-50 border-amber-200", isWarning: true };
    return { status: "ระดับน้ำตาลสูงเกณฑ์เบาหวาน (≥126)", color: "text-red-700 bg-red-50 border-red-200", isWarning: true };
  } else {
    if (sugar < 140) return { status: "ปกติหลังอาหาร (<140)", color: "text-emerald-600 bg-emerald-50 border-emerald-200", isWarning: false };
    if (sugar <= 199) return { status: "ค่าน้ำตาลสูงเล็กน้อย (140-199)", color: "text-amber-700 bg-amber-50 border-amber-200", isWarning: true };
    return { status: "ค่าน้ำตาลสูงหลังอาหาร (≥200)", color: "text-red-700 bg-red-50 border-red-200", isWarning: true };
  }
}
