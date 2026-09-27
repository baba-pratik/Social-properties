import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";

dotenv.config();

const app = express();
const PORT = 3000;

// Helmet security headers (CSP report-only for now)
app.use(
  helmet({
    contentSecurityPolicy: false, // we will set report-only manually
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === "production",
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
  })
);

// Additional CSP report-only header (covers Supabase, Vite, data/blob URLs)
app.use((_req, res, next) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.setHeader("Content-Security-Policy-Report-Only", csp);
  next();
});

// Supabase server client for auth verification
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
let supabaseServer: ReturnType<typeof createClient> | null = null;
function getSupabaseServer() {
  if (!supabaseServer && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseServer;
}

// Simple in-memory rate limiter (per IP)
const uploadRateMap = new Map<string, number[]>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxReq = 10;
  const arr = uploadRateMap.get(ip) || [];
  const recent = arr.filter(t => now - t < windowMs);
  if (recent.length >= maxReq) return false;
  recent.push(now);
  uploadRateMap.set(ip, recent);
  return true;
}

// Rate limiting for upload endpoints (per IP)
function uploadRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many upload requests, please slow down" });
  }
  next();
}

app.use("/api/upload", uploadRateLimiter);
app.use("/api/upload-base64", uploadRateLimiter);

// Setup persistent local uploads directory in public/uploads
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded media files statically
app.use("/uploads", express.static(uploadsDir));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configure multer for file uploads (supports images and videos up to 100MB)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const rawExt =
      path.extname(file.originalname).replace(".", "") ||
      (file.mimetype.startsWith("video/") ? "mp4" : "jpg");
    const safeExt = /^[a-zA-Z0-9]+$/.test(rawExt) ? rawExt.toLowerCase() : "bin";
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `${uniqueSuffix}.${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max for videos & high-res images
  },
});

// Authentication middleware for upload endpoints
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  const sb = getSupabaseServer();
  if (!sb) {
    console.error("Supabase server client not configured");
    return res.status(500).json({ error: "Server misconfiguration" });
  }
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  (req as any).user = data.user;
  next();
}

// MIME and size validation
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

function validateFile(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }
  const mime = req.file.mimetype;
  const size = req.file.size;
  let maxSize = 0;
  if (ALLOWED_IMAGE_MIME.has(mime)) {
    maxSize = MAX_IMAGE_SIZE;
  } else if (ALLOWED_VIDEO_MIME.has(mime)) {
    maxSize = MAX_VIDEO_SIZE;
  } else {
    return res.status(400).json({ error: "Unsupported file type" });
  }
  if (size > maxSize) {
    return res.status(400).json({ error: "File size exceeds limit" });
  }
  next();
}

// File upload API endpoint (authenticated)
app.post("/api/upload", requireAuth, upload.single("file"), validateFile, (req, res) => {
  try {
    const file = req.file!;
    const publicUrl = `/uploads/${file.filename}`;
    res.json({
      url: publicUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    });
  } catch (error: any) {
    console.error("Upload error in /api/upload:", error);
    res.status(500).json({ error: "Failed to process upload" });
  }
});

// Base64 direct upload endpoint fallback (authenticated)
app.post("/api/upload-base64", requireAuth, async (req, res) => {
  try {
    const { dataUrl, filename } = req.body;
    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ error: "No dataUrl provided" });
    }
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid dataUrl format" });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    // Validate MIME
    if (!ALLOWED_IMAGE_MIME.has(mimeType) && !ALLOWED_VIDEO_MIME.has(mimeType)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }
    const buffer = Buffer.from(base64Data, "base64");
    const size = buffer.length;
    const maxSize = ALLOWED_IMAGE_MIME.has(mimeType) ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (size > maxSize) {
      return res.status(400).json({ error: "File size exceeds limit" });
    }
    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const safeName = filename
      ? `${uniqueSuffix}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      : `${uniqueSuffix}.${ext}`;
    const destPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(destPath, buffer);
    res.json({ url: `/uploads/${safeName}` });
  } catch (err: any) {
    console.error("upload-base64 error:", err);
    res.status(500).json({ error: "Failed to save base64 file" });
  }
});

// Lazy initialize Gemini client to avoid crashes if GEMINI_API_KEY is not yet injected
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Social Properties API",
    time: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Primary and fallback Gemini models
