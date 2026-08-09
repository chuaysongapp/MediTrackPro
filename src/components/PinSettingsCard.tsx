import React, { useState } from "react";
import { Lock, Fingerprint, ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import {
  isPinSet,
  setPin as savePin,
  verifyPin,
  clearPin,
  isWebAuthnSupported,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
} from "../utils/appLock";

interface PinSettingsCardProps {
  profileName?: string;
}

export const PinSettingsCard: React.FC<PinSettingsCardProps> = ({ profileName }) => {
  const [pinSet, setPinSet] = useState<boolean>(isPinSet());
  const [bioOn, setBioOn] = useState<boolean>(isBiometricEnabled());
  const bioSupported = isWebAuthnSupported();

  const [currentPin, setCurrentPin] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const reset = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  };

  const validPin = (p: string) => /^\d{4,6}$/.test(p);

  const handleSave = async () => {
    setMsg(null);
    if (pinSet) {
      const ok = await verifyPin(currentPin);
      if (!ok) {
        setMsg({ type: "err", text: "PIN ปัจจุบันไม่ถูกต้อง" });
        return;
      }
    }
    if (!validPin(newPin)) {
      setMsg({ type: "err", text: "PIN ต้องเป็นตัวเลข 4–6 หลัก" });
      return;
    }
    if (newPin !== confirmPin) {
      setMsg({ type: "err", text: "ยืนยัน PIN ไม่ตรงกัน" });
      return;
    }
    await savePin(newPin);
    setPinSet(true);
    reset();
    setMsg({ type: "ok", text: "บันทึก PIN เรียบร้อย" });
  };

  const handleRemove = async () => {
    setMsg(null);
    const ok = await verifyPin(currentPin);
    if (!ok) {
      setMsg({ type: "err", text: "PIN ปัจจุบันไม่ถูกต้อง" });
      return;
    }
    clearPin();
    setPinSet(false);
    setBioOn(false);
    reset();
    setMsg({ type: "ok", text: "ปิดการล็อกแล้ว" });
  };

  const handleToggleBio = async () => {
    setMsg(null);
    if (bioOn) {
      disableBiometric();
      setBioOn(false);
      setMsg({ type: "ok", text: "ปิดปลดล็อกด้วยลายนิ้วมือแล้ว" });
      return;
    }
    if (!pinSet) {
      setMsg({ type: "err", text: "ตั้ง PIN ก่อนจึงจะเปิดลายนิ้วมือได้" });
      return;
    }
    const ok = await enableBiometric(profileName || "MediTrack");
    if (ok) {
      setBioOn(true);
      setMsg({ type: "ok", text: "เปิดปลดล็อกด้วยลายนิ้วมือแล้ว" });
    } else {
      setMsg({ type: "err", text: "ตั้งค่าลายนิ้วมือไม่สำเร็จ (อุปกรณ์อาจไม่รองรับ)" });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Lock className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">ล็อกแอปด้วย PIN / ลายนิ้วมือ</h3>
          <p className="text-xs text-slate-500">
            สถานะ: {pinSet ? <span className="text-emerald-700 font-semibold">เปิดใช้งาน</span> : <span className="text-slate-500">ยังไม่ตั้งค่า</span>}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหว การตั้ง PIN จะล็อกแอปทุกครั้งที่เปิด/รีเฟรช เพื่อกันผู้อื่นที่เข้าถึงเครื่องเดียวกัน
      </p>

      {(!pinSet || true) && (
        <div className="space-y-3">
          {pinSet && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">PIN ปัจจุบัน</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tracking-widest"
                placeholder="••••"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{pinSet ? "PIN ใหม่" : "ตั้ง PIN"}</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tracking-widest"
                placeholder="4–6 หลัก"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ยืนยัน PIN</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tracking-widest"
                placeholder="ยืนยันอีกครั้ง"
              />
            </div>
          </div>

          {msg && (
            <p className={`text-xs font-semibold ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              {pinSet ? "เปลี่ยน PIN" : "ตั้ง PIN"}
            </button>

            {pinSet && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ShieldOff className="w-4 h-4" />
                ปิดการล็อก
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleBio}
              disabled={!bioSupported}
              className={`px-4 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-colors ${
                !bioSupported
                  ? "border-slate-200 text-slate-400 cursor-not-allowed"
                  : bioOn
                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
              }`}
              title={bioSupported ? "" : "อุปกรณ์นี้ไม่รองรับลายนิ้วมือ (WebAuthn)"}
            >
              <Fingerprint className="w-4 h-4" />
              {bioOn ? "ปิดลายนิ้วมือ" : "เปิดลายนิ้วมือ"}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
            <KeyRound className="w-3 h-3" /> เก็บเฉพาะค่าแฮชของ PIN (PBKDF2) ไม่เคยเก็บ PIN จริง
          </p>
        </div>
      )}
    </div>
  );
};
