import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/projects",
  "Projects",
  "Plan projects with list and board views, colour-coded tasks, milestones and checklists, all saved privately on your device.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
