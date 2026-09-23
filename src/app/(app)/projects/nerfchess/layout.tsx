import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/projects/nerfchess",
  "NerfChess",
  "Product and marketing pipelines for NerfChess, the chess variant by Joseph Leung.",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
