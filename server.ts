import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // In-memory cloud backup store for multi-profile sync
  const cloudStorageMemory: Record<string, any> = {};

  // Initialize Gemini AI SDK securely on server side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API: LINE Messaging & Line Notify Handler
  app.post("/api/line/notify", async (req, res) => {
    try {
      const { token, userId, message, mode } = req.body;

      if (!message) {
        return res.status(400).json({ success: false, error: "กรุณาระบุข้อความที่ต้องการส่ง" });
      }

      // If user provides a token, make real API call
      if (token && token.trim().length > 10) {
        if (mode === "line_notify") {
          // LINE Notify API
          const response = await fetch("https://notify-api.line.me/api/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Bearer ${token.trim()}`,
            },
            body: new URLSearchParams({ message }),
          });
          const data = await response.json();
          return res.json({ success: response.ok, data, mode: "line_notify" });
        } else {
          // LINE Messaging API Push Message
          const target = userId && userId.trim() ? userId.trim() : "";
          if (!target) {
            return res.status(400).json({
              success: false,
              error: "สำหรับ LINE Messaging API ต้องระบุ User ID / Group ID ผู้รับด้วย",
            });
          }

          const response = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token.trim()}`,
            },
            body: JSON.stringify({
              to: target,
              messages: [{ type: "text", text: message }],
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            return res.status(response.status).json({ success: false, error: data.message || "LINE API Error", data });
          }
          return res.json({ success: true, data, mode: "messaging_api" });
        }
      } else {
        // Simulation Mode when Token not configured yet
        console.log("LINE Notification Simulation:", message);
        return res.json({
          success: true,
          simulated: true,
          mode: mode || "messaging_api",
          message: "ส่งข้อความสำเร็จ (จำลองการส่ง - กรุณาใส่ Token ในการตั้งค่าเพื่อส่งไปยัง LINE จริง)",
          sentContent: message,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error("LINE Notify Error:", err);
      return res.status(500).json({ success: false, error: err.message || "เกิดข้อผิดพลาดในการส่ง LINE" });
    }
  });

  // API: Gemini AI Health Advisor & Monthly Summary
  app.post("/api/ai/health-advice", async (req, res) => {
    try {
      const { profileName, age, medicines, vitals, adherenceRate, monthlyLogs } = req.body;

      const systemInstruction = `คุณคือผู้เชี่ยวชาญด้านเภสัชกรรมและสุขภาพดิจิทัลระบบคลังยาประจำบ้าน ให้คำแนะนำและวิเคราะห์สรุปผลสุขภาพรายเดือนสำหรับผู้ใช้ชาวไทยอย่างอบอุ่น ชัดเจน เข้าใจง่าย และถูกต้องตามหลักการแพทย์พื้นฐาน
      กฎสำคัญ:
      1. ตอบเป็นภาษาไทยอย่างสุภาพ มีความเป็นมิตรและให้กำลังใจ
      2. สรุปความเสี่ยงสุขภาพเรียลไทม์ (ถ้าความดัน >140/90 หรือ ค่าน้ำตาล >126 mg/dL ให้เตือนสุภาพ)
      3. วิเคราะห์ความสม่ำเสมอในการทานยา (Adherence Rate %) และรายการยาที่ใกล้หมด
      4. ให้ข้อแนะนำการปฏิบัติตัว 3-4 ข้อสั้นๆ กระชับ
      5. เน้นย้ำเสมอว่าคำแนะนำนี้เป็นระบบช่วยเตือนและวิเคราะห์เบื้องต้น ไม่ทดแทนคำวินิจฉัยของแพทย์ประจำตัว`;

      const prompt = `ข้อมูลสุขภาพผู้ใช้:
- ชื่อโปรไฟล์: ${profileName || "ผู้ใช้งาน"} (อายุ: ${age || "-"} ปี)
- ความสม่ำเสมอในการทานยาเดือนนี้: ${adherenceRate || 0}%
- รายการยาคงเหลือในคลัง:
${(medicines || []).map((m: any) => `  * ${m.name} (คงเหลือ ${m.remainingQuantity} ${m.unit} / เตือนเมื่อต่ำกว่า ${m.lowThreshold} ${m.unit})`).join("\n") || "ไม่มีข้อมูลยา"}

- ค่าสัญญาณชีพและผลตรวจล่าสุด:
  * ความดันโลหิต: ${vitals?.latestBP || "ยังไม่บันทึก"} mmHg
  * ค่าน้ำตาลปลายนิ้ว: ${vitals?.latestSugar || "ยังไม่บันทึก"} mg/dL
  * น้ำหนักล่าสุด: ${vitals?.latestWeight || "ยังไม่บันทึก"} kg (BMI: ${vitals?.bmi || "-"})

โปรดสรุปผลสุขภาพรายเดือน วิเคราะห์สถานะคลังยาและสัญญาณชีพ พร้อมให้คำแนะนำและข้อควรระวังครับ`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({
        success: true,
        advice: response.text || "ไม่สามารถสร้างคำแนะนำได้ในขณะนี้",
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("AI Health Advice Error:", err);
      return res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการประมวลผล AI: " + (err.message || "Unknown error"),
      });
    }
  });

  // API: Cloud Data Backup & Restore
  app.post("/api/backup/save", (req, res) => {
    try {
      const { backupKey, payload } = req.body;
      if (!backupKey || !payload) {
        return res.status(400).json({ success: false, error: "ข้อมูลไม่ครบถ้วน" });
      }
      cloudStorageMemory[backupKey] = {
        data: payload,
        updatedAt: new Date().toISOString(),
      };
      return res.json({
        success: true,
        message: "สำรองข้อมูลบนคลาวด์เรียบร้อยแล้ว",
        updatedAt: cloudStorageMemory[backupKey].updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/backup/load/:key", (req, res) => {
    try {
      const key = req.params.key;
      const record = cloudStorageMemory[key];
      if (!record) {
        return res.status(404).json({ success: false, error: "ไม่พบสำรองข้อมูลสำหรับรหัสนี้" });
      }
      return res.json({ success: true, payload: record.data, updatedAt: record.updatedAt });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
