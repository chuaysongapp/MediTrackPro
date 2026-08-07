import React, { useState } from "react";
import { PlusCircle, X, PackageCheck, Building2, Calendar, FileText } from "lucide-react";
import { Medicine } from "../types";

interface RefillModalProps {
  medicine: Medicine | null;
  onClose: () => void;
  onConfirm: (medicineId: string, addQty: number, cost?: number, source?: string, note?: string) => void;
}

export const RefillModal: React.FC<RefillModalProps> = ({ medicine, onClose, onConfirm }) => {
  const [addQty, setAddQty] = useState<number>(30);
  const [cost, setCost] = useState<string>("");
  const [source, setSource] = useState<string>("โรงพยาบาล/ร้านยาใกล้บ้าน");
  const [note, setNote] = useState<string>("");

  if (!medicine) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addQty <= 0) return;
    onConfirm(
      medicine.id,
      Number(addQty),
      cost ? Number(cost) : undefined,
      source,
      note
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 relative border border-slate-100 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">เติมยาเข้าคลังระบบ</h3>
            <p className="text-xs text-slate-500">{medicine.name}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 mb-5 border border-slate-200 text-xs text-slate-700 flex justify-between items-center">
          <div>
            <span className="text-slate-500">คงเหลือปัจจุบัน:</span>{" "}
            <span className="font-bold text-amber-700">
              {medicine.remainingQuantity} {medicine.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500">หลังเติมจะกลายเป็น:</span>{" "}
            <span className="font-bold text-emerald-700">
              {medicine.remainingQuantity + (Number(addQty) || 0)} {medicine.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              จำนวนยาที่ต้องการเติมเพิ่ม ({medicine.unit}) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                value={addQty}
                onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                {medicine.unit}
              </span>
            </div>
            {/* Quick selector buttons */}
            <div className="flex gap-2 mt-2">
              {[10, 30, 60, 90, 100].map((qty) => (
                <button
                  type="button"
                  key={qty}
                  onClick={() => setAddQty(qty)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                    addQty === qty
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  +{qty}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ค่ายาเพิ่มเติม (บาท - ถ้ามี)
            </label>
            <input
              type="number"
              placeholder="เช่น 150"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              แหล่งที่มารับยา / สถานพยาบาล
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="เช่น โรงพยาบาลศิริราช, ร้านขายยาแถวบ้าน"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              บันทึกโน้ตเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น ยาตามรอบนัดหมอรับประทาน 1 เดือน"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
              <PackageCheck className="w-4 h-4" />
              <span>ยืนยันเติมยา</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
