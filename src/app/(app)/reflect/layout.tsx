import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/reflect",
  "Reflect",
  "Low-pressure daily check-ins for mood, energy and sleep, plus self-care, nutrition and journaling.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
