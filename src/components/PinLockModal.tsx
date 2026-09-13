import React, { useState, useEffect } from "react";
import { Lock, AlertCircle, X, Delete } from "lucide-react";
import { UserProfile } from "../types";
import { verifyPin } from "../utils/appLock";

interface PinLockModalProps {
  profile: UserProfile | null;    // prop name matches what App.tsx passes
  onSuccess: () => void;
  onClose: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  profile,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (!profile) return null;

  const hasPbkdf2Pin = !profile.pinCode; // if plaintext pin is gone, use appLock
  // Legacy: profile.pinCode is still plaintext 4-digit stored in profile object
  // New: use verifyPin from appLock (PBKDF2) — profile.pinCode will be empty once migrated

  const verify = async (code: string) => {
    if (code.length < 4) return;
    setChecking(true);
    setError("");
    let ok = false;
    // First try PBKDF2 (new secure storage via appLock)
    ok = await verifyPin(code);
    // Fallback: compare against legacy plaintext PIN stored in profile
    if (!ok && profile.pinCode && profile.pinCode === code) ok = true;
    setChecking(false);
    if (ok) {
      onSuccess();
    } else {
      setError("PIN ไม่ถูกต้อง กรุณาลองใหม่");
      setPin("");
    }
  };

  const press = (d: string) => {
    if (checking) return;
    setError("");
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) verify(next);
  };

  const keys = ["1","2","3","4","5","6","7","8","9"];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative border border-slate-100">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">ยืนยันตัวตนก่อนสลับบัญชี</h3>
          <p className="text-sm text-slate-500 mt-1">
            ใส่ PIN สำหรับ <span className="font-semibold text-emerald-700">{profile.name}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map((i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              pin.length > i ? "bg-emerald-600 border-emerald-600 scale-110" : "border-slate-300 bg-slate-50"
            }`} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {keys.map((k) => (
            <button key={k} type="button" onClick={() => press(k)} disabled={checking}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-lg text-slate-800 transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50">
              {k}
            </button>
          ))}
          <button type="button" onClick={() => { setPin(""); setError(""); }} className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-200 text-xs font-semibold text-slate-500 transition-all flex items-center justify-center cursor-pointer">ล้าง</button>
          <button type="button" onClick={() => press("0")} disabled={checking}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-lg text-slate-800 transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50">0</button>
          <button type="button" onClick={() => { setPin((p) => p.slice(0,-1)); setError(""); }}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-200 text-slate-600 transition-all flex items-center justify-center cursor-pointer">
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-2">เพื่อความปลอดภัยของข้อมูลสุขภาพและคลังยาประจำตัว</p>
      </div>
    </div>
  );
};
