import { SystemData, UserProfile } from "../types";
import { initialSystemData } from "../data/initialData";

const STORAGE_KEY = "med_health_tracker_v1";

export function loadSystemData(): SystemData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveSystemData(initialSystemData);
      return initialSystemData;
    }
    const parsed = JSON.parse(raw) as SystemData;
    // Ensure all required properties exist
    return {
      ...initialSystemData,
      ...parsed,
      profiles: parsed.profiles && parsed.profiles.length > 0 ? parsed.profiles : initialSystemData.profiles,
      medicines: parsed.medicines || [],
      intakeLogs: parsed.intakeLogs || [],
      refillHistory: parsed.refillHistory || [],
      vitals: parsed.vitals || [],
      appointments: parsed.appointments || [],
      medicalRecords: parsed.medicalRecords || [],
      lineConfig: { ...initialSystemData.lineConfig, ...(parsed.lineConfig || {}) },
    };
  } catch (e) {
    console.error("Error loading system data from localStorage:", e);
    return initialSystemData;
  }
}

export function saveSystemData(data: SystemData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving system data to localStorage:", e);
  }
}

export const loadInitialData = loadSystemData;
export const saveData = saveSystemData;

export function clearAllSystemData(): SystemData {
  saveSystemData(initialSystemData);
  return initialSystemData;
}

export async function syncToCloud(data: SystemData, backupKey = "default_backup"): Promise<boolean> {
  const result = await syncCloudBackup(data, backupKey);
  return result.success;
}

export async function fetchFromCloud(backupKey = "default_backup"): Promise<SystemData | null> {
  const result = await restoreCloudBackup(backupKey);
  return result.success && result.payload ? result.payload : null;
}

export function exportBackupJSON(data: SystemData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().split("T")[0];
  a.download = `med_health_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackupJSON(file: File): Promise<SystemData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as SystemData;
        if (!parsed.profiles || !parsed.medicines) {
          throw new Error("ไฟล์สำรองข้อมูลไม่ถูกต้อง รูปแบบไม่ครบถ้วน");
        }
        saveSystemData(parsed);
        resolve(parsed);
      } catch (err: any) {
        reject(new Error("อ่านไฟล์สำรองข้อมูลไม่สำเร็จ: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("เกิดข้อผิดพลาดในการอ่านไฟล์"));
    reader.readAsText(file);
  });
}

export async function syncCloudBackup(data: SystemData, backupKey: string): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
  try {
    const res = await fetch("/api/backup/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupKey, payload: data }),
    });
    const result = await res.json();
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์สำรองข้อมูลได้" };
  }
}

export async function restoreCloudBackup(backupKey: string): Promise<{ success: boolean; payload?: SystemData; error?: string }> {
  try {
    const res = await fetch(`/api/backup/load/${encodeURIComponent(backupKey)}`);
    const result = await res.json();
    if (result.success && result.payload) {
      saveSystemData(result.payload);
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "ไม่สามารถดึงข้อมูลสำรองจากคลาวด์ได้" };
  }
}
