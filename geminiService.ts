
import { GoogleGenAI, Type } from "@google/genai";
import { Workout } from "./types";

/**
 * CLIENT-SIDE SERVICE
 * Connects directly to Gemini API to process images, bypassing the need for a backend Cloud Function.
 */

// Initialize the client directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema definition matching the frontend types
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
            muscleDistributions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  group: { type: Type.STRING },
                  factor: { type: Type.NUMBER }
                },
                required: ["group", "factor"]
              }
            },
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
                required: ["setNumber", "reps", "weight", "unit"]
              }
            }
          },
          required: ["name", "muscleDistributions", "sets"]
        }
      }
    },
    required: ["workoutDate", "exercises"]
  }
} as const;

export const processWorkoutScreenshots = async (images: { base64: string, timestamp: number }[]): Promise<Workout[]> => {
  try {
    const model = "gemini-3-pro-preview";

    const prompt = `Analyze these Whoop Strength Trainer screenshots.
    Extract exercise names, sets, reps, and weights.
    Use your deep knowledge of kinesiology to intelligently assign MUSCLE LOAD FACTORS (0.0 to 1.0) for relevant groups: Chest, Back, Shoulders, Arms, Legs, Core.
    
    IMPORTANT: Return the data as a valid JSON array matching the schema.`;

    const parts = [
      { text: prompt },
      ...images.map((img) => {
        // Dynamic mime-type detection to support PNG, JPEG, WEBP, etc.
        const base64Data = img.base64.split(",")[1] || img.base64;
        const mimeMatch = img.base64.match(/^data:(.*);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
        
        return {
          inlineData: { mimeType, data: base64Data }
        };
      })
    ];

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: WORKOUT_SCHEMA,
        temperature: 0.2
      }
    });

    let text = response.text || "[]";
    
    // Safety: Strip markdown code blocks if the model includes them
    if (text.trim().startsWith("```")) {
      text = text.replace(/^```(json)?/, "").replace(/```$/, "");
    }

    const rawData = JSON.parse(text);

    // Transform raw AI data into the frontend Workout type
    return rawData.map((r: any, idx: number) => ({
      id: `w-${Date.now()}-${idx}`,
      date: r.workoutDate || new Date().toISOString(),
      exercises: r.exercises.map((ex: any, eIdx: number) => ({
        id: `ex-${Date.now()}-${idx}-${eIdx}`,
        name: ex.name,
        muscleGroup: ex.muscleDistributions?.[0]?.group || 'Other', 
        sets: ex.sets
      })),
      totalVolume: r.exercises.reduce((acc: number, ex: any) => 
        acc + ex.sets.reduce((sAcc: number, s: any) => sAcc + (s.reps * (s.weight || 0)), 0), 0)
    }));
  } catch (error) {
    console.error("Gemini Processing Error:", error);
    throw error;
  }
};
