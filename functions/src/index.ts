import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const adminDb = getFirestore();


// 1. Configuration
const geminiApiKey = defineSecret("GEMINI_API_KEY");
type ReasonCode =
  | "UNAUTHENTICATED"
  | "BAD_INPUT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "AI_OVERLOADED"
  | "AI_REJECTED"
  | "AI_AUTH"
  | "AI_EMPTY_RESPONSE"
  | "SERVER_CONFIG"
  | "UNKNOWN";

const makeRequestId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toPublicError(reasonCode: ReasonCode, requestId: string) {
  // Keep user messages calm + consistent (no provider internals)
  const messages: Record<ReasonCode, string> = {
    UNAUTHENTICATED: "Please sign in to process workouts.",
    BAD_INPUT: "Please upload valid screenshots and try again.",
    PAYLOAD_TOO_LARGE: "Those images are too large. Please reduce resolution and try again.",
    RATE_LIMITED: "You’ve hit the usage limit. Please wait a minute and try again.",
    AI_OVERLOADED: "The AI service is busy right now. Please try again in 30 seconds.",
    AI_REJECTED: "Those screenshots couldn’t be processed. Try clearer screenshots and try again.",
    AI_AUTH: "AI access is temporarily unavailable. Please try again later.",
    AI_EMPTY_RESPONSE: "The AI returned an empty result. Please try again.",
    SERVER_CONFIG: "Server is misconfigured. Please try again later.",
    UNKNOWN: "Something went wrong. Please try again.",
  };

  return {
    ok: false as const,
    reasonCode,
    message: messages[reasonCode] ?? messages.UNKNOWN,
    requestId,
  };
}

function classifyError(err: any): { reasonCode: ReasonCode; httpish?: number } {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  const msg = String(err?.message ?? "").toLowerCase();

  // Common overload signals
  if (status === 429 || msg.includes("resource exhausted") || msg.includes("overloaded")) {
    return { reasonCode: "AI_OVERLOADED", httpish: 429 };
  }

  // Bad request / rejected payload
  if (status === 400 || msg.includes("invalid argument") || msg.includes("image") || msg.includes("mime")) {
    return { reasonCode: "AI_REJECTED", httpish: 400 };
  }

  // Auth/key issues
  if (status === 401 || status === 403 || msg.includes("api key") || msg.includes("permission")) {
    return { reasonCode: "AI_AUTH", httpish: 401 };
  }

  return { reasonCode: "UNKNOWN" };
}

