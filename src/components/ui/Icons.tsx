// Original line-icon set for Orbit. 1.5px stroke, 20px grid, quiet geometry.
// The Spotify mark is the exception: Spotify's developer policy requires
// their logo for attribution wherever Spotify content is shown.

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 18, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconToday = (p: P) => (
  <I {...p}>
    <circle cx="10" cy="10" r="3.2" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6L14 6M6 14l-1.4 1.4" />
  </I>
);

export const IconProjects = (p: P) => (
  <I {...p}>
    <path d="M3 6.5L10 3l7 3.5-7 3.5-7-3.5Z" />
    <path d="M3 10.5l7 3.5 7-3.5" />
    <path d="M3 14l7 3.5 7-3.5" opacity="0.5" />
  </I>
);

export const IconTrain = (p: P) => (
  <I {...p}>
    <path d="M2.5 10h2M15.5 10h2" />
    <rect x="4.5" y="6.5" width="2.5" height="7" rx="1" />
    <rect x="13" y="6.5" width="2.5" height="7" rx="1" />
    <path d="M7 10h6" />
  </I>
);

export const IconReflect = (p: P) => (
  <I {...p}>
    <path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z" />
  </I>
);

export const IconSpace = (p: P) => (
  <I {...p}>
    <circle cx="10" cy="10" r="3" />
    <ellipse cx="10" cy="10" rx="8" ry="3.2" transform="rotate(-22 10 10)" />
  </I>
);

export const IconPlay = (p: P) => (
  <I {...p}>
    <path d="M7 5.5v9l7.5-4.5L7 5.5Z" fill="currentColor" stroke="none" />
  </I>
);

export const IconPause = (p: P) => (
  <I {...p}>
    <rect x="6" y="5" width="2.4" height="10" rx="0.8" fill="currentColor" stroke="none" />
    <rect x="11.6" y="5" width="2.4" height="10" rx="0.8" fill="currentColor" stroke="none" />
  </I>
);

export const IconNext = (p: P) => (
  <I {...p}>
    <path d="M5 5.5v9L11.5 10 5 5.5Z" fill="currentColor" stroke="none" />
    <path d="M14 5.5v9" />
  </I>
);

export const IconPrev = (p: P) => (
  <I {...p}>
    <path d="M15 5.5v9L8.5 10 15 5.5Z" fill="currentColor" stroke="none" />
    <path d="M6 5.5v9" />
  </I>
);

export const IconVolume = (p: P) => (
  <I {...p}>
    <path d="M4 8v4h2.5L10 15V5L6.5 8H4Z" />
    <path d="M12.5 7.5a3.6 3.6 0 0 1 0 5" />
  </I>
);

export const IconDevice = (p: P) => (
  <I {...p}>
    <rect x="3" y="4" width="14" height="9" rx="1.5" />
    <path d="M7.5 16.5h5" />
  </I>
);

export const IconCalendar = (p: P) => (
  <I {...p}>
    <rect x="3" y="4.5" width="14" height="12" rx="2" />
    <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
  </I>
);

export const IconCheck = (p: P) => (
  <I {...p}>
    <path d="M4 10.5l4 4 8-9" />
  </I>
);

export const IconPlus = (p: P) => (
  <I {...p}>
    <path d="M10 4.5v11M4.5 10h11" />
  </I>
);

export const IconChevronRight = (p: P) => (
  <I {...p}>
    <path d="M7.5 4.5L13 10l-5.5 5.5" />
  </I>
);

export const IconSound = (p: P) => (
  <I {...p}>
    <path d="M4 8v4h3l4 3.5v-11L7 8H4z" />
    <path d="M13.5 7.5a3.5 3.5 0 010 5" />
  </I>
);

export const IconChevronLeft = (p: P) => (
  <I {...p}>
    <path d="M12.5 4.5L7 10l5.5 5.5" />
  </I>
);

export const IconChevronDown = (p: P) => (
  <I {...p}>
    <path d="M4.5 7.5L10 13l5.5-5.5" />
  </I>
);

