import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/insights",
  "Insights",
  "Charts of your completed tasks, streaks, training volume and check-ins, computed on your device.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
