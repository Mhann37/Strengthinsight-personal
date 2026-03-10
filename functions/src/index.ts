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
 if (
  status === 429 ||
  msg.includes("resource exhausted") ||
  msg.includes("overloaded") ||
  msg.includes("too many requests")
) {
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

const userMinuteRef = adminDb.doc(`rateLimitsUsers/${uid}/minutes/${minBucket}`);
const userDayRef = adminDb.doc(`rateLimitsUsers/${uid}/days/${dayBucket}`);
const globalMinuteRef = adminDb.doc(`rateLimitsGlobalMinutes/${minBucket}`);

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

// ── generateNextWorkout response types ────────────────────────
interface GeneratedExercise {
  name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  progression_note: string;
  progression_direction: "up" | "maintain" | "down" | "rep_increase";
}

interface GeneratedWorkout {
  focus: string;
  exercises: GeneratedExercise[];
  estimated_volume_kg: number;
  coach_note: string;
}

const NEXT_WORKOUT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    focus: {
      type: Type.STRING,
      description:
        "Session focus: Upper Strength / Lower Strength / Upper Hypertrophy / Lower Hypertrophy / Full Body",
    },
    exercises: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          sets: { type: Type.INTEGER },
          reps: { type: Type.INTEGER },
          weight_kg: { type: Type.NUMBER },
          progression_note: {
            type: Type.STRING,
            description: "Short note like +2.5kg, +1 rep, maintain, deload",
          },
          progression_direction: {
            type: Type.STRING,
            enum: ["up", "maintain", "down", "rep_increase"],
          },
        },
        required: [
          "name",
          "sets",
          "reps",
          "weight_kg",
          "progression_note",
          "progression_direction",
        ],
      },
    },
    estimated_volume_kg: { type: Type.NUMBER },
    coach_note: {
      type: Type.STRING,
      description:
        "One specific, personalised coaching sentence about this session.",
    },
  },
  required: [
    "focus",
    "exercises",
    "estimated_volume_kg",
    "coach_note",
  ],
};

