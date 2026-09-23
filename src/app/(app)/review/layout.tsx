import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/review",
  "Weekly review",
  "Clear overdue tasks one decision at a time: do it today, move it, or let it go.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
