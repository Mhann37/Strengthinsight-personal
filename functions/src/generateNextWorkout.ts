import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Guard against double-init when this module is loaded alongside index.ts
if (!getApps().length) initializeApp();
const adminDb = getFirestore();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const makeRequestId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Muscle group inference ────────────────────────────────────
const muscleGroupMap: Record<string, string> = {
  // Chest
  "bench press": "chest",
  "incline bench": "chest",
  "chest fly": "chest",
  "push up": "chest",
  "chest press": "chest",
  "pec deck": "chest",
  // Back
  "deadlift": "back",
  "bent over row": "back",
  "pull up": "back",
  "lat pulldown": "back",
  "seated row": "back",
  "t-bar row": "back",
  "cable row": "back",
  "chin up": "back",
  // Shoulders
  "overhead press": "shoulders",
  "lateral raise": "shoulders",
  "front raise": "shoulders",
  "face pull": "shoulders",
  "shoulder press": "shoulders",
  "military press": "shoulders",
  "arnold press": "shoulders",
  // Legs
  "squat": "legs",
  "leg press": "legs",
  "romanian deadlift": "legs",
  "leg curl": "legs",
  "leg extension": "legs",
  "calf raise": "legs",
  "lunge": "legs",
  "hack squat": "legs",
  "hip thrust": "legs",
  "glute bridge": "legs",
  // Arms
  "bicep curl": "arms",
  "tricep": "arms",
  "hammer curl": "arms",
  "skull crusher": "arms",
  "preacher curl": "arms",
  "cable curl": "arms",
  "close grip": "arms",
  // Core
  "plank": "core",
  "crunch": "core",
  "ab ": "core",
  "sit up": "core",
  "russian twist": "core",
};

function getMuscleGroup(exerciseName: string): string {
  const lower = exerciseName.toLowerCase();
  for (const [key, group] of Object.entries(muscleGroupMap)) {
    if (lower.includes(key)) return group;
  }
  return "other";
}

// ── 1RM estimation (Epley) ────────────────────────────────────
function epley1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

function toKgIfNeeded(weight: number, unit: string): number {
  if (unit === "lbs") return Math.round(weight * 0.453592 * 10) / 10;
  return Number(weight) || 0;
}

// Round to nearest 1.25kg increment
function roundToNearest125(kg: number): number {
  return Math.round(kg / 1.25) * 1.25;
}

// ── Exercise summary types ─────────────────────────────────────
interface ExerciseSummary {
  name: string;
  muscle_group: string;
  last_weight_kg: number;
  last_sets: number;
  last_reps: number;
  estimated_1rm: number;
  trend: "progressing" | "plateau" | "regressing";
  last_trained_days_ago: number;
  suggested_weight_kg: number;
  plateau: boolean;
}

interface AthleteSummary {
  days_since_last_session: number;
  recovery_score?: number;
  recently_trained_muscle_groups: string[];
  sessions_this_week: number;
  exercises: ExerciseSummary[];
}

