import React from "react";
import {
  LayoutDashboard,
  Pill,
  Clock,
  BarChart3,
  Stethoscope,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  lowStockCount: number;
  upcomingApptCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  lowStockCount,
  upcomingApptCount,
}) => {
  const tabs = [
    {
      id: "dashboard",
      label: "แดชบอร์ดสุขภาพ",
      shortLabel: "หน้าแรก",
      icon: LayoutDashboard,
    },
    {
      id: "inventory",
      label: "คลังยาคงเหลือ",
      shortLabel: "คลังยา",
      icon: Pill,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: "bg-orange-500 text-white",
    },
    {
      id: "intake",
      label: "บันทึกทานยาแต่ละมื้อ",
      shortLabel: "ตารางยา",
      icon: Clock,
    },
    {
      id: "analytics",
      label: "กราฟสรุปผล & AI",
      shortLabel: "กราฟสรุป",
      icon: BarChart3,
      isAi: true,
    },
    {
      id: "records",
      label: "ประวัติการรักษา & นัดแพทย์",
      shortLabel: "นัดแพทย์",
      icon: Stethoscope,
      badge: upcomingApptCount > 0 ? upcomingApptCount : null,
      badgeColor: "bg-blue-600 text-white",
    },
    {
      id: "settings",
      label: "LINE API & ตั้งค่าระบบ",
      shortLabel: "ตั้งค่า",
      icon: MessageSquare,
    },
  ];

  return (
    <>
      {/* Desktop Top Navigation Bar (Hidden on Mobile) */}
      <nav className="hidden sm:block bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs overflow-x-clip">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="grid grid-cols-6 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer text-center min-w-0 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-slate-50 border border-slate-200/80"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-slate-500"
                    }`}
                  />
                  <div className="flex items-center gap-1 min-w-0 truncate">
                    <span className="hidden lg:inline truncate">{tab.label}</span>
                    <span className="inline lg:hidden truncate">{tab.shortLabel}</span>

                    {tab.isAi && (
                      <span className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                      }`}>
                        <Sparkles className="w-2.5 h-2.5 fill-current" /> AI
                      </span>
                    )}

                    {tab.badge !== null && tab.badge !== undefined && (
                      <span
                        className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${tab.badgeColor}`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Floating Bottom Dock (Concept 1 - Mobile Bottom Navigation Bar) */}
      <div className="block sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl px-1 py-1.5">
        <div className="grid grid-cols-6 gap-0.5 max-w-md mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer relative ${
                  isActive
                    ? "text-blue-400 font-black scale-105"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1.5 w-6 h-1 bg-blue-500 rounded-full shadow-xs" />
                )}

                <div className="relative">
                  <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span
                      className={`absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[8px] font-black leading-none ${tab.badgeColor}`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                <span className="truncate w-full text-center tracking-tighter">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
