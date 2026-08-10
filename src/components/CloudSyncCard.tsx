import React, { useState } from "react";
import { CloudUpload, CloudDownload, RefreshCw, Cloud } from "lucide-react";

interface CloudSyncCardProps {
  email?: string | null;
  lastSavedAt?: string | null;
  recordCount: number;
  onPush: () => Promise<{ ok: boolean; msg: string }>;
  onPull: () => Promise<{ ok: boolean; msg: string }>;
}

export const CloudSyncCard: React.FC<CloudSyncCardProps> = ({
  email,
  lastSavedAt,
  recordCount,
  onPush,
  onPull,
}) => {
  const [busy, setBusy] = useState<"push" | "pull" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (kind: "push" | "pull") => {
    setBusy(kind);
    setMsg(null);
    try {
      const res = kind === "push" ? await onPush() : await onPull();
      setMsg({ ok: res.ok, text: res.msg });
    } catch (e) {
      setMsg({ ok: false, text: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
          <Cloud className="w-5 h-5 text-sky-700" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">ซิงค์ข้อมูลกับคลาวด์ (ควบคุมเอง)</h3>
          <p className="text-xs text-slate-500">
            {email ? <>บัญชี: <span className="font-semibold text-slate-700">{email}</span></> : "ยังไม่ได้ล็อกอิน Google"}
            {lastSavedAt && <> · บันทึกล่าสุด {lastSavedAt}</>}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        ใช้เมื่อข้อมูลสองเครื่องไม่ตรงกัน — เครื่องที่มีข้อมูลครบให้กด "ดันขึ้นคลาวด์" แล้วอีกเครื่องกด "ดึงจากคลาวด์" (เครื่องนี้มีผลตรวจ {recordCount} รายการ)
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run("push")}
          disabled={busy !== null}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          {busy === "push" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
          ดันข้อมูลเครื่องนี้ขึ้นคลาวด์
        </button>
        <button
          type="button"
          onClick={() => run("pull")}
          disabled={busy !== null}
          className="px-4 py-2 rounded-xl border border-sky-300 text-sky-700 hover:bg-sky-50 disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          {busy === "pull" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
          ดึงจากคลาวด์มาเครื่องนี้
        </button>
      </div>

      {msg && (
        <p className={`text-xs font-semibold mt-3 ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
      )}

      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
        ⚠️ "ดันขึ้นคลาวด์" จะเขียนทับข้อมูลบนคลาวด์ด้วยข้อมูลเครื่องนี้ / "ดึงจากคลาวด์" จะเขียนทับข้อมูลในเครื่องนี้ด้วยข้อมูลคลาวด์ — เลือกให้ถูกเครื่อง
      </p>
    </div>
  );
};