// ── Pre-processing: build athlete summary ─────────────────────
async function buildAthleteSummary(uid: string): Promise<AthleteSummary> {
  const workoutsCol = adminDb.collection("workouts");
  const now = Date.now();

  // Fetch last 30 sessions — enough for trend calc across all exercises
  const snap = await workoutsCol
    .where("userId", "==", uid)
    .orderBy("date", "desc")
    .limit(30)
    .get();

  if (snap.empty) {
    throw new HttpsError(
      "failed-precondition",
      "No sessions found. Log at least 3 workouts first."
    );
  }

  const sessions = snap.docs.map((d) => {
    const data = d.data();
    return {
      date: String(data.date ?? ""),
      dateMs: new Date(data.date).getTime(),
      exercises: (data.exercises ?? []) as any[],
      recoveryScore: data.recoveryScore as number | undefined,
    };
  });

  // Days since last session
  const lastSessionMs = sessions[0]?.dateMs ?? now;
  const daysSinceLast = Math.max(
    0,
    Math.floor((now - lastSessionMs) / (1000 * 60 * 60 * 24))
  );

  // Sessions this week (Mon–Sun ISO week)
  const startOfWeek = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(d);
    mon.setDate(mon.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon.getTime();
  })();
  const sessionsThisWeek = sessions.filter((s) => s.dateMs >= startOfWeek).length;

  // Recovery score: check WHOOP integration first, then last session
  let recoveryScore: number | undefined;
  try {
    const whoopSnap = await adminDb
      .doc(`users/${uid}/integrations/whoop`)
      .get();
    if (whoopSnap.exists) {
      const d = whoopSnap.data();
      const score = d?.recovery_score ?? d?.recoveryScore;
      if (typeof score === "number") recoveryScore = score;
    }
  } catch {
    // WHOOP doc may not exist — fall through
  }
  if (recoveryScore === undefined) {
    for (const s of sessions) {
      if (typeof s.recoveryScore === "number") {
        recoveryScore = s.recoveryScore;
        break;
      }
    }
  }

  // Recently trained muscle groups (last 2 sessions)
  const recentlyTrainedGroups = new Set<string>();
  for (const session of sessions.slice(0, 2)) {
    for (const ex of session.exercises) {
      const group = getMuscleGroup(ex?.name ?? "");
      if (group !== "other") recentlyTrainedGroups.add(group);
    }
  }

  // Build per-exercise history
  // Map: exerciseName → list of { dateMs, weightKg, sets, reps, est1RM }
  const exerciseHistory = new Map<
    string,
    { dateMs: number; weightKg: number; sets: number; reps: number; est1RM: number }[]
  >();

  for (const session of sessions) {
    for (const ex of session.exercises) {
      const name: string = ex?.name ?? "Unknown";
      if (!name || name === "Unknown") continue;
      const rawSets: any[] = ex?.sets ?? [];
      if (rawSets.length === 0) continue;

      // Peak weight in this session for this exercise
      let peakWeightKg = 0;
      let peakReps = 0;
      let totalSets = 0;

      for (const s of rawSets) {
        const wKg = toKgIfNeeded(Number(s?.weight) || 0, s?.unit ?? "kg");
        const reps = Number(s?.reps) || 0;
        if (reps === 0 || wKg === 0) continue;
        const e1rm = epley1RM(wKg, reps);
        if (e1rm > epley1RM(peakWeightKg, peakReps)) {
          peakWeightKg = wKg;
          peakReps = reps;
        }
        totalSets++;
      }

      if (peakWeightKg === 0 || totalSets === 0) continue;

      const entry = {
        dateMs: session.dateMs,
        weightKg: peakWeightKg,
        sets: totalSets,
        reps: peakReps,
        est1RM: epley1RM(peakWeightKg, peakReps),
      };

      if (!exerciseHistory.has(name)) exerciseHistory.set(name, []);
      exerciseHistory.get(name)!.push(entry);
    }
  }

  // Build ExerciseSummary for each exercise, sort by recency, cap at 10
  const summaries: ExerciseSummary[] = [];

  for (const [name, appearances] of exerciseHistory.entries()) {
    // appearances are already in descending date order (from session order)
    const most_recent = appearances[0];
    const last_trained_days_ago = Math.max(
      0,
      Math.floor((now - most_recent.dateMs) / (1000 * 60 * 60 * 24))
    );

    // 1RM trend: last 3 vs prior 3 appearances
    const last3 = appearances.slice(0, 3);
    const prior3 = appearances.slice(3, 6);

    const avg1RM = (arr: typeof last3) =>
      arr.reduce((s, a) => s + a.est1RM, 0) / arr.length;

    let trend: ExerciseSummary["trend"];
    if (prior3.length === 0) {
      trend = "progressing"; // not enough history — be optimistic
    } else {
      const avgLast = avg1RM(last3);
      const avgPrior = avg1RM(prior3);
      if (avgLast > avgPrior * 1.02) trend = "progressing";
      else if (avgLast < avgPrior * 0.97) trend = "regressing";
      else trend = "plateau";
    }

    const plateau = trend === "plateau";

    // Suggested weight
    let suggested_weight_kg: number;
    if (trend === "progressing") {
      suggested_weight_kg = roundToNearest125(most_recent.weightKg + 2.5);
    } else if (trend === "regressing") {
      suggested_weight_kg = Math.max(
        roundToNearest125(most_recent.weightKg - 2.5),
        0
      );
    } else {
      suggested_weight_kg = most_recent.weightKg;
    }

    summaries.push({
      name,
      muscle_group: getMuscleGroup(name),
      last_weight_kg: Math.round(most_recent.weightKg * 10) / 10,
      last_sets: most_recent.sets,
      last_reps: most_recent.reps,
      estimated_1rm: Math.round(most_recent.est1RM * 10) / 10,
      trend,
      last_trained_days_ago,
      suggested_weight_kg: Math.round(suggested_weight_kg * 10) / 10,
      plateau,
    });
  }

  // Sort by last_trained_days_ago ascending (most recently trained first)
  // then cap to 10 most relevant exercises (enough for Gemini to pick 5)
  summaries.sort((a, b) => a.last_trained_days_ago - b.last_trained_days_ago);
  const topExercises = summaries.slice(0, 10);

  const summary: AthleteSummary = {
    days_since_last_session: daysSinceLast,
    recently_trained_muscle_groups: Array.from(recentlyTrainedGroups),
    sessions_this_week: sessionsThisWeek,
    exercises: topExercises,
  };

  // Only include recovery_score if we have a value
  if (typeof recoveryScore === "number") {
    summary.recovery_score = recoveryScore;
  }

  return summary;
}

