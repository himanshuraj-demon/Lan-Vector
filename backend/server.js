import cors from "cors";
import express from "express";
import fs from "fs";
import multer from "multer";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import "dotenv/config";

const app = express();

// multer instance – used for both routes
const upload = multer({ dest: "uploads/" });

const port = Number(process.env.PORT) || 3000;

app.use(cors());
// express.json() handles application/json bodies.
// For multipart/form-data (React Native default), multer handles parsing instead.
app.use(express.json());

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// VOICE -> TRANSCRIBE -> TRANSLATE -> TTS
// ─────────────────────────────────────────────────────────────────────────────
app.post("/translate", upload.single("audio"), async (req, res) => {
  let inputPath;
  let outputPath;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    inputPath = req.file.path;
    outputPath = inputPath + ".wav";

    // STEP 1: Convert to WAV
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("pcm_s16le")
        .audioChannels(1)
        .audioFrequency(16000)
        .format("wav")
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // STEP 2: Transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(outputPath),
      model: "gpt-4o-transcribe",
    });

    const text = transcription.text;

    // STEP 3: Translate
    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Translate the following text into ${req.body.language}. 
Return ONLY the translated sentence. 
Do NOT add explanations, prefixes, or extra text.

Text: ${text}`,
        },
      ],
    });

    const translatedText = chatRes.choices[0].message.content ?? "";

    // STEP 4: TTS
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: translatedText,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    res.json({
      text,
      translatedText,
      audioBase64: audioBuffer.toString("base64"),
    });
  } catch (err) {
    console.error("ERROR /translate:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEXT -> TRANSLATE -> TTS
//
// Root cause of the bug:
//   React Native's fetch() with a FormData body sends Content-Type: multipart/form-data.
//   express.json() only parses application/json, so req.body stays undefined.
//
// Fix:
//   Use upload.none() — multer parses multipart/form-data text fields (no file needed).
//   This populates req.body correctly for both FormData and JSON requests.
// ─────────────────────────────────────────────────────────────────────────────
app.post("/translate-text", upload.none(), async (req, res) => {
  try {
    const text = req.body?.text;
    const language = req.body?.language;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "text is required" });
    }
    if (!language || typeof language !== "string") {
      return res.status(400).json({ error: "language is required" });
    }

    // STEP 1: Translate
    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Translate the following text into ${language}. 
Return ONLY the translated sentence. 
Do NOT add explanations, prefixes, or extra text.

Text: ${text.trim()}`,
        },
      ],
    });

    const translatedText = chatRes.choices[0].message.content ?? "";

    // STEP 2: TTS
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: translatedText,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    res.json({
      translatedText,
      audioBase64: audioBuffer.toString("base64"),
    });
  } catch (err) {
    console.error("ERROR /translate-text:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});