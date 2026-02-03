import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app, "us-central1");
const processWorkoutScreenshotsFn = httpsCallable(functions, "processWorkoutScreenshots");

type ImagePayload = {
  base64: string;      // may be full data URL or raw base64
  mimeType?: string;   // optional
  timestamp?: number;
};

function splitDataUrl(input: string) {
  if (!input.includes(",")) return { mimeType: undefined, base64: input };
  const [header, data] = input.split(",", 2);
  const mimeType = header.match(/data:(.*?);base64/)?.[1];
  return { mimeType, base64: data };
}

export async function processWorkoutScreenshots(images: ImagePayload[]) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const payload = images.map((img) => {
    const parts = splitDataUrl(img.base64);
    return {
      base64: parts.base64,
      mimeType: img.mimeType ?? parts.mimeType ?? "image/jpeg",
      timestamp: img.timestamp ?? Date.now(),
    };
  });

  try {
    const res = await processWorkoutScreenshotsFn({ images: payload, timezone });
    return (res as any).data;
  } catch (err: any) {
    // Firebase callable errors often put the server message into err.message
    const rawMsg = String(err?.message ?? "");

    let parsed: any = null;

    // Our server sends JSON as the error message
    try {
      parsed = JSON.parse(rawMsg);
    } catch {
      // Firebase sometimes prefixes the message; try to extract JSON
      const jsonStart = rawMsg.indexOf("{");
      const jsonEnd = rawMsg.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
          parsed = JSON.parse(rawMsg.slice(jsonStart, jsonEnd + 1));
        } catch {}
      }
    }

    // If this is one of our structured errors, rethrow cleanly
    if (parsed?.requestId && parsed?.reasonCode && parsed?.message) {
      throw { ...parsed, original: err };
    }

    // Fallback
    throw {
      ok: false,
      reasonCode: "UNKNOWN",
      message: "Something went wrong. Please try again.",
      requestId: "N/A",
      original: err,
    };
  }
}

  const res = await processWorkoutScreenshotsFn({ images: payload, timezone });
  return (res as any).data;
}
