import React from "react";
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
} from "lucide-react";
import { DoctorAppointment, MedicalRecord, UserProfile } from "../types";
import { formatThaiDate } from "../utils/thaiHelpers";

interface MedicalRecordsViewProps {
  activeProfile: UserProfile;
  appointments: DoctorAppointment[];
  medicalRecords: MedicalRecord[];
  onOpenAddAppointment: () => void;
  onToggleApptStatus: (apptId: string) => void;
}

export const MedicalRecordsView: React.FC<MedicalRecordsViewProps> = ({
  activeProfile,
  appointments,
  medicalRecords,
  onOpenAddAppointment,
  onToggleApptStatus,
}) => {
  const profileAppts = appointments.filter((a) => a.profileId === activeProfile.id);
  const profileRecords = medicalRecords.filter((r) => r.profileId === activeProfile.id);

  const upcomingAppts = profileAppts.filter((a) => a.status === "upcoming");
  const pastAppts = profileAppts.filter((a) => a.status !== "upcoming");

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

        <button
          onClick={onOpenAddAppointment}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มวันนัดพบแพทย์</span>
        </button>
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
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200"
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
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          <span>ประวัติผลตรวจเลือดและบันทึกการรักษา ({profileRecords.length})</span>
        </h3>

        {profileRecords.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-xs text-slate-400">
            ยังไม่มีประวัติการบันทึกผลตรวจเลือด
          </div>
        ) : (
          <div className="space-y-4">
            {profileRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">{rec.title}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {rec.hospital} • {formatThaiDate(rec.date)}
                    </p>
                  </div>
                  <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                    ผลตรวจทางการแพทย์
                  </span>
                </div>

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
                    <p className="text-xs font-extrabold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>ค่าห้องแล็บเจาะเลือด (Blood Test Results):</span>
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
                          <span className="text-[10px] text-slate-400 font-bold block">Cholesterol</span>
                          <span className="font-black text-slate-900">{rec.labResults.cholesterol} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.ldl !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">LDL (ไขมันเลว)</span>
                          <span className="font-black text-slate-900">{rec.labResults.ldl} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.hdl !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">HDL (ไขมันดี)</span>
                          <span className="font-black text-slate-900">{rec.labResults.hdl} mg/dL</span>
                        </div>
                      )}
                      {rec.labResults.creatinine !== undefined && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Creatinine (การทำงานไต)</span>
                          <span className="font-black text-slate-900">{rec.labResults.creatinine}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
