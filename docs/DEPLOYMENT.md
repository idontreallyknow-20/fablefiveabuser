# Deploying Orbit

The Supabase project already exists and has the full schema applied
(project ref `tezmxgexbqqgvpbkixzp`, region `ca-central-1`). What remains is
deploying the app to Vercel and, optionally, wiring up the integrations.

## 1. Vercel

```bash
npm install -g vercel
vercel login
vercel link          # from the repository root
vercel deploy --prod
```

Set these environment variables in the Vercel project (Settings ->
Environment Variables), for Production and Preview:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tezmxgexbqqgvpbkixzp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_at3E9oX8IV2dNK99-wpRqw_vQctW3iB` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard -> Project Settings -> API keys -> service_role |
| `PUBLIC_SIGNUPS_ENABLED` | `false` |
| `NEXT_PUBLIC_APP_URL` | your production URL, e.g. `https://orbit-yourname.vercel.app` |

Redeploy after changing environment variables.

## 2. First account

Open the deployed app, choose Create account, and sign up with your email.
The first account is always allowed (bootstrap); every later signup is
blocked while `PUBLIC_SIGNUPS_ENABLED=false`. Supabase sends a confirmation
email; confirm, then sign in.

To open registration for friends later, set `PUBLIC_SIGNUPS_ENABLED=true`
and redeploy. Every user gets a fully separate workspace enforced by row
level security.

## 3. Spotify (optional, requires Premium for in-browser playback)

1. https://developer.spotify.com/dashboard -> Create app.
2. Redirect URI: `https://YOUR-DOMAIN/api/spotify/callback`
   (and `http://localhost:3000/api/spotify/callback` for development).
3. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in Vercel.
4. In Orbit: Space -> Connections -> Connect Spotify. Add more profiles with
   "Add another profile"; switch with "Make active".

## 4. Google Calendar (optional)

1. https://console.cloud.google.com -> create a project -> enable the
   Google Calendar API.
2. OAuth consent screen: External, add yourself as a test user (or publish).
3. Credentials -> OAuth client ID -> Web application; redirect URI:
   `https://YOUR-DOMAIN/api/google/callback`.
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel.
5. In Orbit: Space -> Connections -> Connect Google Calendar, then choose
   which calendars appear.

## 5. Weather

Nothing to configure. Orbit uses Open-Meteo (no key) with Richmond Hill as
the default location; change it in Space -> Connections.

## 6. Install as an app

- Windows (Chrome/Edge): open the site -> address-bar install icon.
  Repeat on each of the three monitors' windows, then register each window
  as a display in Space -> Displays.
- Samsung Galaxy S25 (Chrome): menu -> Add to Home screen. Notifications
  work once allowed in Space -> Notifications.

## 7. Supabase maintenance

- Migrations live in `supabase/migrations/` and have already been applied.
- To regenerate DB types after schema changes:
  `npx supabase gen types typescript --project-id tezmxgexbqqgvpbkixzp > src/lib/db/types.ts`
- Free-tier projects pause after a week of inactivity; open the dashboard to
  restore, or upgrade the org if Orbit runs unattended on your monitors.

## 8. Backups

Space -> Data -> Download export produces a complete JSON of your data.
Supabase also keeps daily backups on paid plans; on the free tier, export
regularly.
