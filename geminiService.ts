
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Workout } from "./types";

const WORKOUT_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      workoutDate: { type: Type.STRING },
      exercises: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            muscleGroup: { type: Type.STRING, description: "One of: Chest, Back, Shoulders, Arms, Legs, Core" },
            sets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  setNumber: { type: Type.INTEGER },
                  reps: { type: Type.INTEGER },
                  weight: { type: Type.NUMBER },
                  unit: { type: Type.STRING }
                },
                required: ["setNumber", "reps", "weight", "unit"],
                propertyOrdering: ["setNumber", "reps", "weight", "unit"]
              }
            }
          },
          required: ["name", "muscleGroup", "sets"],
          propertyOrdering: ["name", "muscleGroup", "sets"]
        }
      }
    },
    required: ["workoutDate", "exercises"],
    propertyOrdering: ["workoutDate", "exercises"]
  }
};

export const processWorkoutScreenshots = async (images: { base64: string, timestamp: number }[]): Promise<Workout[]> => {
  // Always initialize a new GoogleGenAI instance right before the call to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-flash-preview for general multimodal extraction and reasoning tasks
  const model = 'gemini-3-flash-preview';
  const metadata = images.map((img, i) => `Image ${i+1}: ${new Date(img.timestamp).toISOString()}`).join('\n');

  const prompt = `Analyze these Whoop screenshots. Map each exercise to: Chest, Back, Shoulders, Arms, Legs, or Core.\nMetadata:\n${metadata}`;

  try {
    const parts = [{ text: prompt }, ...images.map(img => ({
      inlineData: { mimeType: 'image/png', data: img.base64.split(',')[1] || img.base64 }
    }))];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { responseMimeType: "application/json", responseSchema: WORKOUT_SCHEMA }
    });

    // Directly access the .text property as per the latest SDK guidelines
    const text = response.text || '[]';
    const results = JSON.parse(text);
    
    return results.map((r: any, idx: number) => ({
      id: `w-${Date.now()}-${idx}`,
      date: r.workoutDate,
      exercises: r.exercises,
      totalVolume: r.exercises.reduce((acc: number, ex: any) => 
        acc + ex.sets.reduce((sAcc: number, s: any) => sAcc + (s.reps * s.weight), 0), 0)
    }));
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
