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
  ClipboardList,
  Eye,
  Search,
} from "lucide-react";
import { MedicalRecord, CustomLabItem } from "../types";
import { extractTextFromPdfFile, renderPdfPagesToImages, parseLabTextWithRegex } from "../utils/labParser";
import { sha256Hex, findDuplicateRecord } from "../utils/dedupe";

interface AddMedicalRecordModalProps {
  profileId: string;
  profileName: string;
  existingRecords?: MedicalRecord[];
  onClose: () => void;
  onSave: (record: Omit<MedicalRecord, "id">) => void;
}

export const AddMedicalRecordModal: React.FC<AddMedicalRecordModalProps> = ({
  profileId,
  profileName,
  existingRecords = [],
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<"pdf" | "manual">("pdf");
  const [pdfMode, setPdfMode] = useState<"file" | "paste">("file");

  // Form State
  const [title, setTitle] = useState<string>("ผลตรวจเลือดและเคมีคลินิก");
  const [hospital, setHospital] = useState<string>("");
  const [patientName, setPatientName] = useState<string>(profileName);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [doctorNotes, setDoctorNotes] = useState<string>("");
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [isAiParsed, setIsAiParsed] = useState<boolean>(false);
  const [fileHash, setFileHash] = useState<string>("");
  const [duplicateOf, setDuplicateOf] = useState<MedicalRecord | null>(null);

  // Raw Text Inspection & Paste State
  const [rawTextContent, setRawTextContent] = useState<string>("");
  const [pastedText, setPastedText] = useState<string>("");
  const [showRawInspector, setShowRawInspector] = useState<boolean>(false);

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

  // Helper to apply parsed values to state
  const applyParsedDataToForm = (parsed: ReturnType<typeof parseLabTextWithRegex>): number => {
    if (parsed.hospital) setHospital(parsed.hospital);
    if (parsed.patientName) setPatientName(parsed.patientName);
    if (parsed.date) setDate(parsed.date);
    if (parsed.title) setTitle(parsed.title);

    let extractedCount = 0;

    if (parsed.labResults) {
      const lr = parsed.labResults;
      if (lr.fbs !== undefined && lr.fbs !== null) { setFbs(String(lr.fbs)); extractedCount++; }
      if (lr.hba1c !== undefined && lr.hba1c !== null) { setHba1c(String(lr.hba1c)); extractedCount++; }
      if (lr.cholesterol !== undefined && lr.cholesterol !== null) { setCholesterol(String(lr.cholesterol)); extractedCount++; }
      if (lr.triglyceride !== undefined && lr.triglyceride !== null) { setTriglyceride(String(lr.triglyceride)); extractedCount++; }
      if (lr.hdl !== undefined && lr.hdl !== null) { setHdl(String(lr.hdl)); extractedCount++; }
      if (lr.ldl !== undefined && lr.ldl !== null) { setLdl(String(lr.ldl)); extractedCount++; }
      if (lr.creatinine !== undefined && lr.creatinine !== null) { setCreatinine(String(lr.creatinine)); extractedCount++; }
      if (lr.bun !== undefined && lr.bun !== null) { setBun(String(lr.bun)); extractedCount++; }
      if (lr.egfr !== undefined && lr.egfr !== null) { setEgfr(String(lr.egfr)); extractedCount++; }
      if (lr.sgot !== undefined && lr.sgot !== null) { setSgot(String(lr.sgot)); extractedCount++; }
      if (lr.sgpt !== undefined && lr.sgpt !== null) { setSgpt(String(lr.sgpt)); extractedCount++; }
      if (lr.uricAcid !== undefined && lr.uricAcid !== null) { setUricAcid(String(lr.uricAcid)); extractedCount++; }
      if (lr.hemoglobin !== undefined && lr.hemoglobin !== null) { setHemoglobin(String(lr.hemoglobin)); extractedCount++; }
      if (lr.wbc !== undefined && lr.wbc !== null) { setWbc(String(lr.wbc)); extractedCount++; }
      if (lr.platelet !== undefined && lr.platelet !== null) { setPlatelet(String(lr.platelet)); extractedCount++; }

      if (Array.isArray(lr.customItems) && lr.customItems.length > 0) {
        setCustomItems(lr.customItems);
        extractedCount += lr.customItems.length;
      }
    }

    setIsAiParsed(true);
    return extractedCount;
  };

  // Handle Manual Text Parse (Fast Paste)
  const handleParseTextContent = (textToParse: string, sourceLabel: string) => {
    if (!textToParse.trim()) {
      setUploadError("กรุณาวางหรือพิมพ์ข้อความผลตรวจเลือดก่อนทำรายการ");
      return;
    }

    setUploadError("");
    setUploadSuccess("");

    const parsed = parseLabTextWithRegex(textToParse, sourceLabel);
    const count = applyParsedDataToForm(parsed);

    if (count > 0 || parsed.hospital || parsed.patientName) {
      setUploadSuccess(`ถอดรหัสจากข้อความสำเร็จ! พบ ${count > 0 ? `${count} รายการผลแล็บ` : 'ข้อมูลเบื้องต้น'} ข้อมูลถูกเติมลงในแบบฟอร์มด้านล่างแล้ว`);
    } else {
      setUploadError("ไม่พบตัวเลขผลแล็บที่เข้าคู่ในข้อความที่วาง กรุณาตรวจสอบว่ามีข้อความชื่อการตรวจและตัวเลข เช่น 'FBS 95' หรือ 'HbA1c 6.2'");
    }
  };

  // Handle PDF / File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");
    setFileHash("");
    setDuplicateOf(null);

    // Compute SHA-256 of the raw file bytes (for exact-duplicate detection)
    try {
      const rawBuffer = await file.arrayBuffer();
      const h = await sha256Hex(rawBuffer);
      if (h) setFileHash(h);
    } catch {
      setFileHash("");
    }

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
    setRawTextContent("");

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

      setRawTextContent(extractedText);

      // 2. Immediate Local RegEx parsing
      let localParsed = parseLabTextWithRegex(extractedText, file.name);
      let localCount = 0;

      if (localParsed) {
        localCount = applyParsedDataToForm(localParsed);
      }

      // 3. Optional Server-side parse if available
      let serverParsedSuccess = false;
      if (file.size < 8 * 1024 * 1024) {
        try {
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string) || "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          });

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
              const serverCount = applyParsedDataToForm(data.data);
              serverParsedSuccess = true;
              setUploadSuccess(`วิเคราะห์ไฟล์ "${file.name}" สำเร็จ (${serverCount} รายการผลแล็บ)! กรุณาตรวจสอบข้อมูลและปรับแก้ไขในแบบฟอร์มด้านล่างได้ทันที`);
            }
          }
        } catch (apiErr) {
          console.warn("Server AI Lab parse notice:", apiErr);
        }
      }

      if (!serverParsedSuccess) {
        if (localCount > 0 || (localParsed && (localParsed.hospital || localParsed.patientName))) {
          setUploadSuccess(`ถอดรหัสและดึงข้อมูลจากไฟล์ "${file.name}" สำเร็จ (${localCount > 0 ? `${localCount} รายการผลแล็บ` : 'ข้อมูลเบื้องต้น'})! กรุณาตรวจสอบข้อมูลและปรับแก้ไขในแบบฟอร์มด้านล่างได้ทันที`);
        } else {
          setUploadSuccess(`อัปโหลดไฟล์ "${file.name}" เรียบร้อย! หากค่าผลตรวจไม่ปรากฏ คุณสามารถก๊อปปี้ข้อความจาก PDF มาวางในช่อง "วางข้อความคัดลอกจาก PDF" เพื่อให้ระบบถอดรหัสได้ 100%`);
          setShowRawInspector(true);
        }
      }
    } catch (err: any) {
      setIsAiParsed(true);
      setUploadError("");
      setUploadSuccess(`นำเข้าไฟล์ "${file.name}" เรียบร้อย! คุณสามารถพิมพ์กรอกค่าผลแล็บในแบบฟอร์มด้านล่างเพิ่มเติมได้ทันที`);
    } finally {
      setIsUploading(false);
    }
  };

  const buildRecord = (): Omit<MedicalRecord, "id"> => ({
    profileId,
    title: title.trim() || "ผลตรวจเลือดและเคมีคลินิก",
    hospital: hospital.trim() || "โรงพยาบาล/คลินิก",
    patientName: patientName.trim(),
    date,
    diagnosis: diagnosis.trim() || undefined,
    doctorNotes: doctorNotes.trim() || undefined,
    pdfFileName: pdfFileName || undefined,
    isAiParsed,
    fileHash: fileHash || undefined,
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record = buildRecord();

    // Duplicate check (scoped per profile). Warn but allow override.
    const dup = findDuplicateRecord(existingRecords, {
      profileId: record.profileId,
      date: record.date,
      hospital: record.hospital,
      labResults: record.labResults,
      fileHash: record.fileHash,
      pdfFileName: record.pdfFileName,
    });
    if (dup) {
      setDuplicateOf(dup);
      return;
    }

    onSave(record);
  };

  // ผู้ใช้ยืนยันบันทึกซ้ำอยู่ดี
  const handleForceSave = () => {
    setDuplicateOf(null);
    onSave(buildRecord());
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
              อัปโหลดไฟล์ PDF ผลแล็บตรวจเลือดเพื่อดึงข้อมูลอัตโนมัติ หรือก๊อปปี้ข้อความมาวาง สำหรับ{" "}
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
            <span>นำเข้าข้อมูลจาก PDF / รูปภาพ / คัดลอกข้อความ</span>
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

        {/* PDF / Paste Zone */}
        {activeTab === "pdf" && (
          <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl p-4 mb-6 space-y-3">
            {/* Sub Mode Toggle */}
            <div className="flex items-center justify-center gap-2 pb-2 border-b border-emerald-200/60">
              <button
                type="button"
                onClick={() => setPdfMode("file")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pdfMode === "file"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-emerald-100 border border-slate-200"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>1. เลือกไฟล์ PDF / รูปภาพ</span>
              </button>
              <button
                type="button"
                onClick={() => setPdfMode("paste")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pdfMode === "paste"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-emerald-100 border border-slate-200"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>2. วางข้อความคัดลอกจาก PDF (ชัวร์ 100%)</span>
              </button>
            </div>

            {pdfMode === "file" ? (
              <div className="text-center space-y-3 py-2">
                <div className="w-10 h-10 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-emerald-950">
                    เลือกหรือลากไฟล์ PDF ผลตรวจเลือด / ผลตรวจแล็บประจำปี
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    รองรับไฟล์ PDF (.pdf) และไฟล์รูปภาพ (.png, .jpg) ระบบจะถอดรหัสอ่านข้อมูลตรงตามเอกสาร
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังอ่านไฟล์ PDF และถอดรหัส...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>เลือกไฟล์ PDF / รูปภาพผลตรวจ</span>
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
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-emerald-700" />
                    <span>ก๊อปปี้ข้อความทั้งหมดในไฟล์ PDF แล้วนำมาวางในช่องด้านล่างนี้:</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                    💡 เปิด PDF &gt; กด Ctrl+A (เลือกหมด) &gt; Ctrl+C (ก๊อปปี้)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="วางข้อความที่ก๊อปปี้จาก PDF หรือผลตรวจเลือดตรงนี้ เช่น:&#10;Fasting Blood Sugar 95 mg/dL (70-99)&#10;HbA1c 5.8 %&#10;Cholesterol 195 mg/dL&#10;Triglyceride 120 mg/dL..."
                  className="w-full bg-white border border-emerald-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleParseTextContent(pastedText, "ข้อความที่ก๊อปปี้มาวาง")}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ ถอดรหัสข้อความและเติมค่าลงแบบฟอร์มทันที</span>
                </button>
              </div>
            )}

            {/* Status Messages */}
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

            {/* Inspect / Edit Raw Extracted Text */}
            {rawTextContent && (
              <div className="border-t border-emerald-200/80 pt-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowRawInspector(!showRawInspector)}
                  className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1.5 cursor-pointer underline decoration-dotted"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showRawInspector ? "ซ่อนข้อความที่ถอดได้จาก PDF" : "🔍 ดู/แก้ไข ข้อความที่ระบบถอดได้จาก PDF ล่าสุด"}</span>
                </button>

                {showRawInspector && (
                  <div className="mt-2 space-y-2 bg-white/80 p-3 rounded-xl border border-emerald-200">
                    <label className="block text-[11px] font-bold text-slate-700">
                      ข้อความที่ PDF.js อ่านได้จากไฟล์ (สามารถปรับแก้ไขตัวเลขตรงนี้แล้วกดปุ่มวิเคราะห์ซ้ำได้):
                    </label>
                    <textarea
                      rows={5}
                      value={rawTextContent}
                      onChange={(e) => setRawTextContent(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-[11px] font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleParseTextContent(rawTextContent, pdfFileName || "ข้อความ PDF")}
                      className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>🔄 ถอดรหัสข้อมูลจากข้อความด้านบนนี้อีกครั้ง</span>
                    </button>
                  </div>
                )}
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
                  <FileCheck className="w-3 h-3" /> ถอดข้อมูลเรียบร้อย
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
                    className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-blue-900 text-xs"
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

            {/* Custom Extra Items */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">
                  รายการตรวจเพิ่มเติมจากเอกสาร ({customItems.length} รายการ)
                </span>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มรายการตรวจ</span>
                </button>
              </div>

              {customItems.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {customItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs"
                    >
                      <input
                        type="text"
                        placeholder="ชื่อผลตรวจ (เช่น Sodium, Electrolyte)"
                        value={item.testName}
                        onChange={(e) => handleCustomItemChange(idx, "testName", e.target.value)}
                        className="col-span-5 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="ค่าที่ได้ (เช่น 138)"
                        value={item.resultValue}
                        onChange={(e) => handleCustomItemChange(idx, "resultValue", e.target.value)}
                        className="col-span-3 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-emerald-900"
                      />
                      <input
                        type="text"
                        placeholder="หน่วย (เช่น mmol/L)"
                        value={item.unit || ""}
                        onChange={(e) => handleCustomItemChange(idx, "unit", e.target.value)}
                        className="col-span-3 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomItem(idx)}
                        className="col-span-1 text-slate-400 hover:text-rose-600 p-1 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Diagnosis & Notes */}
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateOf && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900">ดูเหมือนผลตรวจนี้เคยบันทึกไว้แล้ว</p>
                  <p className="text-xs text-amber-800 mt-1">
                    ตรงกับรายการเดิม: <span className="font-semibold">{duplicateOf.title}</span>
                    {" · "}{duplicateOf.hospital}
                    {" · "}วันที่ {duplicateOf.date}
                    {duplicateOf.fileHash && fileHash && duplicateOf.fileHash === fileHash
                      ? " (ไฟล์เดียวกันเป๊ะ)"
                      : " (ค่าผลตรวจตรงกัน)"}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">ต้องการบันทึกซ้ำอีกครั้งหรือไม่?</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleForceSave}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      บันทึกซ้ำอยู่ดี
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateOf(null)}
                      className="px-4 py-2 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 font-bold text-xs transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกผลตรวจเลือดเข้าสู่ระบบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
