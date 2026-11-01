-- Fictional tenant fixtures ONLY for Supabase project qvnldjidqyuwglksdtlm.
-- No production employees, emails, schedules or contact records are copied.
begin;
insert into public.wf_agencies(name,active,minimum_staff,max_continuous_hours)
values ('NIPD Workforce Test Agency (FICTIONAL)',true,5,18),
       ('External Agency Isolation Test (FICTIONAL)',true,5,18)
on conflict(name) do nothing;
commit;