// ── Gemini prompt ──────────────────────────────────────────────
function buildPrompt(summary: AthleteSummary): string {
  return `You are a strength and conditioning coach. An athlete's training data has been pre-analysed for you. Your job is to select 5 exercises for their next session and write a short coaching note.

ATHLETE SUMMARY:
${JSON.stringify(summary, null, 0)}

SELECTION RULES (apply in order):
1. Do not select any exercise where last_trained_days_ago < 2
2. Do not select more than 2 exercises from the same muscle group
3. Avoid muscle groups listed in recently_trained_muscle_groups unless last_trained_days_ago >= 3
4. Prefer exercises with trend: "progressing" or "plateau" over "regressing"
5. Use the pre-calculated suggested_weight_kg as the target weight — do not recalculate
6. For plateau exercises: keep the weight, but reduce reps by 1 and add "drop set" to progression_note
7. If recovery_score is present and below 50: reduce sets by 1 on all exercises (minimum 2 sets)
8. Select exactly 5 exercises

OUTPUT RULES:
- progression_direction must be exactly one of: "up", "maintain", "down", "rep_increase"
- progression_note should be brief: "+2.5kg", "maintain", "drop set", "-1 rep + drop set"
- coach_note: one sentence, max 15 words, must reference a specific number from the data
- estimated_volume_kg: calculate as sum of (sets × reps × weight_kg) across all exercises
- focus: one of "Upper Strength", "Lower Strength", "Upper Hypertrophy", "Lower Hypertrophy", "Full Body"

Respond ONLY with this JSON object. No preamble, no explanation, no markdown backticks:
{"focus":"","exercises":[{"name":"","sets":0,"reps":0,"weight_kg":0,"progression_note":"","progression_direction":""}],"estimated_volume_kg":0,"coach_note":""}`;
}

// ── Gemini response schema ────────────────────────────────────
// Using plain object validation instead of Type.OBJECT to avoid import
// dependency drift — response is small enough to validate manually.
interface GeneratedWorkout {
  focus: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    weight_kg: number;
    progression_note: string;
    progression_direction: "up" | "maintain" | "down" | "rep_increase";
  }[];
  estimated_volume_kg: number;
  coach_note: string;
}

function validateResponse(data: any): GeneratedWorkout {
  if (
    typeof data?.focus !== "string" ||
    !Array.isArray(data?.exercises) ||
    data.exercises.length === 0
  ) {
    throw new Error("Invalid AI response structure");
  }
  return data as GeneratedWorkout;
}

// ── JSON safety net ───────────────────────────────────────────
function safeParseWorkoutJSON(raw: string): any {
  let cleaned = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  console.info('[generateNextWorkout] cleaned response first 50 chars:', cleaned.substring(0, 50));

  if (!cleaned.endsWith('}')) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > 0) {
      cleaned = cleaned.substring(0, lastBrace + 1);
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) cleaned += ']}';
    }
  }
  return JSON.parse(cleaned);
}

