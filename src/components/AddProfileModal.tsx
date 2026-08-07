import React, { useState } from "react";
import { UserPlus, UserCheck, X, Lock, Save, Camera, Upload } from "lucide-react";
import { UserProfile } from "../types";

interface AddProfileModalProps {
  initialProfile?: UserProfile | null;
  onClose: () => void;
  onSave: (profile: Omit<UserProfile, "id">, editId?: string) => void;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&auto=format&fit=crop&q=80",
];

export const AddProfileModal: React.FC<AddProfileModalProps> = ({
  initialProfile,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(initialProfile);

  const [name, setName] = useState(initialProfile?.name || "");
  const [relationship, setRelationship] = useState(initialProfile?.relationship || "ตนเอง");
  const [age, setAge] = useState<number>(initialProfile?.age || 35);
  const [gender, setGender] = useState<"male" | "female" | "other">(initialProfile?.gender || "male");
  const [bloodType, setBloodType] = useState(initialProfile?.bloodType || "O+");
  const [chronicDiseases, setChronicDiseases] = useState(initialProfile?.chronicDiseases?.join(", ") || "");
  const [drugAllergies, setDrugAllergies] = useState(initialProfile?.drugAllergies?.join(", ") || "");
  const [pinCode, setPinCode] = useState(initialProfile?.pinCode || "");
  const [avatarUrl, setAvatarUrl] = useState(
    initialProfile?.avatarUrl || PRESET_AVATARS[0]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave(
      {
        name: name.trim(),
        relationship,
        age: Number(age),
        gender,
        bloodType,
        chronicDiseases: chronicDiseases
          ? chronicDiseases.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        drugAllergies: drugAllergies
          ? drugAllergies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        pinCode: pinCode.trim(),
        avatarUrl,
      },
      initialProfile?.id
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 relative border border-slate-100 my-8 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
            {isEditing ? <UserCheck className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isEditing ? "แก้ไขข้อมูลโปรไฟล์ผู้ใช้งาน" : "เพิ่มโปรไฟล์สมาชิกในครอบครัว"}
            </h3>
            <p className="text-xs text-slate-500">
              {isEditing ? "ปรับปรุงข้อมูลส่วนตัว โรคประจำตัว หรือเปลี่ยนรูปโปรไฟล์" : "จัดการคลังยา แยกประวัติสุขภาพอิสระในเครื่องเดียว"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Picture Selection / Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>รูปโปรไฟล์ (Avatar Photo)</span>
            </label>
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="relative w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center overflow-hidden shrink-0 border-2 border-emerald-500 shadow-xs">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0) || "U"
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูปจากเครื่อง</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        avatarUrl === url ? "border-emerald-600 scale-105 shadow-xs" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="preset avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อ-นามสกุล / ชื่อเรียกโปรไฟล์ *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น คุณณรงค์, คุณแม่นภา"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ความสัมพันธ์
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="ตนเอง">ตนเอง (ผู้ใช้งานหลัก)</option>
                <option value="บิดา">บิดา</option>
                <option value="มารดา">มารดา</option>
                <option value="ปู่/ย่า/ตา/ยาย">ปู่/ย่า/ตา/ยาย</option>
                <option value="คู่สมรส">คู่สมรส</option>
                <option value="บุตร/หลาน">บุตร/หลาน</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                อายุ (ปี)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เพศ
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                กรุ๊ปเลือด
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="O+">O Rh+</option>
                <option value="O-">O Rh-</option>
                <option value="A+">A Rh+</option>
                <option value="A-">A Rh-</option>
                <option value="B+">B Rh+</option>
                <option value="B-">B Rh-</option>
                <option value="AB+">AB Rh+</option>
                <option value="AB-">AB Rh-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              โรคประจำตัว (คั่นด้วยเครื่องหมายจุลภาค ,)
            </label>
            <input
              type="text"
              placeholder="เช่น ความดันโลหิตสูง, เบาหวาน, ไขมัน"
              value={chronicDiseases}
              onChange={(e) => setChronicDiseases(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ประวัติแพ้ยา (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น Penicillin, Sulfa"
              value={drugAllergies}
              onChange={(e) => setDrugAllergies(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>ตั้งรหัส PIN 4 หลักสลับบัญชี (ไม่ใส่ได้)</span>
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="เช่น 1234"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-center tracking-widest font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? "บันทึกการแก้ไข" : "สร้างโปรไฟล์"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

