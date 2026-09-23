import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/calendar",
  "Calendar",
  "A month, week and agenda calendar that merges scheduled tasks, due dates, recurring tasks and daily routines.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
