import type { Metadata } from "next";
import { SpaceShell } from "./SpaceShell";

export const metadata: Metadata = {
  title: "Settings",
  description: "Themes, displays, notifications, routines, and backups for Orbit.",
  alternates: { canonical: "/space" },
  robots: { index: false, follow: true },
};

export default function SpaceLayout({ children }: { children: React.ReactNode }) {
  return <SpaceShell>{children}</SpaceShell>;
}
