-- ClosetOS: activity_log table
-- Run this in the Supabase SQL Editor.
-- This script is idempotent (safe to re-run).

create table if not exists public.activity_log (
  event_id        uuid primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  type            text        not null,
  item_id         uuid        references public.wardrobe_items(id) on delete set null,
  outfit_id       uuid        references public.outfits(id) on delete set null,
  plan_date       date,
  source          text,
  metadata        jsonb       not null default '{}'::jsonb,
  session_id      text,
  event_timestamp timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Idempotency: prevents duplicate events from retries or double-clicks
create unique index if not exists idx_activity_log_event_id
on public.activity_log(event_id);

-- Primary analytics access: user timeline sorted by canonical event time
create index if not exists idx_activity_log_user_event_ts
on public.activity_log(user_id, event_timestamp desc);

-- Type trends over time (used for funnel analysis)
create index if not exists idx_activity_log_type_time
on public.activity_log(type, event_timestamp desc);

-- General filters
create index if not exists idx_activity_log_user_id
on public.activity_log(user_id);

create index if not exists idx_activity_log_type
on public.activity_log(type);

-- Row-Level Security
alter table public.activity_log enable row level security;

drop policy if exists "Users can view their own activity logs" on public.activity_log;
drop policy if exists "Users can insert their own activity logs" on public.activity_log;

create policy "Users can view their own activity logs"
on public.activity_log for select
using ( auth.uid() = user_id );

create policy "Users can insert their own activity logs"
on public.activity_log for insert
with check ( auth.uid() = user_id );