export const IconDefer = (p: P) => (
  <I {...p}>
    <path d="M4 10h9M10 6.5l3.5 3.5-3.5 3.5" />
    <path d="M16 5v10" opacity="0.5" />
  </I>
);

export const IconNote = (p: P) => (
  <I {...p}>
    <path d="M5 3.5h10a1 1 0 0 1 1 1v8.5L12.5 16.5H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z" />
    <path d="M12.5 16.5V13H16" />
  </I>
);

export const IconLink = (p: P) => (
  <I {...p}>
    <path d="M8.5 11.5l3-3" />
    <path d="M7 13l-1.5 1.5a2.8 2.8 0 0 1-4-4L4.5 7.5" transform="translate(3 -1)" />
    <path d="M13 7l1.5-1.5a2.8 2.8 0 0 0-4-4L7.5 4.5" transform="translate(-1 3)" />
  </I>
);

export const IconTimer = (p: P) => (
  <I {...p}>
    <circle cx="10" cy="11" r="6" />
    <path d="M10 8v3.2l2.2 1.4M8 2.5h4" />
  </I>
);

export const IconAmbient = (p: P) => (
  <I {...p}>
    <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r="5.5" opacity="0.6" />
    <circle cx="10" cy="10" r="8" opacity="0.3" />
  </I>
);

export const IconFocus = (p: P) => (
  <I {...p}>
    <circle cx="10" cy="10" r="2.4" />
    <path d="M10 2.5V5M10 15v2.5M2.5 10H5M15 10h2.5" />
  </I>
);

export const IconEdit = (p: P) => (
  <I {...p}>
    <path d="M12.5 3.8l3.7 3.7L7 16.7l-4.3.6.6-4.3 9.2-9.2Z" />
  </I>
);

export const IconTrash = (p: P) => (
  <I {...p}>
    <path d="M4 5.5h12M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6 5.5l.7 10a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-10" />
  </I>
);

export const IconArchive = (p: P) => (
  <I {...p}>
    <rect x="3" y="4" width="14" height="4" rx="1" />
    <path d="M4.5 8v7a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 15.5 15V8M8 11h4" />
  </I>
);

export const IconGrip = (p: P) => (
  <I {...p}>
    <circle cx="7.5" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="14" r="1" fill="currentColor" stroke="none" />
  </I>
);

export const IconDisplay = (p: P) => (
  <I {...p}>
    <rect x="2.5" y="4" width="15" height="10" rx="1.5" />
    <path d="M8 17h4M10 14v3" />
  </I>
);

export const IconBell = (p: P) => (
  <I {...p}>
    <path d="M10 3a4.5 4.5 0 0 1 4.5 4.5c0 3.5 1 4.5 1.5 5H4c.5-.5 1.5-1.5 1.5-5A4.5 4.5 0 0 1 10 3Z" />
    <path d="M8.5 15.5a1.5 1.5 0 0 0 3 0" />
  </I>
);

export const IconSearch = (p: P) => (
  <I {...p}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M13.5 13.5L17 17" />
  </I>
);

export const IconLock = (p: P) => (
  <I {...p}>
    <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
  </I>
);

export const IconLogout = (p: P) => (
  <I {...p}>
    <path d="M8 3.5H5a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 5 16.5h3" />
    <path d="M12 6.5l3.5 3.5-3.5 3.5M15 10H8" />
  </I>
);

export const IconExport = (p: P) => (
  <I {...p}>
    <path d="M10 12.5v-9M6.5 6.5L10 3l3.5 3.5" />
    <path d="M4 12v3.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V12" />
  </I>
);

// weather set
export const IconRain = (p: P) => (
  <I {...p}>
    <path d="M6 11.5a4 4 0 1 1 .5-8 5 5 0 0 1 9.5 2 3 3 0 0 1-1 6" />
    <path d="M7 14l-1 2.5M11 14l-1 2.5M15 14l-1 2.5" />
  </I>
);

