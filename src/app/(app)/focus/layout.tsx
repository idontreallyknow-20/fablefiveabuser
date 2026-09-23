import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/focus",
  "Focus",
  "One task, a timer and a lofi soundscape. A distraction-free focus session.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
