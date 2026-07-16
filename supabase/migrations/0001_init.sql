-- Orbit: initial schema
-- Every row belongs to a user. Isolation is enforced with row level security.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  app_name text not null default 'Orbit',
  settings jsonb not null default '{}'::jsonb,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'general'
    check (kind in ('general', 'nerf_product', 'nerf_marketing')),
  description text not null default '',
  statuses jsonb not null default '[]'::jsonb,
  color text,
  icon text,
  priority int not null default 2 check (priority between 1 and 3),
  archived boolean not null default false,
  milestones jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_idx on public.projects (user_id, archived);

alter table public.projects enable row level security;

create policy "projects_all_own" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks (backlog, project tasks, and the three daily priorities)
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  note text not null default '',
  status text not null default 'todo',
  importance int not null default 2 check (importance between 1 and 3),
  duration_min int,
  energy text check (energy in ('low', 'medium', 'high')),
  due_date date,
  scheduled_at timestamptz,
  scheduled_end_at timestamptz,
  priority_date date,
  priority_slot int check (priority_slot between 1 and 3),
  deferral_count int not null default 0,
  completed_at timestamptz,
  links jsonb not null default '[]'::jsonb,
  depends_on uuid[] not null default '{}',
  custom jsonb not null default '{}'::jsonb,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_idx on public.tasks (user_id, status);
create index tasks_user_project_idx on public.tasks (user_id, project_id);
create index tasks_user_due_idx on public.tasks (user_id, due_date);
create unique index tasks_priority_slot_uniq
  on public.tasks (user_id, priority_date, priority_slot)
  where priority_slot is not null and completed_at is null;

alter table public.tasks enable row level security;

create policy "tasks_all_own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- nerfchess marketing content
-- ---------------------------------------------------------------------------

create table public.nerf_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null default 'idea'
    check (stage in ('idea', 'script', 'record', 'edit', 'ready', 'posted', 'review', 'repurpose')),
  platforms text[] not null default '{}',
  format text not null default '',
  hook text not null default '',
  concept text not null default '',
  caption text not null default '',
  cta text not null default '',
  link text not null default '',
  publish_date date,
  metrics jsonb not null default '{}'::jsonb,
  notes text not null default '',
  repurpose_status text not null default '',
  next_action text not null default '',
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index nerf_content_user_idx on public.nerf_content (user_id, stage);

alter table public.nerf_content enable row level security;

create policy "nerf_content_all_own" on public.nerf_content
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger nerf_content_updated_at before update on public.nerf_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- fitness
-- ---------------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'push'
    check (category in ('push', 'pull', 'legs', 'core', 'skill', 'run', 'recovery')),
  metrics text[] not null default '{reps}',
  is_default boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index exercises_user_idx on public.exercises (user_id, category);

alter table public.exercises enable row level security;

create policy "exercises_all_own" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  split text not null default '',
  notes text not null default '',
  duration_min int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sessions_user_idx on public.workout_sessions (user_id, date desc);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_all_own" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger workout_sessions_updated_at before update on public.workout_sessions
  for each row execute function public.set_updated_at();

create table public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null default '',
  set_number int not null default 1,
  reps int,
  weight_kg numeric,
  hold_seconds numeric,
  distance_m numeric,
  time_seconds numeric,
  rpe numeric check (rpe is null or (rpe >= 1 and rpe <= 10)),
  form_note text not null default '',
  is_pr boolean not null default false,
  created_at timestamptz not null default now()
);

create index workout_entries_session_idx on public.workout_entries (session_id);
create index workout_entries_user_exercise_idx on public.workout_entries (user_id, exercise_id);

alter table public.workout_entries enable row level security;

create policy "workout_entries_all_own" on public.workout_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.recovery_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  kind text not null default 'recovery'
    check (kind in ('pain', 'tension', 'physio', 'mobility', 'recovery')),
  body_area text not null default '',
  severity int check (severity is null or (severity between 1 and 5)),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index recovery_notes_user_idx on public.recovery_notes (user_id, date desc);

alter table public.recovery_notes enable row level security;

create policy "recovery_notes_all_own" on public.recovery_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- self care and mental check-ins
-- ---------------------------------------------------------------------------

create table public.selfcare_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  kind text not null
    check (kind in ('skincare_am', 'skincare_pm', 'sleep', 'calories', 'protein', 'water', 'mobility', 'outdoor', 'journal')),
  value numeric,
  note text not null default '',
  done boolean not null default true,
  created_at timestamptz not null default now()
);

