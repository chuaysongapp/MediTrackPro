import * as pdfjsLib from "pdfjs-dist";

// Worker URL for Vite / Browser
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromPdfFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += `--- Page ${pageNum} ---\n` + pageText + "\n\n";
    }
    return fullText.trim();
  } catch (err) {
    console.warn("Client PDF text extraction notice:", err);
    return "";
  }
}

export interface ParsedLabReport {
  hospital?: string;
  date?: string;
  patientName?: string;
  title?: string;
  diagnosis?: string;
  doctorNotes?: string;
  labResults?: {
    fbs?: number;
    hba1c?: number;
    cholesterol?: number;
    triglyceride?: number;
    hdl?: number;
    ldl?: number;
    creatinine?: number;
    bun?: number;
    egfr?: number;
    sgot?: number;
    sgpt?: number;
    uricAcid?: number;
    hemoglobin?: number;
    wbc?: number;
    platelet?: number;
    customItems?: Array<{
      testName: string;
      resultValue: string;
      unit?: string;
      refRange?: string;
      flag?: "normal" | "high" | "low" | "abnormal";
    }>;
  };
}

export function parseLabTextWithRegex(text: string, fileName?: string): ParsedLabReport {
  const result: ParsedLabReport = {
    labResults: {
      customItems: [],
    },
  };

  if (!text) return result;

  // 1. Hospital Name
  if (text.includes("รามาธิบดี") || text.includes("RAMA")) {
    result.hospital = "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี";
  } else if (text.includes("ศิริราช") || text.includes("Siriraj")) {
    result.hospital = "โรงพยาบาลศิริราช";
  } else if (text.includes("จุฬา") || text.includes("Chulalongkorn")) {
    result.hospital = "โรงพยาบาลจุฬาลงกรณ์";
  } else if (text.includes("กรุงเทพ") || text.includes("Bangkok")) {
    result.hospital = "โรงพยาบาลกรุงเทพ";
  }

  // 2. Patient Name
  const nameMatch = text.match(/(?:นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|Mr\.|Mrs\.|Ms\.)\s*([ก-๙a-zA-Z\s]+?)(?=\s{2,}|\d|Age|HN|Loc|202|201|$)/i);
  if (nameMatch && nameMatch[0]) {
    result.patientName = nameMatch[0].trim();
  }

  // 3. Date
  const dateMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](20\d{2})/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    const year = dateMatch[3];
    result.date = `${year}-${month}-${day}`;
  }

  const lr: NonNullable<ParsedLabReport["labResults"]> = { customItems: [] };

  // HbA1c
  const hba1cMatch = text.match(/HbA1c[^\d]*(\d+\.?\d*)/i);
  if (hba1cMatch) lr.hba1c = parseFloat(hba1cMatch[1]);

  // Glucose
  const glucoseMatch = text.match(/(?:Glucose|Fasting Sugar|FBS)[^\d]*(\d+\.?\d*)/i);
  if (glucoseMatch) lr.fbs = parseFloat(glucoseMatch[1]);

  // Cholesterol
  const cholMatch = text.match(/(?:Total\s*)?Cholesterol[^\d]*(\d+\.?\d*)/i);
  if (cholMatch) lr.cholesterol = parseFloat(cholMatch[1]);

  // Triglyceride
  const triMatch = text.match(/Triglyceride[^\d]*(\d+\.?\d*)/i);
  if (triMatch) lr.triglyceride = parseFloat(triMatch[1]);

  // HDL
  const hdlMatch = text.match(/HDL[^\d]*(\d+\.?\d*)/i);
  if (hdlMatch) lr.hdl = parseFloat(hdlMatch[1]);

  // LDL
  const ldlMatch = text.match(/LDL[^\d]*(\d+\.?\d*)/i);
  if (ldlMatch) lr.ldl = parseFloat(ldlMatch[1]);

  // Creatinine
  const crMatch = text.match(/Creatinine[^\d]*(\d+\.?\d*)/i);
  if (crMatch) lr.creatinine = parseFloat(crMatch[1]);

  // eGFR
  const egfrMatch = text.match(/eGFR[^\d]*(\d+\.?\d*)/i);
  if (egfrMatch) lr.egfr = parseFloat(egfrMatch[1]);

  // BUN
  const bunMatch = text.match(/\bBUN\b[^\d]*(\d+\.?\d*)/i);
  if (bunMatch) lr.bun = parseFloat(bunMatch[1]);

  // SGOT
  const sgotMatch = text.match(/(?:SGOT|AST)[^\d]*(\d+\.?\d*)/i);
  if (sgotMatch) lr.sgot = parseFloat(sgotMatch[1]);

  // SGPT
  const sgptMatch = text.match(/(?:SGPT|ALT)[^\d]*(\d+\.?\d*)/i);
  if (sgptMatch) lr.sgpt = parseFloat(sgptMatch[1]);

  // Uric Acid
  const uricMatch = text.match(/Uric Acid[^\d]*(\d+\.?\d*)/i);
  if (uricMatch) lr.uricAcid = parseFloat(uricMatch[1]);

  // Custom Items
  const customTests = [
    { name: "Estimated Average Glucose", unit: "mg/dL", regex: /Estimated Average Glucose[^\d]*(\d+\.?\d*)/i },
    { name: "Sodium (โซเดียม)", unit: "mmol/L", regex: /Sodium[^\d]*(\d+\.?\d*)/i },
    { name: "Potassium (โพแทสเซียม)", unit: "mmol/L", regex: /Potassium[^\d]*(\d+\.?\d*)/i },
    { name: "Chloride (คลอไรด์)", unit: "mmol/L", regex: /Chloride[^\d]*(\d+\.?\d*)/i },
    { name: "Carbondioxide (คาร์บอนไดออกไซด์)", unit: "mmol/L", regex: /Carbondioxide[^\d]*(\d+\.?\d*)/i },
    { name: "Albumin/Creatinine Ratio (Urine)", unit: "mg/g", regex: /Albumin\/Creatinine Ratio[^\d]*(\d+\.?\d*)/i },
    { name: "Albumin Urine", unit: "mg/dL", regex: /Albumin Urine[^\d]*(\d+\.?\d*)/i },
  ];

  for (const t of customTests) {
    const m = text.match(t.regex);
    if (m && m[1]) {
      lr.customItems?.push({
        testName: t.name,
        resultValue: m[1],
        unit: t.unit,
        flag: "normal",
      });
    }
  }

  result.labResults = lr;
  result.title = `ผลตรวจเลือดและเคมีคลินิก - ${result.hospital || fileName || "เอกสารทางการแพทย์"}`;

  return result;
}
