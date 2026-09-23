// Public identity of the site: canonical URL, author, and structured data.

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://aesthetic-inky-seven.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "Orbit";
export const SITE_TAGLINE = "A calm daily dashboard by Joseph Leung";
export const SITE_DESCRIPTION =
  "Orbit is a free, private daily dashboard built by Joseph Leung: three priorities, " +
  "a calendar, training logs, focus timer, lofi, and living weather scenes. No account, " +
  "and your data stays on your device.";

export const AUTHOR = {
  name: "Joseph Leung",
  alternateName: "Joseph Wah Sing Leung",
  url: "https://josephleung-site.vercel.app",
  id: "https://josephleung-site.vercel.app/#joseph",
  sameAs: [
    "https://dailybriefhq.com",
    "https://dailybriefhq.com/about",
    "https://ratings.fide.com/profile/2636654",
    "https://www.chess.ca/en/ratings/p/?id=167606",
    "https://www.chess.com/member/squeakycrab",
    "https://lichess.org/@/BigTrustedCrabby",
    "https://lichess.org/@/UltraAddict2010",
    "https://www.linkedin.com/in/joseph-leung-21b3473bb/",
    "https://github.com/idontreallyknow-20",
    "https://nerfchess.com",
  ],
};

export function structuredData() {
  const person = {
    "@type": "Person",
    "@id": AUTHOR.id,
    name: AUTHOR.name,
    alternateName: AUTHOR.alternateName,
    url: AUTHOR.url,
    sameAs: AUTHOR.sameAs,
    homeLocation: {
      "@type": "Place",
      name: "Richmond Hill, Ontario, Canada",
    },
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en-CA",
        creator: { "@id": AUTHOR.id },
        publisher: { "@id": AUTHOR.id },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: `${SITE_URL}/today`,
        description: SITE_DESCRIPTION,
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
        creator: { "@id": AUTHOR.id },
        author: { "@id": AUTHOR.id },
      },
    ],
  };
}

/** per-page metadata with a canonical URL and matching social tags */
export function pageMeta(path: string, title: string, description: string) {
  return {
    title,
    description,
    alternates: { canonical: path },
    // nested objects replace the root ones rather than merging, so each page
    // restates the shared social fields
    openGraph: {
      type: "website" as const,
      siteName: SITE_NAME,
      locale: "en_CA",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: OG_ALT }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [OG_IMAGE],
    },
  };
}

export const OG_IMAGE = "/opengraph-image";
export const OG_ALT = "Orbit, a calm daily dashboard by Joseph Leung";
