-- Nutrition: itemized meals with macros; selfcare kinds widened.

alter table public.selfcare_logs drop constraint selfcare_logs_kind_check;
alter table public.selfcare_logs add constraint selfcare_logs_kind_check
  check (kind in (
    'skincare_am', 'skincare_pm', 'sleep', 'calories', 'protein', 'carbs',
    'fat', 'water', 'mobility', 'outdoor', 'journal', 'skincare_step'
  ));

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  name text not null default '',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index meals_user_idx on public.meals (user_id, date desc);
alter table public.meals enable row level security;
create policy meals_all_own on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
