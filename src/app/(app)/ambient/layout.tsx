import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/ambient",
  "Ambient",
  "A quiet full-screen clock over a living weather scene, made for a spare monitor.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
