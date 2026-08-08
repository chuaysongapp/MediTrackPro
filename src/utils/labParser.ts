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
      
      const items = textContent.items as any[];
      if (!items || items.length === 0) continue;

      // Extract items with position coordinates (x = transform[4], y = transform[5])
      const posItems = items
        .filter((item: any) => item && typeof item.str === "string" && item.str.length > 0)
        .map((item: any) => ({
          str: item.str,
          x: item.transform ? item.transform[4] : 0,
          y: item.transform ? item.transform[5] : 0,
        }));

      // Sort by Y coordinate descending (top of page to bottom)
      posItems.sort((a, b) => b.y - a.y);

      // Group items into lines where Y difference <= 4 points
      const lineGroups: typeof posItems[] = [];
      for (const item of posItems) {
        const existingLine = lineGroups.find(g => Math.abs(g[0].y - item.y) <= 4);
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
      fullText += `--- Page ${pageNum} ---\n` + pageText + "\n\n";
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
 * Smart multi-strategy lab value finder for client-side text parsing.
 * Strips out reference ranges, units, dates, and matches aliases in 1-3 line windows.
 */
function findLabValueInText(text: string, aliases: string[]): number | undefined {
  if (!text) return undefined;
  const lines = text.split(/\r?\n/);

  const extractFromBlock = (block: string): number | undefined => {
    // 1. Strip reference ranges in parens e.g. (70-99), (4.0-6.0), (<200)
    let clean = block
      .replace(/\([\s\S]*?\)/g, " ")
      .replace(/\[[\s\S]*?\]/g, " ");

    // 2. Strip explicit range expressions e.g. "70.0 - 99.0", "< 200", "> 40"
    clean = clean
      .replace(/\d+(?:\.\d+)?\s*[-–—~]\s*\d+(?:\.\d+)?/g, " ")
      .replace(/(?:<|>|<=|>=)\s*\d+(?:\.\d+)?/gi, " ");

    // 3. Strip dates e.g. "26/08/2026", "2026-08-26"
    clean = clean.replace(/\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4}/g, " ");

    // 4. Strip unit artifacts e.g. "1.73m2", "10^3"
    clean = clean.replace(/1\.73\s*m\^?2?/gi, " ").replace(/10\^\d+/g, " ");

    // Extract all candidate numbers
    const matches = clean.match(/\b\d+(?:\.\d+)?\b/g);
    if (!matches) return undefined;

    for (const m of matches) {
      const num = parseFloat(m);
      if (!isNaN(num) && num > 0 && num < 40000) {
        // Skip Thai Buddhist years (2560 - 2575) if integer
        if (num >= 2560 && num <= 2575 && Number.isInteger(num)) continue;
        return num;
      }
    }
    return undefined;
  };

  // 1. Single line search
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    const hasAlias = aliases.some(alias => lowerLine.includes(alias.toLowerCase()));

    if (hasAlias) {
      const val = extractFromBlock(line);
      if (val !== undefined) return val;

      // 2. Look at 2-3 line sliding window for multi-line table layouts
      if (i + 1 < lines.length) {
        const windowText = lines.slice(i, i + 3).join(" ");
        const windowVal = extractFromBlock(windowText);
        if (windowVal !== undefined) return windowVal;
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
    const hMatch = text.match(/(?:โรงพยาบาล|คลินิก|ศูนย์แล็บ|ห้องปฏิบัติการ|Hospital|Clinic|Lab)\s*([ก-๙a-zA-Z0-9\s]+)/i);
    if (hMatch) result.hospital = hMatch[0].trim();
  }

  // 2. Patient Name Detection
  const nameMatch = text.match(/(?:นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|คุณ|Mr\.|Mrs\.|Ms\.|Name|ชื่อ-สกุล|ชื่อผู้ป่วย)\s*[:\s]*([ก-๙a-zA-Z\s\.\'\-\/]+?)(?=\s{2,}|\n|\r|\d{2,}|Age|HN|Loc|202|201|256|257|$)/i);
  if (nameMatch && nameMatch[1]) {
    const rawName = nameMatch[1].trim();
    if (rawName.length >= 2 && rawName.length <= 60) {
      result.patientName = rawName;
    }
  }

  // 3. Date Detection (Supports Western YYYY-MM-DD, DD/MM/YYYY and Thai BE Years 2560-2575)
  const dateMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](20\d{2}|25\d{2})/) ||
                    text.match(/(20\d{2}|25\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
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
  lr.fbs = findLabValueInText(text, ["Fasting Blood Sugar", "Fasting Glucose", "Glucose", "FBS", "Blood Sugar", "น้ำตาลในเลือด", "น้ำตาล", "FPG"]);
  lr.hba1c = findLabValueInText(text, ["HbA1c", "Hemoglobin A1c", "A1C", "Glycated Hemoglobin", "น้ำตาลสะสม"]);
  lr.cholesterol = findLabValueInText(text, ["Total Cholesterol", "Cholesterol", "CHOL", "ไขมันรวม", "คอเลสเตอรอล"]);
  lr.triglyceride = findLabValueInText(text, ["Triglyceride", "Triglycerides", "TRIG", "ไตรกลีเซอไรด์"]);
  lr.hdl = findLabValueInText(text, ["HDL-Cholesterol", "HDL-C", "HDL", "ไขมันดี", "เอชดีแอล"]);
  lr.ldl = findLabValueInText(text, ["LDL-Cholesterol", "LDL-C", "LDL", "ไขมันเลว", "แอลดีแอล"]);
  lr.creatinine = findLabValueInText(text, ["Creatinine", "Cr", "Blood Creatinine", "ครีเอตินีน", "ค่าไต"]);
  lr.egfr = findLabValueInText(text, ["eGFR", "e-GFR", "GFR", "Estimated GFR", "อัตราการกรองของไต"]);
  lr.bun = findLabValueInText(text, ["BUN", "Blood Urea Nitrogen", "ยูเรียไนโตรเจน"]);
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
    "fbs", "glucose", "hba1c", "cholesterol", "triglyceride", "triglycerides", "hdl", "ldl",
    "creatinine", "egfr", "bun", "sgot", "ast", "sgpt", "alt", "uric", "hemoglobin", "hb",
    "wbc", "platelet", "platelets", "hospital", "patient", "page", "date", "name", "age",
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
