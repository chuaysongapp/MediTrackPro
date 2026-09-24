import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Medicine, IntakeLog, MealTime } from "../types";
import { localDateStr } from "../utils/thaiHelpers";

type DayStatus = "full" | "partial" | "missed" | "none";

interface IntakeCalendarProps {
  medicines: Medicine[]; // already filtered to the active profile
  logs: IntakeLog[]; // already filtered to the active profile
  selectedDate: string; // YYYY-MM-DD
  todayStr: string; // YYYY-MM-DD (local)
  onSelectDate: (date: string) => void;
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MEALS: MealTime[] = ["morning", "noon", "evening", "bedtime"];

const DOT_CLASS: Record<DayStatus, string> = {
  full: "bg-emerald-500",
  partial: "bg-amber-400",
  missed: "bg-rose-500",
  none: "",
};

export const IntakeCalendar: React.FC<IntakeCalendarProps> = ({
  medicines,
  logs,
  selectedDate,
  todayStr,
  onSelectDate,
}) => {
  const [view, setView] = useState(() => {
    const [y, m] = selectedDate.split("-").map(Number);
    return { y, m: m - 1 };
  });

  const [todayY, todayM] = todayStr.split("-").map(Number);
  const isCurrentMonth = view.y === todayY && view.m === todayM - 1;

  // Logs grouped by date
  const logsByDate = useMemo(() => {
    const map = new Map<string, IntakeLog[]>();
    for (const l of logs) {
      const arr = map.get(l.date);
      if (arr) arr.push(l);
      else map.set(l.date, [l]);
    }
    return map;
  }, [logs]);

  // Tracking start = earliest recorded day. Days before it are not counted as "missed".
  const trackingStart = useMemo(
    () => logs.reduce((min, l) => (l.date < min ? l.date : min), todayStr),
    [logs, todayStr]
  );

  // Date each medicine was added (local), so days before a med existed don't count
  const medStart = useMemo(() => {
    const map = new Map<string, string>();
    for (const med of medicines) {
      const d = med.createdAt ? new Date(med.createdAt) : null;
      map.set(med.id, d && !isNaN(d.getTime()) ? localDateStr(d) : "0000-00-00");
    }
    return map;
  }, [medicines]);

  const statusOf = (dateStr: string): DayStatus => {
    if (dateStr > todayStr) return "none";
    const dayLogs = logsByDate.get(dateStr) || [];
    let total = 0;
    let taken = 0;
    let skipped = 0;
    for (const med of medicines) {
      const hasLogThatDay = dayLogs.some((l) => l.medicineId === med.id);
      if (!hasLogThatDay && (medStart.get(med.id) || "") > dateStr) continue;
      for (const meal of MEALS) {
        if (!med.schedules.includes(meal)) continue;
        total++;
        const log = dayLogs.find((l) => l.medicineId === med.id && l.meal === meal);
        if (log?.status === "taken") taken++;
        else if (log?.status === "skipped") skipped++;
      }
    }
    if (total === 0) return "none";
    if (taken >= total) return "full";
    if (taken > 0) return "partial";
    if (dateStr < trackingStart) return "none";
    if (dateStr === todayStr) return skipped > 0 ? "missed" : "none"; // today isn't over yet
    return "missed";
  };

  // Build the month grid
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const out: ({ dateStr: string; day: number; weekday: number } | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(view.y, view.m, d);
      out.push({ dateStr: localDateStr(date), day: d, weekday: date.getDay() });
    }
    return out;
  }, [view]);

  // Month summary
  const summary = useMemo(() => {
    let full = 0, partial = 0, missed = 0;
    for (const c of cells) {
      if (!c) continue;
      const s = statusOf(c.dateStr);
      if (s === "full") full++;
      else if (s === "partial") partial++;
      else if (s === "missed") missed++;
    }
    return { full, partial, missed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, logsByDate, medicines, todayStr, trackingStart, medStart]);

  const goMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const goToday = () => {
    setView({ y: todayY, m: todayM - 1 });
    onSelectDate(todayStr);
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            {THAI_MONTHS[view.m]} {view.y + 543}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ทานครบ {summary.full} วัน · บางมื้อ {summary.partial} วัน · ไม่ได้ทาน {summary.missed} วัน
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => goMonth(-1)}
            aria-label="เดือนก่อนหน้า"
            className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            disabled={isCurrentMonth}
            aria-label="เดือนถัดไป"
            className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[11px] font-bold py-1 ${
              i === 0 ? "text-rose-500" : i === 6 ? "text-blue-600" : "text-slate-400"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c) return <div key={`e${idx}`} />;
          const isFuture = c.dateStr > todayStr;
          const isToday = c.dateStr === todayStr;
          const isSelected = c.dateStr === selectedDate;
          const status = statusOf(c.dateStr);
          const dayColor = isToday
            ? "text-white"
            : c.weekday === 0
            ? "text-rose-500"
            : c.weekday === 6
            ? "text-blue-600"
            : "text-slate-800";
          return (
            <button
              key={c.dateStr}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate(c.dateStr)}
              className={`h-12 sm:h-16 rounded-xl flex flex-col items-center justify-start pt-1.5 gap-1 transition-all ${
                isSelected
                  ? "ring-2 ring-emerald-500 bg-emerald-50"
                  : "hover:bg-slate-50"
              } ${isFuture ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
              aria-label={`${c.day} ${THAI_MONTHS[view.m]} ${view.y + 543}`}
            >
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${dayColor} ${
                  isToday ? "bg-emerald-600" : ""
                }`}
              >
                {c.day}
              </span>
              {status !== "none" && <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASS[status]}`} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-semibold">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />ทานครบ</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />บางมื้อ</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />ไม่ได้ทาน</span>
        </div>
        <span className="text-[11px] text-slate-400">* แตะวันเพื่อดูหรือบันทึกการทานยา</span>
      </div>
    </div>
  );
};