// 4b. generateNextWorkout Cloud Function
export const generateNextWorkout = onCall(
  {
    secrets: [geminiApiKey],
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: "1GiB",
    region: "us-central1",
  },
  async (request) => {
    const requestId = makeRequestId();

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        JSON.stringify(toPublicError("UNAUTHENTICATED", requestId))
      );
    }

    const uid = request.auth.uid;
    await enforceRateLimits(uid);

    try {
      const apiKey = geminiApiKey.value();
      if (!apiKey) {
        throw new HttpsError(
          "internal",
          JSON.stringify(toPublicError("SERVER_CONFIG", requestId))
        );
      }

      // Fetch last 5 sessions from Firestore
      const workoutsCol = adminDb.collection("workouts");
      const recentSnap = await workoutsCol
        .where("userId", "==", uid)
        .orderBy("date", "desc")
        .limit(5)
        .get();

      const recentSessions = recentSnap.docs.map((d) => d.data());

      if (recentSessions.length === 0) {
        throw new HttpsError(
          "failed-precondition",
          JSON.stringify({
            ok: false,
            reasonCode: "BAD_INPUT",
            message: "No sessions found. Log at least 3 workouts first.",
            requestId,
          })
        );
      }

      // Fetch full exercise library (up to 100 recent sessions)
      const allSnap = await workoutsCol
        .where("userId", "==", uid)
        .orderBy("date", "desc")
        .limit(100)
        .get();

      const exerciseSet = new Set<string>();
      allSnap.docs.forEach((d) => {
        const data = d.data();
        if (Array.isArray(data.exercises)) {
          data.exercises.forEach((ex: any) => {
            if (ex?.name) exerciseSet.add(ex.name);
          });
        }
      });
      const exerciseLibrary = Array.from(exerciseSet);

      // Latest recovery score from recent sessions
      let recoveryScore: number | null = null;
      for (const s of recentSessions) {
        if (typeof s.recoveryScore === "number") {
          recoveryScore = s.recoveryScore;
          break;
        }
      }

      // Days since last session
      let daysSinceLast = 1;
      if (recentSessions[0]?.date) {
        const lastDate = new Date(recentSessions[0].date);
        daysSinceLast = Math.max(
          0,
          Math.floor(
            (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        );
      }

      // Sanitise session data for prompt (trim to keep within token budget)
      const sessionsSummary = recentSessions.map((s: any) => ({
        date: String(s.date ?? "").slice(0, 10),
        exercises: (s.exercises ?? []).map((ex: any) => ({
          name: ex?.name ?? "Unknown",
          muscleGroup: ex?.muscleGroup ?? null,
          sets: (ex?.sets ?? []).slice(0, 10).map((set: any) => ({
            reps: Number(set?.reps) || 0,
            weightKg:
              set?.unit === "lbs"
                ? Math.round((Number(set?.weight) || 0) * 0.453592 * 10) / 10
                : Number(set?.weight) || 0,
          })),
        })),
        recoveryScore: s.recoveryScore ?? null,
      }));

      const prompt = `You are a strength and conditioning coach building a personalised next workout for an athlete.

Here is their recent training data:

LAST ${sessionsSummary.length} SESSIONS:
${JSON.stringify(sessionsSummary, null, 2)}

FULL EXERCISE LIBRARY (exercises they have logged before):
${JSON.stringify(exerciseLibrary)}

TODAY'S CONTEXT:
- Recovery score: ${recoveryScore !== null ? `${recoveryScore}/100` : "not available"}
- Days since last session: ${daysSinceLast}
- Current goal: Progressive overload with fatigue management

RULES:
1. Do not programme a muscle group trained in the last 48 hours
2. For exercises where the last session hit all target reps cleanly: increase weight by the smallest practical increment (2.5kg for compound, 1.25kg for isolation)
3. For exercises showing a plateau (less than 3% load change over last 4 sessions): suggest a rep range increase or add a drop set instead of adding weight
4. If recovery score is below 50: reduce total sets by 20%, keep target weights the same
5. If recovery score is above 75 and days since last session is 3+: standard volume, full weights
6. Only use exercises from the user's own exercise library — do not invent new exercises
7. Select 5 exercises maximum
8. Choose a session focus (Upper Strength / Lower Strength / Upper Hypertrophy / Lower Hypertrophy / Full Body) based on what's most needed given recent training pattern

Respond ONLY with valid JSON matching the required schema. No preamble, no markdown.`;

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const generate = async () =>
        ai.models.generateContent({
          model,
          contents: { parts: [{ text: prompt }] },
          config: {
            responseMimeType: "application/json",
            responseSchema: NEXT_WORKOUT_SCHEMA as any,
            temperature: 0.2,
          },
        });

      const callWithRetry = async () => {
        try {
          return await generate();
        } catch (err: any) {
          const { reasonCode } = classifyError(err);
          if (reasonCode !== "AI_OVERLOADED") throw err;
          const delay = 800 + Math.floor(Math.random() * 400);
          console.warn("[generateNextWorkout] overload, retrying once", {
            requestId,
            delay,
          });
          await sleep(delay);
          return await generate();
        }
      };

      const response: any = await callWithRetry();

      const text = response.text;
      if (!text) {
        throw Object.assign(new Error("AI returned empty response."), {
          _reasonCode: "AI_EMPTY_RESPONSE",
        });
      }

      const data = JSON.parse(text) as GeneratedWorkout;
      return data;
    } catch (error: any) {
      console.error("[generateNextWorkout] error", {
        requestId,
        uid,
        message: error?.message,
      });

      const forced = error?._reasonCode as ReasonCode | undefined;
      const { reasonCode } = forced
        ? { reasonCode: forced }
        : classifyError(error);

      const publicPayload = toPublicError(reasonCode, requestId);

      const callableCode =
        reasonCode === "UNAUTHENTICATED"
          ? "unauthenticated"
          : reasonCode === "BAD_INPUT" || reasonCode === "AI_REJECTED"
          ? "invalid-argument"
          : reasonCode === "AI_OVERLOADED" || reasonCode === "RATE_LIMITED"
          ? "resource-exhausted"
          : "internal";

      throw new HttpsError(callableCode as any, JSON.stringify(publicPayload));
    }
  }
);

