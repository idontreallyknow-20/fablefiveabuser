-- Shared team notes: one plain-text pad per team, autosaved from the team
-- page. Any member may edit; writes go straight through RLS (no RPC).

alter table public.teams
  add column if not exists notes text not null default '';

-- members update the team row directly (notes today; name/accent tomorrow)
drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update using (public.is_team_member(id))
  with check (public.is_team_member(id));
