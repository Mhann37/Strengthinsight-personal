
import { GoogleGenAI, Type } from "@google/genai";
import { Workout, Exercise, SetRecord } from "./types";

// Always use the process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const WORKOUT_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      workoutDate: {
        type: Type.STRING,
        description: "The date of the workout in ISO format. Use the provided image timestamps and visual clues to determine this."
      },
      exercises: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the exercise" },
            sets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  setNumber: { type: Type.INTEGER },
                  reps: { type: Type.INTEGER },
                  weight: { type: Type.NUMBER },
                  unit: { type: Type.STRING, enum: ["kg", "lbs"] }
                },
                required: ["setNumber", "reps", "weight", "unit"]
              }
            }
          },
          required: ["name", "sets"]
        }
      }
    },
    required: ["workoutDate", "exercises"]
  }
};

export const processWorkoutScreenshots = async (images: { base64: string, timestamp: number }[]): Promise<Workout[]> => {
  // Use gemini-3-pro-preview for complex reasoning tasks like parsing structured workout data from multiple screenshots.
  const model = 'gemini-1.5-flash';
  
  // Format timestamps for the prompt
  const metadataContext = images.map((img, i) => `Image ${i+1} was taken at: ${new Date(img.timestamp).toISOString()}`).join('\n');

  const prompt = `
    Analyze these Whoop Strength Trainer screenshots. 
    
    METADATA CONTEXT:
    ${metadataContext}

    INSTRUCTIONS:
    1. Extract all exercises, sets, reps, and weights from all images.
    2. Group exercises into workouts based on their dates. 
    3. Use the provided metadata timestamps as the primary source for the "workoutDate".
    4. If multiple screenshots have timestamps within a few hours of each other, they belong to the SAME workout.
    5. Ensure duplicate exercises (appearing across multiple screenshots) are merged correctly.
    
    Return the data as an array of workout objects.
  `;

  try {
    const imageParts = images.map(img => ({
      inlineData: {
        mimeType: 'image/png',
        data: img.base64.split(',')[1] || img.base64
      }
    }));

    // Use ai.models.generateContent with a content object containing parts as per current SDK guidelines.
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          ...imageParts
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: WORKOUT_SCHEMA
      }
    });

    // Access the text property directly (it's not a method).
    const results = JSON.parse(response.text || '[]');
    
    return results.map((result: any, wIdx: number) => ({
      id: `workout-${Date.now()}-${wIdx}`,
      date: result.workoutDate,
      exercises: result.exercises.map((ex: any, idx: number) => ({
        id: `ex-${Date.now()}-${wIdx}-${idx}`,
        name: ex.name,
        sets: ex.sets
      })),
      totalVolume: result.exercises.reduce((acc: number, ex: any) => 
        acc + ex.sets.reduce((sAcc: number, s: any) => sAcc + (s.reps * s.weight), 0)
      , 0)
    }));
  } catch (error) {
    console.error("Error processing images with Gemini:", error);
    throw error;
  }
};
