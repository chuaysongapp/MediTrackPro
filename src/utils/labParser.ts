import * as pdfjsLib from "pdfjs-dist";

// Configure worker URL for browser environments with resilient fallbacks
if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
  try {
    const version = pdfjsLib.version || "3.11.174";
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
  } catch (e) {
    console.warn("PDF.js worker setup fallback notice:", e);
  }
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      isEvalSupported: false,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as any[];
      if (!items || items.length === 0) continue;

      // Extract items with position coordinates (x = transform[4], y = transform[5])
      const posItems = items
        .filter((item: any) => item && typeof item.str === "string" && item.str.length > 0)
        .map((item: any) => ({
          str: item.str.trim(),
          x: item.transform ? item.transform[4] : 0,
          y: item.transform ? item.transform[5] : 0,
        }))
        .filter(i => i.str.length > 0);

      // Sort by Y coordinate descending (top of page to bottom)
      posItems.sort((a, b) => b.y - a.y);

      // Group items into lines where Y difference <= 8 points (more lenient for varied font baselines)
      const lineGroups: typeof posItems[] = [];
      for (const item of posItems) {
        const existingLine = lineGroups.find(g => Math.abs(g[0].y - item.y) <= 8);
        if (existingLine) {
          existingLine.push(item);
        } else {
          lineGroups.push([item]);
        }
      }

      // Sort items within each line left-to-right (by X coordinate)
      const pageLines = lineGroups.map(line => {
        line.sort((a, b) => a.x - b.x);
        return line.map(i => i.str).join(" ").replace(/\s+/g, " ").trim();
      }).filter(lineStr => lineStr.length > 0);

      const pageText = pageLines.join("\n");
      const rawWordStream = posItems.map(i => i.str).join(" ");

      fullText += `--- Page ${pageNum} ---\n` + pageText + "\n" + rawWordStream + "\n\n";
    }

    return fullText.trim();
  } catch (err) {
    console.warn("Client PDF text extraction notice:", err);
    return "";
  }
}

export async function renderPdfPagesToImages(file: File, maxPages = 3): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      isEvalSupported: false,
    });
    
    const pdf = await loadingTask.promise;
    const pageImages: string[] = [];
    const pagesToRender = Math.min(pdf.numPages, maxPages);

    for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        } as any).promise;
        
        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        pageImages.push(jpegDataUrl);
      }
    }
    return pageImages;
  } catch (err) {
    console.warn("PDF page image rendering notice:", err);
    return [];
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
 * Clean reference ranges and non-value numbers from a block of text
 */
function extractCandidateNumbers(block: string): number[] {
  if (!block) return [];

  let clean = block;

  // 1. Remove obvious date strings e.g. 08/08/2026, 2026-08-08, 2569/08/08
  clean = clean.replace(/\b\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4}\b/g, " ");

  // 2. Remove explicit range patterns like "70 - 99", "70.0 - 99.0", "70.0-99.0", "4.0-6.0", "13.5-17.5"
  clean = clean.replace(/\d+(?:\.\d+)?\s*[-–—~]\s*\d+(?:\.\d+)?/g, " ");

  // 3. Remove comparison operator ranges like "< 200", "<200", "> 40", ">= 60", "<= 100"
  clean = clean.replace(/(?:<|>|<=|>=)\s*\d+(?:\.\d+)?/gi, " ");

  // 4. Remove reference range headers / brackets if they don't contain sole numbers
  clean = clean.replace(/Ref(?:erence)?\s*Range[^\n\r]*/gi, " ");

  // 5. Remove unit multipliers e.g. 1.73m2, 10^3, 10^6, /uL
  clean = clean.replace(/1\.73\s*m\^?2?/gi, " ").replace(/10\^\d+/g, " ");

  // Find all remaining numeric tokens
  const tokens = clean.match(/\b\d+(?:\.\d+)?\b/g);
  if (!tokens) return [];

  const candidates: number[] = [];
  for (const t of tokens) {
    const num = parseFloat(t);
    if (!isNaN(num) && num >= 0 && num < 100000) {
      // Ignore Thai Buddhist years (2550 - 2575) if integer
      if (num >= 2550 && num <= 2575 && Number.isInteger(num)) continue;
      // Ignore common page numbers or document years
      if (num >= 2020 && num <= 2030 && Number.isInteger(num)) continue;
      candidates.push(num);
    }
  }

  return candidates;
}

/**
 * Smart multi-strategy lab value finder for client-side text parsing.
 * Supports row-by-row, colon-separated, and multi-line sliding windows (up to 12 lines).
 */
