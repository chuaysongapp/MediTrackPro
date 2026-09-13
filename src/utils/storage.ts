import { SystemData, UserProfile } from "../types";
import { initialSystemData } from "../data/initialData";

const STORAGE_KEY = "med_health_tracker_v1";
const LOCAL_UPDATED_AT_KEY = "med_health_tracker_local_updatedAt";

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
      refillHistory: parsed.refillHistory || (parsed as any).refillLogs || [],
      vitals: parsed.vitals || [],
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

// Stamp the "locally modified" time. Call this ONLY on genuine user edits — never on
// initial load/hydration or when data was just pulled from the cloud — so that opening
// the app on a device never makes its (possibly older) local copy look "newer" than cloud.
export function markLocalModified(): void {
  try {
    localStorage.setItem(LOCAL_UPDATED_AT_KEY, new Date().toISOString());
  } catch (e) {
    console.error("Error marking local modified time:", e);
  }
}

export function getLocalUpdatedAt(): string | null {
  try {
    return localStorage.getItem(LOCAL_UPDATED_AT_KEY);
  } catch {
    return null;
  }
}

export const loadInitialData = loadSystemData;
export const saveData = saveSystemData;

export function clearAllSystemData(): SystemData {
  saveSystemData(initialSystemData);
  return initialSystemData;
}

// NOTE: syncToCloud/fetchFromCloud previously called /api/backup/* which doesn't work
// on GitHub Pages. Use firebase.ts saveUserDataToFirestore/loadUserDocFromFirestore instead.
export async function syncToCloud(_data: SystemData, _backupKey = "default_backup"): Promise<boolean> {
  console.warn("syncToCloud: /api/backup/* is unavailable on GitHub Pages. Use Firestore sync instead.");
  return false;
}

export async function fetchFromCloud(_backupKey = "default_backup"): Promise<SystemData | null> {
  console.warn("fetchFromCloud: /api/backup/* is unavailable on GitHub Pages. Use Firestore sync instead.");
  return null;
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

// End of storage utilities
