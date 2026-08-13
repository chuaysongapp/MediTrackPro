import React, { useState, useRef } from "react";
import { Stethoscope, X, Calendar, Clock, Building, FileText, Save, Upload, Sparkles, ClipboardPaste } from "lucide-react";
import { DoctorAppointment } from "../types";
import { extractTextFromPdfFile } from "../utils/labParser";
import { parseAppointmentText } from "../utils/appointmentParser";

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

  // PDF/image auto-fill
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const applyParsed = (text: string): boolean => {
    const p = parseAppointmentText(text);
    const got: string[] = [];
    if (p.doctorName) { setDoctorName(p.doctorName); got.push("แพทย์"); }
    if (p.hospital) { setHospital(p.hospital); got.push("โรงพยาบาล"); }
    if (p.department) { setDepartment(p.department); got.push("แผนก"); }
    if (p.appointmentDate) { setAppointmentDate(p.appointmentDate); got.push("วันนัด"); }
    if (p.appointmentTime) { setAppointmentTime(p.appointmentTime); got.push("เวลา"); }
    if (p.purpose) { setPurpose(p.purpose); got.push("วัตถุประสงค์"); }
    if (got.length === 0) {
      setParseMsg({ ok: false, text: "อ่านข้อมูลไม่พบ ลองวางข้อความเอง หรือกรอกด้านล่าง" });
      return false;
    }
    setParseMsg({ ok: true, text: `ดึงข้อมูลแล้ว: ${got.join(", ")} — ตรวจทานก่อนบันทึก` });
    return true;
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setParseMsg(null);
    try {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (isPdf) {
        const text = await extractTextFromPdfFile(file);
        if (!text || text.trim().length < 20) {
          setParseMsg({ ok: false, text: "PDF นี้ไม่มีข้อความ (เป็นไฟล์สแกน) — กำลังลองอ่านด้วย AI..." });
          await extractWithClaude(file, "application/pdf");
        } else {
          applyParsed(text);
        }
      } else {
        // Image — send to Claude Vision
        setParseMsg({ ok: false, text: "📷 กำลังอ่านรูปด้วย AI..." });
        await extractWithClaude(file, file.type || "image/jpeg");
      }
    } catch {
      setParseMsg({ ok: false, text: "เกิดข้อผิดพลาดในการอ่านไฟล์" });
    } finally {
      setParsing(false);
    }
  };

  const extractWithClaude = async (file: File, mediaType: string) => {
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const isImage = mediaType.startsWith("image/");
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          messages: [{
            role: "user",
            content: [
              isImage
                ? { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }
                : { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              {
                type: "text",
                text: `คุณเป็น parser ใบนัดพบแพทย์ภาษาไทย ดึงข้อมูลจากใบนัดนี้แล้วตอบ JSON เท่านั้น ไม่มีข้อความอื่น รูปแบบ:
{"doctorName":"","hospital":"","department":"","appointmentDate":"YYYY-MM-DD","appointmentTime":"HH:mm","purpose":""}
- appointmentDate ให้แปลงเป็น ค.ศ. (พ.ศ.2569 = ค.ศ.2026)
- ถ้าไม่มีข้อมูลใดให้ใส่ "" ห้ามใส่ null
- ตอบ JSON เท่านั้น`
              }
            ]
          }]
        })
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = await response.json();
      const rawText = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const got: string[] = [];
      if (parsed.doctorName) { setDoctorName(parsed.doctorName); got.push("แพทย์"); }
      if (parsed.hospital) { setHospital(parsed.hospital); got.push("โรงพยาบาล"); }
      if (parsed.department) { setDepartment(parsed.department); got.push("แผนก"); }
      if (parsed.appointmentDate) { setAppointmentDate(parsed.appointmentDate); got.push("วันนัด"); }
      if (parsed.appointmentTime) { setAppointmentTime(parsed.appointmentTime); got.push("เวลา"); }
      if (parsed.purpose) { setPurpose(parsed.purpose); got.push("วัตถุประสงค์"); }
      if (got.length > 0) {
        setParseMsg({ ok: true, text: `✅ AI อ่านได้: ${got.join(", ")} — ตรวจทานก่อนบันทึก` });
      } else {
        setParseMsg({ ok: false, text: "AI อ่านไม่พบข้อมูลนัด — กรุณากรอกด้วยตนเอง" });
      }
    } catch (e: any) {
      setParseMsg({ ok: false, text: `AI อ่านไม่ได้: ${e?.message || "error"} — กรุณากรอกเอง` });
    }
  };

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

        {/* Auto-fill from PDF / image / pasted text */}
        <div className="mb-5 rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
          <p className="text-xs font-bold text-teal-900 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-teal-600" /> ดึงข้อมูลจากใบนัดอัตโนมัติ
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.currentTarget.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" /> {parsing ? "กำลังอ่าน..." : "อัปโหลด PDF / รูป"}
            </button>
            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className="px-3.5 py-2 rounded-xl border border-teal-300 text-teal-800 hover:bg-teal-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ClipboardPaste className="w-4 h-4" /> วางข้อความจากใบนัด
            </button>
          </div>

          {showPaste && (
            <div className="mt-3">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={4}
                placeholder={"วางข้อความจากใบนัด เช่น\nนพ.รัชพล มาลา\nรพ.วลัยลักษณ์ (คลินิกหู คอ จมูก)\nวันนัด: 11 ส.ค. 2569 เวลา 11:45 น.\nวัตถุประสงค์: ฟังผล PSG"}
                className="w-full rounded-xl border border-teal-300 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => applyParsed(pasteText)}
                disabled={!pasteText.trim()}
                className="mt-2 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                ดึงข้อมูลจากข้อความ
              </button>
            </div>
          )}

          {parseMsg && (
            <p className={`text-xs font-semibold mt-2 ${parseMsg.ok ? "text-emerald-700" : "text-amber-700"}`}>
              {parseMsg.text}
            </p>
          )}
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
