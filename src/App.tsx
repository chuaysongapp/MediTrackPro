import React, { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { SystemData, UserProfile, Medicine, MealTime, FoodRelation, HealthVital, DoctorAppointment, LineConfig } from "./types";
import { loadInitialData, saveData, syncToCloud, fetchFromCloud, clearAllSystemData } from "./utils/storage";
import {
  auth,
  loginWithGoogle,
  loginAsGuest,
  logoutUser,
  loadUserDataFromFirestore,
  saveUserDataToFirestore,
} from "./lib/firebase";
import { CloudSyncBanner } from "./components/CloudSyncBanner";
import { HeaderNavbar, UITheme } from "./components/HeaderNavbar";
import { NavigationTabs } from "./components/NavigationTabs";
import { DashboardView } from "./components/DashboardView";
import { InventoryView } from "./components/InventoryView";
import { IntakeLogView } from "./components/IntakeLogView";
import { AnalyticsView } from "./components/AnalyticsView";
import { MedicalRecordsView } from "./components/MedicalRecordsView";
import { LineAndSettingsView } from "./components/LineAndSettingsView";
import { PinLockModal } from "./components/PinLockModal";
import { RefillModal } from "./components/RefillModal";
import { AddEditMedicineModal } from "./components/AddEditMedicineModal";
import { AddVitalsModal } from "./components/AddVitalsModal";
import { AddAppointmentModal } from "./components/AddAppointmentModal";
import { AddProfileModal } from "./components/AddProfileModal";
import { DoctorReportModal } from "./components/DoctorReportModal";

export default function App() {
  const [data, setData] = useState<SystemData>(() => loadInitialData());
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [theme, setTheme] = useState<UITheme>(() => {
    return (localStorage.getItem("meditrack_theme") as UITheme) || "high-density";
  });

  // Firebase Auth & Cloud Sync States
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isCloudSaving, setIsCloudSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const handleThemeChange = (newTheme: UITheme) => {
    setTheme(newTheme);
    localStorage.setItem("meditrack_theme", newTheme);
  };

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsCloudSaving(true);
        const cloudData = await loadUserDataFromFirestore(user.uid);
        if (cloudData && cloudData.profiles && cloudData.profiles.length > 0) {
          setData(cloudData);
          setLastSavedAt(new Date().toLocaleTimeString("th-TH"));
        } else {
          // Push local data to new cloud account on first sign in
          await saveUserDataToFirestore(user.uid, data, {
            email: user.email,
            displayName: user.displayName,
          });
          setLastSavedAt(new Date().toLocaleTimeString("th-TH"));
        }
        setIsCloudSaving(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync to Firestore & Local Storage on data change
  useEffect(() => {
    saveData(data); // LocalStorage backup

    if (!firebaseUser) return;

    const timer = setTimeout(async () => {
      setIsCloudSaving(true);
      const success = await saveUserDataToFirestore(firebaseUser.uid, data, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      });
      if (success) {
        setLastSavedAt(new Date().toLocaleTimeString("th-TH"));
      }
      setIsCloudSaving(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [data, firebaseUser]);

  const handleLoginGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      alert("ไม่สามารถเข้าสู่ระบบด้วย Google ได้: " + (err.message || "เกิดข้อผิดพลาด"));
    }
  };

  const handleLoginGuest = async () => {
    try {
      await loginAsGuest();
    } catch (err: any) {
      alert("ไม่สามารถเข้าสู่ระบบ Guest ได้: " + (err.message || "เกิดข้อผิดพลาด"));
    }
  };

  const handleLogoutCloud = async () => {
    try {
      await logoutUser();
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  const handleResetAllData = async () => {
    const cleanData = clearAllSystemData();
    setData(cleanData);
    if (firebaseUser) {
      setIsCloudSaving(true);
      await saveUserDataToFirestore(firebaseUser.uid, cleanData, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      });
      setIsCloudSaving(false);
      setLastSavedAt(new Date().toLocaleTimeString("th-TH"));
    }
  };

  // Clean mock data if existing mock profiles are detected
  useEffect(() => {
    if (data.profiles.some((p) => p.id === "prof_father" || p.name.includes("สมชาย"))) {
      handleResetAllData();
    }
  }, []);

  // Security & Pin Switch Modal
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null);

  // Action Modals State
  const [refillMed, setRefillMed] = useState<Medicine | null>(null);
  const [editMed, setEditMed] = useState<Medicine | null>(null);
  const [showAddMedModal, setShowAddMedModal] = useState<boolean>(false);
  const [showAddVitalsModal, setShowAddVitalsModal] = useState<boolean>(false);
  const [showAddApptModal, setShowAddApptModal] = useState<boolean>(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState<boolean>(false);
  const [showDoctorReportModal, setShowDoctorReportModal] = useState<boolean>(false);

  // Sync to local storage on data change
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Network Online/Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const activeProfile =
    data.profiles.find((p) => p.id === data.activeProfileId) || data.profiles[0];

  // Select profile handler with PIN check
  const handleSelectProfile = (profile: UserProfile) => {
    if (profile.id === activeProfile.id) return;

    if (profile.pinCode && profile.pinCode.length > 0) {
      setPendingProfile(profile);
    } else {
      setData((prev) => ({ ...prev, activeProfileId: profile.id }));
    }
  };

  const handleConfirmPinSuccess = () => {
    if (pendingProfile) {
      setData((prev) => ({ ...prev, activeProfileId: pendingProfile.id }));
      setPendingProfile(null);
    }
  };

  // Toggle Medication Intake (taken vs skipped)
  const handleToggleIntake = (medicineId: string, meal: MealTime, status: "taken" | "skipped") => {
    const todayStr = new Date().toISOString().split("T")[0];
    const nowTimeStr = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

    setData((prev) => {
      const existingIndex = prev.intakeLogs.findIndex(
        (l) => l.profileId === activeProfile.id && l.medicineId === medicineId && l.date === todayStr && l.meal === meal
      );

      let updatedLogs = [...prev.intakeLogs];
      let updatedMeds = [...prev.medicines];

      const med = updatedMeds.find((m) => m.id === medicineId);

      if (existingIndex >= 0) {
        const oldLog = updatedLogs[existingIndex];
        // If clicking same status, remove log and revert stock
        if (oldLog.status === status) {
          updatedLogs.splice(existingIndex, 1);
          if (oldLog.status === "taken" && med) {
            med.remainingQuantity += oldLog.dosage;
          }
        } else {
          // Status changed
          if (oldLog.status === "taken" && status === "skipped" && med) {
            med.remainingQuantity += oldLog.dosage;
          } else if (oldLog.status === "skipped" && status === "taken" && med) {
            med.remainingQuantity = Math.max(0, med.remainingQuantity - oldLog.dosage);
          }
          updatedLogs[existingIndex] = {
            ...oldLog,
            status,
            timestamp: nowTimeStr,
          };
        }
      } else {
        // Create new intake log
        const dosage = med ? med.dosagePerTime : 1;
        updatedLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          profileId: activeProfile.id,
          medicineId,
          date: todayStr,
          meal,
          status,
          timestamp: nowTimeStr,
          dosage,
        });

        // If taken, reduce stock
        if (status === "taken" && med) {
          med.remainingQuantity = Math.max(0, med.remainingQuantity - dosage);
        }
      }

      return {
        ...prev,
        intakeLogs: updatedLogs,
        medicines: updatedMeds,
      };
    });
  };

  // Refill Medication Stock
  const handleConfirmRefill = (
    medicineId: string,
    addQty: number,
    cost?: number,
    source?: string,
    note?: string
  ) => {
    const todayStr = new Date().toISOString().split("T")[0];

    setData((prev) => {
      const updatedMeds = prev.medicines.map((m) => {
        if (m.id === medicineId) {
          return {
            ...m,
            remainingQuantity: m.remainingQuantity + addQty,
            totalQuantity: (m.totalQuantity || 60) + addQty,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      });

      const updatedRefills = [
        ...prev.refillLogs,
        {
          id: `refill_${Date.now()}`,
          profileId: activeProfile.id,
          medicineId,
          date: todayStr,
          addedQuantity: addQty,
          cost,
          source,
          note,
        },
      ];

      return {
        ...prev,
        medicines: updatedMeds,
        refillLogs: updatedRefills,
      };
    });

    setRefillMed(null);
  };

  // Add / Edit Medicine
  const handleSaveMedicine = (medData: Omit<Medicine, "id" | "createdAt" | "updatedAt">) => {
    const nowIso = new Date().toISOString();

    setData((prev) => {
      if (editMed) {
        const updatedMeds = prev.medicines.map((m) =>
          m.id === editMed.id ? { ...medData, id: editMed.id, createdAt: editMed.createdAt, updatedAt: nowIso } : m
        );
        return { ...prev, medicines: updatedMeds };
      } else {
        const newMed: Medicine = {
          ...medData,
          id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        return { ...prev, medicines: [...prev.medicines, newMed] };
      }
    });

    setEditMed(null);
    setShowAddMedModal(false);
  };

  const handleDeleteMedicine = (medId: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการยานี้ออกจากระบบ?")) {
      setData((prev) => ({
        ...prev,
        medicines: prev.medicines.filter((m) => m.id !== medId),
      }));
    }
  };

  // Add Health Vital Reading
  const handleSaveVitals = (vitalData: Omit<HealthVital, "id">) => {
    const newVital: HealthVital = {
      ...vitalData,
      id: `vital_${Date.now()}`,
    };

    setData((prev) => ({
      ...prev,
      vitals: [newVital, ...prev.vitals],
    }));

    setShowAddVitalsModal(false);
  };

  // Add Doctor Appointment
  const handleSaveAppointment = (apptData: Omit<DoctorAppointment, "id">) => {
    const newAppt: DoctorAppointment = {
      ...apptData,
      id: `appt_${Date.now()}`,
    };

    setData((prev) => ({
      ...prev,
      appointments: [newAppt, ...prev.appointments],
    }));

    setShowAddApptModal(false);
  };

  const handleToggleApptStatus = (apptId: string) => {
    setData((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) =>
        a.id === apptId ? { ...a, status: a.status === "upcoming" ? "completed" : "upcoming" } : a
      ),
    }));
  };

  // Add Family Profile
  const handleSaveProfile = (profData: Omit<UserProfile, "id">) => {
    const newProf: UserProfile = {
      ...profData,
      id: `prof_${Date.now()}`,
    };

    setData((prev) => ({
      ...prev,
      profiles: [...prev.profiles, newProf],
      activeProfileId: newProf.id,
    }));

    setShowAddProfileModal(false);
  };

  // Save LINE Config
  const handleSaveLineConfig = (config: LineConfig) => {
    setData((prev) => ({ ...prev, lineConfig: config }));
  };

  // Dispatch Test Message to LINE via Server Endpoint
  const handleSendTestLineMessage = async (message: string) => {
    try {
      const res = await fetch("/api/line/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.lineConfig.notifyToken,
          userId: data.lineConfig.messagingUserId,
          mode: data.lineConfig.mode,
          message,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert("ส่งข้อความแจ้งเตือนเข้า LINE สำเร็จเรียบร้อย!");
      } else {
        alert("ไม่สามารถส่ง LINE ได้: " + (result.error || "โปรดตรวจสอบ Token"));
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ LINE: " + e.message);
    }
  };

  // Cloud Backup Upload & Restore
  const handleCloudBackup = async () => {
    await syncToCloud(data);
  };

  const handleCloudRestore = async () => {
    const restored = await fetchFromCloud();
    if (restored) {
      setData(restored);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `med_tracker_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  // Import JSON
  const handleImportJson = (jsonDataStr: string) => {
    try {
      const parsed = JSON.parse(jsonDataStr);
      if (parsed.profiles && parsed.medicines) {
        setData(parsed);
        alert("นำเข้าข้อมูลสำรองสำเร็จเรียบร้อย!");
      } else {
        alert("รูปแบบไฟล์ข้อมูลไม่ถูกต้อง");
      }
    } catch (e) {
      alert("ไม่สามารถอ่านไฟล์ JSON ได้");
    }
  };

  const lowStockCount = data.medicines.filter(
    (m) => m.profileId === activeProfile.id && m.remainingQuantity <= m.lowThreshold
  ).length;

  const upcomingApptCount = data.appointments.filter(
    (a) => a.profileId === activeProfile.id && a.status === "upcoming"
  ).length;

  const getThemeWrapperClass = () => {
    switch (theme) {
      case "warm-care":
        return "min-h-screen bg-amber-50/70 text-slate-800 font-sans antialiased selection:bg-amber-500 selection:text-white";
      case "modern-emerald":
        return "min-h-screen bg-emerald-50/40 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white";
      case "dark-obsidian":
        return "min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950";
      case "high-density":
      default:
        return "min-h-screen bg-slate-100 text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white";
    }
  };

  return (
    <div className={getThemeWrapperClass()}>
      {/* Firebase Cloud Sync Top Banner */}
      <CloudSyncBanner
        user={firebaseUser}
        isSaving={isCloudSaving}
        lastSavedAt={lastSavedAt}
        isOnline={isOnline}
        onLoginGoogle={handleLoginGoogle}
        onLoginGuest={handleLoginGuest}
        onLogout={handleLogoutCloud}
        onResetAllData={handleResetAllData}
      />

      {/* Top Header Navbar */}
      <HeaderNavbar
        profiles={data.profiles}
        activeProfile={activeProfile}
        medicines={data.medicines}
        isOnline={isOnline}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        onOpenDoctorReport={() => setShowDoctorReportModal(true)}
        onSelectProfile={handleSelectProfile}
        onOpenAddProfile={() => setShowAddProfileModal(true)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Navigation Tabs Bar */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        lowStockCount={lowStockCount}
        upcomingApptCount={upcomingApptCount}
      />

      {/* Main Content View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === "dashboard" && (
          <DashboardView
            activeProfile={activeProfile}
            medicines={data.medicines}
            intakeLogs={data.intakeLogs}
            vitals={data.vitals}
            appointments={data.appointments}
            lineConfig={data.lineConfig}
            onToggleIntake={handleToggleIntake}
            onOpenAddVitals={() => setShowAddVitalsModal(true)}
            onOpenRefill={(med) => setRefillMed(med)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSendLineNotify={handleSendTestLineMessage}
            onOpenDoctorReport={() => setShowDoctorReportModal(true)}
          />
        )}

        {activeTab === "inventory" && (
          <InventoryView
            activeProfile={activeProfile}
            medicines={data.medicines}
            onOpenAddMedicine={() => {
              setEditMed(null);
              setShowAddMedModal(true);
            }}
            onOpenEditMedicine={(med) => {
              setEditMed(med);
              setShowAddMedModal(true);
            }}
            onOpenRefill={(med) => setRefillMed(med)}
            onDeleteMedicine={handleDeleteMedicine}
          />
        )}

        {activeTab === "intake" && (
          <IntakeLogView
            activeProfile={activeProfile}
            medicines={data.medicines}
            intakeLogs={data.intakeLogs}
            onToggleIntake={handleToggleIntake}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsView
            activeProfile={activeProfile}
            medicines={data.medicines}
            vitals={data.vitals}
            intakeLogs={data.intakeLogs}
            onOpenDoctorReport={() => setShowDoctorReportModal(true)}
          />
        )}

        {activeTab === "records" && (
          <MedicalRecordsView
            activeProfile={activeProfile}
            appointments={data.appointments}
            medicalRecords={data.medicalRecords}
            onOpenAddAppointment={() => setShowAddApptModal(true)}
            onToggleApptStatus={handleToggleApptStatus}
          />
        )}

        {activeTab === "settings" && (
          <LineAndSettingsView
            profiles={data.profiles}
            activeProfile={activeProfile}
            lineConfig={data.lineConfig}
            currentTheme={theme}
            onThemeChange={handleThemeChange}
            onSaveLineConfig={handleSaveLineConfig}
            onSendTestLineMessage={handleSendTestLineMessage}
            onCloudBackup={handleCloudBackup}
            onCloudRestore={handleCloudRestore}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onOpenAddProfile={() => setShowAddProfileModal(true)}
          />
        )}
      </main>

      {/* PIN Security Modal for Profile Switch */}
      {pendingProfile && (
        <PinLockModal
          profile={pendingProfile}
          onClose={() => setPendingProfile(null)}
          onSuccess={handleConfirmPinSuccess}
        />
      )}

      {/* Refill Stock Modal */}
      {refillMed && (
        <RefillModal
          medicine={refillMed}
          onClose={() => setRefillMed(null)}
          onConfirm={handleConfirmRefill}
        />
      )}

      {/* Add / Edit Medicine Modal */}
      {showAddMedModal && (
        <AddEditMedicineModal
          profileId={activeProfile.id}
          medicineToEdit={editMed}
          onClose={() => {
            setEditMed(null);
            setShowAddMedModal(false);
          }}
          onSave={handleSaveMedicine}
        />
      )}

      {/* Add Vitals Modal */}
      {showAddVitalsModal && (
        <AddVitalsModal
          profileId={activeProfile.id}
          onClose={() => setShowAddVitalsModal(false)}
          onSave={handleSaveVitals}
        />
      )}

      {/* Add Appointment Modal */}
      {showAddApptModal && (
        <AddAppointmentModal
          profileId={activeProfile.id}
          onClose={() => setShowAddApptModal(false)}
          onSave={handleSaveAppointment}
        />
      )}

      {/* Add Profile Modal */}
      {showAddProfileModal && (
        <AddProfileModal
          onClose={() => setShowAddProfileModal(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* Doctor Report Modal */}
      {showDoctorReportModal && (
        <DoctorReportModal
          activeProfile={activeProfile}
          vitals={data.vitals}
          medicines={data.medicines}
          intakeLogs={data.intakeLogs}
          onClose={() => setShowDoctorReportModal(false)}
        />
      )}

      {/* High Density Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 px-6 py-2 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-1 shrink-0 mt-8">
        <div className="flex gap-4">
          <span>ฐานข้อมูล: เข้ารหัส 256-bit AES LocalStorage</span>
          <span className="hidden sm:inline">•</span>
          <span>คลาวด์ซิงค์: LINE API & Cloud Backup</span>
        </div>
        <div>MediTrack Pro v2.4.1 (High Density Theme) • ภาษาไทยสมบูรณ์</div>
      </footer>
    </div>
  );
}