// 4. The Cloud Function
export const processWorkoutScreenshots = onCall(
  {
    secrets: [geminiApiKey],
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: "1GiB",
    region: "us-central1",
  },
  async (request) => {
    const requestId = makeRequestId();

    // A. Authentication Check
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        JSON.stringify(toPublicError("UNAUTHENTICATED", requestId))
      );
    }

    // C. Input Validation
    const { images, timezone } = request.data;

    if (!Array.isArray(images) || images.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        JSON.stringify(toPublicError("BAD_INPUT", requestId))
      );
    }
    if (images.length > 5) {
      throw new HttpsError(
        "invalid-argument",
        JSON.stringify(toPublicError("BAD_INPUT", requestId))
      );
    }

    // Approx size check (20MB limit)
    const totalSize = images.reduce(
      (acc: number, img: any) => acc + (img.base64?.length || 0),
      0
    );
    if (totalSize > 20_000_000) {
      throw new HttpsError(
        "invalid-argument",
        JSON.stringify(toPublicError("PAYLOAD_TOO_LARGE", requestId))
      );
    }

    // ✅ Rate limit (auth-only)
    await enforceRateLimits(request.auth.uid);

    try {
      // D. Initialize Gemini
      const apiKey = geminiApiKey.value();
      if (!apiKey) {
        console.error("Gemini API Key is missing from secrets configuration.");
        throw new HttpsError(
          "internal",
          JSON.stringify(toPublicError("SERVER_CONFIG", requestId))
        );
      }

      const ai = new GoogleGenAI({ apiKey });
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
          let mimeType = img.mimeType;
          if (!mimeType || !mimeType.startsWith("image/")) {
            mimeType = "image/jpeg";
          }
          return {
            inlineData: {
              mimeType,
              data: img.base64,
            },
          };
        }),
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
          console.warn("[processWorkoutScreenshots] overload, retrying once", {
            requestId,
            delay,
          });
          await sleep(delay);

          return await generate(); // second (final) attempt
        }
      };

      const response: any = await callWithRetry();

      // H. Parse Response
      const text = response.text;
      if (!text) {
        throw Object.assign(new Error("AI returned empty response."), {
          status: 520,
          _reasonCode: "AI_EMPTY_RESPONSE",
        });
      }

      const rawData = JSON.parse(text) as WorkoutResponse;

      return {
        workoutDate: rawData.workoutDate,
        exercises: rawData.exercises,
      };
    } catch (error: any) {
      console.error("[processWorkoutScreenshots] error", {
        requestId,
        uid: request.auth?.uid,
        status: error?.status ?? error?.code,
        message: error?.message,
        raw: error,
      });

      const forced = error?._reasonCode as ReasonCode | undefined;
      const { reasonCode } = forced ? { reasonCode: forced } : classifyError(error);

      const publicPayload = toPublicError(reasonCode, requestId);

      const callableCode =
        reasonCode === "UNAUTHENTICATED"
          ? "unauthenticated"
          : reasonCode === "BAD_INPUT" ||
            reasonCode === "PAYLOAD_TOO_LARGE" ||
            reasonCode === "AI_REJECTED"
          ? "invalid-argument"
          : reasonCode === "AI_OVERLOADED" || reasonCode === "RATE_LIMITED"
          ? "resource-exhausted"
          : "internal";

      throw new HttpsError(callableCode as any, JSON.stringify(publicPayload));
    }
  }
);
