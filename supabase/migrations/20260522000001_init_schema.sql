-- voicenode: initial schema
-- profiles, boards, board_collaborators, board_snapshots, board_events

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled board',
  visibility text not null check (visibility in ('private','link','public')) default 'private',
  link_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index boards_owner_idx on public.boards (owner_id);
create index boards_link_token_idx on public.boards (link_token) where link_token is not null;

create table public.board_collaborators (
  board_id uuid references public.boards(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','viewer')) default 'editor',
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index board_collaborators_user_idx on public.board_collaborators (user_id);

create table public.board_snapshots (
  board_id uuid primary key references public.boards(id) on delete cascade,
  yjs_state bytea,
  updated_at timestamptz not null default now()
);

create table public.board_events (
  id bigserial primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  kind text not null,
  payload jsonb,
  actor uuid,
  created_at timestamptz not null default now()
);
create index board_events_board_created_idx on public.board_events (board_id, created_at desc);

-- updated_at trigger for boards
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger boards_set_updated_at
before update on public.boards
for each row execute function public.set_updated_at();

-- profile auto-create on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