const LIMITS = {
  userPerMinute: 5,
  userPerDay: 30,
  globalPerMinute: 200,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Use UTC buckets to keep it simple and consistent
function minuteBucketUTC(d = new Date()) {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}_${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}`;
}

function dayBucketUTC(d = new Date()) {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

async function enforceRateLimits(uid: string) {
  const now = new Date();
  const minBucket = minuteBucketUTC(now);
  const dayBucket = dayBucketUTC(now);

  const userMinuteRef = adminDb.doc(`rateLimits/users/${uid}/minutes/${minBucket}`);
  const userDayRef = adminDb.doc(`rateLimits/users/${uid}/days/${dayBucket}`);
  const globalMinuteRef = adminDb.doc(`rateLimits/global/minutes/${minBucket}`);

  await adminDb.runTransaction(async (tx) => {
    const [umSnap, udSnap, gmSnap] = await Promise.all([
      tx.get(userMinuteRef),
      tx.get(userDayRef),
      tx.get(globalMinuteRef),
    ]);

    const umCount = (umSnap.exists ? (umSnap.data()?.count ?? 0) : 0) as number;
    const udCount = (udSnap.exists ? (udSnap.data()?.count ?? 0) : 0) as number;
    const gmCount = (gmSnap.exists ? (gmSnap.data()?.count ?? 0) : 0) as number;

    // Would this request exceed limits?
    if (umCount + 1 > LIMITS.userPerMinute) {
      throw Object.assign(new Error("rate_limited_user_minute"), { _reasonCode: "RATE_LIMITED" });
    }
    if (udCount + 1 > LIMITS.userPerDay) {
      throw Object.assign(new Error("rate_limited_user_day"), { _reasonCode: "RATE_LIMITED" });
    }
    if (gmCount + 1 > LIMITS.globalPerMinute) {
      throw Object.assign(new Error("rate_limited_global_minute"), { _reasonCode: "RATE_LIMITED" });
    }

    // Write/increment counts (atomic in transaction)
    const base = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!umSnap.exists) tx.set(userMinuteRef, { count: 1, ...base }, { merge: true });
    else tx.update(userMinuteRef, { count: FieldValue.increment(1), ...base });

    if (!udSnap.exists) tx.set(userDayRef, { count: 1, ...base }, { merge: true });
    else tx.update(userDayRef, { count: FieldValue.increment(1), ...base });

    if (!gmSnap.exists) tx.set(globalMinuteRef, { count: 1, ...base }, { merge: true });
    else tx.update(globalMinuteRef, { count: FieldValue.increment(1), ...base });
  });
}

// 2. Interfaces matches Client Logic
interface SetRecord {
  setNumber: number;
  reps: number;
  weight: number;
  unit: "kg";
}

interface MuscleDistribution {
  group: string;
  factor: number;
}

interface Exercise {
  name: string;
  muscleDistributions: MuscleDistribution[];
  sets: SetRecord[];
}

interface WorkoutResponse {
  workoutDate: string;
  exercises: Exercise[];
}

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
export const processWorkoutScreenshots = onCall(
  { 
    secrets: [geminiApiKey],
    maxInstances: 10,
    timeoutSeconds: 120, 
    memory: "1GiB", 
    region: "us-central1"
  },
  async (request) => {
    const requestId = makeRequestId();
    // A. Authentication Check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", JSON.stringify(toPublicError("UNAUTHENTICATED", requestId)));
    }

    // C. Input Validation
    const { images, timezone } = request.data;
    
    if (!Array.isArray(images) || images.length === 0) {
      throw new HttpsError("invalid-argument", JSON.stringify(toPublicError("BAD_INPUT", requestId)));
    }
    if (images.length > 5) {
      throw new HttpsError("invalid-argument", JSON.stringify(toPublicError("BAD_INPUT", requestId)));
    }

    // Approx size check (20MB limit)
    const totalSize = images.reduce((acc: number, img: any) => acc + (img.base64?.length || 0), 0);
    if (totalSize > 20_000_000) { 
      throw new HttpsError("invalid-argument", JSON.stringify(toPublicError("PAYLOAD_TOO_LARGE", requestId)));
    }
await enforceRateLimits(request.auth.uid);
    
    try {
      // D. Initialize Gemini
      const apiKey = geminiApiKey.value();
      if (!apiKey) {
         console.error("Gemini API Key is missing from secrets configuration.");
         throw new HttpsError("internal", JSON.stringify(toPublicError("SERVER_CONFIG", requestId)));
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
        ...images.map((img: any) => {
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

// G. Call AI (retry once on overload)
const generate = async () =>
  ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA as any,
      temperature: 0,
    },
  });

const callWithRetry = async () => {
  try {
    return await generate();
  } catch (err: any) {
    const { reasonCode } = classifyError(err);

    if (reasonCode !== "AI_OVERLOADED") throw err;

    const delay = 800 + Math.floor(Math.random() * 400); // 800–1200ms
    console.warn("[processWorkoutScreenshots] overload, retrying once", { requestId, delay });
    await sleep(delay);

    return await generate(); // second (final) attempt
  }
};

const response = await callWithRetry();

      // H. Parse Response
      const text = response.text;
      if (!text) {
        throw Object.assign(new Error("AI returned empty response."), { status: 520, _reasonCode: "AI_EMPTY_RESPONSE" });
      }

      const rawData = JSON.parse(text) as WorkoutResponse;

      return {
        workoutDate: rawData.workoutDate,
        exercises: rawData.exercises
      };

} catch (error: any) {
  // Always log full details server-side with requestId
  console.error("[processWorkoutScreenshots] error", {
    requestId,
    uid: request.auth?.uid,
    status: error?.status ?? error?.code,
    message: error?.message,
    raw: error,
  });

  // Respect explicit reason code if we set one
  const forced = error?._reasonCode as ReasonCode | undefined;
  const { reasonCode } = forced ? { reasonCode: forced } : classifyError(error);

  // Return stable error payload to client (no provider internals)
  const publicPayload = toPublicError(reasonCode, requestId);

  // Map to firebase callable codes
const callableCode =
  reasonCode === "UNAUTHENTICATED" ? "unauthenticated"
  : reasonCode === "BAD_INPUT" ||
    reasonCode === "PAYLOAD_TOO_LARGE" ||
    reasonCode === "AI_REJECTED"
    ? "invalid-argument"
    : reasonCode === "AI_OVERLOADED" ||
      reasonCode === "RATE_LIMITED"
      ? "resource-exhausted"
      : "internal";

  throw new HttpsError(callableCode as any, JSON.stringify(publicPayload));
}
    }
  }
);
