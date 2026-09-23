import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const ROUTES: { path: string; priority: number }[] = [
  { path: "/today", priority: 1 },
  { path: "/about", priority: 0.9 },
  { path: "/projects", priority: 0.7 },
  { path: "/projects/nerfchess", priority: 0.6 },
  { path: "/calendar", priority: 0.7 },
  { path: "/train", priority: 0.7 },
  { path: "/reflect", priority: 0.6 },
  { path: "/focus", priority: 0.6 },
  { path: "/sounds", priority: 0.5 },
  { path: "/insights", priority: 0.5 },
  { path: "/review", priority: 0.4 },
  { path: "/ambient", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
