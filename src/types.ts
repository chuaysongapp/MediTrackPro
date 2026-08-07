export type MealTime = "morning" | "noon" | "evening" | "bedtime";
export type FoodRelation = "before_meal" | "after_meal" | "with_meal" | "anytime";

export interface Medicine {
  id: string;
  profileId: string;
  name: string; // ชื่อยา เช่น Amlodipine 5mg
  genericName?: string; // ชื่อสามัญทางยา
  purpose: string; // สรรพคุณ / โรคที่รักษา เช่น ลดความดันโลหิต
  totalQuantity: number; // จำนวนทั้งหมดเดิม
  remainingQuantity: number; // จำนวนคงเหลือปัจจุบัน
  lowThreshold: number; // จำนวนเตือนใกล้หมด
  unit: string; // หน่วย เช่น เม็ด, แคปซูล, มล.
  dosagePerTime: number; // ทานครั้งละกี่หน่วย
  schedules: MealTime[]; // มื้อที่ต้องทาน
  foodRelation: FoodRelation; // ความสัมพันธ์กับอาหาร
  instructions?: string; // คำแนะนำเพิ่มเติม
  expiryDate?: string; // วันหมดอายุ YYYY-MM-DD
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeLog {
  id: string;
  profileId: string;
  medicineId: string;
  medicineName: string;
  date: string; // YYYY-MM-DD
  meal: MealTime;
  dosage: number;
  unit: string;
  status: "taken" | "skipped" | "pending";
  timestamp?: string; // เวลาที่ทานจริง HH:mm
  note?: string;
}

export interface RefillTransaction {
  id: string;
  profileId: string;
  medicineId: string;
  medicineName: string;
  addedQuantity: number;
  unit: string;
  cost?: number;
  source?: string; // สถานที่รับยา เช่น รพ.จุฬาฯ, ร้านยาแถวบ้าน
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface HealthVital {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD HH:mm
  systolicBP?: number; // ความดันตัวบน mmHg
  diastolicBP?: number; // ความดันตัวล่าง mmHg
  heartRate?: number; // ชีพจร bpm
  bloodSugar?: number; // ค่าน้ำตาล mg/dL
  sugarType?: "fasting" | "after_meal" | "random";
  weight?: number; // น้ำหนัก kg
  height?: number; // ส่วนสูง cm
  note?: string;
}

export interface DoctorAppointment {
  id: string;
  profileId: string;
  doctorName: string;
  hospital: string;
  department?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  purpose: string; // เหตุผลในการนัด
  preparationNotes?: string; // การเตรียมตัว เช่น งดน้ำงดอาหาร
  status: "upcoming" | "completed" | "cancelled";
}

export interface MedicalRecord {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD
  title: string; // เช่น ผลตรวจเลือดประจำปี
  hospital: string;
  diagnosis?: string; // คำวินิจฉัย
  doctorNotes?: string; // บันทึกของแพทย์
  labResults?: {
    fbs?: number; // Fasting Blood Sugar
    hba1c?: number; // %
    cholesterol?: number; // mg/dL
    triglyceride?: number;
    hdl?: number;
    ldl?: number;
    creatinine?: number;
  };
  attachments?: string[];
}

export interface UserProfile {
  id: string;
  name: string; // เช่น คุณพ่อสมชาย
  relationship: string; // เช่น บิดา, มารดา, ตัวฉันเอง
  age: number;
  gender: "male" | "female" | "other";
  bloodType?: string;
  chronicDiseases?: string[]; // โรคประจำตัว เช่น เบาหวาน, ความดัน
  drugAllergies?: string[]; // ประวัติแพ้ยา
  pinCode?: string; // รหัสผ่านความปลอดภัย 4 หลัก
  avatarUrl?: string;
  isDefault?: boolean;
}

export interface LineConfig {
  enabled: boolean;
  mode: "messaging_api" | "line_notify";
  channelAccessToken: string;
  userId: string; // User ID หรือ Group ID
  lineNotifyToken?: string;
  notifyOnLowStock: boolean;
  notifyOnDoseTime: boolean;
  notifyOnVitalWarning: boolean;
  dailySummaryTime: string; // e.g. "08:00"
}

export interface SystemData {
  profiles: UserProfile[];
  activeProfileId: string;
  medicines: Medicine[];
  intakeLogs: IntakeLog[];
  refillHistory: RefillTransaction[];
  vitals: HealthVital[];
  appointments: DoctorAppointment[];
  medicalRecords: MedicalRecord[];
  lineConfig: LineConfig;
  lastCloudBackup?: string;
}
