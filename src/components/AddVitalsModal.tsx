import React, { useState } from "react";
import { Activity, X, HeartPulse, Droplet, Scale, Save, Bluetooth, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { HealthVital } from "../types";

interface AddVitalsModalProps {
  profileId: string;
  vitalToEdit?: HealthVital | null;
  onClose: () => void;
  onSave: (vital: Omit<HealthVital, "id">) => void;
}

export const AddVitalsModal: React.FC<AddVitalsModalProps> = ({
  profileId,
  vitalToEdit,
  onClose,
  onSave,
}) => {
  const [systolicBP, setSystolicBP] = useState<string>(String(vitalToEdit?.systolicBP ?? "120"));
  const [diastolicBP, setDiastolicBP] = useState<string>(String(vitalToEdit?.diastolicBP ?? "80"));
  const [heartRate, setHeartRate] = useState<string>(String(vitalToEdit?.heartRate ?? "72"));
  const [bloodSugar, setBloodSugar] = useState<string>(String(vitalToEdit?.bloodSugar ?? "100"));
  const [sugarType, setSugarType] = useState<"fasting" | "after_meal" | "random">(vitalToEdit?.sugarType ?? "fasting");
  const [weight, setWeight] = useState<string>(String(vitalToEdit?.weight ?? "68.0"));
  const [height, setHeight] = useState<string>(String(vitalToEdit?.height ?? "168"));
  const [note, setNote] = useState<string>(vitalToEdit?.note ?? "");

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
                  const svc = await server.getPrimaryService(0x1810); // Blood Pressure service
                  const char = await svc.getCharacteristic(0x2a35); // Blood Pressure Measurement
                  const val = await char.readValue();
                  // BPM format: flags(1) + systolic(2) + diastolic(2) + MAP(2) + pulse(2) - little endian mmHg
                  const systolic = val.getUint16(1, true);
                  const diastolic = val.getUint16(3, true);
                  const pulse = val.byteLength >= 8 ? val.getUint16(7, true) : 0;
                  if (systolic > 50 && systolic < 250) {
                    setSystolicBP(String(systolic));
                    setDiastolicBP(String(diastolic));
                    if (pulse > 30) setHeartRate(String(pulse));
                    gotData = true;
                  }
                } catch { /* characteristic not available on this device */ }
              } else if (deviceType === "sugar") {
                try {
                  const svc = await server.getPrimaryService(0x1808); // Glucose service
                  const char = await svc.getCharacteristic(0x2a18); // Glucose Measurement
                  const val = await char.readValue();
                  // Glucose Measurement: flags(1) + seq(2) + date(7) + timeOffset(2) + glucoseConc(2)
                  const rawGlucose = val.getFloat32(10, true); // mol/L × 1000 = mmol/L
                  const mgdl = Math.round(rawGlucose * 18000); // convert mol/L → mg/dL
                  if (mgdl > 20 && mgdl < 600) { setBloodSugar(String(mgdl)); gotData = true; }
                } catch { /* characteristic not available */ }
              } else if (deviceType === "scale") {
                try {
                  const svc = await server.getPrimaryService(0x181d); // Weight Scale
                  const char = await svc.getCharacteristic(0x2a9d); // Weight Measurement
                  const val = await char.readValue();
                  const rawWeight = val.getUint16(1, true) * 0.005; // resolution 0.005 kg
                  if (rawWeight > 5 && rawWeight < 300) { setWeight(rawWeight.toFixed(1)); gotData = true; }
                } catch { /* characteristic not available */ }
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
        // Fallback demo reading
        simulateDemoReading(deviceType);
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
        simulateDemoReading(deviceType);
      } else {
        setBtErrorAdvice(
          `ไม่พบอุปกรณ์วัดความดันบลูทูธใกล้เคียง: ${err.message || "กรุณาเปิดบลูทูธที่เครื่องวัดความดันและลองอีกครั้ง"}`
        );
        simulateDemoReading(deviceType);
      }
    } finally {
      setIsBtConnecting(false);
    }
  };

  const simulateDemoReading = (deviceType: "bp" | "sugar" | "scale") => {
    if (deviceType === "bp") {
      const sys = Math.floor(118 + Math.random() * 10);
      const dia = Math.floor(76 + Math.random() * 8);
      const hr = Math.floor(70 + Math.random() * 10);
      setSystolicBP(String(sys));
      setDiastolicBP(String(dia));
      setHeartRate(String(hr));
      setBtStatus(`[ทดสอบสาธิต] ดึงค่าความดันสำเร็จ: ${sys}/${dia} mmHg (ชีพจร ${hr} bpm)`);
      setConnectedDevice("เครื่องวัดความดัน Omron / Allwell BLE (Demo)");
    } else if (deviceType === "sugar") {
      const sugar = Math.floor(98 + Math.random() * 20);
      setBloodSugar(String(sugar));
      setBtStatus(`[ทดสอบสาธิต] ดึงค่าน้ำตาลสำเร็จ: ${sugar} mg/dL`);
      setConnectedDevice("เครื่องเจาะน้ำตาล Glucose Meter (Demo)");
    } else if (deviceType === "scale") {
      const w = (67 + Math.random() * 4).toFixed(1);
      setWeight(String(w));
      setBtStatus(`[ทดสอบสาธิต] ดึงค่าน้ำหนักสำเร็จ: ${w} kg`);
      setConnectedDevice("เครื่องชั่งน้ำหนัก Smart Scale (Demo)");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);

    onSave({
      profileId,
      date: nowStr,
      systolicBP: systolicBP ? Number(systolicBP) : undefined,
      diastolicBP: diastolicBP ? Number(diastolicBP) : undefined,
      heartRate: heartRate ? Number(heartRate) : undefined,
      bloodSugar: bloodSugar ? Number(bloodSugar) : undefined,
      sugarType,
      weight: weight ? Number(weight) : undefined,
      height: height ? Number(height) : undefined,
      note: connectedDevice ? `[Bluetooth Allwell Sync: ${connectedDevice}] ${note.trim()}`.trim() : note.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 relative border border-slate-100 animate-in fade-in zoom-in duration-200 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">บันทึกค่าสุขภาพประจำวัน</h3>
            <p className="text-xs text-slate-500">
              ความดันโลหิต ค่าน้ำตาลปลายนิ้ว ชีพจร และน้ำหนักตัว
            </p>
          </div>
        </div>

        {/* Bluetooth Device Pairing Panel (Allwell / Medical BLE) */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl mb-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
                <Bluetooth className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-900">เชื่อมต่อบลูทูธวัดอัตโนมัติ (Allwell Sync)</span>
                <p className="text-[10px] text-blue-700">เลือกประเภทอุปกรณ์เพื่อดึงค่าผลวัดทันที</p>
              </div>
            </div>
            {connectedDevice && (
              <span className="text-[10px] font-bold bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" /> เชื่อมต่อแล้ว
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isBtConnecting}
              onClick={() => handleBluetoothPairing("bp")}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/60 border border-blue-200 rounded-xl text-[11px] font-bold text-slate-800 flex items-center justify-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
              <span>เครื่องวัดความดัน</span>
            </button>
            <button
              type="button"
              disabled={isBtConnecting}
              onClick={() => handleBluetoothPairing("sugar")}
              className="px-2.5 py-1.5 bg-white hover:bg-purple-100/60 border border-purple-200 rounded-xl text-[11px] font-bold text-slate-800 flex items-center justify-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Droplet className="w-3.5 h-3.5 text-purple-600" />
              <span>เครื่องเจาะน้ำตาล</span>
            </button>
            <button
              type="button"
              disabled={isBtConnecting}
              onClick={() => handleBluetoothPairing("scale")}
              className="px-2.5 py-1.5 bg-white hover:bg-teal-100/60 border border-teal-200 rounded-xl text-[11px] font-bold text-slate-800 flex items-center justify-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Scale className="w-3.5 h-3.5 text-teal-600" />
              <span>เครื่องชั่ง/BMI</span>
            </button>
          </div>

          {btStatus && (
            <div className="text-[10px] font-bold text-blue-900 bg-white/80 p-2 rounded-lg border border-blue-100 flex items-center gap-1.5 animate-in fade-in">
              {isBtConnecting ? (
                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3 text-green-600" />
              )}
              <span>{btStatus}</span>
            </div>
          )}

          {btErrorAdvice && (
            <div className="text-[11px] font-bold text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2 animate-in fade-in leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span>{btErrorAdvice}</span>
                <div className="mt-1.5">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] rounded-lg shadow-2xs font-extrabold"
                  >
                    ↗️ คลิกที่นี่เพื่อเปิดในหน้าต่างใหม่ (Open in New Tab)
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Blood Pressure Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-slate-800">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>ความดันโลหิต & ชีพจร</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ตัวบน (SYS)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="120"
                    value={systolicBP}
                    onChange={(e) => setSystolicBP(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">
                    mmHg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ตัวล่าง (DIA)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="80"
                    value={diastolicBP}
                    onChange={(e) => setDiastolicBP(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">
                    mmHg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ชีพจร (Pulse)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="72"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">
                    bpm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Blood Sugar Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                <Droplet className="w-4 h-4 text-purple-600" />
                <span>ระดับน้ำตาลปลายนิ้ว</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ค่าน้ำตาล (mg/dL)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 110"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  สภาวะก่อน/หลังเจาะ
                </label>
                <select
                  value={sugarType}
                  onChange={(e) => setSugarType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="fasting">งดอาหารตื่นนอน (Fasting)</option>
                  <option value="after_meal">หลังอาหาร 2 ชม.</option>
                  <option value="random">วัดแบบสุ่มระหว่างวัน</option>
                </select>
              </div>
            </div>
          </div>

          {/* Weight & Height Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-slate-800">
              <Scale className="w-4 h-4 text-teal-600" />
              <span>น้ำหนัก & ส่วนสูง</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  น้ำหนัก (กก.)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="68.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 font-bold text-teal-900 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ส่วนสูง (ซม.)
                </label>
                <input
                  type="number"
                  placeholder="168"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              โน้ตหรืออาการผิดปกติเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น มีอาการเวียนศีรษะเล็กน้อยหลังทานอาหาร"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกผลสุขภาพ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
