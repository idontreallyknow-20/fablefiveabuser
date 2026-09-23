"use client";

import { localDb } from "@/lib/local/client";
import type { UserBackground } from "@/lib/backgrounds/data";

const MAX_IMAGE_EDGE = 2560;
const WEBP_QUALITY = 0.85;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

async function userId(): Promise<string> {
  const supabase = localDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

/** average color of a frame, downsampled to 16x16 (see spotify/glow.ts) */
function averageColor(source: CanvasImageSource): string {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#101014";
  ctx.drawImage(source, 0, 0, 16, 16);
  const { data } = ctx.getImageData(0, 0, 16, 16);
  let r = 0,
    g = 0,
    b = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const hex = (v: number) =>
    Math.round(v / n)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
      type,
      quality,
    );
  });
}

interface PreparedUpload {
  kind: "image" | "video";
  blob: Blob;
  ext: string;
  contentType: string;
  avgColor: string;
  width: number | null;
  height: number | null;
  durationS: number | null;
}

async function prepareImage(file: File): Promise<PreparedUpload> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Unreadable image");
  }
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await toBlob(canvas, "image/webp", WEBP_QUALITY);
    return {
      kind: "image",
      blob,
      ext: "webp",
      contentType: "image/webp",
      avgColor: averageColor(canvas),
      width: w,
      height: h,
      durationS: null,
    };
  } finally {
    bitmap.close();
  }
}

/** probes duration/size via a temp element and grabs a poster frame at 0.5s */
async function prepareVideo(file: File): Promise<PreparedUpload> {
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Video over 60MB");
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Unreadable video"));
      video.src = url;
    });
    if (!Number.isFinite(video.duration) || video.duration > MAX_VIDEO_SECONDS) {
      throw new Error("Video over 60s");
    }
    // poster frame for the average color
    await new Promise<void>((resolve) => {
      // some containers never fire seeked; resolve either way
      const t = setTimeout(() => resolve(), 1500);
      video.onseeked = () => {
        clearTimeout(t);
        resolve();
      };
      video.currentTime = Math.min(0.5, video.duration / 2);
    });
    const frame = document.createElement("canvas");
    frame.width = video.videoWidth || 16;
    frame.height = video.videoHeight || 16;
    let avgColor = "#101014";
    try {
      const fctx = frame.getContext("2d");
      if (fctx) {
        fctx.drawImage(video, 0, 0, frame.width, frame.height);
        avgColor = averageColor(frame);
      }
    } catch {
      // tainted or undrawable frame: keep the fallback color
    }
    return {
      kind: "video",
      blob: file,
      ext: VIDEO_TYPES[file.type],
      contentType: file.type,
      avgColor,
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      durationS: Math.round(video.duration * 10) / 10,
    };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

/**
 * Processes a file client-side (images re-encode to capped WebP, videos pass
 * through under hard caps), uploads it to the private `backgrounds` bucket at
 * {uid}/{id}.{ext}, and inserts the metadata row.
 */
export async function uploadBackground(file: File): Promise<UserBackground> {
  let prepared: PreparedUpload;
  if (file.type.startsWith("image/")) {
    prepared = await prepareImage(file);
  } else if (file.type in VIDEO_TYPES) {
    prepared = await prepareVideo(file);
  } else {
    throw new Error("Unsupported file type");
  }

  const supabase = localDb();
  const uid = await userId();
  const id = crypto.randomUUID();
  const path = `${uid}/${id}.${prepared.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("backgrounds")
    .upload(path, prepared.blob, { contentType: prepared.contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("user_backgrounds")
    .insert({
      id,
      user_id: uid,
      kind: prepared.kind,
      path,
      avg_color: prepared.avgColor,
      width: prepared.width,
      height: prepared.height,
      duration_s: prepared.durationS,
      size_bytes: prepared.blob.size,
    })
    .select()
    .single();
  if (error) {
    // don't strand the object if the row insert failed
    await supabase.storage.from("backgrounds").remove([path]).catch(() => {});
    throw error;
  }
  return data;
}