const GEMINI_TEXT_MODEL = "gemini-3.6-flash";
const FALLBACK_GEMINI_MODEL = "gemini-3.8-flash";

async function generateGeminiContent(options: {
  contents: any;
  config?: any;
}) {
  const ai = getGenAI();
  try {
    return await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: options.contents,
      config: options.config,
    });
  } catch (err: any) {
    if (
      err?.status === 404 ||
      err?.code === 404 ||
      err?.message?.includes("404") ||
      err?.message?.includes("not found") ||
      err?.message?.includes("no longer available")
    ) {
      console.warn(
        `Gemini model ${GEMINI_TEXT_MODEL} returned 404, falling back to ${FALLBACK_GEMINI_MODEL}`
      );
      return await ai.models.generateContent({
        model: FALLBACK_GEMINI_MODEL,
        contents: options.contents,
        config: options.config,
      });
    }
    throw err;
  }
}

// AI Description Generator for Property Uploads
app.post("/api/gemini/generate-description", async (req, res) => {
  try {
    const { title, property_type, listing_type, price, bedrooms, locality, city, key_highlights } = req.body;

    const systemInstruction = `आप "Social Properties" (सोशल प्रॉपर्टीज) के रियल एस्टेट कॉपीराइटर हैं। 
आपको झारखंड के प्रमुख शहरों विशेषकर बोकारो (Bokaro - जैसे सेक्टर 4, सिटी सेंटर, चास, सेक्टर 1 आदि) और गिरिडीह (Giridih - जैसे झंडा मैदान, टॉवर चौक, पचंबा, बरगंडा आदि) की रियल एस्टेट मार्केट की गहरी समझ है।
यूज़र द्वारा दी गई जानकारी के आधार पर एक अत्यधिक आकर्षक, पेशेवर और विश्वसनीय प्रॉपर्टी विवरण (Listing Description) लिखें।
भाषा नीति: प्राकृतिक हिंदी और सामान्य अंग्रेजी रियल एस्टेट शब्दों (जैसे 2BHK, Modular Kitchen, 24x7 Water, Parking, Balcony, Prime Location, Rent/Sale) का संतुलित और प्रभावशाली मिश्रण (Hinglish/Hindi real estate style) रखें।
संरचना:
1. मुख्य आकर्षण (Catchy Headline)
2. प्रॉपर्टी की मुख्य विशेषताएं (Bullet points / हाइलाइट्स)
3. लोकेशन व नजदीकी सुविधाएं (Connectivity & Nearby Landmarks)
4. अंतिम कॉल-टू-एक्शन (Contact/Site Visit अपील)`;

    const prompt = `कृपया निम्नलिखित प्रॉपर्टी के लिए एक पेशेवर और आकर्षक रियल एस्टेट विवरण तैयार करें:
- शीर्षक: ${title || "उल्लेखित नहीं"}
- प्रकार: ${property_type || "Flat"} (${listing_type === "rent" ? "किराए के लिए (Rent)" : "बिक्री के लिए (Sale)"})
- शहर व इलाका: ${locality || ""}, ${city || "बोकारो / गिरिडीह"}
- बेडरूम: ${bedrooms ? `${bedrooms} BHK` : "लागू नहीं"}
- कीमत: ₹${price ? Number(price).toLocaleString("en-IN") : "नेगोशिएबल"}
- यूज़र द्वारा दिए गए मुख्य बिंदु/नोट्स: ${key_highlights || "प्राइम लोकेशन, तुरंत रहने योग्य, पानी और बिजली की उत्तम सुविधा।"}`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      description: response.text || "",
    });
  } catch (error: any) {
    console.error("Gemini description generation error:", error);
    let errorMessage = "विवरण जनरेट करने में त्रुटि हुई। कृपया बाद में प्रयास करें।";
    
    if (error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("high demand")) {
      errorMessage = "AI सर्वर अभी व्यस्त है। कृपया कुछ सेकंड बाद फिर से प्रयास करें। (Server is busy, try again)";
    }
    
    res.status(503).json({
      error: errorMessage,
    });
  }
});