export const IconSnow = (p: P) => (
  <I {...p}>
    <path d="M6 11.5a4 4 0 1 1 .5-8 5 5 0 0 1 9.5 2 3 3 0 0 1-1 6" />
    <path d="M7 14.5v.01M11 16v.01M14 14v.01M9 17.5v.01" strokeWidth="2" />
  </I>
);

export const IconCloud = (p: P) => (
  <I {...p}>
    <path d="M6 15a4 4 0 1 1 .5-8 5 5 0 0 1 9.5 2 3.5 3.5 0 0 1-1.5 6H6Z" />
  </I>
);

export const IconClearNight = (p: P) => (
  <I {...p}>
    <path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z" />
    <path d="M15 4v.01M17 7v.01" strokeWidth="2" />
  </I>
);

export const IconClearDay = (p: P) => (
  <I {...p}>
    <circle cx="10" cy="10" r="3.5" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6L14 6M6 14l-1.4 1.4" />
  </I>
);

export const IconFog = (p: P) => (
  <I {...p}>
    <path d="M4 8h12M3 11h14M5 14h10" opacity="0.9" />
  </I>
);

export const IconStorm = (p: P) => (
  <I {...p}>
    <path d="M6 10.5a4 4 0 1 1 .5-8 5 5 0 0 1 9.5 2 3 3 0 0 1-1 6" />
    <path d="M11 10l-2.5 4h3L9 18" />
  </I>
);

export const IconWind = (p: P) => (
  <I {...p}>
    <path d="M3 8h9a2 2 0 1 0-2-2M3 12h12a2 2 0 1 1-2 2" />
  </I>
);

export const IconSunrise = (p: P) => (
  <I {...p}>
    <path d="M10 11V5M7.5 7.5L10 5l2.5 2.5" />
    <path d="M4 14a6 6 0 0 1 12 0" />
    <path d="M2.5 17h15" />
  </I>
);

export const IconSunset = (p: P) => (
  <I {...p}>
    <path d="M10 5v6M7.5 8.5L10 11l2.5-2.5" />
    <path d="M4 14a6 6 0 0 1 12 0" />
    <path d="M2.5 17h15" />
  </I>
);

/**
 * Spotify logo mark, reproduced for the attribution Spotify's design
 * guidelines require when showing Spotify content. Trademark of Spotify AB.
 */
export const IconSpotify = ({ size = 18, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="Spotify" {...rest}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.308a.747.747 0 0 1-1.029.249c-2.818-1.722-6.366-2.111-10.542-1.157a.748.748 0 0 1-.333-1.458c4.571-1.045 8.492-.595 11.655 1.338.353.215.464.676.249 1.028zm1.469-3.267a.935.935 0 0 1-1.286.311c-3.226-1.983-8.143-2.557-11.959-1.399a.936.936 0 0 1-.543-1.79c4.358-1.322 9.776-.682 13.477 1.593a.935.935 0 0 1 .311 1.285zm.126-3.403C15.23 8.34 8.845 8.128 5.15 9.249a1.122 1.122 0 0 1-.652-2.148c4.242-1.287 11.294-1.039 15.746 1.605a1.122 1.122 0 1 1-1.146 1.932z" />
  </svg>
);

export const IconInsights = (p: P) => (
  <I {...p}>
    <path d="M3.5 16.5v-5" />
    <path d="M8 16.5v-9" />
    <path d="M12.5 16.5v-6.5" />
    <path d="M17 16.5V5" />
  </I>
);

export const IconSpark = (p: P) => (
  <I {...p}>
    <path d="M10 3.5c.5 3.2 2.3 5 5.5 5.5-3.2.5-5 2.3-5.5 5.5-.5-3.2-2.3-5-5.5-5.5 3.2-.5 5-2.3 5.5-5.5Z" />
    <path d="M15.5 13.5c.25 1.4 1.1 2.25 2.5 2.5-1.4.25-2.25 1.1-2.5 2.5-.25-1.4-1.1-2.25-2.5-2.5 1.4-.25 2.25-1.1 2.5-2.5Z" />
  </I>
);

export const IconGoogle = ({ size = 18, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden {...rest}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 6.5v3.5h3.5" strokeLinecap="round" />
  </svg>
);
