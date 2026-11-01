// NIPD Command v2 — STAGING-ONLY email dispatcher.
// Intentionally disabled without explicitly configured secrets and test recipient.
// Deploy ONLY to Supabase project qvnldjidqyuwglksdtlm.
const STAGING_REF = "qvnldjidqyuwglksdtlm";
const env = (name: string) => Deno.env.get(name) || "";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({error:"Method not allowed"},405);
  const url = env("SUPABASE_URL");
  if (new URL(url).hostname !== STAGING_REF + ".supabase.co") return json({error:"Not isolated staging"},503);
  if (env("NIPD_EMAIL_DELIVERY_ENABLED") !== "true") return json({error:"Email sending disabled"},503);
  const token = env("NIPD_EMAIL_WORKER_TOKEN");
  if (token.length < 32 || request.headers.get("x-nipd-worker-token") !== token) return json({error:"Unauthorized"},401);
  const recipient = env("NIPD_TEST_EMAIL_INBOX");
  const sender = env("NIPD_TEST_EMAIL_FROM");
  const key = env("RESEND_API_KEY");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ||
      !sender || !key || !serviceKey) return json({error:"Missing staging-only email configuration"},503);
  // Always send only to a fixed test address, never recipient addresses from the queue.
  const rpc = async (name: string, args: Record<string,unknown>) => {
    const result = await fetch(url+"/rest/v1/rpc/"+name,{
      method:"POST",headers:{"apikey":serviceKey,"Authorization":"Bearer "+serviceKey,
      "Content-Type":"application/json"},body:JSON.stringify(args)
    });
    if(!result.ok) throw Error("Staging RPC failed: "+result.status);
    return await result.json();
  };
  try {
    const jobs = await rpc("wf_claim_notifications",{p_limit:5}) as Array<{notification_id:string;agency_id:string;recipient_id:string;event_key:string;subject:string;safe_body:string;attempt_number:number}>;
    let sent=0,failed=0,held_for_review=0;
    for(const job of jobs) {
      const subject="[FICTIONAL NIPD STAGING] "+String(job.subject).slice(0,130);
      const message="TEST MESSAGE — NOT AN OPERATIONAL ALERT.\\n"+
        "Original fictional recipient: "+job.recipient_id+"\\n\\n"+
        String(job.safe_body).slice(0,1000);
      // Resend stores keys for only 24 hours. Retried messages older than 23h
      // must be held, not resent with an expired provider deduplication key.
      if (job.attempt_number > 1) {
        const withinWindow=await rpc("wf_notification_retry_safe",{p_notification:job.notification_id}) as boolean;
        if (!withinWindow) {
          await rpc("wf_record_notification_delivery",{
            p_notification:job.notification_id,p_attempt:job.attempt_number,
            p_success:false,p_safe_error:"Retry outside idempotency window: manual review required"
          });
          held_for_review++;
          continue;
        }
      }
      // Stable across attempts/restarts; never include an attempt number.
      const idempotencyKey="nipd-staging-email/"+job.notification_id;
      let success=false, safeError="Test provider error";
      try {
        const res=await fetch("https://api.resend.com/emails",{
          method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json",
            "Idempotency-Key":idempotencyKey},
          body:JSON.stringify({from:sender,to:[recipient],subject,text:message})
        });
        success=res.ok;
        if(!success) safeError="Email provider HTTP "+res.status;
      } catch { safeError="Email provider connection failed"; }
      // A provider ACCEPTED result is not inbox delivery confirmation.
      await rpc("wf_record_notification_delivery",{
        p_notification:job.notification_id,p_attempt:job.attempt_number,p_success:success,
        p_safe_error:success?null:safeError
      });
      if(success)sent++; else failed++;
    }
    return json({environment:"fictional-staging",claimed:jobs.length,accepted_by_provider:sent,failed,held_for_review});
  } catch { return json({error:"Staging email dispatch failed; see private logs"},500); }
});
