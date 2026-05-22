-- Per-key fixed-window rate limit, called from server actions via RPC.
-- Anyone can write; we trust the bucket key to be authority-controlled
-- (server-side IP derivation, never user input).

create table public.rate_limit_buckets (
  bucket text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;

create policy rate_limit_anon_all on public.rate_limit_buckets
  for all using (true) with check (true);

create or replace function public.bump_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
as $$
declare
  b public.rate_limit_buckets%rowtype;
  now_ts timestamptz := now();
begin
  insert into public.rate_limit_buckets (bucket, count, window_start)
  values (p_bucket, 1, now_ts)
  on conflict (bucket) do update
    set count = case
          when public.rate_limit_buckets.window_start + (p_window_seconds || ' seconds')::interval < now_ts
            then 1
          else public.rate_limit_buckets.count + 1
        end,
        window_start = case
          when public.rate_limit_buckets.window_start + (p_window_seconds || ' seconds')::interval < now_ts
            then now_ts
          else public.rate_limit_buckets.window_start
        end
    returning * into b;
  return b.count <= p_max;
end;
$$;

grant execute on function public.bump_rate_limit(text, int, int) to anon, authenticated;
