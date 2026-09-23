"use client";

// Uploaded pad samples: validated by decoding, stored in the private
// `sounds` bucket, cached in memory (decoded) and idb (raw bytes) so
// pads fire instantly and keep working offline.

import { openDB, type IDBPDatabase } from "idb";
import { localDb } from "@/lib/local/client";
import { audioContext, masterBus, type Voice } from "@/lib/sound/engine";

const MAX_SAMPLE_BYTES = 2 * 1024 * 1024;

const decoded = new Map<string, AudioBuffer>();

let dbPromise: Promise<IDBPDatabase> | null = null;
function idb() {
  if (!dbPromise) {
    dbPromise = openDB("orbit-sounds", 1, {
      upgrade(db) {
        db.createObjectStore("samples");
      },
    });
  }
  return dbPromise;
}

async function userId(): Promise<string> {
  const supabase = localDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

/** validate, upload, and return the storage path for a new sample */
export async function uploadSample(file: File): Promise<string> {
  if (file.size > MAX_SAMPLE_BYTES) throw new Error("Samples are capped at 2 MB");
  const bytes = await file.arrayBuffer();
  // decode up front so broken files never reach storage
  await audioContext().decodeAudioData(bytes.slice(0));
  const uid = await userId();
  const ext = file.name.split(".").pop()?.toLowerCase() || "audio";
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const supabase = localDb();
  const { error } = await supabase.storage.from("sounds").upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  await (await idb()).put("samples", bytes, path);
  return path;
}

async function fetchSampleBytes(path: string): Promise<ArrayBuffer> {
  const cached = (await (await idb()).get("samples", path)) as ArrayBuffer | undefined;
  if (cached) return cached;
  const supabase = localDb();
  const { data, error } = await supabase.storage.from("sounds").download(path);
  if (error || !data) throw error ?? new Error("sample missing");
  const bytes = await data.arrayBuffer();
  await (await idb()).put("samples", bytes, path);
  return bytes;
}

export async function loadSample(path: string): Promise<AudioBuffer> {
  const hit = decoded.get(path);
  if (hit) return hit;
  const bytes = await fetchSampleBytes(path);
  const buf = await audioContext().decodeAudioData(bytes.slice(0));
  decoded.set(path, buf);
  return buf;
}

export function playSample(buffer: AudioBuffer, gain: number, loop: boolean): Voice {
  const ac = audioContext();
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = loop;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(masterBus());
  src.start();
  return {
    stop: () => {
      const t = ac.currentTime;
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      setTimeout(() => src.stop(), 200);
    },
  };
}

export async function deleteSample(path: string) {
  const supabase = localDb();
  await supabase.storage.from("sounds").remove([path]);
  decoded.delete(path);
  await (await idb()).delete("samples", path);
}
