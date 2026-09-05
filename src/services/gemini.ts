import { GoogleGenAI, Modality } from "@google/genai";

const DEPARTMENT_INFO = `
📌 COLLEGE DETAILS
College Name: St. Peter’s Institute of Higher Education and Research (SPIHER)
Accreditation: Accredited by NAAC with 'A+' Grade
Location: Avadi, Chennai – 600 054, Tamil Nadu
Email: info@spiher.ac.in
Phone: +91 94456 38085, +91 91505 34663

📌 BCA DEPARTMENT
HOD: Dr. R. Latha
Assistant HOD: Dr. D. Kavitha

📌 STAFF MEMBERS
- Dr. R. Latha (HOD) - AI, Data Mining - lathahod@spiher.ac.in
- Dr. D. Kavitha (Assistant HOD) - Cloud Computing - kavitha.ca@spiher.ac.in
- Mr. Jagadeesh - Full Stack, DevOps - jagadeesh.ca@spiher.ac.in
- Ms. Subashini - DBMS, Cyber Security - subashini.ca@spiher.ac.in
- Ms. Vinotha - Mobile App Dev, UI/UX - vinotha.ca@spiher.ac.in
- Ms. Vasanthi - Algorithms - vasanthi.ca@spiher.ac.in

📌 COURSES: BCA (General), BCA Artificial Intelligence, BCA Data Science, MCA, PhD
📌 FEES: BCA 60k, MCA 75k, BCA AI 90k, BCA Data Science 90k
📌 PLACEMENTS: Highest 6 LPA, 54+ placements, Recruiters: TCS, Infosys, Cognizant, HCL, Accenture etc.
📌 LINKS: Student Portal https://insproplus.com/stpetersstudent - Fees https://insproplus.com/stpeterspay
`;

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error("VITE_GEMINI_API_KEY missing");
    return null;
  }
  return key.trim();
};

export async function getChatResponse(userMessage: string) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Vercel");
    }

    const ai = new GoogleGenAI({ apiKey });
    // PUTHU MODEL - ITHU THAAN MUKKIYAM DA!
    const model = "gemini-2.0-flash";
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: `You are SPIHER BCA Assistant. Answer only from given data. Be polite. If unrelated, say contact office. Keep short. Respond in user's language (Tamil/English/Tanglish).
        COLLEGE INFO: ${DEPARTMENT_INFO}`,
      },
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text;
  } catch (error: any) {
    console.error("Chat Error:", error);
    throw error;
  }
}

export async function getSpeechResponse(text: string) {
  try {
    if (!text || text.trim().length === 0) return null;
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const cleanText = text.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/\n+/g, ' ').trim();
    if (cleanText.length === 0) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text: `Read this naturally: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error: any) {
    console.warn("TTS error, skipping audio", error);
    return null;
  }
}
