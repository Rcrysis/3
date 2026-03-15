import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractBPFromImage(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: "image/jpeg"
          }
        },
        "Extract the systolic, diastolic, and heart rate values from this blood pressure monitor screen. Return ONLY a JSON object with keys 'systolic', 'diastolic', and 'heartRate'. If a value is not visible or readable, return null for that key."
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            systolic: { type: Type.NUMBER, description: "Systolic blood pressure" },
            diastolic: { type: Type.NUMBER, description: "Diastolic blood pressure" },
            heartRate: { type: Type.NUMBER, description: "Heart rate or pulse" }
          }
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (e) {
    console.error("Error extracting BP:", e);
    return null;
  }
}

export async function extractGlucoseFromImage(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: "image/jpeg"
          }
        },
        "Extract the blood glucose value from this glucometer screen. Return ONLY a JSON object with the key 'glucose'. If the value is not visible or readable, return null."
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            glucose: { type: Type.NUMBER, description: "Blood glucose level" }
          }
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (e) {
    console.error("Error extracting Glucose:", e);
    return null;
  }
}
