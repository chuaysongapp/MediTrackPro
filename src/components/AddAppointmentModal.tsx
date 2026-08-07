import React, { useState } from "react";
import { Stethoscope, X, Calendar, Clock, Building, FileText, Save } from "lucide-react";
import { DoctorAppointment } from "../types";

interface AddAppointmentModalProps {
  profileId: string;
  onClose: () => void;
  onSave: (appointment: Omit<DoctorAppointment, "id">) => void;
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  profileId,
  onClose,
  onSave,
}) => {
  const [doctorName, setDoctorName] = useState("");
  const [hospital, setHospital] = useState("");
  const [department, setDepartment] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [purpose, setPurpose] = useState("");
  const [preparationNotes, setPreparationNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName || !hospital || !appointmentDate) return;

    onSave({
      profileId,
      doctorName: doctorName.trim(),
      hospital: hospital.trim(),
      department: department.trim(),
      appointmentDate,
      appointmentTime,
      purpose: purpose.trim(),
      preparationNotes: preparationNotes.trim(),
      status: "upcoming",
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 relative border border-slate-100 my-8 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">เพิ่มวันนัดพบแพทย์</h3>
            <p className="text-xs text-slate-500">
              แจ้งเตือนการนัดหมาย ฟังผลตรวจ และคำแนะนำเตรียมตัวก่อนพบแพทย์
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อแพทย์ผู้ตรวจ *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น นพ.ประวิทย์ สุขสมบูรณ์"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                โรงพยาบาล / คลินิก *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น โรงพยาบาลศิริราช"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                แผนก / ศูนย์ตรวจ
              </label>
              <input
                type="text"
                placeholder="เช่น อายุรกรรมหัวใจ"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันนัดหมาย *
              </label>
              <input
                type="date"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เวลานัด *
              </label>
              <input
                type="time"
                required
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              จุดประสงค์ในการนัดหมาย
            </label>
            <input
              type="text"
              placeholder="เช่น ฟังผลตรวจเลือดประจำปี และรับยาลดความดัน"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ข้อควรปฏิบัติและเตรียมตัวก่อนพบแพทย์
            </label>
            <textarea
              rows={2}
              placeholder="เช่น งดน้ำและอาหารหลัง 20.00 น., เจาะค่าน้ำตาลปลายนิ้วย้อนหลังมาแสดง"
              value={preparationNotes}
              onChange={(e) => setPreparationNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกใบนัดพบแพทย์</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
