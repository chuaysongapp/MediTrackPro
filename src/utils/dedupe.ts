import { MedicalRecord } from "../types";

/** SHA-256 ของไฟล์ (คืนค่าเป็น hex). ใช้ตรวจไฟล์ซ้ำแบบเป๊ะ. */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

function norm(s?: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, "").trim();
}

const STD_KEYS = [
  "fbs", "hba1c", "cholesterol", "triglyceride", "hdl", "ldl", "creatinine",
  "bun", "egfr", "sgot", "sgpt", "uricAcid", "hemoglobin", "wbc", "platelet",
] as const;

type SigInput = Pick<MedicalRecord, "profileId" | "date" | "hospital" | "labResults">;

/** มีค่าแล็บจริงหรือไม่ (มาตรฐานอย่างน้อย 1 หรือ custom ที่มีค่า) */
export function hasLabData(r: SigInput): boolean {
  const lr = r.labResults || {};
  const anyStd = STD_KEYS.some((k) => (lr as any)[k] !== undefined && (lr as any)[k] !== null);
  const anyCustom = (lr.customItems || []).some((c) => (c.resultValue || "").trim() !== "");
  return anyStd || anyCustom;
}

/**
 * ลายเซ็นเนื้อหาแบบ deterministic: โปรไฟล์ + วันที่ + โรงพยาบาล + ค่าแล็บทั้งหมด
 * ใบเดียวกันจะได้ลายเซ็นเดียวกัน; คนละ panel (ค่าต่างกัน) จะได้คนละลายเซ็น
 */
export function contentSignature(r: SigInput): string {
  const lr = r.labResults || {};
  const std = STD_KEYS.map((k) => `${k}:${(lr as any)[k] ?? ""}`).join("|");
  const custom = (lr.customItems || [])
    .map((c) => `${norm(c.testName)}=${norm(c.resultValue)}`)
    .sort()
    .join("|");
  return [norm(r.profileId), r.date || "", norm(r.hospital), std, custom].join("::");
}

/**
 * หา record ที่ซ้ำกับ candidate (scope เฉพาะ profile เดียวกัน)
 * ลำดับการตรวจ: (1) ไฟล์เป๊ะด้วย fileHash → (2) ลายเซ็นเนื้อหา →
 * (3) fallback ชื่อไฟล์+วันที่+รพ. เมื่อไม่มีค่าแล็บให้เทียบ
 * คืน record เดิมที่ซ้ำ หรือ null
 */
export function findDuplicateRecord(
  records: MedicalRecord[],
  candidate: SigInput & { fileHash?: string; pdfFileName?: string }
): MedicalRecord | null {
  const sameProfile = records.filter((r) => r.profileId === candidate.profileId);

  // 1) ไฟล์เหมือนเป๊ะ
  if (candidate.fileHash) {
    const byFile = sameProfile.find((r) => r.fileHash && r.fileHash === candidate.fileHash);
    if (byFile) return byFile;
  }

  // 2) เนื้อหาเหมือน (เฉพาะเมื่อมีค่าแล็บให้เทียบจริง)
  if (hasLabData(candidate)) {
    const sig = contentSignature(candidate);
    const byContent = sameProfile.find((r) => hasLabData(r) && contentSignature(r) === sig);
    if (byContent) return byContent;
  } else if (candidate.pdfFileName) {
    // 3) ไม่มีค่าแล็บ → เทียบชื่อไฟล์ + วันที่ + โรงพยาบาล
    const byName = sameProfile.find(
      (r) =>
        r.pdfFileName &&
        r.pdfFileName === candidate.pdfFileName &&
        r.date === candidate.date &&
        norm(r.hospital) === norm(candidate.hospital)
    );
    if (byName) return byName;
  }

  return null;
}
