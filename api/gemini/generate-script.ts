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
    const { title, property_type, listing_type, price, bedrooms, locality, city } = req.body;

    const systemInstruction = `आप "Social Properties" (सोशल प्रॉपर्टीज) के लिए एक एक्सपर्ट रीयल एस्टेट वीडियो स्क्रिप्ट राइटर हैं। आपको इंस्टाग्राम रील्स और टिकटॉक जैसे वर्टिकल वीडियो के लिए आकर्षक, 30-सेकंड की स्क्रिप्ट लिखनी है।
भाषा नीति: हिंदी और सामान्य अंग्रेजी रियल एस्टेट शब्दों (जैसे 2BHK, Rent, Prime Location) का मिश्रण। टोन अत्यधिक उत्साहजनक, ध्यान खींचने वाला और भरोसेमंद होना चाहिए।
संरचना:
1. हुक (पहले 3 सेकंड) - दर्शक का ध्यान खींचें।
2. मुख्य आकर्षण (बीच के 20 सेकंड) - लोकेशन (${city} - ${locality}), कीमत (₹${price}), और खासियतें (${bedrooms ? `${bedrooms} BHK` : property_type}) बताएं।
3. कॉल-टू-एक्शन (अंतिम 7 सेकंड) - "मुझे मैसेज करें" या "बायो में लिंक चेक करें" जैसी बात कहें।
स्क्रिप्ट को सीधे पढ़ने योग्य (Teleprompter style) रखें।`;

    const prompt = `कृपया इस प्रॉपर्टी के लिए एक 30-सेकंड की वीडियो स्क्रिप्ट तैयार करें:
- शीर्षक: ${title || 'उल्लेखित नहीं'}
- प्रकार: ${property_type} (${listing_type === 'rent' ? 'किराए के लिए' : 'बिक्री के लिए'})
- स्थान: ${locality || ''}, ${city || 'बोकारो / गिरिडीह'}
- कीमत: ₹${price ? Number(price).toLocaleString('en-IN') : 'नेगोशिएबल'}
- बेडरूम: ${bedrooms ? `${bedrooms} BHK` : 'लागू नहीं'}`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    return res.status(200).json({ script: response.text || '' });
  } catch (error: any) {
    console.error('Gemini script generation error:', error);
    let errorMessage = 'स्क्रिप्ट जनरेट करने में त्रुटि हुई। कृपया बाद में प्रयास करें।';
    if (error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand')) {
      errorMessage = 'AI सर्वर अभी व्यस्त है। कृपया कुछ सेकंड बाद फिर से प्रयास करें। (Server is busy, try again)';
    }
    return res.status(503).json({ error: errorMessage });
  }
}