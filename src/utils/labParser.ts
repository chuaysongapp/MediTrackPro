import * as pdfjsLib from "pdfjs-dist";
// Bundle the PDF.js worker with the app build (Vite emits it as an asset and
// resolves the correct path even on GitHub Pages sub-paths). This replaces the
// previous CDN URL that pointed at pdf.worker.min.js — a file that no longer
// exists in pdfjs-dist v4+ (the worker is now an ES module: pdf.worker.min.mjs).
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
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

      const posItems = items
        .filter((item: any) => item && typeof item.str === "string" && item.str.length > 0)
        .map((item: any) => ({
          str: item.str.trim(),
          x: item.transform ? item.transform[4] : 0,
          y: item.transform ? item.transform[5] : 0,
        }))
        .filter(i => i.str.length > 0);

      // Sort top-to-bottom
      posItems.sort((a, b) => b.y - a.y);

      // Group into lines (Y within 8pt)
      const lineGroups: typeof posItems[] = [];
      for (const item of posItems) {
        const existingLine = lineGroups.find(g => Math.abs(g[0].y - item.y) <= 8);
        if (existingLine) existingLine.push(item);
        else lineGroups.push([item]);
      }

      // Sort each line left-to-right
      const pageLines = lineGroups.map(line => {
        line.sort((a, b) => a.x - b.x);
        return line.map(i => i.str).join(" ").replace(/\s+/g, " ").trim();
      }).filter(lineStr => lineStr.length > 0);

      fullText += `--- Page ${pageNum} ---\n` + pageLines.join("\n") + "\n\n";
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

        pageImages.push(canvas.toDataURL("image/jpeg", 0.85));
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
 * Row-aware lab parser.
 *
 * Lab reports (e.g. Ramathibodi) are tabular: each result sits on its own line as
 *   <TestName> [H|L] <Value> <Unit> [<Reference range>]
 * We anchor the numeric VALUE to the token immediately before a known unit, so we
 * never grab a reference-range number, an "ISO 15189" document number, or a value
 * from the wrong row. Test names are matched by anchored keywords (word boundaries),
 * so "Hb" can't match inside "HbA1C" and "Cl" can't match inside "Clinic".
 */

const UNIT = String.raw`(?:%|mg\/dL|g\/dL|mg\/g|mmol\/L|mEq\/L|mIU\/L|IU\/L|U\/L|ml\/min|umol\/L|micro\s?mol\/L|10\^3\/uL|10\^6\/uL|\/uL|fL|pg|g\/L)`;
// value must sit directly before a unit; lookahead allows space, "[", "/" (ml/min/1.73) or EOL
const ROW_RE = new RegExp(String.raw`^(.+?)\s+(?:([HL])\s+)?(-?\d+(?:\.\d+)?)\s+(${UNIT})(?=[\s\[/]|$)`, "i");

// Substrings that mark a header / footer / metadata line (checked only on lines
// that already produced a value+unit, so this is a light safety net).
const HEADER_WORDS = [
  "reported", "printed", "approved", "clinic", "lab no", "parameters", "reference",
  "hospital", " hn", "loc:", "dr:", "age :", "dispatch", "received", "page", "tel.",
  "iso", "กทม", "พระราม", "ภาควิชา", "คณะ", "ใบรายงาน", "หมายเหตุ", "ชื่อการทดสอบ",
];

function flagFromLetter(f?: string): "normal" | "high" | "low" {
  if (!f) return "normal";
  const u = f.toUpperCase();
  return u === "H" ? "high" : u === "L" ? "low" : "normal";
}

interface LabRow {
  name: string;
  flag?: string;
  value: number;
  unit: string;
}

function parseRows(text: string): LabRow[] {
  const rows: LabRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(ROW_RE);
    if (!m) continue;
    const name = m[1].trim();
    const lower = name.toLowerCase();
    if (HEADER_WORDS.some(w => lower.includes(w.trim()))) continue;
    const value = parseFloat(m[3]);
    if (isNaN(value)) continue;
    rows.push({ name, flag: m[2], value, unit: m[4] });
  }
  return rows;
}

type StdKey =
  | "fbs" | "hba1c" | "cholesterol" | "triglyceride" | "hdl" | "ldl"
  | "creatinine" | "bun" | "egfr" | "sgot" | "sgpt" | "uricAcid"
  | "hemoglobin" | "wbc" | "platelet";

/** Map a row's test name to a standard field key, or null (=> handle as custom / skip). */
function classifyStandard(name: string, unit: string): StdKey | null {
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  const u = unit.toLowerCase();
  if (/hba1c/.test(n)) return "hba1c";
  if (/estimated average glucose|^eag\b/.test(n)) return null;              // calculated -> custom
  if (/glucose/.test(n) && /naf/.test(n)) return "fbs";                     // Glucose (NaF) = fasting
  if (/^glucose$/.test(n) && u.includes("mg/dl")) return "fbs";
  if (/fasting|^fbs$|^fpg$/.test(n)) return "fbs";
  if (/non-?hdl/.test(n)) return null;                                      // calculated -> custom
  if (/hdl/.test(n) && /chol/.test(n)) return "hdl";
  if (/ldl/.test(n) && /chol/.test(n)) return "ldl";
  if (/^cholesterol$|total cholesterol/.test(n)) return "cholesterol";
  if (/triglyceride/.test(n)) return "triglyceride";
  if (/urine creatinine/.test(n) || /albumin\/creatinine/.test(n)) return null; // -> custom
  if (/^creatinine$/.test(n)) return "creatinine";
  if (/egfr|e-gfr|^gfr$|ckd-epi/.test(n)) return "egfr";
  if (/\bbun\b|blood urea|urea nitrogen/.test(n)) return "bun";
  if (/\bsgot\b|\bast\b/.test(n)) return "sgot";
  if (/\bsgpt\b|\balt\b/.test(n)) return "sgpt";
  if (/uric/.test(n)) return "uricAcid";
  if (/^hemoglobin$|^hb$|^hgb$/.test(n)) return "hemoglobin";
  if (/^wbc$|white blood/.test(n) && !u.includes("hpf")) return "wbc";
  if (/platelet|^plt$/.test(n)) return "platelet";
  return null;
}

