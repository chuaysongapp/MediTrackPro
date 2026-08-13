import React, { useState } from "react";
import {
  Pill,
  Clock,
  HeartPulse,
  Droplet,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  FileText,
  Edit,
} from "lucide-react";
import {
  UserProfile,
  Medicine,
  IntakeLog,
  HealthVital,
  DoctorAppointment,
  MealTime,
  LineConfig,
} from "../types";
import {
  MEAL_NAMES_TH,
  FOOD_RELATION_TH,
  formatThaiDate,
  formatThaiDateShort,
  evaluateBP,
  evaluateSugar,
  calculateBMI,
} from "../utils/thaiHelpers";

interface DashboardViewProps {
  activeProfile: UserProfile;
  medicines: Medicine[];
  intakeLogs: IntakeLog[];
  vitals: HealthVital[];
  appointments: DoctorAppointment[];
  lineConfig: LineConfig;
  onToggleIntake: (medicineId: string, meal: MealTime, status: "taken" | "skipped") => void;
  onOpenAddVitals: () => void;
  onEditVital?: (v: HealthVital) => void;
  onDeleteVital?: (id: string) => void;
  onOpenRefill: (med: Medicine) => void;
  onNavigateTab: (tab: string) => void;
  onSendLineNotify: (msg: string) => void;
  onOpenDoctorReport?: () => void;
  onOpenEditProfile?: (profile: UserProfile) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeProfile,
  medicines,
  intakeLogs,
  vitals,
  appointments,
  lineConfig,
  onToggleIntake,
  onOpenAddVitals,
  onEditVital,
  onDeleteVital,
  onOpenRefill,
  onNavigateTab,
  onSendLineNotify,
  onOpenDoctorReport,
  onOpenEditProfile,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState<boolean>(false);
  const todayStr = new Date().toISOString().split("T")[0];

  // Current active profile medicines
  const profileMeds = medicines.filter((m) => m.profileId === activeProfile.id);

  // Low stock medicines
  const lowStockMeds = profileMeds.filter((m) => m.remainingQuantity <= m.lowThreshold);

  // Today's intake logs
  const todayLogs = intakeLogs.filter(
    (l) => l.profileId === activeProfile.id && l.date === todayStr
  );

