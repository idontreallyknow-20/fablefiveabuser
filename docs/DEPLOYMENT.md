# Deploying Orbit

Orbit is a Next.js app with no database and no accounts. Every visitor's data
is stored in their own browser (IndexedDB), so deploying is just deploying
the Next.js app.

## Vercel

The Vercel project `aesthetic` deploys `main` to production at
https://aesthetic-inky-seven.vercel.app. Pushing to `main` redeploys.

No environment variables are required. Optional ones:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Canonical URL for metadata (defaults to the production URL, also set in `.env.production`) |
| `ANTHROPIC_API_KEY` | Enables the assistant drawer. The endpoint is public, so every visitor spends from this key |
| `AI_MODEL` | Assistant model, defaults to `claude-opus-5` |

Deployment Protection must allow public access to production, otherwise
visitors hit a Vercel login wall.

## Weather

Open-Meteo, no key. Richmond Hill is the default location; change it in
Space -> Connections.

## Install as an app

- Desktop (Chrome/Edge): address-bar install icon. Open one window per
  monitor and register each one in Space -> Displays; they stay in sync
  because they share the same browser storage.
- Android (Chrome): menu -> Add to Home screen. Allow notifications in
  Space -> Notifications.

## Backups

Space -> Data -> Full backup downloads a JSON file of everything on the
device. Restore it on another device from the same page. Clearing site data
in the browser erases Orbit's data, so export now and then.

## Legacy hosted version

Earlier versions stored data in a Supabase project (`orbit`,
ref `tezmxgexbqqgvpbkixzp`). The app no longer uses it and nothing was
deleted. Rows exported from it import through Space -> Data -> Restore,
since the on-device schema matches.
