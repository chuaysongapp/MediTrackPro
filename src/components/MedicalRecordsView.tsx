import React, { useState } from "react";
import {
  Stethoscope,
  Calendar,
  Clock,
  Building,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  Activity,
  Sparkles,
  Trash2,
  FileCheck,
  ShieldCheck,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DoctorAppointment, MedicalRecord, UserProfile } from "../types";
import { formatThaiDate } from "../utils/thaiHelpers";

interface MedicalRecordsViewProps {
  activeProfile: UserProfile;
  appointments: DoctorAppointment[];
  medicalRecords: MedicalRecord[];
  onOpenAddAppointment: () => void;
  onOpenAddMedicalRecord: () => void;
  onDeleteMedicalRecord: (recordId: string) => void;
  onToggleApptStatus: (apptId: string) => void;
}

export const MedicalRecordsView: React.FC<MedicalRecordsViewProps> = ({
  activeProfile,
  appointments,
  medicalRecords,
  onOpenAddAppointment,
  onOpenAddMedicalRecord,
  onDeleteMedicalRecord,
  onToggleApptStatus,
}) => {
  const profileAppts = appointments.filter((a) => a.profileId === activeProfile.id);
  const profileRecords = medicalRecords
    .filter((r) => r.profileId === activeProfile.id)
    // Sort by test date, newest first (dates are YYYY-MM-DD so string compare is correct)
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Collapsible cards — all collapsed by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const upcomingAppts = profileAppts.filter((a) => a.status === "upcoming");

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-600" />
            <span>ประวัติการรักษา & วันนัดพบแพทย์</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกวันหมอนัด ผลเจาะเลือด ค่าห้องแล็บ สำหรับ{" "}
            <strong className="text-emerald-700">{activeProfile.name}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={onOpenAddMedicalRecord}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>อัปโหลด PDF ผลตรวจเลือด (AI Auto Read)</span>
          </button>
          <button
            onClick={onOpenAddAppointment}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มวันนัดพบแพทย์</span>
          </button>
        </div>
      </div>

      {/* Upcoming Appointments Section */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600" />
          <span>การนัดหมายแพทย์ที่กำลังจะถึง ({upcomingAppts.length})</span>
        </h3>

        {upcomingAppts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-xs text-slate-400">
            ไม่มีใบนัดแพทย์คงเหลือในเร็วๆ นี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingAppts.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-3xl p-5 border border-teal-200 shadow-xs space-y-3 relative hover:border-teal-300 transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="bg-teal-100 text-teal-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> นัดล่วงหน้า
                  </span>
                  <button
                    onClick={() => onToggleApptStatus(app.id)}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200 cursor-pointer"
                  >
                    ทำเครื่องหมายตรวจแล้ว
                  </button>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">{app.doctorName}</h4>
                  <p className="text-xs text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                    <Building className="w-3.5 h-3.5" /> {app.hospital} ({app.department || "แผนกทั่วไป"})
                  </p>
                </div>

                <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100 text-xs text-teal-950 font-bold flex justify-between">
                  <span>วันนัด: {formatThaiDate(app.appointmentDate)}</span>
                  <span>เวลา: {app.appointmentTime} น.</span>
                </div>

                {app.purpose && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    🎯 <strong>วัตถุประสงค์:</strong> {app.purpose}
                  </p>
                )}

                {app.preparationNotes && (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-0.5">
                    <span className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> คำแนะนำการเตรียมตัว:
                    </span>
                    <p className="font-medium">{app.preparationNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medical History & Lab Results Section */}
      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>ประวัติผลตรวจเลือดและบันทึกการรักษา ({profileRecords.length})</span>
          </h3>
          <button
            onClick={onOpenAddMedicalRecord}
            className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>เพิ่มผลตรวจเลือด</span>
          </button>
        </div>

        {profileRecords.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">ยังไม่มีประวัติบันทึกผลตรวจเลือดสำหรับ {activeProfile.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                สามารถอัปโหลดไฟล์ PDF หรือรูปถ่ายผลแล็บเพื่อดึงข้อมูลอัตโนมัติด้วย AI
              </p>
            </div>
            <button
              onClick={onOpenAddMedicalRecord}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>อัปโหลด PDF ผลตรวจเลือดแรก</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {profileRecords.map((rec) => {
              const isOpen = !!expanded[rec.id];
              return (
              <div
                key={rec.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base text-slate-900">{rec.title}</h4>
                      {rec.isAiParsed && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-emerald-700" /> ถอดจาก PDF 100%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{rec.hospital}</span>
                      <span>•</span>
                      <span>วันที่ตรวจ: {formatThaiDate(rec.date)}</span>
                      {rec.patientName && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-700 font-bold">
                            <User className="w-3 h-3 text-slate-400" /> {rec.patientName}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {rec.pdfFileName && (
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-500" /> {rec.pdfFileName}
                      </span>
                    )}
                    <button
                      onClick={() => toggle(rec.id)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                      title={isOpen ? "ย่อรายการ" : "ขยายรายการ"}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`คุณต้องการลบรายการ "${rec.title}" ใช่หรือไม่?`)) {
                          onDeleteMedicalRecord(rec.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsed summary — quick glance of key values */}
                {!isOpen && (
                  <button
                    onClick={() => toggle(rec.id)}
                    className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {rec.labResults?.fbs !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">FBS {rec.labResults.fbs}</span>
                      )}
                      {rec.labResults?.hba1c !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">HbA1c {rec.labResults.hba1c}%</span>
                      )}
                      {rec.labResults?.ldl !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">LDL {rec.labResults.ldl}</span>
                      )}
                      {rec.labResults?.egfr !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">eGFR {rec.labResults.egfr}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-700 font-bold shrink-0 group-hover:underline">แตะเพื่อดูทั้งหมด</span>
                  </button>
                )}

                {isOpen && (
                <>
                {rec.diagnosis && (
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-950">
                    <strong className="text-emerald-800">คำวินิจฉัยแพทย์:</strong> {rec.diagnosis}
                  </div>
                )}

                {rec.doctorNotes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    💡 <strong>คำแนะนำแพทย์:</strong> {rec.doctorNotes}
                  </p>
                )}

                {/* Lab Blood Test Grid */}
                {rec.labResults && (
                  <div className="pt-2">
                    <p className="text-xs font-extrabold text-slate-700 mb-2.5 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>ผลตรวจเลือดและเคมีคลินิก (Lab Blood Test):</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {rec.labResults.fbs !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Fasting Sugar (FBS)</span>
                          <span className="font-black text-slate-900">{rec.labResults.fbs} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.hba1c !== undefined && (
                        <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                          <span className="text-[10px] text-purple-700 font-bold block">น้ำตาลสะสม (HbA1c)</span>
                          <span className="font-black text-purple-900">{rec.labResults.hba1c}%</span>
                        </div>
                      )}
                      {rec.labResults.cholesterol !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Cholesterol รวม</span>
                          <span className="font-black text-slate-900">{rec.labResults.cholesterol} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.triglyceride !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Triglycerides</span>
                          <span className="font-black text-slate-900">{rec.labResults.triglyceride} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.hdl !== undefined && (
                        <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-700 font-bold block">HDL (ไขมันดี)</span>
                          <span className="font-black text-emerald-900">{rec.labResults.hdl} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.ldl !== undefined && (
                        <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200">
                          <span className="text-[10px] text-rose-700 font-bold block">LDL (ไขมันเลว)</span>
                          <span className="font-black text-rose-900">{rec.labResults.ldl} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.creatinine !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Creatinine (ไต)</span>
                          <span className="font-black text-slate-900">{rec.labResults.creatinine} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.egfr !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">eGFR (อัตรากรองไต)</span>
                          <span className="font-black text-slate-900">{rec.labResults.egfr} mL/min</span>
                        </div>
                      )}
                      {rec.labResults.bun !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">BUN</span>
                          <span className="font-black text-slate-900">{rec.labResults.bun} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.sgot !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">SGOT / AST (ตับ)</span>
                          <span className="font-black text-slate-900">{rec.labResults.sgot} U/L</span>
                        </div>
                      )}
                      {rec.labResults.sgpt !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">SGPT / ALT (ตับ)</span>
                          <span className="font-black text-slate-900">{rec.labResults.sgpt} U/L</span>
                        </div>
                      )}
                      {rec.labResults.uricAcid !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Uric Acid (เกาต์)</span>
                          <span className="font-black text-slate-900">{rec.labResults.uricAcid} mg/dL</span>
                        </div>
                      )}
                    </div>

                    {/* Custom items */}
                    {rec.labResults.customItems && rec.labResults.customItems.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          รายการตรวจเพิ่มเติมจากเอกสาร:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {rec.labResults.customItems.map((ci, cidx) => (
                            <div
                              key={cidx}
                              className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center"
                            >
                              <div>
                                <span className="font-bold text-slate-800 block text-[11px]">
                                  {ci.testName}
                                </span>
                                {ci.refRange && (
                                  <span className="text-[9px] text-slate-400 block">
                                    ค่าอ้างอิง: {ci.refRange}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-black text-slate-900 text-xs">
                                  {ci.resultValue} {ci.unit || ""}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

