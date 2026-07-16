# Orbit

A personal atmospheric dashboard: a nighttime city behind glass that tracks
your day. Built with Next.js, Tailwind, and Supabase. The application name is
editable in Space, so it only says "Orbit" until you rename it.

## What it does

- **Today**: an oversized clock, live Richmond Hill weather, your next
  calendar event, and three priorities backed by a full backlog.
- **Orbit Guide**: deterministic, explainable priority recommendations (due
  dates, importance, deferrals, energy, time of day). No AI required.
- **Focus**: one task, a timer, music, and nothing else.
- **Ambient**: a composed idle screen with wake lock, burn-in protection, and
  late-night dimming. Starts automatically after inactivity.
- **Projects**: general projects with list and board views, plus NerfChess
  product and marketing pipelines with honest analytics.
- **Train**: calisthenics and gym logging with personal records and
  recovery notes.
- **Reflect**: low-pressure mental check-ins, self-care logging, journaling,
  and a small private relationship-care module.
- **11 themes**, each with an original canvas scene that reacts to real
  weather and real astronomical time. Rainy Midnight City is the default.
- **Multi-screen**: register each monitor, give it a role (Command Center,
  Calendar, Spotify, Ambient, and more), and changes sync live via Supabase
  Realtime.
- **Spotify** (Premium): playback control, multiple profiles, album-light.
- **Google Calendar**: two-way sync with loop prevention.
- **PWA**: installable on desktop and Android, with an offline shell.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase (Auth,
Postgres with RLS, Realtime) · Open-Meteo · Spotify Web API · Google Calendar
API · Vercel.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

The first account created becomes the owner (bootstrap); after that,
registration stays closed while `PUBLIC_SIGNUPS_ENABLED=false`.

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve production build
npm run test       # unit tests (vitest)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Documentation

- `docs/DESIGN.md` — binding art-direction brief and design tokens
- `docs/DEPLOYMENT.md` — Vercel + Supabase + OAuth setup, step by step
- `docs/research/` — the visual research and asset licensing reports
- `ASSET_CREDITS.md` — every third-party asset and its license
- `supabase/migrations/` — full schema with row level security
