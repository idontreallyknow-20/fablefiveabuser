# Orbit

A calm daily dashboard: a nighttime city (or snow, aurora, ocean, and more)
behind glass that follows the real weather and sky, with the few things that
matter today on top. Free, no account, and everything stays on your device.

Live: https://aesthetic-inky-seven.vercel.app

## What's inside

- **Today**: an oversized clock, live weather, three priorities, a backlog,
  and a customizable widget grid.
- **Calendar**: month, week and agenda views over tasks, repeats and routines.
- **Projects**: lists and boards, plus NerfChess product and marketing pipelines.
- **Train**: calisthenics and gym logging with personal records.
- **Reflect**: check-ins, self-care, nutrition and journaling.
- **Focus, Ambient, Sounds**: a focus timer, a full-screen idle scene, a
  soundboard and a generative lofi bed.
- **Displays**: give each monitor a role; windows sync live.
- Installable PWA, works offline once loaded.

## How it works

There is no backend database. `src/lib/local/client.ts` is a small
Supabase-shaped query client over IndexedDB, so the data hooks read like
ordinary PostgREST code while every row stays in the browser. Backups export
and restore from Space -> Data.

Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS v4, TanStack Query,
zustand, Open-Meteo, Vercel.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # production build
npm run test       # unit tests (vitest)
npm run typecheck
npm run lint
# end-to-end drive against a running server (needs Chromium)
CHROMIUM_PATH=/path/to/chrome node tests/e2e/drive.mjs /tmp/shots
```

No environment variables are needed. See `.env.example` for the optional
assistant and `docs/DEPLOYMENT.md` for deployment notes.

## Built by

Built by [Joseph Leung](https://josephleung-site.vercel.app), a student
founder in Richmond Hill, Ontario.
