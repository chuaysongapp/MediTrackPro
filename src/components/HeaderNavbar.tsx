import React, { useState } from "react";
import {
  Users,
  Bell,
  Wifi,
  WifiOff,
  ShieldCheck,
  ChevronDown,
  Plus,
  Pill,
  HeartPulse,
  Palette,
  Check,
  FileText,
} from "lucide-react";
import { UserProfile, Medicine } from "../types";

export type UITheme = "high-density" | "warm-care" | "modern-emerald" | "dark-obsidian";

interface HeaderNavbarProps {
  profiles: UserProfile[];
  activeProfile: UserProfile;
  medicines: Medicine[];
  isOnline: boolean;
  currentTheme?: UITheme;
  onThemeChange?: (theme: UITheme) => void;
  onOpenDoctorReport?: () => void;
  onSelectProfile: (profile: UserProfile) => void;
  onOpenAddProfile: () => void;
  onNavigateTab: (tab: string) => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  profiles,
  activeProfile,
  medicines,
  isOnline,
  currentTheme = "high-density",
  onThemeChange,
  onOpenDoctorReport,
  onSelectProfile,
  onOpenAddProfile,
  onNavigateTab,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Count low stock medicines for current active profile
  const lowStockCount = medicines.filter(
    (m) => m.profileId === activeProfile.id && m.remainingQuantity <= m.lowThreshold
  ).length;

  const themesList: { id: UITheme; name: string; desc: string; badge: string; color: string }[] = [
    {
      id: "high-density",
      name: "High Density (MediTrack Pro)",
      desc: "ดีไซน์กระชับ ข้อมูลครบถ้วน โทนสีน้ำเงิน Slate",
      badge: "แนะนำ",
      color: "bg-blue-600",
    },
    {
      id: "warm-care",
      name: "Warm Healthcare (Friendly Family)",
      desc: "ธีมสีอุ่น อักษรใหญ่ อ่านง่าย เหมาะกับผู้สูงอายุ",
      badge: "อ่านง่าย",
      color: "bg-amber-500",
    },
    {
      id: "modern-emerald",
      name: "Modern Clean (Fresh Emerald)",
      desc: "การ์ดโค้งมน มินิมอล สดใส โทนเขียวมรกต",
      badge: "สดใส",
      color: "bg-emerald-500",
    },
    {
      id: "dark-obsidian",
      name: "Dark Mode Executive (Obsidian)",
      desc: "ธีมมืด ถนอมสายตากลางคืน โทนดำ Cyan",
      badge: "กลางคืน",
      color: "bg-cyan-500",
    },
  ];

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-2 sm:py-0 gap-2">
          {/* Logo & App Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-base sm:text-lg shadow-xs shrink-0">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-xs sm:text-base md:text-lg text-white tracking-tight leading-tight truncate">
                  MediTrack Pro <span className="text-blue-400 text-xs font-normal hidden md:inline">| คลังยา & สุขภาพ</span>
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium bg-slate-800 text-blue-300 border border-slate-700 px-2 py-0.5 rounded-md shrink-0">
                  <ShieldCheck className="w-3 h-3 text-blue-400" /> ปลอดภัย 100%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:block truncate">
                ระบบจัดการคลังยา เตือนทานยา และติดตามสุขภาพครอบครัว
              </p>
            </div>
          </div>

          {/* Right Controls: Doctor Report, Theme Selector, Low Stock Alert, Offline Indicator, Profile Switcher */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Doctor Report Modal Trigger Button */}
            {onOpenDoctorReport && (
              <button
                type="button"
                onClick={onOpenDoctorReport}
                className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
                title="ออกรายงานค่าความดัน/น้ำตาลส่งให้หมอ"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden md:inline">รายงานพบแพทย์</span>
              </button>
            )}

            {/* UI Theme Selector Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowThemeMenu(!showThemeMenu);
                  setShowProfileMenu(false);
                }}
                className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shrink-0"
                title="เลือกธีม UX/UI"
              >
                <Palette className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden xl:inline">ธีม UX/UI</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Theme Dropdown Menu */}
              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-2 py-1.5 mb-1 border-b border-slate-800 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      เลือกรูปแบบ UX/UI ดีไซน์
                    </p>
                    <span className="text-[9px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                      4 รูปแบบ
                    </span>
                  </div>
                  <div className="space-y-1">
                    {themesList.map((th) => {
                      const isSelected = currentTheme === th.id;
                      return (
                        <button
                          key={th.id}
                          onClick={() => {
                            if (onThemeChange) onThemeChange(th.id);
                            setShowThemeMenu(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-950/80 border-blue-500 text-white"
                              : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${th.color}`} />
                              <span className="text-xs font-bold">{th.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 pl-4">{th.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Low Stock Warning Button */}
            {lowStockCount > 0 && (
              <button
                onClick={() => onNavigateTab("inventory")}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-orange-500/10 text-orange-300 border border-orange-500/30 hover:bg-orange-500/20 text-xs font-semibold transition-all animate-pulse"
                title="ยาใกล้หมดคลัง"
              >
                <Bell className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden xs:inline">ยาใกล้หมด</span>
                <span className="bg-orange-500 text-white px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                  {lowStockCount}
                </span>
              </button>
            )}

            {/* Offline/Online Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                isOnline
                  ? "bg-slate-800 text-green-400 border-slate-700"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
              title={isOnline ? "เชื่อมต่ออินเทอร์เน็ตพร้อมใช้งานแบบคลาวด์" : "ใช้งานในโหมดออฟไลน์ (ข้อมูลบันทึกในเครื่อง)"}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-green-400" />
                  <span className="hidden md:inline">ออนไลน์</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-orange-400" />
                  <span className="hidden md:inline">ออฟไลน์</span>
                </>
              )}
            </div>

            {/* Multi-User Profile Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg p-1.5 pr-2.5 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                  {activeProfile.avatarUrl ? (
                    <img
                      src={activeProfile.avatarUrl}
                      alt={activeProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    activeProfile.name.charAt(0)
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white max-w-[100px] truncate">
                    {activeProfile.name}
                  </div>
                  <div className="text-[10px] text-blue-400 flex items-center gap-1">
                    <span>{activeProfile.relationship}</span>
                    {activeProfile.pinCode && <span className="text-slate-400">🔒</span>}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-slate-200 divide-y divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      สลับบัญชีผู้ใช้งาน ({profiles.length})
                    </p>
                  </div>
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {profiles.map((prof) => {
                      const isActive = prof.id === activeProfile.id;
                      return (
                        <button
                          key={prof.id}
                          onClick={() => {
                            setShowProfileMenu(false);
                            onSelectProfile(prof);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800 transition-colors text-left ${
                            isActive ? "bg-blue-950/60 text-blue-300 font-semibold border-l-2 border-blue-500" : "text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center overflow-hidden shrink-0">
                              {prof.avatarUrl ? (
                                <img src={prof.avatarUrl} alt={prof.name} className="w-full h-full object-cover" />
                              ) : (
                                prof.name.charAt(0)
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold truncate">{prof.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {prof.relationship} • อายุ {prof.age} ปี
                              </p>
                            </div>
                          </div>
                          {prof.pinCode && (
                            <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1 py-0.5 rounded">
                              🔒 PIN
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenAddProfile();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มบัญชีสมาชิกใหม่</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
