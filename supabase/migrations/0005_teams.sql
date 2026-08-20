-- Teams: optional small groups (Joseph + Katherine sized, capped at 8)
-- with shared tasks, a privacy-preserving daily summary, and a shared
-- daily bonus ("aligned") when every member clears their priorities.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  accent text not null default '',
  invite_code text not null unique default encode(gen_random_bytes(6), 'base64'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.team_days (
  team_id uuid not null references public.teams (id) on delete cascade,
  date date not null,
  bonus_at timestamptz,
  primary key (team_id, date)
);

-- membership check as security definer so team_members policies can use it
-- without recursing into themselves
create or replace function public.is_team_member(t uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members where team_id = t and user_id = auth.uid()
  );
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_days enable row level security;

create policy teams_select on public.teams
  for select using (public.is_team_member(id));
create policy teams_insert on public.teams
  for insert with check (created_by = auth.uid());
create policy teams_update on public.teams
  for update using (public.is_team_member(id));
create policy teams_delete on public.teams
  for delete using (
    exists (
      select 1 from team_members
      where team_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

create policy team_members_select on public.team_members
  for select using (public.is_team_member(team_id));
-- joining happens exclusively through join_team(); leaving deletes own row
create policy team_members_delete on public.team_members
  for delete using (user_id = auth.uid());
create policy team_members_update_own on public.team_members
  for update using (user_id = auth.uid());

create policy team_days_select on public.team_days
  for select using (public.is_team_member(team_id));
-- writes only via claim_team_day()

-- creating a team also seats the creator as owner
create or replace function public.create_team(team_name text, member_name text)
returns public.teams
language plpgsql security definer
set search_path = public
as $$
declare
  new_team teams;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into teams (name, created_by)
    values (coalesce(team_name, ''), auth.uid())
    returning * into new_team;
  insert into team_members (team_id, user_id, role, display_name)
    values (new_team.id, auth.uid(), 'owner', coalesce(member_name, ''));
  return new_team;
end;
$$;

create or replace function public.join_team(code text, member_name text)
returns public.teams
language plpgsql security definer
set search_path = public
as $$
declare
  target teams;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select * into target from teams where invite_code = code;
  if target.id is null then
    raise exception 'invalid code';
  end if;
  select count(*) into member_count from team_members where team_id = target.id;
  if member_count >= 8 then
    raise exception 'team full';
  end if;
  insert into team_members (team_id, user_id, display_name)
    values (target.id, auth.uid(), coalesce(member_name, ''))
    on conflict (team_id, user_id) do nothing;
  return target;
end;
$$;

-- shared tasks: a task may belong to a team; members can see and update it
alter table public.tasks
  add column if not exists team_id uuid references public.teams (id) on delete set null;
create index if not exists tasks_team_idx on public.tasks (team_id)
  where team_id is not null;

drop policy if exists tasks_all_own on public.tasks;
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

create policy tasks_select on public.tasks
  for select using (
    user_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id))
  );
create policy tasks_insert on public.tasks
  for insert with check (
    user_id = auth.uid()
    and (team_id is null or public.is_team_member(team_id))
  );
create policy tasks_update on public.tasks
  for update using (
    user_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id))
  );
create policy tasks_delete on public.tasks
  for delete using (user_id = auth.uid());

-- per-member daily summary: counts only, never titles of private tasks
create or replace function public.team_today(t uuid, d date)
returns table (
  user_id uuid,
  display_name text,
  priorities_total int,
  priorities_done int
)
language sql stable security definer
set search_path = public
as $$
  select
    m.user_id,
    m.display_name,
    count(k.id)::int as priorities_total,
    count(k.completed_at)::int as priorities_done
  from team_members m
  left join tasks k
    on k.user_id = m.user_id and k.priority_date = d and k.priority_slot is not null
  where m.team_id = t
    and public.is_team_member(t)
  group by m.user_id, m.display_name, m.joined_at
  order by m.joined_at;
$$;

-- the shared bonus: stamps once when every member has set and finished
-- all of the day's priorities
create or replace function public.claim_team_day(t uuid, d date)
returns public.team_days
language plpgsql security definer
set search_path = public
as $$
declare
  row_out team_days;
  lagging int;
begin
  if not public.is_team_member(t) then
    raise exception 'not a member';
  end if;
  select count(*) into lagging
  from team_today(t, d)
  where priorities_total = 0 or priorities_done < priorities_total;
  if lagging > 0 then
    raise exception 'not aligned yet';
  end if;
  insert into team_days (team_id, date, bonus_at)
    values (t, d, now())
    on conflict (team_id, date)
    do update set bonus_at = coalesce(team_days.bonus_at, excluded.bonus_at)
    returning * into row_out;
  return row_out;
end;
$$;

-- consecutive bonus days ending today or yesterday
create or replace function public.team_streak(t uuid)
returns int
language sql stable security definer
set search_path = public
as $$
  with days as (
    select date from team_days
    where team_id = t and bonus_at is not null
    order by date desc
  ),
  numbered as (
    select date, row_number() over (order by date desc) as rn from days
  )
  select coalesce(count(*), 0)::int from numbered
  where date = (
    (select max(date) from days where date >= current_date - 1)
    - make_interval(days => (rn - 1)::int)
  )::date;
$$;

alter publication supabase_realtime add table public.team_days;
alter publication supabase_realtime add table public.team_members;
