
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Workout } from "./types";

// Schema for structured workout data extraction
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
              description: "Breakdown of which muscle groups this exercise targets and how much (0.0 to 1.0).",
              items: {
                type: Type.OBJECT,
                properties: {
                  group: { type: Type.STRING, description: "MUST be one of: Chest, Back, Shoulders, Arms, Legs, Core" },
                  factor: { type: Type.NUMBER, description: "The relative load factor for this group (e.g. 0.8 for primary, 0.2 for secondary). Sum can be > 1 if it hits multiple hard." }
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
};

/**
 * Processes workout screenshots using Gemini to extract exercises, sets, and muscle load factors.
 * Uses gemini-3-pro-preview for advanced reasoning on kinesiology.
 */
export const processWorkoutScreenshots = async (images: { base64: string, timestamp: number }[]): Promise<Workout[]> => {
  // Create a new instance right before the call to ensure up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-3-pro-preview for complex reasoning tasks involving kinesiology domain knowledge
  const model = 'gemini-3-pro-preview';
  
  const prompt = `Analyze these Whoop Strength Trainer screenshots.
Extract exercise names, sets, reps, and weights.

Use your deep knowledge of kinesiology to intelligently assign MUSCLE LOAD FACTORS for each exercise.
Most exercises hit multiple groups. Assign a factor (0.0 to 1.0) for each relevant group.
Examples:
- Squats: Legs (0.9), Core (0.2), Back (0.1)
- Bench Press: Chest (0.9), Shoulders (0.4), Arms (0.3)
- Deadlift: Legs (0.8), Back (0.8), Core (0.4)
- Pullups: Back (0.9), Arms (0.4)

Valid groups: Chest, Back, Shoulders, Arms, Legs, Core.
Ensure the output matches the provided JSON schema precisely.`;

  try {
    const parts = [
      { text: prompt }, 
      ...images.map(img => ({
        inlineData: { mimeType: 'image/png', data: img.base64.split(',')[1] || img.base64 }
      }))
    ];

    // Call generateContent with model and prompt in a single call as per guidelines
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { 
        responseMimeType: "application/json", 
        responseSchema: WORKOUT_SCHEMA,
        temperature: 0.2
      }
    });

    // Directly access text property (not a method) as per guidelines
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
    console.error("Gemini Multi-Load Error:", error);
    throw error;
  }
};
