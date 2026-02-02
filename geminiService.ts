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

  const res = await processWorkoutScreenshotsFn({ images: payload, timezone });
  return (res as any).data;
}
