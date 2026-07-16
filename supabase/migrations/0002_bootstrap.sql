-- Signup gating support. PUBLIC_SIGNUPS_ENABLED lives in the app environment;
-- the very first account (bootstrap) is always allowed. This counter lets the
-- server check "is this the first user" without the service role key.

create or replace function public.profile_count()
returns integer
language sql
security definer set search_path = public
stable
as $$
  select count(*)::integer from public.profiles;
$$;

revoke all on function public.profile_count() from public;
grant execute on function public.profile_count() to anon, authenticated;
