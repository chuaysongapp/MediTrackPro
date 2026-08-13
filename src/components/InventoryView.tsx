import React, { useState } from "react";
import {
  Pill,
  Plus,
  Search,
  AlertTriangle,
  PackagePlus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { Medicine, UserProfile } from "../types";
import { MEAL_NAMES_TH, FOOD_RELATION_TH, formatThaiDate } from "../utils/thaiHelpers";

interface InventoryViewProps {
  activeProfile: UserProfile;
  medicines: Medicine[];
  onOpenAddMedicine: () => void;
  onOpenEditMedicine: (med: Medicine) => void;
  onOpenRefill: (med: Medicine) => void;
  onDeleteMedicine: (medId: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  activeProfile,
  medicines,
  onOpenAddMedicine,
  onOpenEditMedicine,
  onOpenRefill,
  onDeleteMedicine,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "low_stock">("all");

  const profileMeds = medicines.filter((m) => m.profileId === activeProfile.id);

  const filteredMeds = profileMeds.filter((med) => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.genericName && med.genericName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (med.purpose && med.purpose.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterType === "low_stock") {
      return matchesSearch && med.remainingQuantity <= med.lowThreshold;
    }
    return matchesSearch;
  });

  const lowStockCount = profileMeds.filter((m) => m.remainingQuantity <= m.lowThreshold).length;

  return (
    <div className="space-y-5 pb-12">
      {/* Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            <span>คลังยาคงเหลือ ({profileMeds.length} รายการ)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คลังยาประจำตัวสำหรับ <strong className="text-blue-700">{activeProfile.name}</strong> • ตรวจสอบจำนวนและเติมยาเพิ่ม
          </p>
        </div>

        <button
          onClick={onOpenAddMedicine}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มรายการยาใหม่</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อยา, ชื่อสามัญ, สรรพคุณ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filterType === "all"
                ? "bg-slate-900 text-blue-400 shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            รายการยาทั้งหมด ({profileMeds.length})
          </button>

          <button
            onClick={() => setFilterType("low_stock")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterType === "low_stock"
                ? "bg-orange-500 text-white shadow-xs"
                : "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ยาใกล้หมด ({lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* Medication Cards Grid */}
      {filteredMeds.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-slate-200 space-y-2">
          <Pill className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-600 font-bold text-xs">ไม่พบรายการยาที่ตรงตามเงื่อนไขการค้นหา</p>
          <button
            onClick={onOpenAddMedicine}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-all inline-block"
          >
            + เพิ่มรายการยาเข้าคลัง
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeds.map((med) => {
            const isLowStock = med.remainingQuantity <= med.lowThreshold;
            const stockPct = Math.min(100, Math.round((med.remainingQuantity / Math.max(med.totalQuantity || 60, med.remainingQuantity, 1)) * 100));

            return (
              <div
                key={med.id}
                className={`bg-white rounded-xl p-4 border transition-all shadow-2xs relative flex flex-col justify-between ${
                  isLowStock ? "border-orange-300 ring-1 ring-orange-200" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Top Badges & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isLowStock ? (
                        <span className="bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-orange-600" /> ใกล้หมด
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          มีเพียงพอ
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditMedicine(med)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        title="แก้ไขข้อมูลยา"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteMedicine(med.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="ลบยาออก"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Medicine Title & Purpose */}
                  <h3 className="font-bold text-sm sm:text-base text-slate-800">{med.name}</h3>
                  {med.genericName && (
                    <p className="text-[11px] text-slate-400 font-medium italic">{med.genericName}</p>
                  )}
                  {med.purpose && (
                    <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded-md mt-2 border border-slate-100">
                      🎯 สรรพคุณ: {med.purpose}
                    </p>
                  )}

                  {/* Stock Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">จำนวนคงเหลือ:</span>
                      <span className={isLowStock ? "text-orange-600 font-bold" : "text-blue-700 font-bold"}>
                        {med.remainingQuantity} {med.unit}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      เติมยาครั้งละ {med.totalQuantity || 60} {med.unit} · เตือนเมื่อเหลือ {med.lowThreshold} {med.unit}
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isLowStock ? "bg-orange-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.max(5, stockPct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>เตือนเมื่อต่ำกว่า: {med.lowThreshold} {med.unit}</span>
                      <span>ครั้งละ: {med.dosagePerTime} {med.unit}</span>
                    </div>
                  </div>

                  {/* Schedules & Instructions */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">มื้อยา:</span>
                      {med.schedules.map((s) => (
                        <span key={s} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                          {MEAL_NAMES_TH[s]}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4">
                      • {FOOD_RELATION_TH[med.foodRelation]}
                    </p>
                  </div>
                </div>

                {/* Refill Button */}
                <button
                  onClick={() => onOpenRefill(med)}
                  className="mt-3 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 font-bold text-xs rounded-md transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>เติมยาเพิ่มเข้าคลัง (+)</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
