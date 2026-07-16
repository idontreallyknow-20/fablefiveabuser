// Server-side environment access. Integrations degrade to polished
// disconnected states when their variables are unset; nothing is faked.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  publicSignupsEnabled: process.env.PUBLIC_SIGNUPS_ENABLED === "true",
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID ?? "",
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  aiProvider: process.env.AI_PROVIDER ?? "none",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  aiFeaturesEnabled: process.env.AI_FEATURES_ENABLED === "true",
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "",
};

export const integrationStatus = {
  get spotify() {
    return Boolean(env.spotifyClientId && env.spotifyClientSecret && env.supabaseServiceRoleKey);
  },
  get google() {
    return Boolean(env.googleClientId && env.googleClientSecret && env.supabaseServiceRoleKey);
  },
  get serviceRole() {
    return Boolean(env.supabaseServiceRoleKey);
  },
  get push() {
    return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
  },
  get ai() {
    return env.aiFeaturesEnabled && env.aiProvider === "anthropic" && Boolean(env.anthropicApiKey);
  },
};
