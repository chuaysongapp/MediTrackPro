import * as pdfjsLib from "pdfjs-dist";

// Configure worker URL for browser environments
if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "3.11.174"}/build/pdf.worker.min.js`;
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
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
  if (/รามาธิบดี|RAMA/i.test(text)) {
    result.hospital = "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี";
  } else if (/ศิริราช|Siriraj/i.test(text)) {
    result.hospital = "โรงพยาบาลศิริราช";
  } else if (/จุฬา|Chulalongkorn/i.test(text)) {
    result.hospital = "โรงพยาบาลจุฬาลงกรณ์";
  } else if (/กรุงเทพ|Bangkok/i.test(text)) {
    result.hospital = "โรงพยาบาลกรุงเทพ";
  }

  // 2. Patient Name
  const nameMatch = text.match(/(?:นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|Mr\.|Mrs\.|Ms\.)\s*([ก-๙a-zA-Z\s\.\'\-]+?)(?=\s{2,}|\d|Age|HN|Loc|202|201|$)/i);
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

  // Helper regex matcher for lab test numbers
  const extractNum = (pattern: RegExp): number | undefined => {
    const m = text.match(pattern);
    if (m && m[1]) {
      const num = parseFloat(m[1]);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  };

  // HbA1c
  lr.hba1c = extractNum(/HbA1c[^\d\.\n]*([\d\.]+)/i);

  // Fasting Blood Sugar / Glucose
  lr.fbs = extractNum(/(?:Glucose|Fasting Sugar|FBS|Blood Sugar)[^\d\.\n]*([\d\.]+)/i);

  // Cholesterol
  lr.cholesterol = extractNum(/(?:Total\s*)?Cholesterol[^\d\.\n]*([\d\.]+)/i);

  // Triglyceride
  lr.triglyceride = extractNum(/Triglyceride[^\d\.\n]*([\d\.]+)/i);

  // HDL
  lr.hdl = extractNum(/HDL[^\d\.\n]*([\d\.]+)/i);

  // LDL
  lr.ldl = extractNum(/LDL[^\d\.\n]*([\d\.]+)/i);

  // Creatinine
  lr.creatinine = extractNum(/(?:Creatinine|Cr)[^\d\.\n]*([\d\.]+)/i);

  // eGFR
  lr.egfr = extractNum(/eGFR[^\d\.\n]*([\d\.]+)/i);

  // BUN
  lr.bun = extractNum(/\bBUN\b[^\d\.\n]*([\d\.]+)/i);

  // SGOT / AST
  lr.sgot = extractNum(/(?:SGOT|AST)[^\d\.\n]*([\d\.]+)/i);

  // SGPT / ALT
  lr.sgpt = extractNum(/(?:SGPT|ALT)[^\d\.\n]*([\d\.]+)/i);

  // Uric Acid
  lr.uricAcid = extractNum(/Uric Acid[^\d\.\n]*([\d\.]+)/i);

  // Hemoglobin
  lr.hemoglobin = extractNum(/(?:Hemoglobin|Hb)[^\d\.\n]*([\d\.]+)/i);

  // WBC
  lr.wbc = extractNum(/(?:WBC|White Blood Cell)[^\d\.\n]*([\d\.]+)/i);

  // Platelet
  lr.platelet = extractNum(/(?:Platelet|PLT)[^\d\.\n]*([\d\.]+)/i);

  // Custom Items
  const customTests = [
    { name: "Estimated Average Glucose", unit: "mg/dL", regex: /Estimated Average Glucose[^\d\.\n]*([\d\.]+)/i },
    { name: "Sodium (โซเดียม)", unit: "mmol/L", regex: /Sodium[^\d\.\n]*([\d\.]+)/i },
    { name: "Potassium (โพแทสเซียม)", unit: "mmol/L", regex: /Potassium[^\d\.\n]*([\d\.]+)/i },
    { name: "Chloride (คลอไรด์)", unit: "mmol/L", regex: /Chloride[^\d\.\n]*([\d\.]+)/i },
    { name: "Carbondioxide (คาร์บอนไดออกไซด์)", unit: "mmol/L", regex: /Carbondioxide[^\d\.\n]*([\d\.]+)/i },
    { name: "Albumin/Creatinine Ratio (Urine)", unit: "mg/g", regex: /Albumin\/Creatinine Ratio[^\d\.\n]*([\d\.]+)/i },
    { name: "Albumin Urine", unit: "mg/dL", regex: /Albumin Urine[^\d\.\n]*([\d\.]+)/i },
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
