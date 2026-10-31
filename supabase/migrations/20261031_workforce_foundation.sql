-- NIPD Command v2 — WORKFORCE FOUNDATION (review-only; NOT applied to live Supabase)
-- Depends on existing public.staff_access and auth.users.
-- No real employees, contacts or agencies are inserted.
-- Explicit agency memberships are required; roles are never inferred from user metadata.
-- Existing six protected tables and their functions remain unchanged.
begin;

create table if not exists public.wf_agencies (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check(length(name) between 3 and 120),
 active boolean not null default false,
 minimum_staff integer not null default 5 check(minimum_staff between 1 and 40),
 max_continuous_hours integer not null default 18 check(max_continuous_hours between 1 and 24),
 created_at timestamptz not null default now()
);
create table if not exists public.wf_members (
 agency_id uuid not null references public.wf_agencies(id),
 user_id uuid not null references public.staff_access(user_id),
 rank text not null check(rank in ('Officer','Corporal','Sergeant','Lieutenant','Captain','Chief','Civilian')),
 division text not null,
 shift_name text check(shift_name in ('Alpha','Bravo','Charlie','Delta')),
 enabled boolean not null default false,
 supervisor_id uuid references public.staff_access(user_id),
 directory_phone text,
 created_at timestamptz not null default now(),
 primary key(agency_id,user_id),
 foreign key(agency_id,supervisor_id) references public.wf_members(agency_id,user_id)
);
create table if not exists public.wf_private_contacts (
 agency_id uuid not null,
 user_id uuid not null,
 home_address text,
 emergency_name text,
 emergency_phone text,
 emergency_relationship text,
 emergency_address text,
 updated_at timestamptz not null default now(),
 primary key(agency_id,user_id),
 foreign key(agency_id,user_id) references public.wf_members(agency_id,user_id)
);
create table if not exists public.wf_shifts (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 shift_name text not null check(shift_name in ('Alpha','Bravo','Charlie','Delta')),
 begins_at timestamptz not null,
 ends_at timestamptz not null,
 required_count integer not null default 5 check(required_count between 1 and 40),
 require_supervisor boolean not null default true,
 check(ends_at>begins_at and ends_at<=begins_at+interval '24 hours'),
 unique(agency_id,shift_name,begins_at)
);
create table if not exists public.wf_shift_assignments (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null,
 shift_id uuid not null references public.wf_shifts(id),
 user_id uuid not null,
 state text not null default 'assigned' check(state in ('assigned','absent','cancelled')),
 unique(shift_id,user_id),
 foreign key(agency_id,user_id) references public.wf_members(agency_id,user_id)
);
create table if not exists public.wf_absences (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null,
 user_id uuid not null,
 kind text not null check(kind in ('vacation','sick','training','other')),
 begins_at timestamptz not null,
 ends_at timestamptz not null,
 approved boolean not null default false,
 check(ends_at>begins_at),
 foreign key(agency_id,user_id) references public.wf_members(agency_id,user_id)
);
create table if not exists public.wf_transfer_requests (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 assignment_id uuid not null references public.wf_shift_assignments(id),
 releasing_user uuid not null,
 receiving_user uuid,
 releasing_supervisor uuid,
 receiving_supervisor uuid,
 releasing_approved boolean not null default false,
 receiving_approved boolean not null default false,
 status text not null default 'available' check(status in ('available','pickup_requested','awaiting_releasing_supervisor','awaiting_receiving_supervisor','approved','denied','cancelled','expired')),
 reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(agency_id,releasing_user) references public.wf_members(agency_id,user_id),
 foreign key(agency_id,receiving_user) references public.wf_members(agency_id,user_id),
 foreign key(agency_id,releasing_supervisor) references public.wf_members(agency_id,user_id),
 foreign key(agency_id,receiving_supervisor) references public.wf_members(agency_id,user_id)
);
create unique index if not exists wf_one_open_transfer_per_assignment on public.wf_transfer_requests(assignment_id) where status in ('available','pickup_requested','awaiting_releasing_supervisor','awaiting_receiving_supervisor');
create table if not exists public.wf_audit (
 id bigint generated always as identity primary key,
 agency_id uuid not null references public.wf_agencies(id),
 actor_id uuid,
 target_type text not null,
 target_id uuid,
 action text not null,
 changes jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.wf_notification_outbox (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 event_key text not null,
 recipient_id uuid not null,
 category text not null,
 subject text not null,
 safe_body text not null,
 state text not null default 'queued' check(state in ('queued','sent','failed','retrying')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 unique(agency_id,event_key,recipient_id),
 foreign key(agency_id,recipient_id) references public.wf_members(agency_id,user_id)
);
create table if not exists public.wf_details (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 safe_description text not null,
 begins_at timestamptz not null,
 ends_at timestamptz not null,
 assigned_user uuid,
 check(ends_at>begins_at),
 foreign key(agency_id,assigned_user) references public.wf_members(agency_id,user_id)
);
create table if not exists public.wf_detail_transfers (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.wf_agencies(id),
 detail_id uuid not null references public.wf_details(id),
 releasing_user uuid not null,
 receiving_user uuid,
 status text not null default 'available' check(status in ('available','pickup_requested','approved','denied','cancelled','expired')),
 created_at timestamptz not null default now(),
 unique(detail_id,status),
 foreign key(agency_id,releasing_user) references public.wf_members(agency_id,user_id),
 foreign key(agency_id,receiving_user) references public.wf_members(agency_id,user_id)
);

-- All workforce information remains inaccessible until enrollment and RLS review.
-- RLS is intentionally deny-all for new tables: no exposure via REST until reviewed
-- policies and RPCs are separately installed and tested.
alter table public.wf_agencies enable row level security;
alter table public.wf_members enable row level security;
alter table public.wf_private_contacts enable row level security;
alter table public.wf_shifts enable row level security;
alter table public.wf_shift_assignments enable row level security;
alter table public.wf_absences enable row level security;
alter table public.wf_transfer_requests enable row level security;
alter table public.wf_audit enable row level security;
alter table public.wf_notification_outbox enable row level security;
alter table public.wf_details enable row level security;
alter table public.wf_detail_transfers enable row level security;
revoke all on public.wf_agencies,public.wf_members,public.wf_private_contacts,public.wf_shifts,
 public.wf_shift_assignments,public.wf_absences,public.wf_transfer_requests,public.wf_audit,
 public.wf_notification_outbox,public.wf_details,public.wf_detail_transfers from anon,authenticated,public;

commit;
