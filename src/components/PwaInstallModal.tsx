import React, { useEffect, useState } from "react";
import { Smartphone, Download, Share, PlusSquare, CheckCircle, X, ExternalLink, Sparkles } from "lucide-react";

interface PwaInstallModalProps {
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("กรุณาปฏิบัติตามคำแนะนำด้านล่างตามระบบปฏิบัติการของมือถือคุณ");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 relative border border-slate-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">ติดตั้ง MediTrack Pro เป็นแอป</h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> PWA App
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ใช้งานเหมือนแอปจริง เปิดจากไอคอนหน้าจอหลัก มือถือเปิดเร็ว ไม่ติดแถบเบราว์เซอร์
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center my-4 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 text-base">แอปถูกติดตั้งสมบูรณ์แล้ว!</h4>
            <p className="text-xs text-emerald-700">
              ขณะนี้คุณกำลังใช้งาน MediTrack Pro ในโหมด App (Standalone) เรียบร้อยแล้ว
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direct Install Button if supported */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>กดปุ่มนี้เพื่อติดตั้งแอปทันที (Install Application)</span>
              </button>
            )}

            {/* iOS Safari Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900" />
                  สำหรับ iPhone / iPad (iOS - Safari)
                </span>
                {isIOS && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">อุปกรณ์นี้</span>}
              </div>
              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                <li>เปิดเว็บนี้ด้วยเบราว์เซอร์ <strong>Safari</strong></li>
                <li>
                  กดปุ่ม <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold text-[11px]"><Share className="w-3 h-3 mr-1 text-blue-600" /> แชร์ (Share)</span> ที่แถบด้านล่าง
                </li>
                <li>
                  เลื่อนลงมาแล้วเลือก <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold text-[11px]"><PlusSquare className="w-3 h-3 mr-1 text-slate-800" /> เพิ่มไปยังหน้าจอหลัก (Add to Home Screen)</span>
                </li>
                <li>กด <strong>"เพิ่ม" (Add)</strong> มุมขวาบน จะได้ไอคอนแอป MediTrack Pro อยู่หน้าจอมือถือทันที!</li>
              </ol>
            </div>

            {/* Android / Chrome Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  สำหรับ Android / คอมพิวเตอร์ (Google Chrome / Edge)
                </span>
                {!isIOS && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">อุปกรณ์นี้</span>}
              </div>
              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                <li>เปิดเว็บนี้ด้วย <strong>Google Chrome</strong> หรือ <strong>Samsung Internet</strong></li>
                <li>กดปุ่มเมนู <strong>จุด 3 จุด (⋮)</strong> มุมขวาบน</li>
                <li>
                  เลือกเมนู <strong>"ติดตั้งแอป" (Install app)</strong> หรือ <strong>"เพิ่มลงในหน้าจอหลัก" (Add to Home screen)</strong>
                </li>
                <li>กดยืนยัน ไอคอนแอปจะปรากฏที่หน้าจอมือถือ/คอมพิวเตอร์ของคุณ</li>
              </ol>
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
