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

/**
 * Smart line-by-line lab value finder.
 * Strips out reference ranges in parentheses e.g. (70-99), (4.0-6.0)
 * before searching for the actual test result number.
 */
function findLabValueInText(text: string, aliases: string[]): number | undefined {
  const lines = text.split(/\r?\n/);
  
  // 1. Line-by-line search
  for (const rawLine of lines) {
    const hasAlias = aliases.some(alias => {
      const reg = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return reg.test(rawLine);
    });

    if (hasAlias) {
      // Strip reference ranges inside parens or brackets: (70 - 100), (0.67-1.17), [<200]
      const cleanLine = rawLine
        .replace(/\([\d\.\s\-\<\>\:\,]+\)/g, ' ')
        .replace(/\[[\d\.\s\-\<\>\:\,]+\]/g, ' ');

      // Find numbers that come after the alias
      // Matches numbers like 126, 8.27, 0.71, 119
      const numberMatches = cleanLine.match(/[:\s=]+(\d+(?:\.\d+)?)/g);
      if (numberMatches) {
        for (const m of numberMatches) {
          const valStr = m.replace(/[:\s=]/g, '').trim();
          const val = parseFloat(valStr);
          if (!isNaN(val) && val > 0) {
            return val;
          }
        }
      }
    }
  }

  // 2. Global text fallback search
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cleanText = text.replace(/\([\d\.\s\-\<\>\:\,]+\)/g, ' ');
    const reg = new RegExp(`${escaped}[^\\d\\n\\r]{0,25}?[:\\s=]+(\\d+(?:\\.\\d+)?)`, 'i');
    const m = cleanText.match(reg);
    if (m && m[1]) {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  return undefined;
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
  } else if (/บำรุงราษฎร์|Bumrungrad/i.test(text)) {
    result.hospital = "โรงพยาบาลบำรุงราษฎร์";
  } else if (/พญาไท|Phyathai/i.test(text)) {
    result.hospital = "โรงพยาบาลพญาไท";
  } else if (/สมิติเวช|Samitivej/i.test(text)) {
    result.hospital = "โรงพยาบาลสมิติเวช";
  } else if (/พระราม|Praram/i.test(text)) {
    result.hospital = "โรงพยาบาลพระรามเก้า";
  } else {
    const hMatch = text.match(/(?:โรงพยาบาล|คลินิก|Hospital|Clinic)\s*([ก-๙a-zA-Z\s]+)/i);
    if (hMatch) result.hospital = hMatch[0].trim();
  }

  // 2. Patient Name
  const nameMatch = text.match(/(?:นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|Mr\.|Mrs\.|Ms\.|Name\s*:?)\s*([ก-๙a-zA-Z\s\.\'\-\/]+?)(?=\s{2,}|\n|\r|\d{2,}|Age|HN|Loc|202|201|$)/i);
  if (nameMatch && nameMatch[0]) {
    const rawName = nameMatch[0].trim();
    if (rawName.length >= 3 && rawName.length <= 60) {
      result.patientName = rawName;
    }
  }

  // 3. Date
  const dateMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](20\d{2})/) ||
                    text.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (dateMatch) {
    if (dateMatch[1].length === 4) {
      result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
    } else {
      result.date = `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
    }
  }

  const lr: NonNullable<ParsedLabReport["labResults"]> = { customItems: [] };

  // Extraction rules for standard blood lab items
  lr.hba1c = findLabValueInText(text, ["HbA1c", "Hemoglobin A1c", "A1C", "Glycated Hemoglobin"]);
  lr.fbs = findLabValueInText(text, ["Fasting Blood Sugar", "Fasting Glucose", "Glucose", "FBS", "Blood Sugar"]);
  lr.cholesterol = findLabValueInText(text, ["Total Cholesterol", "Cholesterol", "CHOL"]);
  lr.triglyceride = findLabValueInText(text, ["Triglyceride", "Triglycerides", "TRIG"]);
  lr.hdl = findLabValueInText(text, ["HDL-Cholesterol", "HDL-C", "HDL"]);
  lr.ldl = findLabValueInText(text, ["LDL-Cholesterol", "LDL-C", "LDL"]);
  lr.creatinine = findLabValueInText(text, ["Creatinine", "Cr", "Blood Creatinine"]);
  lr.egfr = findLabValueInText(text, ["eGFR", "e-GFR", "GFR", "Estimated GFR"]);
  lr.bun = findLabValueInText(text, ["BUN", "Blood Urea Nitrogen"]);
  lr.sgot = findLabValueInText(text, ["SGOT", "AST"]);
  lr.sgpt = findLabValueInText(text, ["SGPT", "ALT"]);
  lr.uricAcid = findLabValueInText(text, ["Uric Acid", "Uric"]);
  lr.hemoglobin = findLabValueInText(text, ["Hemoglobin", "Hb", "HGB"]);
  lr.wbc = findLabValueInText(text, ["WBC", "White Blood Cell", "White Blood Cells"]);
  lr.platelet = findLabValueInText(text, ["Platelet", "Platelets", "PLT"]);

  // Custom Items
  const customTests = [
    { name: "Estimated Average Glucose", unit: "mg/dL", aliases: ["Estimated Average Glucose", "eAG"] },
    { name: "Sodium (โซเดียม)", unit: "mmol/L", aliases: ["Sodium", "Na"] },
    { name: "Potassium (โพแทสเซียม)", unit: "mmol/L", aliases: ["Potassium", "K"] },
    { name: "Chloride (คลอไรด์)", unit: "mmol/L", aliases: ["Chloride", "Cl"] },
    { name: "Carbondioxide (คาร์บอนไดออกไซด์)", unit: "mmol/L", aliases: ["Carbondioxide", "CO2", "Bicarbonate"] },
    { name: "Albumin/Creatinine Ratio (Urine)", unit: "mg/g", aliases: ["Albumin/Creatinine Ratio", "Urine Alb/Cr"] },
    { name: "Albumin Urine", unit: "mg/dL", aliases: ["Albumin Urine", "Urine Albumin"] },
  ];

  for (const t of customTests) {
    const val = findLabValueInText(text, t.aliases);
    if (val !== undefined) {
      lr.customItems?.push({
        testName: t.name,
        resultValue: String(val),
        unit: t.unit,
        flag: "normal",
      });
    }
  }

  result.labResults = lr;
  result.title = `ผลตรวจเลือดและเคมีคลินิก - ${result.hospital || fileName || "เอกสารทางการแพทย์"}`;

  return result;
}