  // Latest vital reading
  const profileVitals = vitals
    .filter((v) => v.profileId === activeProfile.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestVital = profileVitals[0] || null;

  // Evaluate latest vitals
  const bpEval = latestVital ? evaluateBP(latestVital.systolicBP, latestVital.diastolicBP) : null;
  const sugarEval = latestVital ? evaluateSugar(latestVital.bloodSugar, latestVital.sugarType) : null;
  const bmiEval = latestVital ? calculateBMI(latestVital.weight, latestVital.height) : null;

  // Upcoming appointments
  const upcomingAppts = appointments
    .filter((a) => a.profileId === activeProfile.id && a.status === "upcoming")
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

  // Meal schedules mapping
  const mealsList: { id: MealTime; title: string; icon: string; timeHint: string }[] = [
    { id: "morning", title: "มื้อเช้า", icon: "🌅", timeHint: "07:00 - 09:00 น." },
    { id: "noon", title: "มื้อกลางวัน", icon: "☀️", timeHint: "12:00 - 13:00 น." },
    { id: "evening", title: "มื้อเย็น", icon: "🌆", timeHint: "17:30 - 19:00 น." },
    { id: "bedtime", title: "ก่อนนอน", icon: "🌙", timeHint: "21:00 - 22:00 น." },
  ];

  // Adherence calculation for today
  let totalTodayDoses = 0;
  let takenTodayDoses = 0;
  mealsList.forEach((m) => {
    const medsForMeal = profileMeds.filter((med) => med.schedules.includes(m.id));
    totalTodayDoses += medsForMeal.length;
    medsForMeal.forEach((med) => {
      const log = todayLogs.find((l) => l.medicineId === med.id && l.meal === m.id);
      if (log?.status === "taken") takenTodayDoses++;
    });
  });
  const todayAdherencePct = totalTodayDoses > 0 ? Math.round((takenTodayDoses / totalTodayDoses) * 100) : 100;

  // Quick send LINE summary
  const handleSendSummaryToLine = () => {
    const text = `📌 สรุปทานยาประจำวันสำหรับ ${activeProfile.name}
วันที่: ${formatThaiDate(todayStr)}
------------------------
💊 ความสม่ำเสมอในการทานยา: ${todayAdherencePct}% (${takenTodayDoses}/${totalTodayDoses} มื้อ)
${lowStockMeds.length > 0 ? `⚠️ ยาใกล้หมดคลัง (${lowStockMeds.length} รายการ): ${lowStockMeds.map((m) => m.name).join(", ")}` : "✅ คลังยาเพียงพอปกติ"}
${latestVital ? `🩸 ค่าความดันล่าสุด: ${latestVital.systolicBP}/${latestVital.diastolicBP} mmHg\n💉 ค่าน้ำตาล: ${latestVital.bloodSugar} mg/dL` : ""}`;

    onSendLineNotify(text);
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-16 relative">
      {/* Welcome & Profile Summary Header Banner */}
      <div className="bg-slate-900 rounded-xl text-white p-5 shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-blue-600 text-white font-black text-xl flex items-center justify-center overflow-hidden shrink-0 border border-blue-400 shadow-xs">
              {activeProfile.avatarUrl ? (
                <img src={activeProfile.avatarUrl} alt={activeProfile.name} className="w-full h-full object-cover" />
              ) : (
                activeProfile.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">{activeProfile.name}</h2>
                <span className="text-[10px] bg-slate-800 text-blue-300 border border-slate-700 px-2 py-0.5 rounded font-bold">
                  {activeProfile.relationship} (อายุ {activeProfile.age} ปี)
                </span>
                {activeProfile.bloodType && (
                  <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded font-bold">
                    กรุ๊ปเลือด {activeProfile.bloodType}
                  </span>
                )}
                {onOpenEditProfile && (
                  <button
                    onClick={() => onOpenEditProfile(activeProfile)}
                    className="inline-flex items-center gap-1 text-[11px] bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/40 px-2 py-0.5 rounded-md transition-all cursor-pointer font-medium"
                    title="แก้ไขข้อมูลและรูปโปรไฟล์"
                  >
                    <Edit className="w-3 h-3" />
                    <span>แก้ไขโปรไฟล์</span>
                  </button>
                )}
              </div>

              {/* Chronic diseases & allergies */}
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-300">
                {activeProfile.chronicDiseases && activeProfile.chronicDiseases.length > 0 && (
                  <span className="text-slate-300">
                    <strong className="text-blue-400">โรคประจำตัว:</strong>{" "}
                    {activeProfile.chronicDiseases.join(", ")}
                  </span>
                )}
                {activeProfile.drugAllergies && activeProfile.drugAllergies.length > 0 && (
                  <span className="bg-red-950/80 text-red-300 border border-red-800/60 px-2 py-0.5 rounded font-semibold text-[10px]">
                    ⚠️ แพ้ยา: {activeProfile.drugAllergies.join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Today's Dose Progress Gauge & Quick LINE button */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
            <div className="text-center pr-3 border-r border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ความสม่ำเสมอวันนี้</p>
              <div className="text-xl font-bold text-blue-400 mt-0.5">{todayAdherencePct}%</div>
              <p className="text-[10px] text-slate-400">
                ทานแล้ว {takenTodayDoses}/{totalTodayDoses} มื้อ
              </p>
            </div>

            <button
              onClick={handleSendSummaryToLine}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
              title="ส่งสรุปเตือนไปยัง LINE"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">แจ้งเตือน LINE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warning Banners Section */}
      <div className="space-y-3">
        {/* Low Stock Warning Banner */}
        {lowStockMeds.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-orange-100 text-orange-800 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-xs sm:text-sm">
                  แจ้งเตือน: มีรายการยาใกล้หมดคลังจำนวน {lowStockMeds.length} รายการ!
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  ยาที่ใกล้หมด:{" "}
                  {lowStockMeds.map((m) => `${m.name} (เหลือ ${m.remainingQuantity} ${m.unit})`).join(", ")}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("inventory")}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-md shadow-2xs transition-all flex items-center gap-1 shrink-0"
            >
              <span>เติมยาเข้าคลัง</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Vital Health Warnings */}
        {(bpEval?.isWarning || sugarEval?.isWarning) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 shadow-2xs text-red-900">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xs sm:text-sm">
                แจ้งเตือนสุขภาพ: ตรวจพบค่าสัญญาณชีพผิดปกติ!
              </h3>
              <ul className="text-xs space-y-0.5 mt-1 text-red-800 font-medium">
                {bpEval?.isWarning && (
                  <li>• ความดันโลหิตล่าสุด: {latestVital?.systolicBP}/{latestVital?.diastolicBP} mmHg ({bpEval.status})</li>
                )}
                {sugarEval?.isWarning && (
                  <li>• ค่าน้ำตาลปลายนิ้วล่าสุด: {latestVital?.bloodSugar} mg/dL ({sugarEval.status})</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Today's Medication Checklist & Health Vitals Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Today's Medication Meals Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>ตารางการทานยาประจำวัน</span>
              </h3>
              <p className="text-xs text-slate-500">
                วัน{formatThaiDate(todayStr, false)} • กดบันทึกเมื่อทานยาแต่ละมื้อ
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("intake")}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
            >
              <span>ประวัติย้อนหลัง</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {mealsList.map((meal) => {
              const medsInMeal = profileMeds.filter((m) => m.schedules.includes(meal.id));

              return (
                <div
                  key={meal.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meal.icon}</span>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800">{meal.title}</h4>
                        <span className="text-[10px] text-slate-400 font-medium">{meal.timeHint}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {medsInMeal.length} รายการ
                    </span>
                  </div>

                  {medsInMeal.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">ไม่มีรายการยาในมื้อนี้</p>
                  ) : (
                    <div className="space-y-2">
                      {medsInMeal.map((med) => {
                        const log = todayLogs.find((l) => l.medicineId === med.id && l.meal === meal.id);
                        const isTaken = log?.status === "taken";
                        const isSkipped = log?.status === "skipped";

                        return (
                          <div
                            key={med.id}
                            className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              isTaken
                                ? "bg-blue-50/60 border-blue-200 border-l-4 border-l-blue-600"
                                : isSkipped
                                ? "bg-slate-50 border-slate-200 opacity-60"
                                : "bg-white border-slate-200 hover:border-blue-300 border-l-4 border-l-slate-300"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isTaken
                                    ? "bg-blue-600 text-white"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                <Pill className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-slate-800">{med.name}</span>
                                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                    ครั้งละ {med.dosagePerTime} {med.unit}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                    {FOOD_RELATION_TH[med.foodRelation]}
                                  </span>
                                </div>
                                {med.instructions && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">💡 {med.instructions}</p>
                                )}
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  คลังยาคงเหลือ:{" "}
                                  <span className={med.remainingQuantity <= med.lowThreshold ? "text-orange-600 font-bold" : "text-slate-600"}>
                                    {med.remainingQuantity} {med.unit}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Intake Buttons */}
                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              <button
                                onClick={() => onToggleIntake(med.id, meal.id, "taken")}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                                  isTaken
                                    ? "bg-blue-600 text-white shadow-2xs"
                                    : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isTaken ? "ทานแล้ว" : "ทานยา"}</span>
                              </button>

                              <button
                                onClick={() => onToggleIntake(med.id, meal.id, "skipped")}
                                className={`px-2 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                                  isSkipped
                                    ? "bg-slate-700 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                                title="ข้ามมื้อนี้"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>ข้าม</span>
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

        {/* Right 1 Col: Health Vitals Card & Doctor Appointments */}
        <div className="space-y-4">
          {/* Health Vitals Summary Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>ค่าสัญญาณชีพล่าสุด</span>
              </h3>
              <div className="flex items-center gap-1.5">
                {onOpenDoctorReport && (
                  <button
                    onClick={onOpenDoctorReport}
                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="ออกรายงานค่าความดัน/น้ำตาลส่งหมอ"
                  >
                    <FileText className="w-3 h-3" />
                    <span>รายงานส่งหมอ</span>
                  </button>
                )}
                <button
                  onClick={onOpenAddVitals}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>บันทึกเพิ่ม</span>
                </button>
              </div>
            </div>

            {latestVital ? (
              <div className="space-y-2.5">
                {/* Edit / Delete controls */}
                <div className="flex items-center justify-end gap-2">
                  {onEditVital && (
                    <button
                      onClick={() => onEditVital(latestVital)}
                      className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >✏️ แก้ไข</button>
                  )}
                  {onDeleteVital && (
                    <button
                      onClick={() => onDeleteVital(latestVital.id)}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                    >🗑 ลบ</button>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between">
                    <span>ความดันโลหิต</span>
                    <span className="text-slate-400 font-normal">{formatThaiDateShort(latestVital.date)}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-800">
                      {latestVital.systolicBP || "-"}/{latestVital.diastolicBP || "-"}
                    </span>
                    <span className="text-xs text-slate-400">mmHg</span>
                  </div>
                  {bpEval && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold">
                      <span className={bpEval.isWarning ? "text-red-600" : "text-green-600"}>
                        ● {bpEval.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Blood Sugar Card */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between">
                    <span>น้ำตาลปลายนิ้ว</span>
                    <span className="text-slate-400 font-normal">{formatThaiDateShort(latestVital.date)}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-800">
                      {latestVital.bloodSugar || "-"}
                    </span>
                    <span className="text-xs text-slate-400">mg/dL</span>
                  </div>
                  {sugarEval && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold">
                      <span className={sugarEval.isWarning ? "text-red-600" : "text-green-600"}>
                        ● {sugarEval.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Weight & BMI Card */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between">
                    <span>น้ำหนักตัว & BMI</span>
                    <span className="text-slate-400 font-normal">{formatThaiDateShort(latestVital.date)}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-800">
                      {latestVital.weight || "-"}
                    </span>
                    <span className="text-xs text-slate-400">kg</span>
                    {bmiEval && (
                      <span className="text-xs font-bold text-blue-600 ml-auto">
                        BMI: {bmiEval.bmi}
                      </span>
                    )}
                  </div>
                  {bmiEval && (
                    <div className="mt-1 text-[10px] font-bold text-blue-600">
                      <span>● {bmiEval.text}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs">
                ยังไม่มีการบันทึกค่าสัญญาณชีพ
                <br />
                <button
                  onClick={onOpenAddVitals}
                  className="mt-1.5 text-blue-600 font-bold underline cursor-pointer"
                >
                  คลิกเพื่อบันทึกครั้งแรก
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Doctor Appointments Widget */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>นัดพบแพทย์ล่วงหน้า</span>
              </h3>
              <button
                onClick={() => onNavigateTab("records")}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                ดูทั้งหมด
              </button>
            </div>

            {upcomingAppts.length > 0 ? (
              <div className="space-y-2">
                {upcomingAppts.slice(0, 2).map((app) => (
                  <div
                    key={app.id}
                    className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold text-rose-900">
                      <span>{app.doctorName}</span>
                      <span className="text-rose-700 font-mono text-[11px]">
                        {formatThaiDate(app.appointmentDate)} ({app.appointmentTime} น.)
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium text-[11px]">{app.hospital} ({app.department || "แผนกทั่วไป"})</p>
                    <p className="text-slate-700 bg-white p-1.5 rounded border border-rose-100 font-medium text-[11px]">
                      🎯 {app.purpose}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-3 text-xs text-slate-400 italic">
                ไม่มีใบนัดแพทย์ในเร็วๆ นี้
              </p>
            )}
          </div>

          {/* High Density Dark Status & Line Summary Card */}
          <div className="bg-slate-900 rounded-xl shadow-md p-4 text-white">
            <h3 className="text-xs font-bold mb-2.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              สถานะการเชื่อมต่อ LINE Notify
            </h3>
            <div className="p-2.5 bg-white/10 rounded-lg mb-3">
              <div className="text-[10px] text-slate-400 mb-1 uppercase">การแจ้งเตือนล่าสุด</div>
              <div className="text-xs leading-relaxed text-slate-200">
                "{activeProfile.name} - สรุปตารางทานยาประจำวันและความดันโลหิตเรียบร้อย"
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">แจ้งเตือนทานยา</span>
                <span className="text-[10px] bg-green-900/60 text-green-300 border border-green-700/50 px-1.5 py-0.2 rounded font-bold">เปิดใช้งาน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">แจ้งเตือนยาใกล้หมด</span>
                <span className="text-[10px] bg-green-900/60 text-green-300 border border-green-700/50 px-1.5 py-0.2 rounded font-bold">เปิดใช้งาน</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Concept 2 Floating Quick Action Hub (Floating FAB) */}
      <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2">
        {showQuickMenu && (
          <div className="bg-slate-900/95 text-white backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-700 space-y-2 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200 w-52">
            <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider pb-1 border-b border-slate-800">
              ⚡ ทางลัดด่วน (Quick Hub)
            </div>
            <button
              onClick={() => {
                setShowQuickMenu(false);
                onOpenAddVitals();
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-slate-200"
            >
              <HeartPulse className="w-4 h-4 text-rose-400 shrink-0" />
              <span>บันทึกความดัน / น้ำตาล</span>
            </button>
            {onOpenDoctorReport && (
              <button
                onClick={() => {
                  setShowQuickMenu(false);
                  onOpenDoctorReport();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-slate-200"
              >
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span>รายงานส่งหมอ</span>
              </button>
            )}
            <button
              onClick={() => {
                setShowQuickMenu(false);
                onNavigateTab("inventory");
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-slate-200"
            >
              <Pill className="w-4 h-4 text-amber-400 shrink-0" />
              <span>จัดการคลังยา / เติมยา</span>
            </button>
            <button
              onClick={() => {
                setShowQuickMenu(false);
                handleSendSummaryToLine();
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-slate-200"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ส่งสรุปเตือนเข้า LINE</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setShowQuickMenu(!showQuickMenu)}
          className={`px-4 py-3 rounded-full text-white font-black text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer border ${
            showQuickMenu
              ? "bg-slate-800 border-slate-600 scale-95"
              : "bg-blue-600 hover:bg-blue-500 border-blue-400 hover:scale-105"
          }`}
        >
          <Sparkles className="w-4 h-4 fill-current text-blue-200" />
          <span>{showQuickMenu ? "ปิดเมนูด่วน" : "ทางลัดด่วน"}</span>
        </button>
      </div>
    </div>
  );
};
