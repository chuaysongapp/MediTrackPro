import { SystemData } from "../types";

export const initialSystemData: SystemData = {
  activeProfileId: "prof_default",
  profiles: [
    {
      id: "prof_default",
      name: "ผู้ใช้งานหลัก",
      relationship: "ตนเอง",
      age: 35,
      gender: "male",
      bloodType: "O+",
      chronicDiseases: [],
      drugAllergies: [],
      pinCode: "",
      avatarUrl: "",
      isDefault: true,
    },
  ],
  medicines: [],
  intakeLogs: [],
  refillHistory: [],
  vitals: [],
  appointments: [],
  medicalRecords: [],
  lineConfig: {
    enabled: false,
    mode: "messaging_api",
    channelAccessToken: "",
    userId: "",
    lineNotifyToken: "",
    notifyOnLowStock: true,
    notifyOnDoseTime: true,
    notifyOnVitalWarning: true,
    dailySummaryTime: "08:00",
  },
  lastCloudBackup: new Date().toISOString(),
};
