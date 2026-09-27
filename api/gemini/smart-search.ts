import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_TEXT_MODEL = 'gemini-3.6-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-3.8-flash';

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function generateGeminiContent(options: { contents: any; config?: any }) {
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
      err?.message?.includes('404') ||
      err?.message?.includes('not found') ||
      err?.message?.includes('no longer available')
    ) {
      console.warn(`Gemini model ${GEMINI_TEXT_MODEL} returned 404, falling back to ${FALLBACK_GEMINI_MODEL}`);
      return await ai.models.generateContent({
        model: FALLBACK_GEMINI_MODEL,
        contents: options.contents,
        config: options.config,
      });
    }
    throw err;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
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
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.status(200).json({ filters: parsed });
  } catch (error: any) {
    console.error('Gemini smart search error:', error);
    const fallbackFilters = {
      city: null,
      locality: null,
      listing_type: null,
      property_type: null,
      bedrooms: null,
      max_price: null,
      min_price: null,
      keywords: req.body?.query?.trim() || '',
    };
    return res.status(200).json({ filters: fallbackFilters });
  }
}