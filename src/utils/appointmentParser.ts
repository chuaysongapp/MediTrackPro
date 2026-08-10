/**
 * Parse a doctor-appointment slip (Thai) into structured fields.
 * Heuristic/regex based — works on text extracted from a text-based PDF or pasted text.
 * (Scanned images without a text layer won't yield text; user can paste/type instead.)
 */

export interface ParsedAppointment {
  doctorName?: string;
  hospital?: string;
  department?: string;
  appointmentDate?: string; // YYYY-MM-DD (AD)
  appointmentTime?: string; // HH:mm
  purpose?: string;
}

const TH_MONTHS: Record<string, string> = {
  "มกราคม": "01", "ม.ค": "01", "มค": "01",
  "กุมภาพันธ์": "02", "ก.พ": "02", "กพ": "02",
  "มีนาคม": "03", "มี.ค": "03", "มีค": "03",
  "เมษายน": "04", "เม.ย": "04", "เมย": "04",
  "พฤษภาคม": "05", "พ.ค": "05", "พค": "05",
  "มิถุนายน": "06", "มิ.ย": "06", "มิย": "06",
  "กรกฎาคม": "07", "ก.ค": "07", "กค": "07",
  "สิงหาคม": "08", "ส.ค": "08", "สค": "08",
  "กันยายน": "09", "ก.ย": "09", "กย": "09",
  "ตุลาคม": "10", "ต.ค": "10", "ตค": "10",
  "พฤศจิกายน": "11", "พ.ย": "11", "พย": "11",
  "ธันวาคม": "12", "ธ.ค": "12", "ธค": "12",
};

function toAdYear(y: number): number {
  // Buddhist Era → AD when it looks like BE (>= 2400)
  return y >= 2400 ? y - 543 : y;
}

function normMonthKey(raw: string): string | null {
  const k = raw.replace(/\./g, "").trim();
  // try exact, then startsWith match against known keys (also dot-stripped)
  for (const [key, val] of Object.entries(TH_MONTHS)) {
    if (key.replace(/\./g, "") === k) return val;
  }
  return null;
}

function parseThaiDate(text: string): string | undefined {
  // 1) "11 ส.ค. 2569" / "11 สิงหาคม 2569"
  const m1 = text.match(/(\d{1,2})\s*([ก-๙]{1,10}\.?[ก-๙]?\.?)\s*(\d{4})/);
  if (m1) {
    const day = m1[1].padStart(2, "0");
    const mo = normMonthKey(m1[2]);
    if (mo) {
      const year = toAdYear(parseInt(m1[3], 10));
      return `${year}-${mo}-${day}`;
    }
  }
  // 2) numeric dd/mm/yyyy or dd-mm-yyyy (yyyy may be BE)
  const m2 = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m2) {
    const day = m2[1].padStart(2, "0");
    const mo = m2[2].padStart(2, "0");
    const year = toAdYear(parseInt(m2[3], 10));
    if (+mo >= 1 && +mo <= 12) return `${year}-${mo}-${day}`;
  }
  return undefined;
}

function parseTime(text: string): string | undefined {
  // "11:45 น." / "11.45 น." / "เวลา 09:00"
  const m = text.match(/(?:เวลา\s*)?(\d{1,2})[:.](\d{2})\s*(?:น\.?|นาฬิกา)?/);
  if (m) {
    const h = m[1].padStart(2, "0");
    const min = m[2];
    if (+h <= 23 && +min <= 59) return `${h}:${min}`;
  }
  return undefined;
}

export function parseAppointmentText(text: string): ParsedAppointment {
  const out: ParsedAppointment = {};
  if (!text) return out;
  const flat = text.replace(/\r/g, "");
  const lines = flat.split(/\n/).map((l) => l.trim()).filter(Boolean);

  // Doctor name — search per line so we don't cross into the next line
  for (const l of lines) {
    const m = l.match(
      /(?:นพ|พญ|น\.?พ|พ\.?ญ|นายแพทย์|แพทย์หญิง|ทพ|ทพญ|Dr)\.?\s*([ก-๙A-Za-z]+(?:\s+[ก-๙A-Za-z]+){0,2})/
    );
    if (m) {
      let name = m[0];
      // cut if hospital/dept keyword appears later on the same line
      name = name.split(/\s+(?:รพ|โรงพยาบาล|คลินิก|แผนก|ห้อง|อาคาร)/)[0];
      out.doctorName = name.replace(/\s+/g, " ").trim();
      break;
    }
  }

  // Hospital — line/segment containing hospital keyword (keep "โรงพยาบาล"/"รพ." in the name)
  const hospLine = lines.find((l) => /โรงพยาบาล|รพ\.?|คลินิก|สถาบัน|ศูนย์การแพทย์|Hospital|Clinic/i.test(l));
  if (hospLine) {
    let h = hospLine.replace(/^(?:สถานที่|สถานพยาบาล|สถานที่นัด)\s*[:：]\s*/i, "");
    const paren = h.match(/^(.*?)[\(（](.+?)[\)）]/);
    if (paren) {
      out.hospital = paren[1].trim();
      out.department = paren[2].trim();
    } else {
      out.hospital = h.trim();
    }
  }

  // Department — explicit label on its own line, if not already captured from parentheses
  if (!out.department) {
    const depLine = lines.find((l) => /^(?:แผนก|คลินิก|ห้องตรวจ|ห้อง|ตึก|อาคาร)\b/.test(l));
    if (depLine) {
      let d = depLine.replace(/^(?:แผนก|ห้องตรวจ)\s*[:：]?\s*/, "");
      // stop before any date/time fragment on the same line
      d = d.split(/\s+(?:นัด|วันที่|เวลา|\d{1,2}[:.])/)[0];
      out.department = d.replace(/\s+/g, " ").trim();
    }
  }

  // Date
  const dateStr = (lines.find((l) => /นัด|วันที่|date/i.test(l)) || flat);
  out.appointmentDate = parseThaiDate(dateStr) || parseThaiDate(flat);

  // Time
  const timeStr = (lines.find((l) => /เวลา|time|น\./i.test(l)) || flat);
  out.appointmentTime = parseTime(timeStr) || parseTime(flat);

  // Purpose
  const purM = flat.match(/(?:วัตถุประสงค์|เพื่อ|เหตุผล|นัดเพื่อ|Purpose)\s*[:：]?\s*([ก-๙A-Za-z0-9\s\.\-\/]{2,60})/);
  if (purM) {
    out.purpose = purM[1].replace(/\s+/g, " ").trim();
  } else {
    const fp = lines.find((l) => /ฟังผล|ติดตามอาการ|ตรวจติดตาม|รับยา|ตรวจเลือด|ผ่าตัด/.test(l));
    if (fp) out.purpose = fp.replace(/\s+/g, " ").trim();
  }

  return out;
}
