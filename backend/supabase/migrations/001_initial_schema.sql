create table if not exists public.figma_projects (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_key text not null,
  file_url text not null,
  file_name text,
  selected_frame_id text,
  selected_frame_name text,
  figma_version text,
  frames jsonb not null default '[]'::jsonb,
  cached_properties jsonb not null default '{}'::jsonb,
  last_modified_at timestamptz,
  last_fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.figma_projects
  add column if not exists selected_frame_name text;

alter table public.figma_projects
  add column if not exists figma_version text;

alter table public.figma_projects
  add column if not exists frames jsonb not null default '[]'::jsonb;

alter table public.figma_projects
  add column if not exists cached_properties jsonb not null default '{}'::jsonb;

alter table public.figma_projects
  add column if not exists last_modified_at timestamptz;

alter table public.figma_projects
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists figma_projects_user_file_unique
  on public.figma_projects(user_id, file_key);

create index if not exists figma_projects_user_id_idx
  on public.figma_projects(user_id);

create index if not exists figma_projects_created_at_idx
  on public.figma_projects(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists figma_projects_set_updated_at
  on public.figma_projects;

create trigger figma_projects_set_updated_at
before update on public.figma_projects
for each row
execute function public.set_updated_at();

alter table public.figma_projects enable row level security;

drop policy if exists "Users can read their own Figma projects"
  on public.figma_projects;

create policy "Users can read their own Figma projects"
on public.figma_projects
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own Figma projects"
  on public.figma_projects;

create policy "Users can create their own Figma projects"
on public.figma_projects
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Figma projects"
  on public.figma_projects;

create policy "Users can update their own Figma projects"
on public.figma_projects
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own Figma projects"
  on public.figma_projects;

create policy "Users can delete their own Figma projects"
on public.figma_projects
for delete
using (auth.uid() = user_id);
