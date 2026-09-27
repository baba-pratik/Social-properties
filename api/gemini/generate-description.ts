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
- शीर्षक: ${title || 'उल्लेखित नहीं'}
- प्रकार: ${property_type || 'Flat'} (${listing_type === 'rent' ? 'किराए के लिए (Rent)' : 'बिक्री के लिए (Sale)'})
- शहर व इलाका: ${locality || ''}, ${city || 'बोकारो / गिरिडीह'}
- बेडरूम: ${bedrooms ? `${bedrooms} BHK` : 'लागू नहीं'}
- कीमत: ₹${price ? Number(price).toLocaleString('en-IN') : 'नेगोशिएबल'}
- यूज़र द्वारा दिए गए मुख्य बिंदु/नोट्स: ${key_highlights || 'प्राइम लोकेशन, तुरंत रहने योग्य, पानी और बिजली की उत्तम सुविधा।'}`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.status(200).json({ description: response.text || '' });
  } catch (error: any) {
    console.error('Gemini description generation error:', error);
    let errorMessage = 'विवरण जनरेट करने में त्रुटि हुई। कृपया बाद में प्रयास करें।';
    if (error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand')) {
      errorMessage = 'AI सर्वर अभी व्यस्त है। कृपया कुछ सेकंड बाद फिर से प्रयास करें। (Server is busy, try again)';
    }
    return res.status(503).json({ error: errorMessage });
  }
}