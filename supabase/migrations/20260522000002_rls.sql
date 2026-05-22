-- voicenode: row-level security
-- Visibility model: private (owner + collaborators), link (token-gated), public (anyone)
-- Link tokens are read from the `x-board-link-token` request header.

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_collaborators enable row level security;
alter table public.board_snapshots enable row level security;
alter table public.board_events enable row level security;

-- profiles: readable by anyone (display name + avatar are public-ish), updatable only by self
create policy profiles_read_all on public.profiles
  for select using (true);
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- helper: link token from request header (null-safe)
create or replace function public.current_link_token()
returns text language sql stable as $$
  select nullif(
    current_setting('request.headers', true)::json->>'x-board-link-token',
    ''
  );
$$;

-- helper: can the caller view board b?
create or replace function public.can_view_board(b public.boards)
returns boolean language sql stable as $$
  select
    b.visibility = 'public'
    or b.owner_id = auth.uid()
    or (b.visibility = 'link' and b.link_token is not null and b.link_token = public.current_link_token())
    or exists (
      select 1 from public.board_collaborators c
      where c.board_id = b.id and c.user_id = auth.uid()
    );
$$;

-- helper: can the caller edit board b?
create or replace function public.can_edit_board(b public.boards)
returns boolean language sql stable as $$
  select
    b.owner_id = auth.uid()
    or b.visibility = 'public'
    or (b.visibility = 'link' and b.link_token is not null and b.link_token = public.current_link_token())
    or exists (
      select 1 from public.board_collaborators c
      where c.board_id = b.id and c.user_id = auth.uid() and c.role = 'editor'
    );
$$;

-- boards
create policy boards_select on public.boards
  for select using (public.can_view_board(boards));
create policy boards_insert on public.boards
  for insert with check (owner_id = auth.uid());
create policy boards_update on public.boards
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy boards_delete on public.boards
  for delete using (owner_id = auth.uid());

-- board_collaborators: owner manages; collaborator can see their own row
create policy board_collaborators_select on public.board_collaborators
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid())
  );
create policy board_collaborators_write on public.board_collaborators
  for all using (
    exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid())
  );

-- board_snapshots: piggyback on board view/edit
create policy board_snapshots_select on public.board_snapshots
  for select using (
    exists (select 1 from public.boards b where b.id = board_id and public.can_view_board(b))
  );
create policy board_snapshots_write on public.board_snapshots
  for all using (
    exists (select 1 from public.boards b where b.id = board_id and public.can_edit_board(b))
  ) with check (
    exists (select 1 from public.boards b where b.id = board_id and public.can_edit_board(b))
  );

-- board_events: piggyback similarly
create policy board_events_select on public.board_events
  for select using (
    exists (select 1 from public.boards b where b.id = board_id and public.can_view_board(b))
  );
create policy board_events_insert on public.board_events
  for insert with check (
    exists (select 1 from public.boards b where b.id = board_id and public.can_edit_board(b))
  );
