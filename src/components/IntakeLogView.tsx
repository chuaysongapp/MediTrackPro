import React, { useState } from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Pill,
} from "lucide-react";
import { Medicine, IntakeLog, UserProfile, MealTime } from "../types";
import { MEAL_NAMES_TH, FOOD_RELATION_TH, formatThaiDate } from "../utils/thaiHelpers";

interface IntakeLogViewProps {
  activeProfile: UserProfile;
  medicines: Medicine[];
  intakeLogs: IntakeLog[];
  onToggleIntake: (medicineId: string, meal: MealTime, status: "taken" | "skipped") => void;
}

export const IntakeLogView: React.FC<IntakeLogViewProps> = ({
  activeProfile,
  medicines,
  intakeLogs,
  onToggleIntake,
}) => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedMeal, setSelectedMeal] = useState<MealTime | "all">("all");

  const profileMeds = medicines.filter((m) => m.profileId === activeProfile.id);

  const logsForDate = intakeLogs.filter(
    (l) => l.profileId === activeProfile.id && l.date === selectedDate
  );

  const mealsList: { id: MealTime; label: string; icon: string }[] = [
    { id: "morning", label: "มื้อเช้า", icon: "🌅" },
    { id: "noon", label: "มื้อกลางวัน", icon: "☀️" },
    { id: "evening", label: "มื้อเย็น", icon: "🌆" },
    { id: "bedtime", label: "ก่อนนอน", icon: "🌙" },
  ];

  // Count total scheduled doses for selected date
  let totalDoses = 0;
  let takenDoses = 0;
  let skippedDoses = 0;

  mealsList.forEach((m) => {
    const medsInMeal = profileMeds.filter((med) => med.schedules.includes(m.id));
    totalDoses += medsInMeal.length;
    medsInMeal.forEach((med) => {
      const log = logsForDate.find((l) => l.medicineId === med.id && l.meal === m.id);
      if (log?.status === "taken") takenDoses++;
      if (log?.status === "skipped") skippedDoses++;
    });
  });

  const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Date Picker Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            <span>ประวัติและการทานยาแต่ละมื้อ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกการใช้ยา ย้อนดูความสม่ำเสมอในการรับประทานยาสำหรับ{" "}
            <strong className="text-emerald-700">{activeProfile.name}</strong>
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 shrink-0">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-bold text-slate-700">วันที่:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Adherence Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-950 text-white p-4 rounded-3xl border border-emerald-900 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">ความสม่ำเสมอประจำวัน</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{adherenceRate}%</p>
          </div>
          <div className="w-12 h-12 bg-emerald-900/80 rounded-2xl flex items-center justify-center font-bold text-emerald-300">
            {takenDoses}/{totalDoses}
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ทานยาเรียบร้อยแล้ว</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{takenDoses} มื้อ</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ข้ามมื้อ / ยังไม่ได้ทาน</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{totalDoses - takenDoses} มื้อ</p>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
      </div>

      {/* Filter by Meal Tab */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setSelectedMeal("all")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            selectedMeal === "all"
              ? "bg-slate-900 text-emerald-400 shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          ทุกมื้ออาหาร
        </button>
        {mealsList.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMeal(m.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedMeal === m.id
                ? "bg-slate-900 text-emerald-400 shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Meal Dose List */}
      <div className="space-y-4">
        {mealsList
          .filter((m) => selectedMeal === "all" || selectedMeal === m.id)
          .map((meal) => {
            const medsInMeal = profileMeds.filter((med) => med.schedules.includes(meal.id));

            return (
              <div
                key={meal.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <span className="text-xl">{meal.icon}</span>
                    <span>{meal.label}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {medsInMeal.length} รายการยา
                  </span>
                </div>

                {medsInMeal.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">ไม่มีรายการยาจัดไว้ในมื้อนี้</p>
                ) : (
                  <div className="space-y-2">
                    {medsInMeal.map((med) => {
                      const log = logsForDate.find((l) => l.medicineId === med.id && l.meal === meal.id);
                      const isTaken = log?.status === "taken";
                      const isSkipped = log?.status === "skipped";

                      return (
                        <div
                          key={med.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isTaken
                              ? "bg-emerald-50/70 border-emerald-200"
                              : isSkipped
                              ? "bg-slate-50 border-slate-200 opacity-60"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                              <Pill className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-900">{med.name}</span>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  ครั้งละ {med.dosagePerTime} {med.unit}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {FOOD_RELATION_TH[med.foodRelation]} {med.instructions && `• ${med.instructions}`}
                              </p>
                              {log?.timestamp && (
                                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                                  ⏱️ เวลาที่บันทึกทานยา: {log.timestamp} น.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              onClick={() => onToggleIntake(med.id, meal.id, "taken")}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isTaken
                                  ? "bg-emerald-700 text-white shadow-xs"
                                  : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isTaken ? "ทานเรียบร้อย" : "ทำเครื่องหมายทานแล้ว"}</span>
                            </button>

                            <button
                              onClick={() => onToggleIntake(med.id, meal.id, "skipped")}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                isSkipped
                                  ? "bg-slate-700 text-white"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              ข้าม
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
