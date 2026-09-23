import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/today",
  "Today",
  "Your day at a glance: a live clock and Richmond Hill weather, three priorities, a backlog, and what is due soon.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
