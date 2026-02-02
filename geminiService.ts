import { GoogleGenAI, Type } from "@google/genai";
import { Workout } from "./types";

// Initialize Gemini Client
// Using process.env.API_KEY as per client-side requirements
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    workoutDate: { 
      type: Type.STRING, 
      description: "ISO date string of the workout. Use the provided timezone if available." 
    },
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
                group: { 
                  type: Type.STRING,
                  description: "One of: Chest, Back, Shoulders, Arms, Legs, Core"
                },
                factor: { 
                  type: Type.NUMBER,
                  description: "Load factor from 0.0 to 1.0"
                }
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
                unit: { 
                  type: Type.STRING, 
                  enum: ["kg"],
                  description: "Must be 'kg'. Convert 'lbs' to 'kg' if necessary."
                }
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
};

export const processWorkoutScreenshots = async (images: { base64: string, timestamp: number }[]): Promise<Workout[]> => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const promptText = `
      Analyze these Whoop Strength Trainer screenshots.
      1. Extract the workout date (use ${timezone} for context).
      2. Extract all exercise names, sets, reps, and weights.
      3. INTELLIGENTLY ASSIGN 'muscleDistributions' (Chest, Back, Shoulders, Arms, Legs, Core) with a factor (0.0-1.0) based on kinesiology.
      4. CRITICAL: If weights are in LBS, convert them to KG (1 lb = 0.453592 kg) and set unit to 'kg'.
      5. Return STRICT JSON matching the schema.
    `;

    // Prepare payload for Gemini
    const parts = [
      { text: promptText },
      ...images.map((img) => {
        // Extract real MIME type and clean Base64
        let base64 = img.base64;
        let mimeType = "image/jpeg"; // Default fallback

        if (img.base64.includes(',')) {
          const split = img.base64.split(',');
          base64 = split[1]; // The raw base64 data
          
          // Try to find the mime type in the header
          const match = split[0].match(/:(.*?);/);
          if (match && match[1]) {
            mimeType = match[1];
          }
        }

        return {
          inlineData: {
            mimeType: mimeType,
            data: base64
          }
        };
      })
    ];

    // Call Gemini directly from client
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
        temperature: 0
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned empty response.");
    }

    const data = JSON.parse(text);

    // Transform AI Response to Frontend Workout Type
    const generatedWorkout: Workout = {
      id: `w-${Date.now()}`,
      date: data.workoutDate || new Date().toISOString(),
      
      // Calculate total volume based on sets
      totalVolume: data.exercises.reduce((acc: number, ex: any) => 
        acc + ex.sets.reduce((sAcc: number, s: any) => sAcc + (s.reps * (s.weight || 0)), 0), 0),
      
      exercises: data.exercises.map((ex: any, idx: number) => {
        // Find primary muscle group (highest factor)
        const primaryGroup = ex.muscleDistributions.sort((a: any, b: any) => b.factor - a.factor)[0]?.group || 'Other';

        return {
          id: `ex-${Date.now()}-${idx}`,
          name: ex.name,
          muscleGroup: primaryGroup,
          sets: ex.sets.map((s: any) => ({
            ...s,
            unit: 'kg'
          }))
        };
      })
    };

    return [generatedWorkout];

  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(error.message || "Failed to process images. Please ensure your API Key is valid.");
  }
};
