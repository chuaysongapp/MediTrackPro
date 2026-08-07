import React, { useState } from "react";
import {
  MessageSquare,
  Cloud,
  CloudUpload,
  CloudDownload,
  Users,
  Lock,
  Check,
  Send,
  Bell,
  Shield,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  Palette,
  Sparkles,
  Edit,
  Smartphone,
} from "lucide-react";
import { LineConfig, UserProfile, SystemData } from "../types";
import { UITheme } from "./HeaderNavbar";

interface LineAndSettingsViewProps {
  profiles: UserProfile[];
  activeProfile: UserProfile;
  lineConfig: LineConfig;
  currentTheme?: UITheme;
  onThemeChange?: (theme: UITheme) => void;
  onSaveLineConfig: (config: LineConfig) => void;
  onSendTestLineMessage: (message: string) => void;
  onCloudBackup: () => void;
  onCloudRestore: () => void;
  onExportJson: () => void;
  onImportJson: (jsonData: string) => void;
  onOpenAddProfile: () => void;
  onOpenEditProfile?: (profile: UserProfile) => void;
  onOpenPwaModal?: () => void;
}

export const LineAndSettingsView: React.FC<LineAndSettingsViewProps> = ({
  profiles,
  activeProfile,
  lineConfig,
  currentTheme = "high-density",
  onThemeChange,
  onSaveLineConfig,
  onSendTestLineMessage,
  onCloudBackup,
  onCloudRestore,
  onExportJson,
  onImportJson,
  onOpenAddProfile,
  onOpenEditProfile,
  onOpenPwaModal,
}) => {
  const [notifyToken, setNotifyToken] = useState(lineConfig.notifyToken || "");
  const [messagingUserId, setMessagingUserId] = useState(lineConfig.messagingUserId || "");
  const [mode, setMode] = useState<"line_notify" | "messaging_api">(lineConfig.mode || "line_notify");
  const [enabled, setEnabled] = useState(lineConfig.enabled ?? true);
  const [notifyLowStock, setNotifyLowStock] = useState(lineConfig.notifyLowStock ?? true);
  const [notifyIntakeReminder, setNotifyIntakeReminder] = useState(
    lineConfig.notifyIntakeReminder ?? true
  );
  const [notifyAppointment, setNotifyAppointment] = useState(
    lineConfig.notifyAppointment ?? true
  );

  const [testMsg, setTestMsg] = useState("🔔 ทดสอบการแจ้งเตือนจากระบบคลังยา & สุขภาพ");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string>("");

  const handleSaveLine = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveLineConfig({
      enabled,
      mode,
      notifyToken,
      messagingUserId,
      notifyLowStock,
      notifyIntakeReminder,
      notifyAppointment,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onImportJson(text);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <span>การเชื่อมต่อ LINE & ตั้งค่าระบบ</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          เลือกธีมดีไซน์ UX/UI, ตั้งค่าการแจ้งเตือนผ่าน LINE, สำรองข้อมูลคลาวด์ และจัดการสิทธิ์เข้าใช้งาน
        </p>
      </div>

      {/* UX/UI Theme Selection Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>สลับรูปแบบธีม UX/UI ดีไซน์</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" /> 4 ตัวเลือก
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                เลือกสไตล์หน้าตาการแสดงผลที่ตอบโจทย์ความชอบและการใช้งานของคุณ
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Option 1: High Density */}
          <button
            type="button"
            onClick={() => onThemeChange && onThemeChange("high-density")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              currentTheme === "high-density"
                ? "bg-slate-900 text-white border-blue-500 ring-2 ring-blue-500/40 shadow-md"
                : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400">High Density</span>
                {currentTheme === "high-density" && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <h4 className="font-extrabold text-xs mb-1">MediTrack Pro (Slate)</h4>
              <p className={`text-[10px] ${currentTheme === "high-density" ? "text-slate-300" : "text-slate-500"}`}>
                ข้อมูลกระชับ อ่านง่าย ปุ่มชัดเจน โทนสีน้ำเงิน Slate สไตล์การแพทย์โปร
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700/40 text-[10px] font-semibold text-blue-400">
              ✓ ค่าเริ่มต้นมาตรฐาน
            </div>
          </button>

          {/* Option 2: Warm Care */}
          <button
            type="button"
            onClick={() => onThemeChange && onThemeChange("warm-care")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              currentTheme === "warm-care"
                ? "bg-amber-900 text-amber-50 border-amber-500 ring-2 ring-amber-500/40 shadow-md"
                : "bg-amber-50/60 hover:bg-amber-100/60 text-slate-800 border-amber-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-500">Warm Care</span>
                {currentTheme === "warm-care" && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <h4 className="font-extrabold text-xs mb-1">Friendly Family (อบอุ่น)</h4>
              <p className={`text-[10px] ${currentTheme === "warm-care" ? "text-amber-200" : "text-slate-600"}`}>
                โทนสีอุ่น อักษรขนาดใหญ่ อ่านง่าย สบายตา สไตล์ครอบครัวสำหรับผู้สูงอายุ
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-amber-700/40 text-[10px] font-semibold text-amber-500">
              ✓ เหมาะสำหรับผู้สูงอายุ
            </div>
          </button>

          {/* Option 3: Modern Emerald */}
          <button
            type="button"
            onClick={() => onThemeChange && onThemeChange("modern-emerald")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              currentTheme === "modern-emerald"
                ? "bg-emerald-950 text-emerald-50 border-emerald-500 ring-2 ring-emerald-500/40 shadow-md"
                : "bg-emerald-50/40 hover:bg-emerald-100/50 text-slate-800 border-emerald-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-500">Fresh Mint</span>
                {currentTheme === "modern-emerald" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <h4 className="font-extrabold text-xs mb-1">Modern Clean (เขียวมรกต)</h4>
              <p className={`text-[10px] ${currentTheme === "modern-emerald" ? "text-emerald-200" : "text-slate-600"}`}>
                การ์ดโค้งมน มินิมอล สดใส ผ่อนคลาย สะอาดตาตามหลักการออกแบบยุคใหม่
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-800/40 text-[10px] font-semibold text-emerald-500">
              ✓ มินิมอล ผ่อนคลาย
            </div>
          </button>

          {/* Option 4: Dark Obsidian */}
          <button
            type="button"
            onClick={() => onThemeChange && onThemeChange("dark-obsidian")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              currentTheme === "dark-obsidian"
                ? "bg-slate-950 text-slate-100 border-cyan-400 ring-2 ring-cyan-400/40 shadow-md"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-400">Obsidian Dark</span>
                {currentTheme === "dark-obsidian" && (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <h4 className="font-extrabold text-xs mb-1">Dark Executive (โหมดมืด)</h4>
              <p className="text-[10px] text-slate-300">
                โหมดมืดถนอมสายตาสำหรับการใช้งานในที่มืดและกลางคืน ให้ลุคเทคโนโลยีล้ำสมัย
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-semibold text-cyan-400">
              ✓ ถนอมสายตากลางคืน
            </div>
          </button>
        </div>
      </div>

      {/* Web Browser & Mobile Push Notification / PWA App Icon Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span>การแจ้งเตือนบนเบราว์เซอร์ & ไอคอนแอปบนมือถือ (Device Push & PWA)</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  ใช้งานฟรี ไม่ต้องติดตั้งแอป
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                รองรับการส่งการแจ้งเตือนระบบ (Pop-up Push Notification) ตรงถึงหน้าจอมือถือและคอมพิวเตอร์
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notification Permission & Test Trigger Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-blue-600" /> สิทธิ์การแจ้งเตือนอุปกรณ์
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {typeof window !== "undefined" && "Notification" in window
                  ? Notification.permission === "granted"
                    ? "อนุญาตแล้ว (Active)"
                    : Notification.permission === "denied"
                    ? "ปฏิเสธสิทธิ์ (Denied)"
                    : "รอการอนุญาต (Default)"
                  : "ไม่รองรับ"}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              เมื่อกดอนุญาต ระบบจะส่งการแจ้งเตือนแบบป็อปอัป (Push Notification) เมื่อถึงเวลากินยาหรือใกล้ถึงเวลานัดพบแพทย์ แม้สลับไปใช้แอปอื่น
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if ("Notification" in window) {
                    Notification.requestPermission().then((perm) => {
                      if (perm === "granted") {
                        new Notification("🔔 MediTrack Pro Notification", {
                          body: "เปิดใช้งานการแจ้งเตือนอุปกรณ์เรียบร้อยแล้ว!",
                        });
                      } else {
                        alert("โปรดอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์");
                      }
                    });
                  } else {
                    alert("เบราว์เซอร์นี้ไม่รองรับ Web Notification");
                  }
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ขอสิทธิ์รับการแจ้งเตือน</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("💊 ได้เวลารับประทานยา (ทดสอบ)", {
                      body: "ยา ยาลดความดัน 1 เม็ด (หลังอาหารเช้า) - ผู้ป่วย: คุณสมชาย",
                      icon: "/favicon.ico",
                    });
                  } else {
                    alert("กรุณากด 'ขอสิทธิ์รับการแจ้งเตือน' และกดอนุญาต (Allow) ก่อนทดสอบ");
                  }
                }}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ทดสอบส่ง Noti</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
                    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 1.2);
                  } catch (e) {
                    console.log("Audio not supported", e);
                  }
                }}
                className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔊 ทดสอบเสียงกระดิ่ง</span>
              </button>
            </div>
          </div>

          {/* Add to Home Screen Instructions (Mobile App Icon) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs text-slate-700">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              📱 วิธีสร้างไอคอนแอปไว้ที่หน้าจอมือถือ (Add to Home Screen)
            </span>
            <p className="text-[11px] text-slate-500">
              ไม่ต้องดาวน์โหลดจาก App Store / Play Store ให้เปลืองเมมโมรี่ สามารถกดเพิ่มไอคอนลงหน้าจอมือถือเพื่อกดเข้าใช้งานได้ทันที:
            </p>
            <div className="space-y-2 pt-1 text-[11px]">
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <strong className="text-blue-600 block">🍏 iPhone / iPad (Safari):</strong>
                1. กดปุ่ม <span className="font-bold text-slate-900">"แชร์" (Share)</span> ที่แถบล่างสุดของ Safari<br />
                2. เลื่อนลงมาแล้วเลือก <span className="font-bold text-slate-900">"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <strong className="text-emerald-600 block">🤖 Android (Google Chrome):</strong>
                1. กดปุ่มเมนู <span className="font-bold text-slate-900">จุด 3 จุด (⋮)</span> ที่มุมขวาบน<br />
                2. เลือก <span className="font-bold text-slate-900">"ติดตั้งแอป" (Install App)</span> หรือ <span className="font-bold text-slate-900">"เพิ่มลงในหน้าจอหลัก"</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LINE Integration Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">การแจ้งเตือนผ่าน LINE</h3>
                  <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    ทางเลือกเพิ่มเติม
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">LINE Notify / Messaging API (ปิดไว้ได้หากใช้งานคนเดียว)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {!enabled ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ปิดการแจ้งเตือน LINE อยู่ (สำหรับเน้นใช้งานส่วนตัว)
              </p>
              <p className="text-[11px] text-slate-500">
                ระบบจะแจ้งเตือนผ่านเสียงและข้อความป็อปอัปบนเบราว์เซอร์/มือถือของคุณโดยตรงโดยไม่ต้องส่งเข้า LINE หากต้องการเปิดใช้งานภายหลัง สามารถกดเปิดสวิตช์มุมขวาบนได้
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleSaveLine} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รูปแบบการเชื่อมต่อ LINE
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("line_notify")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        mode === "line_notify"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-900 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      LINE Notify Token
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("messaging_api")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        mode === "messaging_api"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-900 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      LINE Messaging API
                    </button>
                  </div>
                </div>

                {mode === "line_notify" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      LINE Notify Access Token *
                    </label>
                    <input
                      type="password"
                      placeholder="กรอกรหัส Token จาก notify-bot.line.me"
                      value={notifyToken}
                      onChange={(e) => setNotifyToken(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      รับ Token ฟรีได้ที่ <a href="https://notify-bot.line.me" target="_blank" rel="noreferrer" className="text-emerald-700 underline">notify-bot.line.me</a>
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      LINE User ID (Messaging API) *
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น U1234567890abcdef..."
                      value={messagingUserId}
                      onChange={(e) => setMessagingUserId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Notification Event Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700">เงื่อนไขที่ต้องการให้เตือนเข้า LINE</label>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyLowStock}
                        onChange={(e) => setNotifyLowStock(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>เตือนอัตโนมัติเมื่อยามีจำนวนต่ำกว่าเกณฑ์ใกล้หมด</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyIntakeReminder}
                        onChange={(e) => setNotifyIntakeReminder(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>เตือนตามเวลามื้ออาหาร เช้า กลางวัน เย็น ก่อนนอน</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyAppointment}
                        onChange={(e) => setNotifyAppointment(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>เตือนใบนัดพบแพทย์ล่วงหน้า 1 วัน</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกการตั้งค่า LINE</span>
                  </button>
                </div>

                {saveSuccess && (
                  <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center animate-in fade-in duration-150">
                    ✅ บันทึกการตั้งค่า LINE เรียบร้อยแล้ว!
                  </p>
                )}
              </form>

              {/* Test LINE Notification Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ทดสอบส่งข้อความเข้า LINE ทันที</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMsg}
                    onChange={(e) => setTestMsg(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onSendTestLineMessage(testMsg)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่งทดสอบ</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cloud Backup, Google Drive & Multi-Account Card */}
        <div className="space-y-6">
          {/* PWA Mobile App Installation Card */}
          {onOpenPwaModal && (
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 border border-emerald-700/50 shadow-lg space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">ติดตั้งเป็นแอปมือถือ (PWA Shortcut)</h3>
                  <p className="text-[10px] text-emerald-200">ใช้งานเหมือนแอปจริง เปิดผ่านไอคอนหน้าจอหลัก มือถือเปิดเร็ว</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                คุณสามารถเพิ่ม MediTrack Pro ลงบนหน้าจอมือถือ (iPhone / Android) เพื่อเปิดใช้งานได้เต็มจอทันทีโดยไม่ติดแถบ URL ของเบราว์เซอร์
              </p>
              <button
                onClick={onOpenPwaModal}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>ดูวิธีติดตั้งลงหน้าจอมือถือ (Install App)</span>
              </button>
            </div>
          )}

          {/* Cloud Sync & Backup Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">ระบบสำรองข้อมูลคลาวด์ & ไฟล์</h3>
                <p className="text-[10px] text-slate-400">เข้าถึงข้อมูลได้ทุกอุปกรณ์ หรือส่งออกไฟล์ JSON</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              สำรองข้อมูลยาทั้งหมด ประวัติสุขภาพ ค่าน้ำตาล ความดัน และสมาชิกในครอบครัวไปยังคลาวด์เพื่อป้องกันข้อมูลสูญหาย
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onCloudBackup();
                  setBackupMsg("อัปโหลดสำรองข้อมูลไปยังคลาวด์เรียบร้อยแล้ว!");
                  setTimeout(() => setBackupMsg(""), 3000);
                }}
                className="p-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <CloudUpload className="w-6 h-6 text-teal-700" />
                <span>สำรองขึ้นคลาวด์</span>
              </button>

              <button
                onClick={() => {
                  onCloudRestore();
                  setBackupMsg("ดึงข้อมูลล่าสุดจากคลาวด์สำเร็จแล้ว!");
                  setTimeout(() => setBackupMsg(""), 3000);
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <CloudDownload className="w-6 h-6 text-slate-700" />
                <span>ดึงข้อมูลคืนจากคลาวด์</span>
              </button>
            </div>

            {backupMsg && (
              <p className="text-xs text-center font-bold text-teal-700 bg-teal-50 p-2 rounded-xl border border-teal-200">
                {backupMsg}
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">ส่งออก / นำเข้าไฟล์สำรอง (JSON File)</label>
              <div className="flex gap-2">
                <button
                  onClick={onExportJson}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดไฟล์ JSON</span>
                </button>

                <label className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer text-center">
                  <Upload className="w-3.5 h-3.5" />
                  <span>นำเข้าไฟล์ JSON</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Profiles & Security Management Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 font-bold flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">สมาชิกในระบบ ({profiles.length})</h3>
                  <p className="text-[10px] text-slate-400">ระบบรักษาความปลอดภัย PIN Code</p>
                </div>
              </div>
              <button
                onClick={onOpenAddProfile}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                + เพิ่มสมาชิก
              </button>
            </div>

            <div className="space-y-2">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                    p.id === activeProfile.id ? "bg-emerald-50 border-emerald-300 font-bold" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                      {p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold">{p.name} {p.id === activeProfile.id && "(ใช้งานอยู่)"}</p>
                      <p className="text-slate-400 text-[10px]">{p.relationship} • อายุ {p.age} ปี</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.pinCode ? (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Lock className="w-3 h-3" /> ล็อก PIN
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">ไม่มี PIN</span>
                    )}
                    {onOpenEditProfile && (
                      <button
                        onClick={() => onOpenEditProfile(p)}
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 hover:text-emerald-700 transition-all cursor-pointer"
                        title="แก้ไขข้อมูลและรูปโปรไฟล์"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
