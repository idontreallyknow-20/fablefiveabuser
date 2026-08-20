// Curated free-license sources for aesthetic moving and still backdrops.
// Rendered as name-only chips on /space/appearance.

export type InspirationKind = "video" | "photo" | "art";

export interface InspirationSource {
  name: string;
  url: string;
  kind: InspirationKind;
}

export const INSPIRATION_SOURCES: InspirationSource[] = [
  { name: "Coverr", url: "https://coverr.co", kind: "video" },
  { name: "Pexels", url: "https://www.pexels.com/videos/", kind: "video" },
  { name: "Pixabay", url: "https://pixabay.com/videos/", kind: "video" },
  { name: "Mixkit", url: "https://mixkit.co/free-stock-video/", kind: "video" },
  { name: "Videvo", url: "https://www.videvo.net/free-stock-video/", kind: "video" },
  { name: "Unsplash", url: "https://unsplash.com", kind: "photo" },
  { name: "NASA", url: "https://images.nasa.gov", kind: "photo" },
  {
    name: "The Met",
    url: "https://www.metmuseum.org/art/collection/search?showOnly=openAccess",
    kind: "art",
  },
  {
    name: "Wikimedia",
    url: "https://commons.wikimedia.org/wiki/Commons:Featured_pictures",
    kind: "art",
  },
];
