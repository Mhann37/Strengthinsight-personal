import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { GoogleGenAI, Type } from "@google/genai";
// 1. Configuration
const geminiApiKey = defineSecret("GEMINI_API_KEY");
// Optional: Comma-separated list of UIDs allowed to use the beta feature
const betaTesterList = defineString("BETA_TESTER_UIDS", { default: "" });
// 3. Strict Schema Definition for Gemini 
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
// 4. The Cloud Function
export const processWorkoutScreenshots = onCall({
    secrets: [geminiApiKey],
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: "1GiB",
    region: "us-central1"
}, async (request) => {
    // A. Authentication Check
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in to process workouts.");
    }
    // B. Beta Access Control
    // If list is empty (default), we skip this check and allow everyone.
    const allowedUids = betaTesterList.value();
    if (allowedUids && allowedUids.length > 0) {
        const uids = allowedUids.split(",").map(id => id.trim());
        if (!uids.includes(request.auth.uid)) {
            throw new HttpsError("permission-denied", "This feature is currently restricted to beta testers.");
        }
    }
    // C. Input Validation
    const { images, timezone } = request.data;
    if (!Array.isArray(images) || images.length === 0) {
        throw new HttpsError("invalid-argument", "No images provided.");
    }
    if (images.length > 5) {
        throw new HttpsError("invalid-argument", "Max 5 images allowed per upload.");
    }
    // Approx size check (20MB limit)
    const totalSize = images.reduce((acc, img) => acc + (img.base64?.length || 0), 0);
    if (totalSize > 20_000_000) {
        throw new HttpsError("invalid-argument", "Payload too large. Please reduce image resolution.");
    }
    try {
        // D. Initialize Gemini
        const apiKey = geminiApiKey.value();
        if (!apiKey) {
            console.error("Gemini API Key is missing from secrets configuration.");
            throw new HttpsError("internal", "Server Configuration Error: GEMINI_API_KEY is missing.");
        }
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const model = "gemini-3-flash-preview";
        // E. Construct Prompt
        const promptText = `
        Analyze these Whoop Strength Trainer screenshots.
        1. Extract the workout date (use ${timezone || "UTC"} for context).
        2. Extract all exercise names, sets, reps, and weights.
        3. INTELLIGENTLY ASSIGN 'muscleDistributions' (Chest, Back, Shoulders, Arms, Legs, Core) with a factor (0.0-1.0) based on kinesiology.
        4. CRITICAL: If weights are in LBS, convert them to KG (1 lb = 0.453592 kg) and set unit to 'kg'.
        5. Return STRICT JSON matching the schema.
      `;
        // F. Build Payload Parts with strict MIME sanitization
        const parts = [
            { text: promptText },
            ...images.map((img) => {
                // Fallback to jpeg if mimeType is missing or generic
                let mimeType = img.mimeType;
                if (!mimeType || !mimeType.startsWith("image/")) {
                    mimeType = "image/jpeg";
                }
                return {
                    inlineData: {
                        mimeType: mimeType,
                        data: img.base64
                    }
                };
            })
        ];
        // G. Call AI
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA,
                temperature: 0
            }
        });
        // H. Parse Response
        const text = response.text;
        if (!text) {
            throw new Error("AI returned empty response.");
        }
        const rawData = JSON.parse(text);
        return {
            workoutDate: rawData.workoutDate,
            exercises: rawData.exercises
        };
    }
    catch (error) {
        console.error("Gemini Processing Error:", JSON.stringify(error, null, 2));
        // Handle API Key or Auth errors specifically
        // We pass the upstream error message (error.message) to the client so they know exactly WHY it failed
        if (error.status === 403 || error.status === 401 || (error.message && error.message.toLowerCase().includes("api key"))) {
            throw new HttpsError("internal", `AI Access Error: ${error.message}`);
        }
        // Return the actual upstream error message to help debugging
        // This is crucial for "Image format not supported" errors (400)
        if (error.status === 400 || (error.message && error.message.includes("400"))) {
            throw new HttpsError("invalid-argument", `AI Rejected Request: ${error.message}`);
        }
        throw new HttpsError("internal", `AI Error: ${error.message || "Unknown error occurred"}`);
    }
});
//# sourceMappingURL=index.js.map