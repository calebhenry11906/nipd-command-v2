#!/usr/bin/env python3
"""Concurrent fictional shift pickup test; disposable PostgreSQL service ONLY."""
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import psycopg

AGENCY = "10000000-0000-4000-8000-000000000001"
OFFICER_A = "00000000-0000-4000-8000-000000000001"
OFFICER_B = "00000000-0000-4000-8000-000000000002"
OFFICER_C = "00000000-0000-4000-8000-000000000007"
SERGEANT = "00000000-0000-4000-8000-000000000003"

def connect():
    return psycopg.connect(
        host=os.getenv("PGHOST", "localhost"),
        dbname=os.getenv("PGDATABASE", "workforce_test"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", ""),
        connect_timeout=8,
    )

def run_as(user_id, sql, parameters=()):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SET LOCAL ROLE authenticated")
            cur.execute("SELECT set_config('request.jwt.claims', %s, true)", ('{"sub":"' + user_id + '","aal":"aal1"}',))
            cur.execute(sql, parameters)
            if cur.description:
                return cur.fetchone()[0]

with connect() as conn:
    with conn.cursor() as cur:
        cur.execute("INSERT INTO auth.users(id,email) VALUES (%s,'fictional-c@example.invalid')", (OFFICER_C,))
        cur.execute("INSERT INTO public.staff_access(user_id,display_label,division,rank,enabled) VALUES (%s,'Demo Officer C','Patrol','Officer',true)", (OFFICER_C,))
        cur.execute("INSERT INTO public.wf_members(agency_id,user_id,rank,division,shift_name,enabled,supervisor_id) VALUES (%s,%s,'Officer','Patrol','Charlie',true,%s)", (AGENCY, OFFICER_C, SERGEANT))
        cur.execute("""
          INSERT INTO public.wf_shifts(id,agency_id,shift_name,begins_at,ends_at)
          VALUES ('20000000-0000-4000-8000-000000000077',%s,'Bravo',now()+interval '35 days',now()+interval '35 days 12 hours')
        """, (AGENCY,))
        cur.execute("""
          INSERT INTO public.wf_shift_assignments(id,agency_id,shift_id,user_id)
          VALUES ('30000000-0000-4000-8000-000000000077',%s,
                  '20000000-0000-4000-8000-000000000077',%s)
        """, (AGENCY, OFFICER_A))
transfer_id = run_as(OFFICER_A, "SELECT public.wf_offer_shift('30000000-0000-4000-8000-000000000077'::uuid)")
start_together = Barrier(2, timeout=15)
def try_claim(employee):
    try:
        start_together.wait()
        run_as(employee,"SELECT public.wf_claim_shift(%s::uuid)", (str(transfer_id),))
        return "success"
    except psycopg.Error as exc:
        return "denied:" + str(exc).splitlines()[0]
with ThreadPoolExecutor(max_workers=2) as pool:
    first = pool.submit(try_claim, OFFICER_B)
    second = pool.submit(try_claim, OFFICER_C)
    outcomes = [first.result(timeout=20), second.result(timeout=20)]
assert outcomes.count("success") == 1, outcomes
assert sum(x.startswith("denied:") for x in outcomes) == 1, outcomes
with connect() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT count(*),max(receiving_user::text) FROM public.wf_transfer_requests WHERE id=%s", (transfer_id,))
        count, owner = cur.fetchone()
        assert count == 1 and owner in (OFFICER_B, OFFICER_C), (count, owner)
        cur.execute("SELECT user_id::text FROM public.wf_shift_assignments WHERE id='30000000-0000-4000-8000-000000000077'")
        assert cur.fetchone()[0] == OFFICER_A, "Original employee must remain assigned before approvals"
print("PASS: two independent PostgreSQL sessions attempted the same fictional pickup; exactly one succeeded and original assignment was preserved")
