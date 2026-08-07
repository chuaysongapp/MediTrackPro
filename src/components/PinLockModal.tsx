import React, { useState } from "react";
import { Lock, KeyRound, AlertCircle, X } from "lucide-react";
import { UserProfile } from "../types";

interface PinLockModalProps {
  targetProfile: UserProfile | null;
  onSuccess: () => void;
  onClose: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  targetProfile,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (!targetProfile) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === targetProfile.pinCode) {
      setError("");
      onSuccess();
    } else {
      setError("รหัส PIN 4 หลักไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleKeyClick = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError("");
      if (nextPin.length === 4) {
        if (nextPin === targetProfile.pinCode) {
          onSuccess();
        } else {
          setError("รหัส PIN 4 หลักไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative border border-slate-100 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">ยืนยันตัวตนก่อนสลับบัญชี</h3>
          <p className="text-sm text-slate-500 mt-1">
            ใส่รหัส PIN 4 หลักสำหรับ <span className="font-semibold text-emerald-700">{targetProfile.name}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Dots Display */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > idx
                  ? "bg-emerald-600 border-emerald-600 scale-110"
                  : "border-slate-300 bg-slate-50"
              }`}
            />
          ))}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyClick(num)}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-lg text-slate-800 transition-all active:scale-95 flex items-center justify-center shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin("")}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-200 text-xs font-semibold text-slate-500 transition-all flex items-center justify-center"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={() => handleKeyClick("0")}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-lg text-slate-800 transition-all active:scale-95 flex items-center justify-center shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-all flex items-center justify-center"
          >
            ⌫ ลบ
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-2">
          เพื่อความปลอดภัยของข้อมูลสุขภาพและคลังยาประจำตัว
        </p>
      </div>
    </div>
  );
};
