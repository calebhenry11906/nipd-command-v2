-- Disposable local PostgreSQL fixture. Never run against the live Supabase project.
create role authenticated nologin;
create role anon nologin;
create schema auth;
create schema app_private;
create table auth.users(id uuid primary key, email text);
create table public.staff_access(
 user_id uuid primary key references auth.users(id),
 display_label text not null,division text not null,rank text not null,
 enabled boolean not null default false
);
create or replace function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'
$$;
-- Override the stub to cast to UUID; the separate expression avoids CREATE FUNCTION type ambiguity.
create or replace function auth.uid() returns uuid language sql stable as $$
 select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid(),auth.jwt() to authenticated;
-- Auth identity is checked by our protected RPCs, not table read grants.
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','officer-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','officer-b@example.invalid'),
 ('00000000-0000-4000-8000-000000000003','sergeant-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000004','sergeant-b@example.invalid'),
 ('00000000-0000-4000-8000-000000000005','outsider@example.invalid');
insert into public.staff_access(user_id,display_label,division,rank,enabled)
 select id,split_part(email,'@',1),'Patrol',
 case when id::text like '%0003' or id::text like '%0004' then 'Sergeant' else 'Officer' end,true from auth.users;