create index selfcare_logs_user_idx on public.selfcare_logs (user_id, date desc, kind);

alter table public.selfcare_logs enable row level security;

create policy "selfcare_logs_all_own" on public.selfcare_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  mood int check (mood is null or (mood between 1 and 5)),
  energy int check (energy is null or (energy between 1 and 5)),
  stress int check (stress is null or (stress between 1 and 5)),
  sleep_quality int check (sleep_quality is null or (sleep_quality between 1 and 5)),
  note text not null default '',
  what_helped text not null default '',
  what_was_hard text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.checkins enable row level security;

create policy "checkins_all_own" on public.checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger checkins_updated_at before update on public.checkins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- relationship care (private, small, never scored)
-- ---------------------------------------------------------------------------

create table public.relationship_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'note'
    check (kind in ('checkin', 'quality_time', 'activity', 'date', 'reminder', 'note')),
  title text not null,
  note text not null default '',
  date date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index relationship_items_user_idx on public.relationship_items (user_id, date);

alter table public.relationship_items enable row level security;

create policy "relationship_items_all_own" on public.relationship_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger relationship_items_updated_at before update on public.relationship_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reset routines
-- ---------------------------------------------------------------------------

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text,
  name text not null,
  category text not null default 'reset'
    check (category in ('reset', 'skincare', 'prep', 'movement', 'reflect')),
  schedule jsonb not null default '{"times": [], "days": [0,1,2,3,4,5,6]}'::jsonb,
  enabled boolean not null default true,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routines_user_idx on public.routines (user_id, enabled);

alter table public.routines enable row level security;

create policy "routines_all_own" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger routines_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

create table public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  status text not null default 'done' check (status in ('done', 'skipped', 'snoozed')),
  at timestamptz not null default now()
);

create index routine_logs_user_idx on public.routine_logs (user_id, date desc);
create index routine_logs_routine_idx on public.routine_logs (routine_id, date desc);

alter table public.routine_logs enable row level security;

create policy "routine_logs_all_own" on public.routine_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- displays (multi-screen roles, synchronized via realtime)
-- ---------------------------------------------------------------------------

create table public.displays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Display',
  role text not null default 'command'
    check (role in ('command', 'calendar', 'spotify', 'priorities', 'nerfchess', 'focus', 'ambient', 'fitness', 'custom')),
  theme text,
  variant text,
  motion text not null default 'balanced' check (motion in ('low', 'balanced', 'cinematic')),
  brightness numeric not null default 1,
  density text not null default 'comfortable' check (density in ('compact', 'comfortable')),
  ambient jsonb not null default '{}'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index displays_user_idx on public.displays (user_id);

alter table public.displays enable row level security;

create policy "displays_all_own" on public.displays
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger displays_updated_at before update on public.displays
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- integrations (metadata visible to owner; secrets locked to service role)
-- ---------------------------------------------------------------------------

create table public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('spotify', 'google')),
  label text not null default '',
  external_id text not null default '',
  email text not null default '',
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, external_id)
);

create index integration_accounts_user_idx on public.integration_accounts (user_id, provider);

alter table public.integration_accounts enable row level security;

create policy "integration_accounts_select_own" on public.integration_accounts
  for select using (auth.uid() = user_id);
create policy "integration_accounts_delete_own" on public.integration_accounts
  for delete using (auth.uid() = user_id);
create policy "integration_accounts_update_own" on public.integration_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- inserts happen server-side with the service role during oauth callbacks

create trigger integration_accounts_updated_at before update on public.integration_accounts
  for each row execute function public.set_updated_at();

-- oauth tokens: rls enabled with no policies, so only the service role can
-- read or write them. they never reach the browser.
create table public.integration_secrets (
  account_id uuid primary key references public.integration_accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  access_token text not null default '',
  refresh_token text not null default '',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.integration_secrets enable row level security;

-- ---------------------------------------------------------------------------
-- calendar cache and task links (loop prevention for two-way sync)
-- ---------------------------------------------------------------------------

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.integration_accounts (id) on delete cascade,
  calendar_id text not null,
  event_id text not null,
  title text not null default '',
  description text not null default '',
  location text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean not null default false,
  color text,
  status text not null default 'confirmed',
  recurring_id text,
  updated_at_remote timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, calendar_id, event_id)
);

create index calendar_events_user_time_idx on public.calendar_events (user_id, starts_at);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_own" on public.calendar_events
  for select using (auth.uid() = user_id);
-- writes happen server-side during sync

create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();

