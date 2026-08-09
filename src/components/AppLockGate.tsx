import React, { useEffect, useState } from "react";
import { Lock, Delete, Fingerprint, ShieldCheck } from "lucide-react";
import { verifyPin, verifyBiometric, isBiometricEnabled, isWebAuthnSupported } from "../utils/appLock";

interface AppLockGateProps {
  onUnlock: () => void;
}

export const AppLockGate: React.FC<AppLockGateProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [checking, setChecking] = useState<boolean>(false);
  const biometricAvailable = isWebAuthnSupported() && isBiometricEnabled();

  const tryBiometric = async () => {
    setError("");
    setChecking(true);
    const ok = await verifyBiometric();
    setChecking(false);
    if (ok) onUnlock();
    else setError("ยืนยันลายนิ้วมือไม่สำเร็จ ลองใหม่หรือใช้ PIN");
  };

  // Offer biometric automatically on open
  useEffect(() => {
    if (biometricAvailable) {
      tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (code: string) => {
    setChecking(true);
    const ok = await verifyPin(code);
    setChecking(false);
    if (ok) {
      onUnlock();
    } else {
      setError("PIN ไม่ถูกต้อง");
      setPin("");
    }
  };

  const press = (d: string) => {
    if (checking) return;
    setError("");
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length >= 4 && next.length === 6) {
      // auto-submit at 6 digits; user can also press check
      submit(next);
    }
  };

  const backspace = () => {
    if (checking) return;
    setError("");
    setPin((p) => p.slice(0, -1));
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-600/20 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-white">MediTrack Pro</h1>
        <p className="text-sm text-slate-400 mt-1">ใส่ PIN เพื่อเข้าใช้งาน</p>

        {/* dots */}
        <div className="flex items-center justify-center gap-3 my-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full border ${
                i < pin.length ? "bg-emerald-400 border-emerald-400" : "border-slate-600"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        {/* keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xl font-semibold transition-colors cursor-pointer"
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={biometricAvailable ? tryBiometric : undefined}
            disabled={!biometricAvailable}
            className={`h-14 rounded-2xl flex items-center justify-center transition-colors ${
              biometricAvailable
                ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer"
                : "bg-slate-800/40 text-slate-600 cursor-not-allowed"
            }`}
            aria-label="ปลดล็อกด้วยลายนิ้วมือ"
          >
            <Fingerprint className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => press("0")}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xl font-semibold transition-colors cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="ลบ"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => submit(pin)}
          disabled={pin.length < 4 || checking}
          className="mt-5 w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" />
          {checking ? "กำลังตรวจสอบ..." : "ปลดล็อก"}
        </button>

        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
          ลืม PIN? ข้อมูลของคุณซิงค์บนคลาวด์อยู่แล้ว (หากล็อกอิน Google) — ล้างข้อมูลแอปในเครื่องแล้วล็อกอินใหม่เพื่อกู้คืน
        </p>
      </div>
    </div>
  );
};
