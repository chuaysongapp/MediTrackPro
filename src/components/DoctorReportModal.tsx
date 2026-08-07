import React, { useState, useMemo } from "react";
import {
  FileText,
  X,
  Calendar,
  Printer,
  Copy,
  Download,
  Check,
  HeartPulse,
  Droplet,
  Scale,
  Pill,
  Sparkles,
  Bot,
  RefreshCw,
  SlidersHorizontal,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { UserProfile, HealthVital, Medicine, IntakeLog } from "../types";
import { formatThaiDateShort, evaluateBP, evaluateSugar, calculateBMI, FOOD_RELATION_TH, MEAL_NAMES_TH } from "../utils/thaiHelpers";

interface DoctorReportModalProps {
  activeProfile: UserProfile;
  vitals: HealthVital[];
  medicines: Medicine[];
  intakeLogs: IntakeLog[];
  onClose: () => void;
}

export const DoctorReportModal: React.FC<DoctorReportModalProps> = ({
  activeProfile,
  vitals,
  medicines,
  intakeLogs,
  onClose,
}) => {
  // Date Presets
  const [presetDays, setPresetDays] = useState<number | "custom">(14);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Include Options
  const [includeBP, setIncludeBP] = useState<boolean>(true);
  const [includeSugar, setIncludeSugar] = useState<boolean>(true);
  const [includeWeight, setIncludeWeight] = useState<boolean>(true);
  const [includeMeds, setIncludeMeds] = useState<boolean>(true);

  // Copy state
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  // Handle Preset Change
  const handlePresetChange = (days: number) => {
    setPresetDays(days);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // Filter vitals by profile and date range
  const filteredVitals = useMemo(() => {
    return vitals
      .filter((v) => {
        if (v.profileId !== activeProfile.id) return false;
        const vDate = v.date.split(" ")[0]; // YYYY-MM-DD
        return vDate >= startDate && vDate <= endDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [vitals, activeProfile.id, startDate, endDate]);

  // Filter intake logs by profile and date range
  const filteredLogs = useMemo(() => {
    return intakeLogs.filter((l) => {
      if (l.profileId !== activeProfile.id) return false;
      return l.date >= startDate && l.date <= endDate;
    });
  }, [intakeLogs, activeProfile.id, startDate, endDate]);

  const profileMeds = useMemo(() => {
    return medicines.filter((m) => m.profileId === activeProfile.id);
  }, [medicines, activeProfile.id]);

  // Statistics Calculations
  const bpReadings = filteredVitals.filter((v) => v.systolicBP && v.diastolicBP);
  const avgSys = bpReadings.length > 0 ? Math.round(bpReadings.reduce((acc, v) => acc + (v.systolicBP || 0), 0) / bpReadings.length) : null;
  const avgDia = bpReadings.length > 0 ? Math.round(bpReadings.reduce((acc, v) => acc + (v.diastolicBP || 0), 0) / bpReadings.length) : null;
  const maxSys = bpReadings.length > 0 ? Math.max(...bpReadings.map((v) => v.systolicBP || 0)) : null;
  const minSys = bpReadings.length > 0 ? Math.min(...bpReadings.map((v) => v.systolicBP || 0)) : null;

  const sugarReadings = filteredVitals.filter((v) => v.bloodSugar);
  const avgSugar = sugarReadings.length > 0 ? Math.round(sugarReadings.reduce((acc, v) => acc + (v.bloodSugar || 0), 0) / sugarReadings.length) : null;
  const maxSugar = sugarReadings.length > 0 ? Math.max(...sugarReadings.map((v) => v.bloodSugar || 0)) : null;
  const minSugar = sugarReadings.length > 0 ? Math.min(...sugarReadings.map((v) => v.bloodSugar || 0)) : null;

  const fastingSugar = sugarReadings.filter((v) => v.sugarType === "fasting");
  const avgFastingSugar = fastingSugar.length > 0 ? Math.round(fastingSugar.reduce((acc, v) => acc + (v.bloodSugar || 0), 0) / fastingSugar.length) : null;

  const weightReadings = filteredVitals.filter((v) => v.weight);
  const latestWeight = weightReadings.length > 0 ? weightReadings[weightReadings.length - 1].weight : null;
  const latestHeight = weightReadings.length > 0 ? weightReadings[weightReadings.length - 1].height : undefined;
  const bmiEval = latestWeight ? calculateBMI(latestWeight, latestHeight) : null;

  // Medication Adherence
  const totalDoses = filteredLogs.length;
  const takenDoses = filteredLogs.filter((l) => l.status === "taken").length;
  const adherencePct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Generate Copyable Text Summary for LINE / Email
  const getCopyableSummaryText = () => {
    let text = `📋 [รายงานติดตามสุขภาพสำหรับแพทย์]\n`;
    text += `👤 ผู้ป่วย: ${activeProfile.name} (อายุ ${activeProfile.age} ปี)\n`;
    if (activeProfile.chronicDiseases && activeProfile.chronicDiseases.length > 0) {
      text += `🩺 โรคประจำตัว: ${activeProfile.chronicDiseases.join(", ")}\n`;
    }
    if (activeProfile.drugAllergies && activeProfile.drugAllergies.length > 0) {
      text += `⚠️ แพ้ยา: ${activeProfile.drugAllergies.join(", ")}\n`;
    }
    text += `📅 ช่วงเวลาข้อมูล: ${formatThaiDateShort(startDate)} ถึง ${formatThaiDateShort(endDate)}\n\n`;

    if (includeBP && avgSys && avgDia) {
      text += `❤️ [สรุปความดันโลหิต]\n`;
      text += `• ค่าเฉลี่ย: ${avgSys}/${avgDia} mmHg (จำนวน ${bpReadings.length} ครั้ง)\n`;
      text += `• สูงสุด: ${maxSys} / ต่ำสุด: ${minSys} mmHg\n\n`;
    }

    if (includeSugar && avgSugar) {
      text += `🩸 [สรุปค่าน้ำตาลปลายนิ้ว]\n`;
      text += `• ค่าเฉลี่ยรวม: ${avgSugar} mg/dL (จำนวน ${sugarReadings.length} ครั้ง)\n`;
      if (avgFastingSugar) {
        text += `• เฉลี่ยงดอาหาร (Fasting): ${avgFastingSugar} mg/dL\n`;
      }
      text += `• สูงสุด: ${maxSugar} / ต่ำสุด: ${minSugar} mg/dL\n\n`;
    }

    if (includeWeight && latestWeight) {
      text += `⚖️ [น้ำหนักตัว & BMI]\n`;
      text += `• น้ำหนักล่าสุด: ${latestWeight} kg ${bmiEval ? `(BMI: ${bmiEval.bmi} - ${bmiEval.text})` : ""}\n\n`;
    }

    if (includeMeds) {
      text += `💊 [ความสม่ำเสมอในการทานยา]\n`;
      text += `• อัตราทานยาตรงเวลา: ${adherencePct}% (${takenDoses}/${totalDoses} มื้อ)\n`;
      text += `• รายการยาปัจจุบัน (${profileMeds.length} รายการ):\n`;
      profileMeds.forEach((m, idx) => {
        text += `  ${idx + 1}. ${m.name} (${m.dosagePerTime} ${m.unit}) - ${m.purpose || "ทานตามสั่ง"}\n`;
      });
      text += `\n`;
    }

    if (aiSummary) {
      text += `✨ [สรุปย่อประเมินอาการ AI]:\n${aiSummary}\n\n`;
    }

    text += `ส่งจากแอป MediTrack Pro (ระบบบันทึกสุขภาพประจำตัว)`;
    return text;
  };

  const handleCopyText = () => {
    const text = getCopyableSummaryText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Date_Time,Systolic_BP,Diastolic_BP,Heart_Rate,Blood_Sugar,Sugar_Type,Weight_kg,Note\n";

    filteredVitals.forEach((v) => {
      const row = [
        `"${v.date}"`,
        v.systolicBP || "",
        v.diastolicBP || "",
        v.heartRate || "",
        v.bloodSugar || "",
        `"${v.sugarType || ""}"`,
        v.weight || "",
        `"${(v.note || "").replace(/"/g, '""')}"`,
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Health_Report_${activeProfile.name}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate AI Doctor Note
  const handleGenerateAiNote = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai/health-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileName: activeProfile.name,
          age: activeProfile.age,
          medicines: profileMeds,
          adherenceRate: adherencePct,
          vitals: {
            latestBP: avgSys ? `${avgSys}/${avgDia}` : null,
            latestSugar: avgSugar,
            latestWeight: latestWeight,
            bmi: bmiEval?.bmi,
          },
          note: `สรุปความเห็นแพทย์แบบย่อ สำหรับช่วงวันที่ ${startDate} ถึง ${endDate}`,
        }),
      });

      const data = await res.json();
      if (data.success && data.advice) {
        setAiSummary(data.advice);
      }
    } catch (err: any) {
      setAiSummary("ไม่สามารถประมวลผลสรุป AI ได้ในขณะนี้");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:bg-white print:p-0 print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Modal Header (Hidden on Print) */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white leading-tight">
                ออกรายงานสุขภาพสำหรับพบแพทย์
              </h2>
              <p className="text-[11px] text-slate-400">
                สรุปผลค่าความดัน ค่าน้ำตาล และประวัติการทานยาประจำตัวสำหรับ <strong className="text-blue-400">{activeProfile.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control Bar: Filters & Options (Hidden on Print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 print:hidden shrink-0 text-xs">
          {/* Date Range Selection Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-600" /> ช่วงเวลา:
              </span>
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handlePresetChange(days)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    presetDays === days
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {days === 90 ? "3 เดือน" : `${days} วัน`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPresetDays("custom")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  presetDays === "custom"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                กำหนดเอง
              </button>
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPresetDays("custom");
                }}
                className="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-slate-400 font-bold">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPresetDays("custom");
                }}
                className="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Toggle Checklist Options */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-3 flex-wrap text-slate-700">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> แสดงในรายงาน:
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBP}
                  onChange={(e) => setIncludeBP(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">ความดันโลหิต</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSugar}
                  onChange={(e) => setIncludeSugar(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium">ค่าน้ำตาลปลายนิ้ว</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeWeight}
                  onChange={(e) => setIncludeWeight(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-medium">น้ำหนัก/BMI</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMeds}
                  onChange={(e) => setIncludeMeds(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium">รายการยา & ประวัติทานยา</span>
              </label>
            </div>

            {/* AI Summary Request Button */}
            <button
              type="button"
              onClick={handleGenerateAiNote}
              disabled={loadingAi}
              className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-md font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              <span>{loadingAi ? "กำลังวิเคราะห์..." : "สร้างข้อสรุป AI สั้นๆ เพิ่มในรายงาน"}</span>
            </button>
          </div>
        </div>

        {/* Printable Report Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 bg-white print:p-0 print:overflow-visible">
          
          {/* Printable Hospital-Grade Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-lg flex items-center justify-center">
                  M
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    MediTrack Pro • รายงานติดตามสัญญาณชีพและคลังยาประจำตัว
                  </h1>
                  <p className="text-xs text-slate-500">
                    เอกสารสรุปความคืบหน้าสำหรับการตรวจติดตามอาการโดยแพทย์ประจำตัว
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500 shrink-0">
              <p className="font-bold text-slate-800">วันที่ออกรายงาน: {formatThaiDateShort(new Date().toISOString().split("T")[0])}</p>
              <p>ช่วงข้อมูล: {formatThaiDateShort(startDate)} - {formatThaiDateShort(endDate)}</p>
            </div>
          </div>

          {/* Patient Profile Details Header */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">ชื่อ-นามสกุล ผู้ป่วย:</span>
              <strong className="text-sm font-bold text-slate-900">{activeProfile.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">อายุ / เพศ:</span>
              <span className="font-semibold text-slate-800">{activeProfile.age} ปี ({activeProfile.gender === "male" ? "ชาย" : "หญิง"})</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">โรคประจำตัว:</span>
              <span className="font-semibold text-slate-800">
                {activeProfile.chronicDiseases && activeProfile.chronicDiseases.length > 0
                  ? activeProfile.chronicDiseases.join(", ")
                  : "ไม่มีระบุ"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">ประวัติแพ้ยา:</span>
              <span className={activeProfile.drugAllergies && activeProfile.drugAllergies.length > 0 ? "font-bold text-red-600" : "font-semibold text-slate-800"}>
                {activeProfile.drugAllergies && activeProfile.drugAllergies.length > 0
                  ? activeProfile.drugAllergies.join(", ")
                  : "ไม่มีแพ้ยา"}
              </span>
            </div>
          </div>

          {/* Key Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {includeBP && (
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">ค่าความดันเฉลี่ย</span>
                  <p className="text-lg font-black text-rose-900 mt-0.5">
                    {avgSys && avgDia ? `${avgSys}/${avgDia}` : "-"} <span className="text-xs font-normal text-rose-700">mmHg</span>
                  </p>
                  <p className="text-[10px] text-rose-700 font-medium mt-0.5">
                    สูงสุด {maxSys || "-"} / ต่ำสุด {minSys || "-"} (วัด {bpReadings.length} ครั้ง)
                  </p>
                </div>
                <HeartPulse className="w-8 h-8 text-rose-400 shrink-0" />
              </div>
            )}

            {includeSugar && (
              <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">ค่าน้ำตาลเฉลี่ย</span>
                  <p className="text-lg font-black text-purple-900 mt-0.5">
                    {avgSugar ? avgSugar : "-"} <span className="text-xs font-normal text-purple-700">mg/dL</span>
                  </p>
                  <p className="text-[10px] text-purple-700 font-medium mt-0.5">
                    เฉลี่ยงดอาหาร {avgFastingSugar || "-"} mg/dL (วัด {sugarReadings.length} ครั้ง)
                  </p>
                </div>
                <Droplet className="w-8 h-8 text-purple-400 shrink-0" />
              </div>
            )}

            {includeMeds && (
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">ความสม่ำเสมอทานยา</span>
                  <p className="text-lg font-black text-emerald-900 mt-0.5">
                    {adherencePct}% <span className="text-xs font-normal text-emerald-700">ตรงเวลา</span>
                  </p>
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                    ทานแล้ว {takenDoses} จากทั้งหมด {totalDoses} มื้อ
                  </p>
                </div>
                <Pill className="w-8 h-8 text-emerald-400 shrink-0" />
              </div>
            )}
          </div>

          {/* AI Clinical Summary Note (If generated) */}
          {aiSummary && (
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-1.5 print:bg-slate-100 print:text-slate-900 print:border-slate-300">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs print:text-blue-800">
                <Bot className="w-4 h-4" />
                <span>สรุปผลประเมินย่อ (Gemini AI Clinical Summary):</span>
              </div>
              <p className="text-xs leading-relaxed font-medium whitespace-pre-line text-slate-200 print:text-slate-800">
                {aiSummary}
              </p>
            </div>
          )}

          {/* Readings History Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span>บันทึกผลวัดค่าสัญญาณชีพ ({filteredVitals.length} รายการ)</span>
            </h3>

            {filteredVitals.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-xl">
                ไม่พบข้อมูลบันทึกความดัน/น้ำตาลในช่วงเวลาที่เลือก
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                      <th className="p-2.5">วันที่-เวลา</th>
                      {includeBP && <th className="p-2.5">ความดัน (SYS/DIA)</th>}
                      {includeBP && <th className="p-2.5">ชีพจร</th>}
                      {includeSugar && <th className="p-2.5">น้ำตาลปลายนิ้ว</th>}
                      {includeSugar && <th className="p-2.5">ชนิดการเจาะ</th>}
                      {includeWeight && <th className="p-2.5">น้ำหนัก</th>}
                      <th className="p-2.5">หมายเหตุ / Bluetooth Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredVitals.map((v) => {
                      const bp = v.systolicBP && v.diastolicBP ? evaluateBP(v.systolicBP, v.diastolicBP) : null;
                      const sugar = v.bloodSugar ? evaluateSugar(v.bloodSugar, v.sugarType) : null;

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-900">{formatThaiDateShort(v.date)}</td>
                          {includeBP && (
                            <td className="p-2.5">
                              {v.systolicBP ? (
                                <span className={`font-bold ${bp?.color || "text-slate-800"}`}>
                                  {v.systolicBP}/{v.diastolicBP} mmHg
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                          {includeBP && <td className="p-2.5">{v.heartRate ? `${v.heartRate} bpm` : "-"}</td>}
                          {includeSugar && (
                            <td className="p-2.5">
                              {v.bloodSugar ? (
                                <span className={`font-bold ${sugar?.color || "text-slate-800"}`}>
                                  {v.bloodSugar} mg/dL
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                          {includeSugar && (
                            <td className="p-2.5 text-slate-500">
                              {v.sugarType === "fasting"
                                ? "งดอาหาร"
                                : v.sugarType === "after_meal"
                                ? "หลังอาหาร"
                                : v.sugarType
                                ? "เจาะสุ่ม"
                                : "-"}
                            </td>
                          )}
                          {includeWeight && <td className="p-2.5">{v.weight ? `${v.weight} kg` : "-"}</td>}
                          <td className="p-2.5 text-slate-500 text-[11px] max-w-xs truncate">{v.note || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Medications List Table */}
          {includeMeds && profileMeds.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Pill className="w-4 h-4 text-blue-600" />
                <span>รายการยาประจำตัวปัจจุบัน ({profileMeds.length} รายการ)</span>
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">ชื่อยา</th>
                      <th className="p-2.5">สรรพคุณ / ข้อบ่งใช้</th>
                      <th className="p-2.5">ขนาดยา/ครั้ง</th>
                      <th className="p-2.5">มื้อยา & คำแนะนำ</th>
                      <th className="p-2.5">คงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {profileMeds.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <strong className="text-slate-900 block">{m.name}</strong>
                          {m.genericName && <span className="text-[10px] text-slate-400 italic">{m.genericName}</span>}
                        </td>
                        <td className="p-2.5 text-slate-700">{m.purpose || "-"}</td>
                        <td className="p-2.5 font-semibold text-slate-800">
                          {m.dosagePerTime} {m.unit}
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-blue-800">
                            {m.schedules.map((s) => MEAL_NAMES_TH[s]).join(", ")}
                          </span>
                          <span className="text-slate-500 block text-[10px]">• {FOOD_RELATION_TH[m.foodRelation]}</span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-700">
                          {m.remainingQuantity} {m.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Doctor Signature Block */}
          <div className="pt-8 border-t border-slate-200 flex justify-end">
            <div className="text-center w-60 space-y-8">
              <p className="text-xs text-slate-500">ลงชื่อแพทย์ผู้รับรายงาน............................................</p>
              <p className="text-xs font-bold text-slate-800">(.........................................................................)</p>
              <p className="text-[10px] text-slate-400">วันที่.........../............/..............</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Buttons Bar (Hidden on Print) */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-slate-400">
            เอกสารรองรับการพิมพ์และแนบในไฟล์เวชระเบียนประจำตัว
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Copy Summary Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedText ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
              <span>{copiedText ? "คัดลอกข้อความแล้ว!" : "คัดลอกสรุปส่ง LINE"}</span>
            </button>

            {/* Download CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>ส่งออก CSV</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงาน / บันทึก PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
