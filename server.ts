import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

      let responseText = "";
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      
      for (const modelName of modelsToTry) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          responseText = res.text || "";
          if (responseText) break;
        } catch (mErr) {
          console.warn(`Model ${modelName} failed for advice, trying next...`, mErr);
        }
      }

      return res.json({
        success: true,
        advice: responseText || "ไม่สามารถสร้างคำแนะนำได้ในขณะนี้",
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

  // API: AI Parse Lab Report PDF & Medical Records
  app.post("/api/ai/parse-lab-report", async (req, res) => {
    try {
      const { fileData, fileType, fileName, textContent } = req.body;

      const systemInstruction = `คุณคือระบบปัญญาประดิษฐ์ทางการแพทย์ที่ชำนาญการอ่านเอกสารผลตรวจเลือด (Lab Report), ผลตรวจสุขภาพประจำปี และใบบันทึกการรักษา
หน้าที่ของคุณคืออ่านข้อมูลจากเอกสาร PDF หรือรูปถ่ายผลแล็บ และสกัดค่าทางการแพทย์ออกมาให้ถูกต้องตรงตามเอกสาร 100%

กฎการสกัดข้อมูล:
1. ดึงชื่อโรงพยาบาล/คลินิก, วันที่ตรวจ (รูปแบบ YYYY-MM-DD), ชื่อคนไข้, คำวินิจฉัยแพทย์, คำแนะนำแพทย์
2. ดึงค่าตัวเลขทางการแพทย์อย่างแม่นยำ:
   - fbs: Fasting Blood Sugar (mg/dL)
   - hba1c: Glycated Hemoglobin (%)
   - cholesterol: Total Cholesterol (mg/dL)
   - triglyceride: Triglycerides (mg/dL)
   - hdl: High Density Lipoprotein (mg/dL)
   - ldl: Low Density Lipoprotein (mg/dL)
   - creatinine: Blood Creatinine (mg/dL)
   - bun: Blood Urea Nitrogen (mg/dL)
   - egfr: estimated GFR (mL/min/1.73m2)
   - sgot: AST (U/L)
   - sgpt: ALT (U/L)
   - uricAcid: Uric Acid (mg/dL)
   - hemoglobin: Hb (g/dL)
   - wbc: White Blood Cells (x10^3/uL)
   - platelet: Platelet Count (x10^3/uL)
3. สำหรับรายการตรวจวัดอื่นๆ ที่มีในเอกสาร ให้ใส่ในอาร์เรย์ customItems โดยระบุ testName, resultValue, unit, refRange, flag ("normal"|"high"|"low"|"abnormal")
4. ตอบกลับเฉพาะโครงสร้าง JSON ที่ถูกต้องสมบูรณ์ ห้ามมีข้อความอื่นนอกเหนือจาก JSON`;

      const promptText = `กรุณาอ่านเอกสารผลตรวจแล็บ/ผลตรวจเลือดนี้ และสกัดข้อมูลออกมาเป็น JSON ในรูปแบบนี้:
{
  "hospital": "ชื่อโรงพยาบาลหรือคลินิก",
  "date": "YYYY-MM-DD",
  "patientName": "ชื่อผู้ป่วย",
  "title": "หัวข้อเอกสาร เช่น ผลตรวจเลือดประจำปี 2026",
  "diagnosis": "คำวินิจฉัยสรุป",
  "doctorNotes": "คำแนะนำแพทย์",
  "labResults": {
    "fbs": 105,
    "hba1c": 6.2,
    "cholesterol": 198,
    "triglyceride": 140,
    "hdl": 52,
    "ldl": 118,
    "creatinine": 0.9,
    "bun": 12,
    "egfr": 95,
    "sgot": 24,
    "sgpt": 28,
    "uricAcid": 5.4,
    "hemoglobin": 14.2,
    "wbc": 6.5,
    "platelet": 250,
    "customItems": [
      { "testName": "Microalbumin/Cr Ratio", "resultValue": "15.2", "unit": "mg/g", "refRange": "<30", "flag": "normal" }
    ]
  }
}
ชื่อไฟล์: ${fileName || "document.pdf"}`;

      let contents: any[] = [];
      if (fileData && fileData.includes("base64,")) {
        const base64Clean = fileData.split("base64,")[1];
        const mime = fileType || (fileData.includes("data:application/pdf") ? "application/pdf" : "image/jpeg");
        contents = [
          {
            inlineData: {
              mimeType: mime,
              data: base64Clean,
            },
          },
          { text: promptText },
        ];
      } else if (textContent) {
        contents = [{ text: `${promptText}\n\nข้อความสกัดจากเอกสาร:\n${textContent}` }];
      } else {
        return res.status(400).json({ success: false, error: "กรุณาส่งไฟล์ PDF หรือข้อความในเอกสาร" });
      }

      let rawText = "";
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          });
          rawText = response.text || "";
          if (rawText) break;
        } catch (mErr) {
          console.warn(`Model ${modelName} failed for lab report parsing, trying next...`, mErr);
        }
      }

      if (!rawText) {
        // Fallback without responseMimeType if json mode failed on older model
        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                temperature: 0.1,
              },
            });
            rawText = response.text || "";
            if (rawText) break;
          } catch (mErr) {
            console.warn(`Model ${modelName} standard mode failed...`, mErr);
          }
        }
      }

      const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(cleanJson);
      } catch (e) {
        parsedData = {
          title: `ผลตรวจจากไฟล์ ${fileName || "PDF"}`,
          hospital: "โรงพยาบาล/คลินิกในเอกสาร",
          date: new Date().toISOString().split("T")[0],
          doctorNotes: rawText,
        };
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error("Parse Lab Report Error:", err);
      return res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการวิเคราะห์เอกสาร PDF: " + (err.message || "Unknown error"),
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