// AI Video Script Generator for Reels
app.post("/api/gemini/generate-script", async (req, res) => {
  try {
    const { title, property_type, listing_type, price, bedrooms, locality, city } = req.body;

    const systemInstruction = `आप "Social Properties" (सोशल प्रॉपर्टीज) के लिए एक एक्सपर्ट रीयल एस्टेट वीडियो स्क्रिप्ट राइटर हैं। आपको इंस्टाग्राम रील्स और टिकटॉक जैसे वर्टिकल वीडियो के लिए आकर्षक, 30-सेकंड की स्क्रिप्ट लिखनी है।
भाषा नीति: हिंदी और सामान्य अंग्रेजी रियल एस्टेट शब्दों (जैसे 2BHK, Rent, Prime Location) का मिश्रण। टोन अत्यधिक उत्साहजनक, ध्यान खींचने वाला और भरोसेमंद होना चाहिए।
संरचना:
1. हुक (पहले 3 सेकंड) - दर्शक का ध्यान खींचें।
2. मुख्य आकर्षण (बीच के 20 सेकंड) - लोकेशन (${city} - ${locality}), कीमत (₹${price}), और खासियतें (${bedrooms ? `${bedrooms} BHK` : property_type}) बताएं।
3. कॉल-टू-एक्शन (अंतिम 7 सेकंड) - "मुझे मैसेज करें" या "बायो में लिंक चेक करें" जैसी बात कहें।
स्क्रिप्ट को सीधे पढ़ने योग्य (Teleprompter style) रखें।`;

    const prompt = `कृपया इस प्रॉपर्टी के लिए एक 30-सेकंड की वीडियो स्क्रिप्ट तैयार करें:
- शीर्षक: ${title || "उल्लेखित नहीं"}
- प्रकार: ${property_type} (${listing_type === "rent" ? "किराए के लिए" : "बिक्री के लिए"})
- स्थान: ${locality || ""}, ${city || "बोकारो / गिरिडीह"}
- कीमत: ₹${price ? Number(price).toLocaleString("en-IN") : "नेगोशिएबल"}
- बेडरूम: ${bedrooms ? `${bedrooms} BHK` : "लागू नहीं"}`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    res.json({
      script: response.text || "",
    });
  } catch (error: any) {
    console.error("Gemini script generation error:", error);
    let errorMessage = "स्क्रिप्ट जनरेट करने में त्रुटि हुई। कृपया बाद में प्रयास करें।";
    
    if (error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("high demand")) {
      errorMessage = "AI सर्वर अभी व्यस्त है। कृपया कुछ सेकंड बाद फिर से प्रयास करें। (Server is busy, try again)";
    }
    
    res.status(503).json({
      error: errorMessage,
    });
  }
});

app.post("/api/gemini/smart-search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query is required" });
    }

    const systemInstruction = `You are a smart search interpreter for an Indian hyperlocal real estate app in Bokaro and Giridih.
The user enters natural queries in Hindi, Hinglish, or English (e.g., "सेक्टर 4 में 2BHK 15000 तक रेंट", "झंडा मैदान गिरिडीह के पास कमर्शियल दुकान", "चास में 3BHK फ्लैट सेल के लिए 45 लाख").
Extract structured filter fields in JSON format:
- city: "Bokaro" or "Giridih" or null
- locality: string or null (e.g. "सेक्टर 4", "चास", "टॉवर चौक", "झंडा मैदान", "सिटी सेंटर", "पचंबा")
- listing_type: "rent" | "sale" | null
- property_type: "flat" | "house" | "pg" | "commercial" | null
- bedrooms: number or null (e.g. 1, 2, 3, 4)
- max_price: number or null (e.g. 15000, 4500000)
- min_price: number or null
- keywords: string summary for title/description matching`;

    const response = await generateGeminiContent({
      contents: `Parse this real estate query into structured JSON: "${query}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ filters: parsed });
  } catch (error: any) {
    console.error("Gemini smart search error:", error);
    // Graceful fallback so search never crashes even if AI service encounters an issue
    const fallbackFilters = {
      city: null,
      locality: null,
      listing_type: null,
      property_type: null,
      bedrooms: null,
      max_price: null,
      min_price: null,
      keywords: req.body?.query?.trim() || "",
    };
    res.json({ filters: fallbackFilters });
  }
});

async function startServer() {
  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
