import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/train",
  "Train",
  "Log calisthenics and gym sessions, track personal records for skills like muscle-ups and handstands, and note recovery.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
