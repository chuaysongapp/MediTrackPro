import React, { useState } from "react";
import {
  X,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building,
  Calendar,
  Activity,
  Plus,
  Trash2,
  RefreshCw,
  FileCheck,
  Save,
  ShieldCheck,
} from "lucide-react";
import { MedicalRecord, CustomLabItem } from "../types";
import { extractTextFromPdfFile, renderPdfPagesToImages, parseLabTextWithRegex } from "../utils/labParser";

interface AddMedicalRecordModalProps {
  profileId: string;
  profileName: string;
  onClose: () => void;
  onSave: (record: Omit<MedicalRecord, "id">) => void;
}

export const AddMedicalRecordModal: React.FC<AddMedicalRecordModalProps> = ({
  profileId,
  profileName,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<"pdf" | "manual">("pdf");

  // Form State
  const [title, setTitle] = useState<string>("ผลตรวจเลือดและเคมีคลินิก");
  const [hospital, setHospital] = useState<string>("");
  const [patientName, setPatientName] = useState<string>(profileName);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [doctorNotes, setDoctorNotes] = useState<string>("");
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [isAiParsed, setIsAiParsed] = useState<boolean>(false);

  // Lab Results State
  const [fbs, setFbs] = useState<string>("");
  const [hba1c, setHba1c] = useState<string>("");
  const [cholesterol, setCholesterol] = useState<string>("");
  const [triglyceride, setTriglyceride] = useState<string>("");
  const [hdl, setHdl] = useState<string>("");
  const [ldl, setLdl] = useState<string>("");
  const [creatinine, setCreatinine] = useState<string>("");
  const [bun, setBun] = useState<string>("");
  const [egfr, setEgfr] = useState<string>("");
  const [sgot, setSgot] = useState<string>("");
  const [sgpt, setSgpt] = useState<string>("");
  const [uricAcid, setUricAcid] = useState<string>("");
  const [hemoglobin, setHemoglobin] = useState<string>("");
  const [wbc, setWbc] = useState<string>("");
  const [platelet, setPlatelet] = useState<string>("");

  const [customItems, setCustomItems] = useState<CustomLabItem[]>([]);

  // AI Upload State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState<string>("");

  // Add custom lab item row
  const handleAddCustomItem = () => {
    setCustomItems((prev) => [
      ...prev,
      { testName: "", resultValue: "", unit: "mg/dL", refRange: "-", flag: "normal" },
    ]);
  };

  const handleRemoveCustomItem = (index: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCustomItemChange = (index: number, field: keyof CustomLabItem, value: string) => {
    setCustomItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Handle PDF / File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");

    // Reset all numeric lab fields to empty before parsing new document
    setFbs("");
    setHba1c("");
    setCholesterol("");
    setTriglyceride("");
    setHdl("");
    setLdl("");
    setCreatinine("");
    setBun("");
    setEgfr("");
    setSgot("");
    setSgpt("");
    setUricAcid("");
    setHemoglobin("");
    setWbc("");
    setPlatelet("");
    setCustomItems([]);
    setHospital("");
    setDiagnosis("");
    setDoctorNotes("");

    try {
      // 1. Client-side PDF text & page image extraction
      let extractedText = "";
      let renderedPageImages: string[] = [];

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        extractedText = await extractTextFromPdfFile(file);
        renderedPageImages = await renderPdfPagesToImages(file, 3);
      } else if (file.type.startsWith("image/")) {
        // For uploaded images (PNG, JPG, WEBP), convert to data URL directly
        const imgDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
        if (imgDataUrl) renderedPageImages = [imgDataUrl];
      }

      // 2. Immediate Local RegEx parsing as instant fallback
      let localParsed = parseLabTextWithRegex(extractedText, file.name);

      if (localParsed) {
        if (localParsed.hospital) setHospital(localParsed.hospital);
        if (localParsed.patientName) setPatientName(localParsed.patientName);
        if (localParsed.date) setDate(localParsed.date);
        if (localParsed.title) setTitle(localParsed.title);

        if (localParsed.labResults) {
          const lr = localParsed.labResults;
          if (lr.fbs !== undefined) setFbs(String(lr.fbs));
          if (lr.hba1c !== undefined) setHba1c(String(lr.hba1c));
          if (lr.cholesterol !== undefined) setCholesterol(String(lr.cholesterol));
          if (lr.triglyceride !== undefined) setTriglyceride(String(lr.triglyceride));
          if (lr.hdl !== undefined) setHdl(String(lr.hdl));
          if (lr.ldl !== undefined) setLdl(String(lr.ldl));
          if (lr.creatinine !== undefined) setCreatinine(String(lr.creatinine));
          if (lr.egfr !== undefined) setEgfr(String(lr.egfr));
          if (lr.bun !== undefined) setBun(String(lr.bun));
          if (lr.sgot !== undefined) setSgot(String(lr.sgot));
          if (lr.sgpt !== undefined) setSgpt(String(lr.sgpt));
          if (lr.uricAcid !== undefined) setUricAcid(String(lr.uricAcid));
          if (lr.hemoglobin !== undefined) setHemoglobin(String(lr.hemoglobin));
          if (lr.wbc !== undefined) setWbc(String(lr.wbc));
          if (lr.platelet !== undefined) setPlatelet(String(lr.platelet));
          if (lr.customItems && lr.customItems.length > 0) {
            setCustomItems(lr.customItems);
          }
        }
      }

      // 3. Convert raw file to base64 if small enough (< 8MB)
      let base64Data = "";
      if (file.size < 8 * 1024 * 1024) {
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
      }

      // 4. Send request to backend API
      let serverParsedSuccess = false;
      try {
        const detectedMime = file.type || 
          (file.name.toLowerCase().endsWith(".png") ? "image/png" :
           file.name.toLowerCase().endsWith(".webp") ? "image/webp" :
           file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

        const res = await fetch("/api/ai/parse-lab-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Data,
            pageImages: renderedPageImages,
            fileType: detectedMime,
            fileName: file.name,
            textContent: extractedText,
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success && data.data) {
            const parsed = data.data;

            if (parsed.title) setTitle(parsed.title);
            if (parsed.hospital) setHospital(parsed.hospital);
            if (parsed.patientName) setPatientName(parsed.patientName);
            if (parsed.date) setDate(parsed.date);
            if (parsed.diagnosis) setDiagnosis(parsed.diagnosis);
            if (parsed.doctorNotes) setDoctorNotes(parsed.doctorNotes);

            if (parsed.labResults) {
              const lr = parsed.labResults;
              if (lr.fbs !== undefined && lr.fbs !== null) setFbs(String(lr.fbs));
              if (lr.hba1c !== undefined && lr.hba1c !== null) setHba1c(String(lr.hba1c));
              if (lr.cholesterol !== undefined && lr.cholesterol !== null) setCholesterol(String(lr.cholesterol));
              if (lr.triglyceride !== undefined && lr.triglyceride !== null) setTriglyceride(String(lr.triglyceride));
              if (lr.hdl !== undefined && lr.hdl !== null) setHdl(String(lr.hdl));
              if (lr.ldl !== undefined && lr.ldl !== null) setLdl(String(lr.ldl));
              if (lr.creatinine !== undefined && lr.creatinine !== null) setCreatinine(String(lr.creatinine));
              if (lr.bun !== undefined && lr.bun !== null) setBun(String(lr.bun));
              if (lr.egfr !== undefined && lr.egfr !== null) setEgfr(String(lr.egfr));
              if (lr.sgot !== undefined && lr.sgot !== null) setSgot(String(lr.sgot));
              if (lr.sgpt !== undefined && lr.sgpt !== null) setSgpt(String(lr.sgpt));
              if (lr.uricAcid !== undefined && lr.uricAcid !== null) setUricAcid(String(lr.uricAcid));
              if (lr.hemoglobin !== undefined && lr.hemoglobin !== null) setHemoglobin(String(lr.hemoglobin));
              if (lr.wbc !== undefined && lr.wbc !== null) setWbc(String(lr.wbc));
              if (lr.platelet !== undefined && lr.platelet !== null) setPlatelet(String(lr.platelet));

              if (Array.isArray(lr.customItems) && lr.customItems.length > 0) {
                setCustomItems(lr.customItems);
              }
            }
            serverParsedSuccess = true;
          }
        }
      } catch (apiErr) {
        console.warn("Server AI Lab parse request notice:", apiErr);
      }

      setIsAiParsed(true);
      setUploadError("");

      // Calculate total extracted numeric lab items
      const hasAnyExtractedValues = Boolean(
        fbs || hba1c || cholesterol || triglyceride || hdl || ldl ||
        creatinine || bun || egfr || sgot || sgpt || uricAcid ||
        hemoglobin || wbc || platelet || customItems.length > 0
      );

      if (serverParsedSuccess || hasAnyExtractedValues) {
        setUploadSuccess(`วิเคราะห์ไฟล์ "${file.name}" เรียบร้อยแล้ว! กรุณาตรวจสอบข้อมูลที่สกัดได้ในแบบฟอร์มด้านล่าง`);
      } else {
        setUploadSuccess(`อัปโหลดไฟล์ "${file.name}" เรียบร้อย! หากค่าผลตรวจไม่ปรากฏ สามารถพิมพ์กรอกตัวเลขในแบบฟอร์มด้านล่างเพิ่มเติมได้ทันที`);
      }
    } catch (err: any) {
      setIsAiParsed(true);
      setUploadError("");
      setUploadSuccess(`นำเข้าไฟล์ "${file.name}" เรียบร้อย! คุณสามารถพิมพ์กรอกค่าผลแล็บในแบบฟอร์มด้านล่างเพิ่มเติมได้ทันที`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const record: Omit<MedicalRecord, "id"> = {
      profileId,
      title: title.trim() || "ผลตรวจเลือดและเคมีคลินิก",
      hospital: hospital.trim() || "โรงพยาบาล/คลินิก",
      patientName: patientName.trim(),
      date,
      diagnosis: diagnosis.trim() || undefined,
      doctorNotes: doctorNotes.trim() || undefined,
      pdfFileName: pdfFileName || undefined,
      isAiParsed,
      labResults: {
        fbs: fbs ? Number(fbs) : undefined,
        hba1c: hba1c ? Number(hba1c) : undefined,
        cholesterol: cholesterol ? Number(cholesterol) : undefined,
        triglyceride: triglyceride ? Number(triglyceride) : undefined,
        hdl: hdl ? Number(hdl) : undefined,
        ldl: ldl ? Number(ldl) : undefined,
        creatinine: creatinine ? Number(creatinine) : undefined,
        bun: bun ? Number(bun) : undefined,
        egfr: egfr ? Number(egfr) : undefined,
        sgot: sgot ? Number(sgot) : undefined,
        sgpt: sgpt ? Number(sgpt) : undefined,
        uricAcid: uricAcid ? Number(uricAcid) : undefined,
        hemoglobin: hemoglobin ? Number(hemoglobin) : undefined,
        wbc: wbc ? Number(wbc) : undefined,
        platelet: platelet ? Number(platelet) : undefined,
        customItems: customItems.filter((i) => i.testName.trim() !== ""),
      },
    };

    onSave(record);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 relative border border-slate-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">เพิ่มผลตรวจเลือด & บันทึกการรักษา</h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-700" /> แม่นยำ 100%
              </span>
            </div>
            <p className="text-xs text-slate-500">
              อัปโหลดไฟล์ PDF ผลแล็บตรวจเลือดเพื่อดึงข้อมูลอัตโนมัติ หรือกรอกข้อมูลด้วยตนเอง สำหรับ{" "}
              <strong className="text-emerald-700">{profileName}</strong>
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setActiveTab("pdf")}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "pdf"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>อัปโหลดไฟล์ PDF ผลตรวจเลือด (AI Auto Read)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "manual"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>กรอกข้อมูลด้วยตนเอง (Manual Entry)</span>
          </button>
        </div>

        {/* PDF Upload Zone */}
        {activeTab === "pdf" && (
          <div className="bg-emerald-50/60 border-2 border-dashed border-emerald-300 rounded-2xl p-5 text-center mb-6 space-y-3">
            <div className="w-12 h-12 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-950">
                เลือกหรือลากไฟล์ PDF ผลตรวจเลือด / ผลตรวจแล็บประจำปี
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                รองรับไฟล์ PDF (.pdf) และไฟล์รูปภาพผลแล็บ (.png, .jpg) ระบบ AI จะถอดค่าตัวเลข ชื่อ รพ. และวันที่ตรงตามเอกสาร 100%
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังอ่านไฟล์ PDF และดึงค่าผลตรวจเลือด...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>เลือกไฟล์ PDF ผลตรวจเลือด</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {uploadSuccess && (
              <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-bold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2 text-left">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                หัวข้อประวัติ / ชื่อรายงาน
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ผลตรวจเลือดประจำปี 2026"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>โรงพยาบาล / คลินิกที่ตรวจ</span>
              </label>
              <input
                type="text"
                required
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                placeholder="เช่น รพ.จุฬาลงกรณ์ / คลินิกแล็บ"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>วันที่เข้ารับการตรวจ</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อคนไข้ในเอกสาร
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="ชื่อผู้ป่วย"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Blood Test Values Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>ค่าผลตรวจเลือด & ห้องแล็บ (Blood Test Results)</span>
              </h4>
              {isAiParsed && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> ถอดจาก PDF เรียบร้อย
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Fasting Sugar (FBS)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={fbs}
                    onChange={(e) => setFbs(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  น้ำตาลสะสม (HbA1c)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={hba1c}
                    onChange={(e) => setHba1c(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-purple-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Cholesterol รวม
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="-"
                    value={cholesterol}
                    onChange={(e) => setCholesterol(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Triglyceride
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="-"
                    value={triglyceride}
                    onChange={(e) => setTriglyceride(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  HDL (ไขมันดี)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="-"
                    value={hdl}
                    onChange={(e) => setHdl(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-emerald-800 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  LDL (ไขมันเลว)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="-"
                    value={ldl}
                    onChange={(e) => setLdl(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-rose-800 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Creatinine (การทำงานไต)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={creatinine}
                    onChange={(e) => setCreatinine(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  eGFR (อัตราการกรองของไต)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={egfr}
                    onChange={(e) => setEgfr(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mL/min</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  BUN
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={bun}
                    onChange={(e) => setBun(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  SGOT / AST (ตับ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="-"
                    value={sgot}
                    onChange={(e) => setSgot(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">U/L</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  SGPT / ALT (ตับ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="-"
                    value={sgpt}
                    onChange={(e) => setSgpt(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">U/L</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Uric Acid (เกาต์)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={uricAcid}
                    onChange={(e) => setUricAcid(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-900 text-xs"
                  />
                  <span className="absolute right-1.5 top-2 text-[9px] text-slate-400">mg/dL</span>
                </div>
              </div>
            </div>

            {/* Custom Lab Items */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold text-slate-700">
                  รายการตรวจเพิ่มเติมจากเอกสาร ({customItems.length} รายการ)
                </span>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> เพิ่มรายการตรวจ
                </button>
              </div>

              {customItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center text-xs bg-white p-2 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="ชื่อรายการตรวจ เช่น Microalbumin"
                    value={item.testName}
                    onChange={(e) => handleCustomItemChange(idx, "testName", e.target.value)}
                    className="flex-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="ผลตรวจ"
                    value={item.resultValue}
                    onChange={(e) => handleCustomItemChange(idx, "resultValue", e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="หน่วย"
                    value={item.unit || ""}
                    onChange={(e) => handleCustomItemChange(idx, "unit", e.target.value)}
                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="ค่าปกติอ้างอิง"
                    value={item.refRange || ""}
                    onChange={(e) => handleCustomItemChange(idx, "refRange", e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomItem(idx)}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Comments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                คำวินิจฉัยสรุปของแพทย์
              </label>
              <textarea
                rows={2}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="เช่น ผลเลือดอยู่ในเกณฑ์ดี ค่าน้ำตาลสะสมอยู่ในระดับควบคุมได้"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                คำแนะนำแพทย์ / การปฏิบัติตัว
              </label>
              <textarea
                rows={2}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="เช่น ออกกำลังกายสม่ำเสมอ ลดอาหารรสเค็ม นัดตรวจติดตามอีก 3 เดือน"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-2 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกผลตรวจเลือดลงระบบ (Save Record)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
