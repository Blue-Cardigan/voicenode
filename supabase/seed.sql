-- Demo public board (owner is the first user in auth.users, if any)
insert into public.boards (id, owner_id, title, visibility)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  id,
  'Welcome to voicenode',
  'public'
from auth.users
order by created_at
limit 1
on conflict (id) do nothing;
