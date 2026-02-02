
import { functions, httpsCallable } from "./firebase";
import { Workout, Exercise } from "./types";

/**
 * SERVER-SIDE SERVICE (via Cloud Functions)
 * Calls the deployed Firebase Cloud Function 'processWorkoutScreenshots'.
 * The API Key is managed securely in Google Cloud Secret Manager.
 */

interface CloudFunctionResponse {
  workoutDate: string;
  exercises: {
    name: string;
    // Backend returns detailed distribution, we map to primary group
    muscleDistributions: { group: string; factor: number }[];
    sets: { setNumber: number; reps: number; weight: number; unit: 'kg' }[];
  }[];
}

export const processWorkoutScreenshots = async (images: { base64: string, timestamp: number }[]): Promise<Workout[]> => {
  try {
    const processFn = httpsCallable<{ images: any[], timezone: string }, CloudFunctionResponse>(
      functions, 
      'processWorkoutScreenshots'
    );

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Prepare payload for Cloud Function
    const payload = images.map((img) => ({
      base64: img.base64.includes(',') ? img.base64.split(',')[1] : img.base64,
      mimeType: "image/png" // Simplification for prototype
    }));

    // Call the backend
    const result = await processFn({ 
      images: payload, 
      timezone: timezone 
    });

    const data = result.data;

    // Transform Backend Response to Frontend Workout Type
    const generatedWorkout: Workout = {
      id: `w-${Date.now()}`,
      date: data.workoutDate || new Date().toISOString(),
      
      // Calculate total volume based on sets
      totalVolume: data.exercises.reduce((acc, ex) => 
        acc + ex.sets.reduce((sAcc, s) => sAcc + (s.reps * (s.weight || 0)), 0), 0),
      
      exercises: data.exercises.map((ex, idx) => {
        // Find primary muscle group (highest factor)
        const primaryGroup = ex.muscleDistributions.sort((a, b) => b.factor - a.factor)[0]?.group || 'Other';

        return {
          id: `ex-${Date.now()}-${idx}`,
          name: ex.name,
          muscleGroup: primaryGroup,
          sets: ex.sets.map(s => ({
            ...s,
            unit: 'kg'
          }))
        };
      })
    };

    return [generatedWorkout];

  } catch (error: any) {
    console.error("Cloud Function Error:", error);
    
    // Handle specific Firebase HttpsErrors
    if (error.code === 'permission-denied') {
      throw new Error("Access Denied: This feature is restricted.");
    }
    if (error.code === 'internal') {
      throw new Error("Server Error: The AI service encountered an issue. Please try again.");
    }
    if (error.code === 'invalid-argument') {
      throw new Error("Validation Error: " + (error.message || "Invalid image data."));
    }
    if (error.message && error.message.includes("quota")) {
      throw new Error("Service Busy: High traffic volume. Please try again later.");
    }

    throw new Error("Failed to process images: " + (error.message || "Unknown error"));
  }
};
