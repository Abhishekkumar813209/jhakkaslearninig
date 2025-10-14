-- Add partial unique index on daily_attendance share_id for idempotency
create unique index if not exists idx_daily_attendance_share_id_unique
on public.daily_attendance (share_id)
where share_id is not null;