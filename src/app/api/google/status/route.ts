import { NextResponse } from "next/server";
import { env, integrationStatus } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!integrationStatus.google) {
    return NextResponse.json({
      configured: false,
      connected: false,
      missing: {
        clientId: !env.googleClientId,
        clientSecret: !env.googleClientSecret,
        serviceRole: !env.supabaseServiceRoleKey,
      },
    });
  }

  const { data: accounts } = await supabase
    .from("integration_accounts")
    .select("id, label, external_id, email, is_active, meta")
    .eq("provider", "google")
    .order("created_at");

  return NextResponse.json({
    configured: true,
    connected: (accounts ?? []).length > 0,
    accounts: accounts ?? [],
  });
}
