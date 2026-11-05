-- Already applied to NIPD Command v2 Supabase staging.
-- Source recovered from supabase_migrations.schema_migrations; do not reapply blindly.


create table if not exists public.wf_ftep_seg_versions (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 version_number int not null check(version_number>0),
 status text not null default 'draft' check(status in ('draft','approved','retired')),
 approved_by uuid, approved_at timestamptz,
 created_at timestamptz not null default now(),
 unique(agency_id,version_number)
);
create table if not exists public.wf_ftep_seg_categories (
 agency_id uuid not null references public.wf_agencies(id),
 version_id uuid not null references public.wf_ftep_seg_versions(id),
 category_number int not null check(category_number between 1 and 30),
 category_name text not null check(length(trim(category_name))>=3),
 group_name text not null,
 description text not null,
 performance_guidelines jsonb not null default '{}'::jsonb,
 primary key (version_id,category_number)
);
create table if not exists public.wf_ftep_dors (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 assignment_id uuid not null references public.wf_ftep_trainee_assignments(id),
 trainee_person_id uuid not null references public.wf_personnel_directory(id),
 fto_person_id uuid not null references public.wf_personnel_directory(id),
 report_date date not null,
 training_day int check(training_day between 1 and 365),
 phase_label text,
 seg_version_id uuid references public.wf_ftep_seg_versions(id),
 status text not null default 'draft' check(status in ('draft','submitted')),
 strength_narrative text not null default '',
 improvement_narrative text not null default '',
 created_by uuid not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 submitted_at timestamptz,
 submitted_by uuid,
 unique (agency_id,assignment_id,report_date),
 constraint wf_ftep_dor_submission_consistent check (
 (status='draft' and submitted_at is null and submitted_by is null)
 or (status='submitted' and submitted_at is not null and submitted_by is not null and seg_version_id is not null))
);
create table if not exists public.wf_ftep_dor_scores (
 dor_id uuid not null references public.wf_ftep_dors(id),
 agency_id uuid not null references public.wf_agencies(id),
 category_number int not null check(category_number between 1 and 30),
 rating smallint check(rating between 1 and 7),
 not_observed boolean not null default false,
 narrative text not null default '',
 non_response_to_training boolean not null default false,
 primary key(dor_id,category_number),
 constraint wf_ftep_score_choice check((rating is not null and not not_observed) or (rating is null and not_observed))
);
create table if not exists public.wf_ftep_dor_events (
 id bigint generated always as identity primary key,
 agency_id uuid not null references public.wf_agencies(id),
 dor_id uuid not null references public.wf_ftep_dors(id),
 actor_user_id uuid not null,
 action text not null,
 occurred_at timestamptz not null default now()
);
create index if not exists wf_ftep_dor_history_idx on public.wf_ftep_dors(agency_id,trainee_person_id,report_date desc);
create index if not exists wf_ftep_dor_scores_idx on public.wf_ftep_dor_scores(agency_id,category_number);
create index if not exists wf_ftep_dor_events_idx on public.wf_ftep_dor_events(agency_id,dor_id,occurred_at);
alter table public.wf_ftep_seg_versions enable row level security;
alter table public.wf_ftep_seg_categories enable row level security;
alter table public.wf_ftep_dors enable row level security;
alter table public.wf_ftep_dor_scores enable row level security;
alter table public.wf_ftep_dor_events enable row level security;
revoke all on public.wf_ftep_seg_versions,public.wf_ftep_seg_categories,public.wf_ftep_dors,public.wf_ftep_dor_scores,public.wf_ftep_dor_events from public,anon,authenticated;
revoke all on sequence public.wf_ftep_dor_events_id_seq from public,anon,authenticated;

