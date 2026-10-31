-- STAGING-ONLY prerequisite for workforce migrations.
-- Apply only after independently verifying the destination is qvnldjidqyuwglksdtlm.
-- Minimal security foundation with NO production identities or operational records.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists public.staff_access (
 user_id uuid primary key references auth.users(id) on delete restrict,
 display_label text not null check(length(display_label) between 2 and 150),
 division text not null,
 rank text not null,
 enabled boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.staff_access enable row level security;
revoke all on public.staff_access from public, anon, authenticated;
commit;