function findLabValueInText(text: string, aliases: string[]): number | undefined {
  if (!text) return undefined;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // Strategy 1: Direct Line Matching (Search line containing alias)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    for (const alias of aliases) {
      const lowerAlias = alias.toLowerCase();
      if (lowerLine.includes(lowerAlias)) {
        // Try extracting numbers from the same line first
        const numsOnLine = extractCandidateNumbers(line);
        if (numsOnLine.length > 0) {
          return numsOnLine[0];
        }

        // Strategy 2: Multi-line window search (Look up to 8 lines ahead for table/column splits)
        const windowLines = lines.slice(i, Math.min(i + 8, lines.length));
        const windowText = windowLines.join(" ");
        const numsInWindow = extractCandidateNumbers(windowText);
        if (numsInWindow.length > 0) {
          return numsInWindow[0];
        }
      }
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

  // 1. Hospital Name Detection
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
    const hMatch = text.match(/(?:โรงพยาบาล|คลินิก|ศูนย์แล็บ|ห้องปฏิบัติการ|Hospital|Clinic|Lab)\s*[:\s]*([ก-๙a-zA-Z0-9\s]+)/i);
    if (hMatch && hMatch[1]) result.hospital = hMatch[0].trim();
  }

  // 2. Patient Name Detection
  const nameMatch = text.match(/(?:นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|คุณ|Mr\.|Mrs\.|Ms\.|Name|ชื่อ-สกุล|ชื่อผู้ป่วย)\s*[:\s]*([ก-๙a-zA-Z\s\.\'\-\/]+?)(?=\s{2,}|\n|\r|\d{2,}|Age|HN|Loc|202|201|256|257|$)/i);
  if (nameMatch && nameMatch[1]) {
    const rawName = nameMatch[1].trim();
    if (rawName.length >= 2 && rawName.length <= 60) {
      result.patientName = rawName;
    }
  }

  // 3. Date Detection (Supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY and Thai BE Years 2560-2575)
  const dateMatch = text.match(/(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|25\d{2})/) ||
                    text.match(/(20\d{2}|25\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (dateMatch) {
    let yearNum = 2026;
    let monthStr = "01";
    let dayStr = "01";

    if (dateMatch[1].length === 4) {
      yearNum = parseInt(dateMatch[1]);
      monthStr = dateMatch[2].padStart(2, "0");
      dayStr = dateMatch[3].padStart(2, "0");
    } else {
      yearNum = parseInt(dateMatch[3]);
      monthStr = dateMatch[2].padStart(2, "0");
      dayStr = dateMatch[1].padStart(2, "0");
    }

    if (yearNum >= 2400 && yearNum <= 2650) {
      yearNum -= 543; // Convert Thai BE to AD
    }
    result.date = `${yearNum}-${monthStr}-${dayStr}`;
  }

  const lr: NonNullable<ParsedLabReport["labResults"]> = { customItems: [] };

  // 4. Standard Blood Lab Items Extraction (English & Thai Aliases)
  lr.fbs = findLabValueInText(text, ["Fasting Blood Sugar", "Fasting Glucose", "Glucose", "FBS", "Blood Sugar", "น้ำตาลในเลือด", "น้ำตาล", "FPG", "GLU"]);
  lr.hba1c = findLabValueInText(text, ["HbA1c", "Hemoglobin A1c", "A1C", "Glycated Hemoglobin", "น้ำตาลสะสม", "Hb A1c"]);
  lr.cholesterol = findLabValueInText(text, ["Total Cholesterol", "Cholesterol", "CHOL", "ไขมันรวม", "คอเลสเตอรอล"]);
  lr.triglyceride = findLabValueInText(text, ["Triglyceride", "Triglycerides", "TRIG", "ไตรกลีเซอไรด์"]);
  lr.hdl = findLabValueInText(text, ["HDL-Cholesterol", "HDL-C", "HDL", "ไขมันดี", "เอชดีแอล"]);
  lr.ldl = findLabValueInText(text, ["LDL-Cholesterol", "LDL-C", "LDL", "Direct LDL", "ไขมันเลว", "แอลดีแอล"]);
  lr.creatinine = findLabValueInText(text, ["Creatinine", "Cr", "Blood Creatinine", "ครีเอตินีน", "ค่าไต"]);
  lr.egfr = findLabValueInText(text, ["eGFR", "e-GFR", "GFR", "Estimated GFR", "CKD-EPI", "อัตราการกรองของไต"]);
  lr.bun = findLabValueInText(text, ["BUN", "Blood Urea Nitrogen", "Urea", "ยูเรียไนโตรเจน"]);
  lr.sgot = findLabValueInText(text, ["SGOT", "AST", "เอสจีโอที", "เอเอสที"]);
  lr.sgpt = findLabValueInText(text, ["SGPT", "ALT", "เอสจีพีที", "เอแอลที"]);
  lr.uricAcid = findLabValueInText(text, ["Uric Acid", "Uric", "กรดยูริก"]);
  lr.hemoglobin = findLabValueInText(text, ["Hemoglobin", "Hb", "HGB", "ฮีโมโกลบิน", "ความเข้มข้นของเลือด"]);
  lr.wbc = findLabValueInText(text, ["WBC", "White Blood Cell", "White Blood Cells", "เม็ดเลือดขาว"]);
  lr.platelet = findLabValueInText(text, ["Platelet", "Platelets", "PLT", "เกล็ดเลือด"]);

  // 5. Custom Tests Extraction
  const customTests = [
    { name: "Estimated Average Glucose (eAG)", unit: "mg/dL", aliases: ["Estimated Average Glucose", "eAG"] },
    { name: "Sodium (โซเดียม)", unit: "mmol/L", aliases: ["Sodium", "Na"] },
    { name: "Potassium (โพแทสเซียม)", unit: "mmol/L", aliases: ["Potassium", "K"] },
    { name: "Chloride (คลอไรด์)", unit: "mmol/L", aliases: ["Chloride", "Cl"] },
    { name: "Carbondioxide (คาร์บอนไดออกไซด์)", unit: "mmol/L", aliases: ["Carbondioxide", "CO2", "Bicarbonate"] },
    { name: "Albumin/Creatinine Ratio", unit: "mg/g", aliases: ["Albumin/Creatinine Ratio", "Urine Alb/Cr"] },
    { name: "Albumin Urine", unit: "mg/dL", aliases: ["Albumin Urine", "Urine Albumin"] },
    { name: "Direct Bilirubin", unit: "mg/dL", aliases: ["Direct Bilirubin", "D-Bilirubin"] },
    { name: "Total Bilirubin", unit: "mg/dL", aliases: ["Total Bilirubin", "T-Bilirubin"] },
    { name: "Alkaline Phosphatase (ALP)", unit: "U/L", aliases: ["Alkaline Phosphatase", "ALP"] },
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

  // 6. Generic Table Row Extraction for any other lab tests
  const lines = text.split(/\r?\n/);
  const knownTokens = [
    "fbs", "glucose", "glu", "hba1c", "cholesterol", "chol", "triglyceride", "triglycerides", "trig", "hdl", "ldl",
    "creatinine", "cr", "egfr", "gfr", "bun", "sgot", "ast", "sgpt", "alt", "uric", "hemoglobin", "hb", "hgb",
    "wbc", "platelet", "platelets", "plt", "hospital", "patient", "page", "date", "name", "age",
    "รามาธิบดี", "ศิริราช", "จุฬา", "กรุงเทพ", "ผลตรวจ", "วันที่", "ชื่อ", "รายงาน"
  ];

  for (const line of lines) {
    const cleanLine = line.trim();
    // Pattern: [Test Name] [Numeric Value] [Unit]
    const rowMatch = cleanLine.match(/^([A-Za-z0-9\s\(\)\/\-\._ก-๙]+?)\s+([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|g\/dL|%|U\/L|u\/l|IU\/L|mmol\/L|mEq\/L|fL|pg|g\/L|10\^3\/uL|10\^6\/uL|\/uL|\/mm3|mL\/min)(?:\s+.*)?$/i);
    
    if (rowMatch) {
      const testName = rowMatch[1].trim();
      const valStr = rowMatch[2];
      const unitStr = rowMatch[3];

      const lowerName = testName.toLowerCase();
      const isKnown = knownTokens.some(tok => lowerName.includes(tok));

      if (!isKnown && testName.length >= 2 && testName.length <= 40) {
        const alreadyAdded = lr.customItems?.some(ci => ci.testName.toLowerCase() === testName.toLowerCase());
        if (!alreadyAdded) {
          lr.customItems?.push({
            testName: testName,
            resultValue: valStr,
            unit: unitStr,
            flag: "normal",
          });
        }
      }
    }
  }

  result.labResults = lr;
  result.title = `ผลตรวจเลือดและเคมีคลินิก - ${result.hospital || fileName || "เอกสารทางการแพทย์"}`;

  return result;
}
