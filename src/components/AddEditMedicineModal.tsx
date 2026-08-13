import React, { useState } from "react";
import { Pill, X, Save, AlertCircle } from "lucide-react";
import { Medicine, MealTime, FoodRelation } from "../types";

interface AddEditMedicineModalProps {
  profileId: string;
  medicineToEdit?: Medicine | null;
  onClose: () => void;
  onSave: (medData: Omit<Medicine, "id" | "createdAt" | "updatedAt">) => void;
}

export const AddEditMedicineModal: React.FC<AddEditMedicineModalProps> = ({
  profileId,
  medicineToEdit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(medicineToEdit?.name || "");
  const [genericName, setGenericName] = useState(medicineToEdit?.genericName || "");
  const [purpose, setPurpose] = useState(medicineToEdit?.purpose || "");
  const [totalQuantity, setTotalQuantity] = useState(medicineToEdit?.totalQuantity || 60);
  const [remainingQuantity, setRemainingQuantity] = useState(
    medicineToEdit?.remainingQuantity !== undefined ? medicineToEdit.remainingQuantity : 60
  );
  const [lowThreshold, setLowThreshold] = useState(medicineToEdit?.lowThreshold || 15);
  const [unit, setUnit] = useState(medicineToEdit?.unit || "เม็ด");
  const [dosagePerTime, setDosagePerTime] = useState(medicineToEdit?.dosagePerTime || 1);
  const [schedules, setSchedules] = useState<MealTime[]>(
    medicineToEdit?.schedules || ["morning"]
  );
  const [foodRelation, setFoodRelation] = useState<FoodRelation>(
    medicineToEdit?.foodRelation || "after_meal"
  );
  const [instructions, setInstructions] = useState(medicineToEdit?.instructions || "");
  const [expiryDate, setExpiryDate] = useState(medicineToEdit?.expiryDate || "");

  const handleMealToggle = (meal: MealTime) => {
    if (schedules.includes(meal)) {
      if (schedules.length > 1) {
        setSchedules(schedules.filter((m) => m !== meal));
      }
    } else {
      setSchedules([...schedules, meal]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      profileId,
      name: name.trim(),
      genericName: genericName.trim(),
      purpose: purpose.trim(),
      totalQuantity: Number(totalQuantity),
      remainingQuantity: Number(remainingQuantity),
      lowThreshold: Number(lowThreshold),
      unit: unit.trim(),
      dosagePerTime: Number(dosagePerTime),
      schedules,
      foodRelation,
      instructions: instructions.trim(),
      expiryDate,
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
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {medicineToEdit ? "แก้ไขรายการยาประจำตัว" : "เพิ่มรายการยาใหม่เข้าคลัง"}
            </h3>
            <p className="text-xs text-slate-500">
              บันทึกรายละเอียด มื้อการทานยา และระดับแจ้งเตือนยาใกล้หมด
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อยา / ชื่อทางการค้า *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น Amlodipine 5mg, พาราเซตามอล"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อสามัญทางยา (Generic Name)
              </label>
              <input
                type="text"
                placeholder="เช่น Amlodipine besylate"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                สรรพคุณ / โรคที่รักษา
              </label>
              <input
                type="text"
                placeholder="เช่น ลดความดันโลหิต, ลดไขมัน"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                จำนวนต่อครั้งที่รับ *
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalQuantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTotalQuantity(v);
                  // Only auto-adjust remaining if it exceeds total AND both are non-zero
                  if (v > 0 && remainingQuantity > v) setRemainingQuantity(v);
                }}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">จำนวนที่รับมาต่อรอบ เช่น 60 เม็ด</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                คงเหลือปัจจุบัน *
              </label>
              <input
                type="number"
                min="0"
                required
                value={remainingQuantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRemainingQuantity(v);
                  // totalQuantity must be ≥ remaining
                  if (v > totalQuantity) setTotalQuantity(v);
                }}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">นับจากที่เหลือจริงในกล่อง</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เตือนใกล้หมด *
              </label>
              <input
                type="number"
                min="1"
                required
                value={lowThreshold}
                onChange={(e) => setLowThreshold(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 font-bold text-amber-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                หน่วยนับ *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="เม็ด">เม็ด</option>
                <option value="แคปซูล">แคปซูล</option>
                <option value="ซอง">ซอง</option>
                <option value="มล.">มล.</option>
                <option value="ช้อนชา">ช้อนชา</option>
                <option value="หยด">หยด</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              มื้อการทานยาประจำวัน (เลือกได้หลายมื้อ) *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "morning", label: "🌅 มื้อเช้า" },
                { id: "noon", label: "☀️ มื้อกลางวัน" },
                { id: "evening", label: "🌆 มื้อเย็น" },
                { id: "bedtime", label: "🌙 ก่อนนอน" },
              ].map((m) => {
                const selected = schedules.includes(m.id as MealTime);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => handleMealToggle(m.id as MealTime)}
                    className={`py-2 px-3 rounded-2xl text-xs font-bold border transition-all ${
                      selected
                        ? "bg-slate-900 text-emerald-400 border-slate-800 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ทานครั้งละกี่ ({unit})
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={dosagePerTime}
                onChange={(e) => setDosagePerTime(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ข้อแนะนำเรื่องมื้ออาหาร
              </label>
              <select
                value={foodRelation}
                onChange={(e) => setFoodRelation(e.target.value as FoodRelation)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="after_meal">หลังอาหาร (15-30 นาที)</option>
                <option value="before_meal">ก่อนอาหาร (30 นาที)</option>
                <option value="with_meal">พร้อมอาหาร / คำแรก</option>
                <option value="anytime">เวลาใดก็ได้ / เมื่อมีอาการ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              คำแนะนำวิธีทานพิเศษ / โน้ตกำกับ
            </label>
            <input
              type="text"
              placeholder="เช่น ดื่มน้ำตามมาก ๆ, ห้ามทานพร้อมนม"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              วันหมดอายุของยา (ถ้าทราบ)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกยา</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
