import React, { useState } from "react";
import { Activity, X, HeartPulse, Droplet, Scale, Save, Bluetooth, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { HealthVital } from "../types";
import { calculateBMI } from "../utils/thaiHelpers";
import { VitalType, VITAL_TYPE_LABEL, typesOf, localDateTimeStr, parseVitalDate } from "../utils/vitals";

interface AddVitalsModalProps {
  profileId: string;
  vitalToEdit?: HealthVital | null;
  initialType?: VitalType;
  lastHeight?: number; // prefill height from the latest record
  onClose: () => void;
  onSave: (vital: Omit<HealthVital, "id">) => void;
}

const TAB_META: Record<VitalType, { icon: React.ReactNode; on: string }> = {
  bp: { icon: <HeartPulse className="w-4 h-4" />, on: "bg-rose-600 text-white" },
  sugar: { icon: <Droplet className="w-4 h-4" />, on: "bg-purple-600 text-white" },
  weight: { icon: <Scale className="w-4 h-4" />, on: "bg-teal-600 text-white" },
};

const BT_LABEL: Record<VitalType, string> = {
  bp: "ดึงค่าจากเครื่องวัดความดันบลูทูธ",
  sugar: "ดึงค่าจากเครื่องเจาะน้ำตาลบลูทูธ",
  weight: "ดึงค่าจากเครื่องชั่งบลูทูธ",
};

const inputCls =
  "w-full bg-white border border-slate-300 rounded-xl py-2 px-3 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm";

export const AddVitalsModal: React.FC<AddVitalsModalProps> = ({
  profileId,
  vitalToEdit,
  initialType: initialTypeProp,
  lastHeight,
  onClose,
  onSave,
}) => {
  const initialType: VitalType = initialTypeProp ?? "bp";
  const isEdit = !!vitalToEdit;
  // When editing, only the types the record contains are editable (old combined records may have several)
  const editTypes: VitalType[] = vitalToEdit ? typesOf(vitalToEdit) : [];
  const availableTabs: VitalType[] = isEdit && editTypes.length > 0 ? editTypes : ["bp", "sugar", "weight"];
  const [tab, setTab] = useState<VitalType>(
    isEdit ? (editTypes.includes(initialType) ? initialType : editTypes[0] || "bp") : initialType
  );

  const str = (n?: number) => (n !== undefined && n !== null ? String(n) : "");
  const [systolicBP, setSystolicBP] = useState<string>(str(vitalToEdit?.systolicBP));
  const [diastolicBP, setDiastolicBP] = useState<string>(str(vitalToEdit?.diastolicBP));
  const [heartRate, setHeartRate] = useState<string>(str(vitalToEdit?.heartRate));
  const [bloodSugar, setBloodSugar] = useState<string>(str(vitalToEdit?.bloodSugar));
  const [sugarType, setSugarType] = useState<"fasting" | "after_meal" | "random">(vitalToEdit?.sugarType ?? "fasting");
  const [weight, setWeight] = useState<string>(str(vitalToEdit?.weight));
  const [height, setHeight] = useState<string>(str(vitalToEdit?.height ?? lastHeight));
  const [note, setNote] = useState<string>(vitalToEdit?.note ?? "");

  // Date & time of the measurement (local). Editing keeps the stored value.
  const initial = (() => {
    if (vitalToEdit?.date) {
      const [d, t] = vitalToEdit.date.trim().split(/[ T]/);
      return { d: d || localDateTimeStr().slice(0, 10), t: (t || "").slice(0, 5) || "00:00" };
    }
    const now = localDateTimeStr();
    return { d: now.slice(0, 10), t: now.slice(11, 16) };
  })();
  const [dateStr, setDateStr] = useState<string>(initial.d);
  const [timeStr, setTimeStr] = useState<string>(initial.t);
  const [formError, setFormError] = useState<string>("");

  // Bluetooth scanning state
  const [isBtConnecting, setIsBtConnecting] = useState<boolean>(false);
  const [btStatus, setBtStatus] = useState<string>("");
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [btErrorAdvice, setBtErrorAdvice] = useState<string>("");

  const handleBluetoothPairing = async (deviceType: "bp" | "sugar" | "scale") => {
    setIsBtConnecting(true);
    setBtErrorAdvice("");
    setBtStatus(
      deviceType === "bp"
        ? "กำลังเปิดกล่องค้นหาเครื่องวัดความดัน (Omron, Allwell, Yuwell, Beurer, ฯลฯ)..."
        : deviceType === "sugar"
        ? "กำลังค้นหาเครื่องวัดน้ำตาล BLE..."
        : "กำลังค้นหาเครื่องชั่งน้ำหนักอัจฉริยะ..."
    );

    try {
      // Check if Web Bluetooth is available
      if ("bluetooth" in navigator && (navigator as any).bluetooth) {
        const optionalServices = [
          "blood_pressure",
          0x1810,
          "glucose",
          0x1808,
          "weight_scale",
          0x181d,
          "body_composition",
          0x181b,
          "device_information",
          "generic_access",
          "generic_attribute",
        ];

        let device: any = null;

        // Try acceptAllDevices first so ALL nearby Bluetooth devices appear regardless of name prefix
        try {
          device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: optionalServices,
          });
        } catch (firstErr: any) {
          // If acceptAllDevices failed, try filters with popular health device name prefixes
          if (firstErr.name !== "NotFoundError" && firstErr.name !== "SecurityError") {
            const filters = [
              { namePrefix: "HEM" },
              { namePrefix: "BP" },
              { namePrefix: "Blood" },
              { namePrefix: "Omron" },
              { namePrefix: "Allwell" },
              { namePrefix: "Yuwell" },
              { namePrefix: "Beurer" },
              { namePrefix: "Microlife" },
              { namePrefix: "A&D" },
              { namePrefix: "BLE" },
              { namePrefix: "Health" },
              { namePrefix: "Smart" },
              { namePrefix: "eScale" },
            ];

            device = await (navigator as any).bluetooth.requestDevice({
              acceptAllDevices: false,
              filters: filters,
              optionalServices: optionalServices,
            });
          } else {
            throw firstErr;
          }
        }

        if (device) {
          const devName = device.name || `อุปกรณ์ BT (${(device.id || "").slice(0, 8)})`;
          setBtStatus(`พบอุปกรณ์: ${devName} — กำลังเชื่อมต่อ GATT...`);
          setConnectedDevice(devName);

          // Connect GATT and read real characteristic values
          try {
            const server = await device.gatt?.connect();
            if (server) {
              let gotData = false;

              if (deviceType === "bp") {
                try {
                  const svc = await server.getPrimaryService(0x1810);
                  const char = await svc.getCharacteristic(0x2a35);
                  // Blood Pressure uses INDICATE — must use startNotifications, not readValue
                  await char.startNotifications();
                  await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error("timeout")), 8000);
                    char.addEventListener("characteristicvaluechanged", (event: any) => {
                      clearTimeout(timeout);
                      const val = event.target.value as DataView;
                      const flags = val.getUint8(0);
                      // bit 0 = unit (0=mmHg, 1=kPa)
                      const systolic = val.getUint16(1, true);
                      const diastolic = val.getUint16(3, true);
                      const pulse = val.byteLength >= 10 ? val.getUint16(8, true) : 0;
                      if (systolic > 50 && systolic < 250) {
                        setSystolicBP(String(systolic));
                        setDiastolicBP(String(diastolic));
                        if (pulse > 30) setHeartRate(String(pulse));
                        gotData = true;
                      }
                      resolve();
                    });
                  });
                  await char.stopNotifications();
                } catch (e: any) {
                  console.warn("BP characteristic:", e?.message);
                }
              } else if (deviceType === "sugar") {
                try {
                  const svc = await server.getPrimaryService(0x1808);
                  const char = await svc.getCharacteristic(0x2a18);
                  await char.startNotifications();
                  await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error("timeout")), 8000);
                    char.addEventListener("characteristicvaluechanged", (event: any) => {
                      clearTimeout(timeout);
                      const val = event.target.value as DataView;
                      // offset 10 = glucose concentration as SFLOAT (mol/L)
                      const rawGlucose = val.getFloat32(10, true);
                      const mgdl = Math.round(rawGlucose * 18000);
                      if (mgdl > 20 && mgdl < 600) { setBloodSugar(String(mgdl)); gotData = true; }
                      resolve();
                    });
                  });
                  await char.stopNotifications();
                } catch (e: any) { console.warn("Sugar characteristic:", e?.message); }
              } else if (deviceType === "scale") {
                try {
                  const svc = await server.getPrimaryService(0x181d);
                  const char = await svc.getCharacteristic(0x2a9d);
                  await char.startNotifications();
                  await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error("timeout")), 8000);
                    char.addEventListener("characteristicvaluechanged", (event: any) => {
                      clearTimeout(timeout);
                      const val = event.target.value as DataView;
                      const rawWeight = val.getUint16(1, true) * 0.005;
                      if (rawWeight > 5 && rawWeight < 300) { setWeight(rawWeight.toFixed(1)); gotData = true; }
                      resolve();
                    });
                  });
                  await char.stopNotifications();
                } catch (e: any) { console.warn("Scale characteristic:", e?.message); }
              }

              if (gotData) {
                setBtStatus(`✅ ดึงข้อมูลจาก ${devName} สำเร็จ — ตรวจสอบค่าก่อนบันทึก`);
              } else {
                setBtStatus(`⚠️ เชื่อมต่อ ${devName} ได้ แต่ไม่พบข้อมูลสุขภาพ — อุปกรณ์อาจไม่ใช่เครื่องวัดสุขภาพ หรือไม่รองรับ BLE Health Profile`);
              }
            }
          } catch (gattErr: any) {
            setBtStatus(`⚠️ เชื่อมต่อ ${devName} แต่ดึงข้อมูลไม่ได้ — กรอกค่าเองด้านล่าง (${gattErr?.message || "GATT error"})`);
          }
        }
      } else {
        // Web Bluetooth not supported in browser (e.g. Safari iOS or older browser)
        setBtErrorAdvice(
          "เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth (เช่น Safari iOS) - แนะนำให้ใช้ Google Chrome หรือเปิดผ่านแอปมือถือ MediTrack Pro"
        );
      }
    } catch (err: any) {
      console.log("Bluetooth request error:", err);

      if (err.name === "NotFoundError") {
        // User cancelled or no device was chosen
        setBtStatus("ยกเลิกการค้นหา หรือไม่พบอุปกรณ์เปิดบลูทูธอยู่ใกล้เคียง");
      } else if (err.name === "SecurityError" || (err.message && err.message.includes("iframe"))) {
        setBtErrorAdvice(
          "⚠️ เบราว์เซอร์บล็อกการค้นหาบลูทูธเนื่องจากอยู่ในหน้ากรอบพรีวิว (iFrame) กรุณากดปุ่ม 'เปิดในหน้าต่างใหม่ (Open in New Tab)' ที่แถบด้านบน หรือใช้ผ่านแอปมือถือที่ติดตั้งไว้ จะค้นหาบลูทูธได้ 100%"
        );
      } else {
        setBtErrorAdvice(
          `เชื่อมต่อบลูทูธไม่สำเร็จ: ${err.message || "กรุณาเปิดบลูทูธที่อุปกรณ์แล้วลองอีกครั้ง"} — กรอกค่าเองได้`
        );
      }
    } finally {
      setIsBtConnecting(false);
    }
  };

  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const inRange = (v: number | undefined, lo: number, hi: number) => v !== undefined && !isNaN(v) && v >= lo && v <= hi;

  const validate = (t: VitalType): string => {
    if (t === "bp") {
      const sys = num(systolicBP), dia = num(diastolicBP), hr = num(heartRate);
      if (!inRange(sys, 50, 260)) return "กรอกความดันตัวบน (50–260 mmHg)";
      if (!inRange(dia, 30, 200)) return "กรอกความดันตัวล่าง (30–200 mmHg)";
      if ((sys as number) <= (dia as number)) return "ความดันตัวบนต้องมากกว่าตัวล่าง";
      if (hr !== undefined && !inRange(hr, 30, 220)) return "ชีพจรควรอยู่ระหว่าง 30–220 bpm";
    } else if (t === "sugar") {
      if (!inRange(num(bloodSugar), 20, 600)) return "กรอกค่าน้ำตาล (20–600 mg/dL)";
    } else {
      if (!inRange(num(weight), 10, 300)) return "กรอกน้ำหนัก (10–300 กก.)";
      const h = num(height);
      if (h !== undefined && !inRange(h, 50, 250)) return "ส่วนสูงควรอยู่ระหว่าง 50–250 ซม.";
    }
    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // New record: only the active tab. Edit: every type the record contains.
    const typesToSave: VitalType[] = isEdit ? availableTabs : [tab];
    for (const t of typesToSave) {
      const err = validate(t);
      if (err) {
        setTab(t);
        setFormError(err);
        return;
      }
    }

    if (!dateStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
      setFormError("กรอกวันที่และเวลาที่วัด");
      return;
    }
    const when = `${dateStr} ${timeStr}`;
    const whenDate = parseVitalDate(when);
    if (!whenDate || whenDate.getTime() > Date.now() + 5 * 60 * 1000) {
      setFormError("วันและเวลาที่วัดต้องไม่เป็นอนาคต");
      return;
    }

    const record: Omit<HealthVital, "id"> = {
      profileId,
      date: when,
      note: connectedDevice ? `[Bluetooth: ${connectedDevice}] ${note.trim()}`.trim() : note.trim(),
    };
    if (typesToSave.includes("bp")) {
      record.systolicBP = num(systolicBP);
      record.diastolicBP = num(diastolicBP);
      record.heartRate = num(heartRate);
    }
    if (typesToSave.includes("sugar")) {
      record.bloodSugar = num(bloodSugar);
      record.sugarType = sugarType;
    }
    if (typesToSave.includes("weight")) {
      record.weight = num(weight);
      record.height = num(height);
    }
    onSave(record);
  };

  const bmiPreview = calculateBMI(num(weight), num(height));
  const switchTab = (t: VitalType) => {
    setTab(t);
    setFormError("");
    setBtStatus("");
    setBtErrorAdvice("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 relative border border-slate-100 animate-in fade-in zoom-in duration-200 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="ปิด"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{isEdit ? "แก้ไขค่าสุขภาพ" : "บันทึกค่าสุขภาพ"}</h3>
            <p className="text-xs text-slate-500">เลือกประเภทที่ต้องการบันทึก ระบบจะบันทึกเฉพาะค่าประเภทนั้น</p>
          </div>
        </div>

        {/* Type tabs */}
        {availableTabs.length > 1 && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-4">
            {availableTabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tab === t ? TAB_META[t].on : "text-slate-600 hover:bg-white"
                }`}
              >
                {TAB_META[t].icon}
                <span>{VITAL_TYPE_LABEL[t]}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">วันที่วัด</label>
              <input type="date" value={dateStr} max={localDateTimeStr().slice(0, 10)} onChange={(e) => setDateStr(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">เวลา</label>
              <input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Bluetooth — current tab's device only (new records) */}
          {!isEdit && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2">
              <button
                type="button"
                disabled={isBtConnecting}
                onClick={() => handleBluetoothPairing(tab === "weight" ? "scale" : tab)}
                className="w-full px-3 py-2 bg-white hover:bg-blue-100/60 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isBtConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4 text-blue-600" />}
                <span>{BT_LABEL[tab]}</span>
              </button>
              {btStatus && (
                <div className="text-[11px] font-bold text-blue-900 bg-white/80 p-2 rounded-lg border border-blue-100 flex items-center gap-1.5">
                  {isBtConnecting ? <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> : <CheckCircle className="w-3 h-3 text-green-600" />}
                  <span>{btStatus}</span>
                </div>
              )}
              {btErrorAdvice && (
                <div className="text-[11px] font-bold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{btErrorAdvice}</span>
                </div>
              )}
            </div>
          )}

          {/* Blood pressure */}
          {tab === "bp" && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-slate-800">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>ความดันโลหิต และชีพจร</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ตัวบน (SYS) *</label>
                  <input type="number" inputMode="numeric" placeholder="mmHg" value={systolicBP} onChange={(e) => setSystolicBP(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ตัวล่าง (DIA) *</label>
                  <input type="number" inputMode="numeric" placeholder="mmHg" value={diastolicBP} onChange={(e) => setDiastolicBP(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ชีพจร</label>
                  <input type="number" inputMode="numeric" placeholder="bpm" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Blood sugar */}
          {tab === "sugar" && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-slate-800">
                <Droplet className="w-4 h-4 text-purple-600" />
                <span>ระดับน้ำตาลปลายนิ้ว</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ค่าน้ำตาล (mg/dL) *</label>
                  <input type="number" inputMode="numeric" placeholder="mg/dL" value={bloodSugar} onChange={(e) => setBloodSugar(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">สภาวะก่อน/หลังเจาะ</label>
                  <select value={sugarType} onChange={(e) => setSugarType(e.target.value as any)} className={inputCls}>
                    <option value="fasting">งดอาหารตื่นนอน (Fasting)</option>
                    <option value="after_meal">หลังอาหาร 2 ชม.</option>
                    <option value="random">วัดแบบสุ่มระหว่างวัน</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Weight & height */}
          {tab === "weight" && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-slate-800">
                <Scale className="w-4 h-4 text-teal-600" />
                <span>น้ำหนัก และส่วนสูง</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">น้ำหนัก (กก.) *</label>
                  <input type="number" inputMode="decimal" step="0.1" placeholder="กก." value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ส่วนสูง (ซม.)</label>
                  <input type="number" inputMode="numeric" placeholder="ซม." value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} />
                </div>
              </div>
              {!isEdit && lastHeight && <p className="text-[11px] text-slate-400 mt-1.5">ส่วนสูงเติมจากครั้งล่าสุดให้อัตโนมัติ</p>}
              <p className="text-xs font-bold text-teal-700 mt-2">
                BMI: {bmiPreview ? `${bmiPreview.bmi} · ${bmiPreview.text}` : "-"}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">โน้ตหรืออาการผิดปกติเพิ่มเติม</label>
            <input
              type="text"
              placeholder={tab === "bp" ? "เช่น วัดหลังตื่นนอน" : tab === "sugar" ? "เช่น หลังอาหารเช้า" : "เช่น ชั่งก่อนอาหารเช้า"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {formError && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer">
              ยกเลิก
            </button>
            <button type="submit" className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <Save className="w-4 h-4" />
              <span>{isEdit ? "บันทึกการแก้ไข" : `บันทึก${VITAL_TYPE_LABEL[tab]}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
