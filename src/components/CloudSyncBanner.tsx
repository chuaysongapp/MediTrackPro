import React, { useState } from "react";
import { User } from "firebase/auth";
import { Cloud, CloudCheck, CloudOff, LogIn, LogOut, UserCheck, Shield, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

interface CloudSyncBannerProps {
  user: User | null;
  isSaving: boolean;
  lastSavedAt: string | null;
  isOnline: boolean;
  onLoginGoogle: () => void;
  onLoginGuest: () => void;
  onLogout: () => void;
  onResetAllData?: () => void;
}

export const CloudSyncBanner: React.FC<CloudSyncBannerProps> = ({
  user,
  isSaving,
  lastSavedAt,
  isOnline,
  onLoginGoogle,
  onLoginGuest,
  onLogout,
  onResetAllData,
}) => {
  const [showAccountModal, setShowAccountModal] = useState(false);

  return (
    <>
      {/* Top Floating Cloud Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-200 text-xs px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-blue-400">
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : user ? (
              <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-[11px] sm:text-xs">
              Firebase Cloud DB:
            </span>
          </div>

          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[150px] sm:max-w-xs">
                {user.isAnonymous ? `ผู้เยี่ยมชม (${user.uid.slice(0, 6)})` : user.email}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full text-[11px]">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>ยังไม่ได้เข้าสู่ระบบคลาวด์</span>
            </div>
          )}

          {isSaving ? (
            <span className="text-[10px] text-blue-300 animate-pulse font-mono">
              กำลังบันทึกลง Firebase...
            </span>
          ) : lastSavedAt ? (
            <span className="text-[10px] text-slate-400 hidden md:inline font-mono">
              บันทึกล่าสุด: {lastSavedAt}
            </span>
          ) : null}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            <Shield className="w-3 h-3 text-emerald-400" />
             Firestore Security Rules ป้องกันการเข้าถึงจากบุคคลอื่น
          </span>

          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{user ? "จัดการบัญชีคลาวด์" : "เข้าสู่ระบบคลาวด์ฟรี"}</span>
          </button>
        </div>
      </div>

      {/* Account & Firebase Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ระบบเก็บข้อมูล Firebase Cloud</h3>
                  <p className="text-xs text-blue-400 font-medium">ปลอดค่าบริการ (Free Tier) & ข้อมูลเป็นส่วนตัว 100%</p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Status Box */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">สถานะการเชื่อมต่อ:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  user ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-amber-950 text-amber-300 border border-amber-800"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {user ? "เชื่อมต่อ Firebase Cloud สำเร็จ" : "ไม่ได้ลงชื่อเข้าใช้"}
                </span>
              </div>

              {user ? (
                <div className="pt-2 border-t border-slate-700/60 space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>ผู้ใช้งาน: {user.isAnonymous ? "บัญชีผู้เยี่ยมชม (Guest)" : user.email}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-6">
                    UID: <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-slate-300">{user.uid}</code>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-300">
                  กรุณาลงชื่อเข้าใช้ด้วย Google หรือใช้บัญชีผู้เยี่ยมชม เพื่อให้ระบบบันทึกคลังยาและประวัติสุขภาพขึ้นคลาวด์โดยอัตโนมัติ
                </p>
              )}
            </div>

            {/* Features & Safety Guarantees */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-400" /> สิทธิ์และความปลอดภัยของข้อมูล:
              </p>
              <ul className="space-y-1.5 text-slate-400 pl-5 list-disc text-[11px] leading-relaxed">
                <li><strong className="text-slate-200">ไม่สูญหาย:</strong> หากเคลียร์ประวัติเบราว์เซอร์หรือเปลี่ยนเครื่อง เพียงเข้าสู่ระบบด้วย Google ข้อมูลจะกลับมาครบถ้วน</li>
                <li><strong className="text-slate-200">ส่วนตัว 100%:</strong> Firestore Security Rules กำหนดให้เฉพาะ UID ของคุณเท่านั้นที่มีสิทธิ์อ่านและเขียนข้อมูล</li>
                <li><strong className="text-slate-200">ฟรี 100%:</strong> รองรับ Firestore Spark Free Tier ของ Google Cloud โดยไม่มีค่าบริการแอบแฝง</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="pt-2 space-y-2">
              {!user ? (
                <>
                  <button
                    onClick={() => {
                      onLoginGoogle();
                      setShowAccountModal(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>เข้าสู่ระบบด้วย Google (แนะนำ - ซิงก์ข้ามเครื่องได้)</span>
                  </button>

                  <button
                    onClick={() => {
                      onLoginGuest();
                      setShowAccountModal(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>เข้าใช้งานด่วน (Guest Account)</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onLogout();
                    setShowAccountModal(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-900/60 hover:bg-rose-900/80 text-rose-200 border border-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>ออกจากระบบคลาวด์</span>
                </button>
              )}

              <button
                onClick={() => setShowAccountModal(false)}
                className="w-full py-2 px-4 rounded-xl bg-transparent text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer text-center"
              >
                ปิดหน้าต่าง
              </button>

              {onResetAllData && (
                <div className="pt-2 border-t border-slate-800 text-center">
                  <button
                    onClick={() => {
                      if (confirm("คุณต้องการล้างข้อมูลตัวอย่างทั้งหมดและเริ่มต้นด้วยฐานข้อมูลว่างใช่หรือไม่?")) {
                        onResetAllData();
                        setShowAccountModal(false);
                      }
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                  >
                    🗑️ ล้างข้อมูลตัวอย่างทั้งหมด (เริ่มต้นฐานข้อมูลว่าง)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
