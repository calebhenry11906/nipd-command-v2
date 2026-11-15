// NIPD Command v2 experimental passkey pilot — no privileged access or invitations.
// Requires separate Supabase Auth Passkeys project configuration and stable HTTPS RP origin.
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.108.0";
const db=createClient("https://qvnldjidqyuwglksdtlm.supabase.co","sb_publishable_LovOph-C6UpNNq1oNR4TQQ_1VYEiChB",{
 auth:{experimental:{passkey:true}}
});
const byId=id=>document.getElementById(id);
const signIn=byId("passkeySignIn"),enroll=byId("passkeyEnroll");
function message(id,txt){byId(id).textContent=txt}
function failure(error){const code=error?.code||"";
 if(code==="passkey_disabled")return "This project's passkey feature is not enabled yet; configure passkeys for the fixed staging hostname before testing.";
 if(code==="webauthn_challenge_expired")return "Passkey request expired. Please retry.";
 if(code==="webauthn_verification_failed")return "The phone passkey could not be verified.";
 return "Passkey verification was cancelled, unsupported, or rejected. No protected workforce access was granted.";
}
signIn.addEventListener("click",async()=>{
 signIn.disabled=true;message("signInStatus","Requesting a passkey from your device…");
 try{
  if(!window.PublicKeyCredential)throw Error("WebAuthn unavailable");
  const {data,error}=await db.auth.signInWithPasskey();
  if(error)throw error;
  if(!data?.user||!data?.session)throw Error("No verified session returned");
  // This standalone passkey session is NOT treated as proof of NIPD's protected AAL2.
  message("signInStatus","Passkey verified in the pilot. Protected NIPD modules still require the existing authorization gate.");
 }catch(error){message("signInStatus",failure(error))}
 finally{signIn.disabled=false}
});
enroll.addEventListener("click",async()=>{
 enroll.disabled=true;message("enrollStatus","Verifying existing session and authenticator assurance…");
 try{
  if(!window.PublicKeyCredential)throw Error("WebAuthn unavailable");
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user||!user.email_confirmed_at)throw Error("An existing confirmed test account is required");
  const {data:aal,error:aalError}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(aalError||aal?.currentLevel!=="aal2")throw Error("Existing staging authenticator verification required");
  const result=await db.auth.registerPasskey();
  if(result.error)throw result.error;
  if(!result.data?.id)throw Error("No passkey returned");
  message("enrollStatus","A passkey was registered for this existing test account. Keep existing MFA enabled until protected passkey-only access is validated.");
 }catch(error){message("enrollStatus",failure(error))}
 finally{enroll.disabled=false}
});