create table public.calendar_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  account_id uuid not null references public.integration_accounts (id) on delete cascade,
  calendar_id text not null,
  event_id text not null,
  etag text,
  status text not null default 'linked' check (status in ('linked', 'deleted', 'unlinked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id)
);

alter table public.calendar_links enable row level security;

create policy "calendar_links_select_own" on public.calendar_links
  for select using (auth.uid() = user_id);
create policy "calendar_links_delete_own" on public.calendar_links
  for delete using (auth.uid() = user_id);

create trigger calendar_links_updated_at before update on public.calendar_links
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create table public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null
    check (category in ('tasks', 'calendar', 'focus', 'nerfchess', 'workouts', 'skincare', 'resets', 'checkins', 'review')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

alter table public.notification_prefs enable row level security;

create policy "notification_prefs_all_own" on public.notification_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  title text not null,
  body text not null default '',
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create index notification_log_user_idx on public.notification_log (user_id, sent_at desc);

alter table public.notification_log enable row level security;

create policy "notification_log_all_own" on public.notification_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null default '{}'::jsonb,
  device_label text not null default '',
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_all_own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- per-user seed data: default exercises and reset routines
-- ---------------------------------------------------------------------------

create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;

  insert into public.exercises (user_id, name, category, metrics, is_default) values
    (new.id, 'Handstand push-up', 'skill', '{reps}', true),
    (new.id, 'Muscle-up', 'skill', '{reps}', true),
    (new.id, 'Handstand balance', 'skill', '{hold_seconds}', true),
    (new.id, 'Pull-up', 'pull', '{reps,weight_kg}', true),
    (new.id, 'Push-up', 'push', '{reps}', true),
    (new.id, 'Bench press', 'push', '{reps,weight_kg}', true),
    (new.id, 'Vertical jump', 'legs', '{distance_m}', true),
    (new.id, 'Run', 'run', '{distance_m,time_seconds}', true);

  insert into public.routines (user_id, slug, name, category, schedule, sort_order) values
    (new.id, 'room_reset', 'Five-minute room reset', 'reset', '{"times": ["21:00"], "days": [0,1,2,3,4,5,6]}', 1),
    (new.id, 'clear_desk', 'Clear desk', 'reset', '{"times": ["18:00"], "days": [0,1,2,3,4,5,6]}', 2),
    (new.id, 'clothes_away', 'Put clothes away', 'reset', '{"times": ["21:15"], "days": [0,1,2,3,4,5,6]}', 3),
    (new.id, 'dishes_out', 'Remove dishes', 'reset', '{"times": ["20:45"], "days": [0,1,2,3,4,5,6]}', 4),
    (new.id, 'refill_water', 'Refill water', 'reset', '{"times": ["09:00", "15:00"], "days": [0,1,2,3,4,5,6]}', 5),
    (new.id, 'skincare_am', 'Morning skincare', 'skincare', '{"times": ["08:30"], "days": [0,1,2,3,4,5,6]}', 6),
    (new.id, 'skincare_pm', 'Evening skincare', 'skincare', '{"times": ["22:30"], "days": [0,1,2,3,4,5,6]}', 7),
    (new.id, 'prep_tomorrow', 'Prepare for tomorrow', 'prep', '{"times": ["21:30"], "days": [0,1,2,3,4,5,6]}', 8),
    (new.id, 'mobility', 'Mobility', 'movement', '{"times": ["17:30"], "days": [1,3,5]}', 9),
    (new.id, 'nightly_reflection', 'Nightly reflection', 'reflect', '{"times": ["22:00"], "days": [0,1,2,3,4,5,6]}', 10);

  insert into public.notification_prefs (user_id, category, enabled)
  values
    (new.id, 'tasks', true), (new.id, 'calendar', true), (new.id, 'focus', true),
    (new.id, 'nerfchess', true), (new.id, 'workouts', true), (new.id, 'skincare', true),
    (new.id, 'resets', true), (new.id, 'checkins', true), (new.id, 'review', true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_user_defaults();

-- ---------------------------------------------------------------------------
-- realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.displays;

-- ---------------------------------------------------------------------------
-- private storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false), ('backgrounds', 'backgrounds', false)
on conflict (id) do nothing;

create policy "storage_read_own" on storage.objects
  for select using (
    bucket_id in ('attachments', 'backgrounds')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_insert_own" on storage.objects
  for insert with check (
    bucket_id in ('attachments', 'backgrounds')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_update_own" on storage.objects
  for update using (
    bucket_id in ('attachments', 'backgrounds')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_delete_own" on storage.objects
  for delete using (
    bucket_id in ('attachments', 'backgrounds')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
