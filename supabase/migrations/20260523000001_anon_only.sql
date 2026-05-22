-- voicenode: drop auth — anyone can create + edit any board.
-- Boards now have a nullable owner_id; RLS is wide-open for the anon role.

alter table public.boards alter column owner_id drop not null;

drop policy if exists boards_select on public.boards;
drop policy if exists boards_insert on public.boards;
drop policy if exists boards_update on public.boards;
drop policy if exists boards_delete on public.boards;
create policy boards_anon_all on public.boards for all using (true) with check (true);

drop policy if exists board_collaborators_select on public.board_collaborators;
drop policy if exists board_collaborators_write on public.board_collaborators;
create policy board_collaborators_anon_all on public.board_collaborators for all using (true) with check (true);

drop policy if exists board_snapshots_select on public.board_snapshots;
drop policy if exists board_snapshots_write on public.board_snapshots;
create policy board_snapshots_anon_all on public.board_snapshots for all using (true) with check (true);

drop policy if exists board_events_select on public.board_events;
drop policy if exists board_events_insert on public.board_events;
create policy board_events_anon_all on public.board_events for all using (true) with check (true);

-- Three demo public boards with stable ids so they survive reseeds.
insert into public.boards (id, owner_id, title, visibility)
values
  ('11111111-1111-1111-1111-111111111111'::uuid, null, 'Welcome to voicenode', 'public'),
  ('22222222-2222-2222-2222-222222222222'::uuid, null, 'Product brainstorm', 'public'),
  ('33333333-3333-3333-3333-333333333333'::uuid, null, 'Sprint retrospective', 'public')
on conflict (id) do update set title = excluded.title, visibility = excluded.visibility;
