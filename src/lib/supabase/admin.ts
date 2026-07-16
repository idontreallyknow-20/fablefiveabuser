import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { env } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS; used only in server routes that store
 * OAuth tokens and run calendar sync. Returns null when the key is not
 * configured so callers can respond with a clear "server not configured"
 * state instead of failing silently.
 */
export function supabaseAdmin() {
  if (!env.supabaseServiceRoleKey) return null;
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
