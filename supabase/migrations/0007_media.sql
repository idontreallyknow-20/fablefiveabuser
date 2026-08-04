-- Custom backgrounds and soundboard pads.

create table public.user_backgrounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  path text not null,
  avg_color text not null default '#0a0a0b',
  width int,
  height int,
  duration_s numeric,
  size_bytes bigint,
  overlay jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index user_backgrounds_user_idx on public.user_backgrounds (user_id);
alter table public.user_backgrounds enable row level security;
create policy user_backgrounds_all_own on public.user_backgrounds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.soundboard_pads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot int not null default 0,
  label text not null default '',
  color text not null default '',
  hotkey text not null default '',
  kind text not null default 'synth' check (kind in ('synth', 'sample')),
  params jsonb not null default '{}'::jsonb,
  sample_path text,
  loop boolean not null default false,
  gain numeric not null default 0.8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index soundboard_pads_user_idx on public.soundboard_pads (user_id, slot);
alter table public.soundboard_pads enable row level security;
create policy soundboard_pads_all_own on public.soundboard_pads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger soundboard_pads_updated_at before update on public.soundboard_pads
  for each row execute function public.set_updated_at();

-- sounds bucket with the same per-user-folder policies as backgrounds
insert into storage.buckets (id, name, public)
values ('sounds', 'sounds', false)
on conflict (id) do nothing;

create policy "storage_sounds_read_own" on storage.objects
  for select using (
    bucket_id = 'sounds' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_sounds_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'sounds' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_sounds_delete_own" on storage.objects
  for delete using (
    bucket_id = 'sounds' and (storage.foldername(name))[1] = auth.uid()::text
  );

alter publication supabase_realtime add table public.user_backgrounds;
