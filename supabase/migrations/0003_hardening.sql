-- Security hardening from the Supabase advisor run.

-- pin the trigger helper's search path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- the seeding trigger must never be callable through the API
revoke all on function public.seed_user_defaults() from public, anon, authenticated;

-- profile_count stays callable: it only reveals whether the first account
-- exists, which the signup gate needs before authentication.
