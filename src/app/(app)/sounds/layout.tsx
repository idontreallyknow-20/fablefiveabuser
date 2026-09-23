import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/sounds",
  "Sounds",
  "A soundboard of synth pads and your own samples, with a generative lofi soundscape for focus.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
