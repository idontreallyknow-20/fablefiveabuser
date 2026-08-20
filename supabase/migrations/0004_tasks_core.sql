-- Tasks as the core surface: tags, lightweight recurrence, checklists.

alter table public.tasks
  add column if not exists tags text[] not null default '{}',
  add column if not exists recurrence jsonb,
  add column if not exists checklist jsonb not null default '[]'::jsonb;

create index if not exists tasks_tags_idx on public.tasks using gin (tags);
