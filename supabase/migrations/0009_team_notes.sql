-- Shared team notes: one plain-text pad per team, autosaved from the team
-- page. Any member may edit; writes go straight through RLS (no RPC).

alter table public.teams
  add column if not exists notes text not null default '';

-- members update the team row directly (notes today; name/accent tomorrow)
drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update using (public.is_team_member(id))
  with check (public.is_team_member(id));

-- keep signed-in-only surface: anon executes nothing
revoke execute on function public.create_team(text, text) from anon;
revoke execute on function public.join_team(text, text) from anon;
revoke execute on function public.claim_team_day(uuid, date) from anon;
revoke execute on function public.team_today(uuid, date) from anon;
revoke execute on function public.team_streak(uuid) from anon;
revoke execute on function public.is_team_member(uuid) from anon;
revoke execute on function public.profile_count() from anon;
