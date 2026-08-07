import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  HeartPulse,
  Droplet,
  Scale,
  Sparkles,
  Bot,
  RefreshCw,
  Award,
  AlertCircle,
  FileCheck2,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Medicine, HealthVital, IntakeLog, UserProfile } from "../types";
import { formatThaiDateShort, evaluateBP, evaluateSugar, calculateBMI } from "../utils/thaiHelpers";

interface AnalyticsViewProps {
  activeProfile: UserProfile;
  medicines: Medicine[];
  vitals: HealthVital[];
  intakeLogs: IntakeLog[];
  onOpenDoctorReport?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  activeProfile,
  medicines,
  vitals,
  intakeLogs,
  onOpenDoctorReport,
}) => {
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string>("");

  const profileMeds = medicines.filter((m) => m.profileId === activeProfile.id);

  // Vitals sorted chronologically for line charts
  const profileVitals = vitals
    .filter((v) => v.profileId === activeProfile.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Prepare Chart Data for Blood Pressure
  const bpChartData = profileVitals.map((v) => ({
    date: formatThaiDateShort(v.date),
    systolic: v.systolicBP || 0,
    diastolic: v.diastolicBP || 0,
    heartRate: v.heartRate || 0,
  }));

  // Prepare Chart Data for Blood Sugar
  const sugarChartData = profileVitals.map((v) => ({
    date: formatThaiDateShort(v.date),
    sugar: v.bloodSugar || 0,
  }));

  // Prepare Chart Data for Weight
  const weightChartData = profileVitals.map((v) => ({
    date: formatThaiDateShort(v.date),
    weight: v.weight || 0,
  }));

  // Prepare Stock Chart Data
  const stockChartData = profileMeds.map((m) => ({
    name: m.name.split(" ")[0],
    remaining: m.remainingQuantity,
    lowThreshold: m.lowThreshold,
  }));

  // Calculate Overall Adherence Rate %
  const profileLogs = intakeLogs.filter((l) => l.profileId === activeProfile.id);
  const totalLogsCount = profileLogs.length;
  const takenCount = profileLogs.filter((l) => l.status === "taken").length;
  const adherencePct = totalLogsCount > 0 ? Math.round((takenCount / totalLogsCount) * 100) : 100;

  const pieData = [
    { name: "ทานยาตรงเวลา", value: takenCount || 1, color: "#059669" },
    { name: "ข้ามมื้อ / ยังไม่ได้ทาน", value: Math.max(0, totalLogsCount - takenCount), color: "#f59e0b" },
  ];

  // Latest Vital Summary
  const latestVital = profileVitals[profileVitals.length - 1] || null;
  const bpEval = latestVital ? evaluateBP(latestVital.systolicBP, latestVital.diastolicBP) : null;
  const sugarEval = latestVital ? evaluateSugar(latestVital.bloodSugar, latestVital.sugarType) : null;
  const bmiEval = latestVital ? calculateBMI(latestVital.weight, latestVital.height) : null;

  // Request AI Health Advice from Gemini Server Route
  const handleGenerateAiReport = async () => {
    setLoadingAi(true);
    setAiAdvice("");
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
            latestBP: latestVital ? `${latestVital.systolicBP}/${latestVital.diastolicBP}` : null,
            latestSugar: latestVital ? latestVital.bloodSugar : null,
            latestWeight: latestVital ? latestVital.weight : null,
            bmi: bmiEval ? bmiEval.bmi : null,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.advice) {
        setAiAdvice(data.advice);
        setAiGeneratedAt(data.generatedAt);
      } else {
        setAiAdvice("เกิดข้อผิดพลาดในการประมวลผล AI: " + (data.error || "ไม่ทราบสาเหตุ"));
      }
    } catch (err: any) {
      setAiAdvice("ไม่สามารถเชื่อมต่อระบบ AI ได้ในขณะนี้: " + err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>สรุปผลสุขภาพ & กราฟคลังยารายเดือน</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            แดชบอร์ดสรุปผลกราฟิกและวิเคราะห์สัญญาณชีพสำหรับ{" "}
            <strong className="text-emerald-700">{activeProfile.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenDoctorReport && (
            <button
              onClick={onOpenDoctorReport}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>ออกรายงานพบแพทย์ (กำหนดช่วงเวลา)</span>
            </button>
          )}

          <button
            onClick={handleGenerateAiReport}
            disabled={loadingAi}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loadingAi ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 fill-current text-amber-300" />
            )}
            <span>{loadingAi ? "กำลังวิเคราะห์ AI..." : "วิเคราะห์สรุปผลด้วย Gemini AI"}</span>
          </button>
        </div>
      </div>

      {/* AI Advice Summary Banner */}
      {(aiAdvice || loadingAi) && (
        <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-3 relative overflow-hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span>สรุปผลประเมินสุขภาพและคำแนะนำจาก AI เภสัชกร</span>
            </div>
            {aiGeneratedAt && (
              <span className="text-[10px] text-slate-400">
                อัปเดตเมื่อ: {new Date(aiGeneratedAt).toLocaleTimeString("th-TH")} น.
              </span>
            )}
          </div>

          {loadingAi ? (
            <div className="py-8 text-center text-slate-300 space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs font-semibold">Gemini AI กำลังรวบรวมประวัติการทานยา ค่าความดัน ค่าน้ำตาลเพื่อสรุปผล...</p>
            </div>
          ) : (
            <div className="text-xs text-slate-200 leading-relaxed space-y-2 whitespace-pre-line font-medium bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              {aiAdvice}
            </div>
          )}
        </div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Adherence Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ความสม่ำเสมอทานยา</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{adherencePct}%</p>
            <p className="text-[10px] text-slate-500 mt-1">ประวัติทั้งหมด {totalLogsCount} ครั้ง</p>
          </div>
          <Award className="w-10 h-10 text-emerald-500/20" />
        </div>

        {/* BP Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ความดันโลหิตล่าสุด</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {latestVital?.systolicBP ? `${latestVital.systolicBP}/${latestVital.diastolicBP}` : "-"} <span className="text-xs text-slate-500 font-normal">mmHg</span>
            </p>
            {bpEval && <span className={`text-[10px] font-bold ${bpEval.color}`}>{bpEval.status}</span>}
          </div>
          <HeartPulse className="w-10 h-10 text-rose-500/20" />
        </div>

        {/* Sugar Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ค่าน้ำตาลปลายนิ้ว</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {latestVital?.bloodSugar || "-"} <span className="text-xs text-slate-500 font-normal">mg/dL</span>
            </p>
            {sugarEval && <span className={`text-[10px] font-bold ${sugarEval.color}`}>{sugarEval.status}</span>}
          </div>
          <Droplet className="w-10 h-10 text-purple-500/20" />
        </div>

        {/* Weight & BMI Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">น้ำหนักตัว & BMI</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {latestVital?.weight || "-"} <span className="text-xs text-slate-500 font-normal">กก.</span>
            </p>
            {bmiEval && <span className="text-[10px] font-bold text-teal-700">BMI: {bmiEval.bmi} ({bmiEval.text})</span>}
          </div>
          <Scale className="w-10 h-10 text-teal-500/20" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Pressure Line Chart */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>แนวโน้มความดันโลหิต (SYS/DIA)</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">เกณฑ์ปกติ: &lt;120/80</span>
          </div>

          <div className="h-64 w-full pt-2">
            {bpChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bpChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[50, 180]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="systolic" name="ความดันตัวบน (SYS)" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="diastolic" name="ความดันตัวล่าง (DIA)" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลความดันเพียงพอในการแสดงกราฟ
              </div>
            )}
          </div>
        </div>

        {/* Blood Sugar Line Chart */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-purple-600" />
              <span>ระดับน้ำตาลปลายนิ้ว (mg/dL)</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">เกณฑ์งดอาหาร: 70-99 mg/dL</span>
          </div>

          <div className="h-64 w-full pt-2">
            {sugarChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sugarChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[50, 200]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="sugar" name="ค่าน้ำตาล" fill="#9333ea" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลค่าน้ำตาลเพียงพอในการแสดงกราฟ
              </div>
            )}
          </div>
        </div>

        {/* Remaining Medication Stock Bar Chart */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>ระดับยาคงเหลือในคลังเทียบกับเกณฑ์เตือน</span>
            </h3>
          </div>

          <div className="h-64 w-full pt-2">
            {stockChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="remaining" name="คงเหลือในคลัง" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="lowThreshold" name="เกณฑ์เตือนใกล้หมด" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีรายการยาในคลัง
              </div>
            )}
          </div>
        </div>

        {/* Weight Trajectory Chart */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-600" />
              <span>การเปลี่ยนแปลงน้ำหนักตัว (กก.)</span>
            </h3>
          </div>

          <div className="h-64 w-full pt-2">
            {weightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" name="น้ำหนักตัว (กก.)" stroke="#0d9488" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลการบันทึกน้ำหนัก
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
