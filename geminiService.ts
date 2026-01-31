
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
            muscleGroup: { 
              type: Type.STRING, 
              description: "MUST be exactly one of: Chest, Back, Shoulders, Arms, Legs, or Core." 
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Analyze these Whoop Strength Trainer screenshots. 
Extract every exercise, set, and rep. 
CRITICAL: Categorize EVERY exercise into one of these 6 groups:
- Chest (e.g., Bench Press, Flyes, Pushups)
- Back (e.g., Rows, Pullups, Lat Pulldowns)
- Shoulders (e.g., Overhead Press, Lateral Raises, Face Pulls)
- Arms (e.g., Biceps Curls, Triceps Extensions, Hammer Curls)
- Legs (e.g., Squats, Deadlifts, Lunges, Calves)
- Core (e.g., Planks, Crunches, Leg Raises)

If an exercise is compound, pick the primary driver.
Return a JSON array matching the provided schema.`;

  try {
    const parts = [
      { text: prompt }, 
      ...images.map(img => ({
        inlineData: { mimeType: 'image/png', data: img.base64.split(',')[1] || img.base64 }
      }))
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { 
        responseMimeType: "application/json", 
        responseSchema: WORKOUT_SCHEMA,
        temperature: 0.1 // Keep it deterministic for classification
      }
    });

    const text = response.text || '[]';
    const results = JSON.parse(text);
    
    return results.map((r: any, idx: number) => ({
      id: `w-${Date.now()}-${idx}`,
      date: r.workoutDate || new Date().toISOString(),
      exercises: r.exercises,
      totalVolume: r.exercises.reduce((acc: number, ex: any) => 
        acc + ex.sets.reduce((sAcc: number, s: any) => sAcc + (s.reps * (s.weight || 0)), 0), 0)
    }));
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};