// ── Cloud Function ─────────────────────────────────────────────
export const generateNextWorkout = onCall(
  {
    secrets: [geminiApiKey],
    maxInstances: 10,
    timeoutSeconds: 30,
    memory: "256MiB",
    region: "us-central1",
  },
  async (request) => {
    const requestId = makeRequestId();

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please sign in to generate a workout."
      );
    }

    const uid = request.auth.uid;

    // Rate limit reuses rateLimitsUsers collection
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const minBucket = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}_${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`;
    const dayBucket = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}`;

    const userMinuteRef = adminDb.doc(`rateLimitsUsers/${uid}/minutes/${minBucket}`);
    const userDayRef = adminDb.doc(`rateLimitsUsers/${uid}/days/${dayBucket}`);

    await adminDb.runTransaction(async (tx) => {
      const [umSnap, udSnap] = await Promise.all([
        tx.get(userMinuteRef),
        tx.get(userDayRef),
      ]);
      const umCount = (umSnap.exists ? (umSnap.data()?.count ?? 0) : 0) as number;
      const udCount = (udSnap.exists ? (udSnap.data()?.count ?? 0) : 0) as number;

      if (umCount + 1 > 5)
        throw Object.assign(new Error("rate_limited"), { _rl: true });
      if (udCount + 1 > 30)
        throw Object.assign(new Error("rate_limited"), { _rl: true });

      const base = { updatedAt: FieldValue.serverTimestamp() };
      if (!umSnap.exists) tx.set(userMinuteRef, { count: 1, ...base });
      else tx.update(userMinuteRef, { count: FieldValue.increment(1), ...base });
      if (!udSnap.exists) tx.set(userDayRef, { count: 1, ...base });
      else tx.update(userDayRef, { count: FieldValue.increment(1), ...base });
    });

    try {
      const apiKey = geminiApiKey.value();
      if (!apiKey) {
        throw new HttpsError(
          "internal",
          "Server configuration error. Please try again later."
        );
      }

      // Pre-process all data — Gemini only sees a compact summary
      const athleteSummary = await buildAthleteSummary(uid);

      // Trim to 6 exercises with only the fields Gemini needs
      const trimmedExercises = athleteSummary.exercises
        .slice(0, 6)
        .map((e) => ({
          name: e.name,
          last_trained_days_ago: e.last_trained_days_ago,
          suggested_weight_kg: e.suggested_weight_kg,
          last_sets: e.last_sets,
          last_reps: e.last_reps,
          trend: e.trend,
          plateau: e.plateau,
        }));

      const compactSummary = {
        days_since_last: athleteSummary.days_since_last_session,
        recovery_score: athleteSummary.recovery_score,
        recent_muscle_groups: athleteSummary.recently_trained_muscle_groups,
        exercises: trimmedExercises,
      };

      const prompt = buildPrompt(compactSummary as any);

      console.info("[generateNextWorkout] prompt length", {
        requestId,
        chars: prompt.length,
        exercises: trimmedExercises.length,
      });

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const generate = async () =>
        ai.models.generateContent({
          model,
          contents: { parts: [{ text: prompt }] },
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
            topP: 0.8,
            maxOutputTokens: 800,
          },
        });

      // Retry once on overload
      let response: any;
      try {
        response = await generate();
      } catch (err: any) {
        const msg = String(err?.message ?? "").toLowerCase();
        const isOverload =
          err?.status === 429 ||
          msg.includes("resource exhausted") ||
          msg.includes("overloaded") ||
          msg.includes("too many requests");
        if (!isOverload) throw err;
        const delay = 800 + Math.floor(Math.random() * 400);
        console.warn("[generateNextWorkout] overload — retrying once", { requestId, delay });
        await sleep(delay);
        response = await generate();
      }

      const text = response?.text;
      if (!text) {
        throw new Error("AI returned empty response.");
      }

      console.info("[generateNextWorkout] raw gemini response", {
        requestId,
        first100chars: text.substring(0, 100),
      });

      const data = validateResponse(safeParseWorkoutJSON(text));
      return data;
    } catch (error: any) {
      console.error("[generateNextWorkout] error", {
        requestId,
        uid,
        message: error?.message,
      });

      // Already-formatted HttpsErrors pass through
      if (error instanceof HttpsError) throw error;

      // Rate limit
      if (error?._rl) {
        throw new HttpsError(
          "resource-exhausted",
          "You've hit the usage limit. Please wait a minute and try again."
        );
      }

      const msg = String(error?.message ?? "");

      if (msg.includes("deadline-exceeded") || msg.includes("timeout")) {
        throw new HttpsError(
          "deadline-exceeded",
          "Taking longer than expected — please try again."
        );
      }
      if (msg.includes("FAILED_PRECONDITION") && msg.includes("index")) {
        throw new HttpsError(
          "failed-precondition",
          "Database index building — try again in 2 minutes."
        );
      }
      if (
        msg.includes("insufficient-permissions") ||
        msg.includes("PERMISSION_DENIED")
      ) {
        throw new HttpsError(
          "permission-denied",
          "Session access error — please sign out and back in."
        );
      }
      if (
        msg.includes("resource exhausted") ||
        msg.includes("overloaded") ||
        msg.includes("429")
      ) {
        throw new HttpsError(
          "resource-exhausted",
          "The AI service is busy right now. Please try again in 30 seconds."
        );
      }

      throw new HttpsError(
        "internal",
        "Something went wrong generating your workout. Please try again."
      );
    }
  }
);