/** Nice display label for known custom items; else the original name. */
function customLabel(name: string): string {
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (/estimated average glucose|^eag\b/.test(n)) return "Estimated Average Glucose (eAG)";
  if (/^sodium$|^na$/.test(n)) return "Sodium (โซเดียม)";
  if (/^potassium$|^k$/.test(n)) return "Potassium (โพแทสเซียม)";
  if (/^chloride$|^cl$/.test(n)) return "Chloride (คลอไรด์)";
  if (/carbondioxide|bicarbonate|^co2$/.test(n)) return "Carbondioxide (คาร์บอนไดออกไซด์)";
  if (/anion gap/.test(n)) return "Anion gap (ค่าคำนวณ)";
  if (/non-?hdl/.test(n)) return "Non-HDL-c (ค่าคำนวณ)";
  if (/albumin\/creatinine/.test(n)) return "Albumin/Creatinine Ratio";
  if (/urine creatinine/.test(n)) return "Urine Creatinine";
  if (/albumin urine|urine albumin/.test(n)) return "Albumin Urine";
  if (/alkaline phosphatase|^alp$/.test(n)) return "Alkaline Phosphatase (ALP)";
  return name.trim();
}

/** Which non-standard rows are worth keeping as custom items (avoids noise). */
function isWantedCustom(name: string): boolean {
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  return /estimated average glucose|^eag\b|^sodium$|^na$|^potassium$|^k$|^chloride$|^cl$|carbondioxide|bicarbonate|^co2$|anion gap|non-?hdl|albumin\/creatinine|urine creatinine|albumin urine|urine albumin|bilirubin|alkaline phosphatase|^alp$|^uric/.test(n);
}

export function parseLabTextWithRegex(text: string, fileName?: string): ParsedLabReport {
  const result: ParsedLabReport = { labResults: { customItems: [] } };
  if (!text) return result;

  // 1. Hospital
  if (/รามาธิบดี|RAMA/i.test(text)) result.hospital = "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี";
  else if (/ศิริราช|Siriraj/i.test(text)) result.hospital = "โรงพยาบาลศิริราช";
  else if (/จุฬา|Chulalongkorn/i.test(text)) result.hospital = "โรงพยาบาลจุฬาลงกรณ์";
  else if (/บำรุงราษฎร์|Bumrungrad/i.test(text)) result.hospital = "โรงพยาบาลบำรุงราษฎร์";
  else if (/สมิติเวช|Samitivej/i.test(text)) result.hospital = "โรงพยาบาลสมิติเวช";
  else if (/กรุงเทพ|Bangkok/i.test(text)) result.hospital = "โรงพยาบาลกรุงเทพ";
  else if (/พญาไท|Phyathai/i.test(text)) result.hospital = "โรงพยาบาลพญาไท";
  else if (/พระราม\s*9|Praram/i.test(text)) result.hospital = "โรงพยาบาลพระรามเก้า";
  else {
    const hMatch = text.match(/(?:โรงพยาบาล|คลินิก|Hospital|Clinic)\s*[:\s]*([ก-๙a-zA-Z0-9\s]+)/i);
    if (hMatch && hMatch[0]) result.hospital = hMatch[0].trim();
  }

  // 2. Patient name
  const nameMatch = text.match(/(?:นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|Mr\.|Mrs\.|Ms\.)\s*([ก-๙a-zA-Z\s\.\'\-]+?)(?=\s{2,}|\n|\r|Age|HN|Loc|Dr|202|256|$)/);
  if (nameMatch && nameMatch[1]) {
    const raw = nameMatch[1].trim();
    if (raw.length >= 2 && raw.length <= 60) result.patientName = raw;
  }

  // 3. Date -> AD YYYY-MM-DD (handles Thai BE)
  const dm = text.match(/(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|25\d{2})/) ||
             text.match(/(20\d{2}|25\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (dm) {
    let y = 2026, mo = "01", d = "01";
    if (dm[1].length === 4) { y = parseInt(dm[1]); mo = dm[2].padStart(2, "0"); d = dm[3].padStart(2, "0"); }
    else { y = parseInt(dm[3]); mo = dm[2].padStart(2, "0"); d = dm[1].padStart(2, "0"); }
    if (y >= 2400 && y <= 2650) y -= 543;
    result.date = `${y}-${mo}-${d}`;
  }

  // 4. Row-based lab value extraction
  const lr = result.labResults!;
  const rows = parseRows(text);
  const seenCustom = new Set<string>();

  for (const row of rows) {
    const key = classifyStandard(row.name, row.unit);
    if (key) {
      if ((lr as any)[key] === undefined) (lr as any)[key] = row.value; // first match wins
      continue;
    }
    if (isWantedCustom(row.name)) {
      const label = customLabel(row.name);
      const dedupeKey = label.toLowerCase();
      if (!seenCustom.has(dedupeKey)) {
        seenCustom.add(dedupeKey);
        lr.customItems!.push({
          testName: label,
          resultValue: String(row.value),
          unit: row.unit,
          flag: flagFromLetter(row.flag),
        });
      }
    }
  }

  result.title = `ผลตรวจเลือดและเคมีคลินิก - ${result.hospital || fileName || "เอกสารทางการแพทย์"}`;
  return result;
}
