
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Workout, Exercise, SetRecord } from "./types";

// Always use Type.OBJECT with propertyOrdering and avoid empty objects.
// Removed enum as it's not explicitly supported in the provided Type enum; used description instead.
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
                  unit: { type: Type.STRING, description: "The unit of weight, either 'kg' or 'lbs'." }
                },
                required: ["setNumber", "reps", "weight", "unit"],
                propertyOrdering: ["setNumber", "reps", "weight", "unit"]
              }
            }
          },
          required: ["name", "sets"],
          propertyOrdering: ["name", "sets"]
        }
      }
    },
    required: ["workoutDate", "exercises"],
    propertyOrdering: ["workoutDate", "exercises"]
  }
};

export const processWorkoutScreenshots = async (images: { base64: string, timestamp: number }[]): Promise<Workout[]> => {
  // CRITICAL: Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key from the environment/dialog.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use gemini-3-pro-preview for complex reasoning tasks like parsing structured workout data from multiple screenshots.
  const model = 'gemini-3-pro-preview';
  
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
    const response: GenerateContentResponse = await ai.models.generateContent({
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
