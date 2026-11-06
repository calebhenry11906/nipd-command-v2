// NIPD Command v2 — staging-only TOTP gate.
// Authentication remains Supabase Auth; this module never stores factors or OTPs.
const create = (tag, text, props = {}) => {
  const element = document.createElement(tag);
  if (text !== null) element.textContent = text;
  Object.assign(element, props);
  return element;
};
const button = (label, callback) => {
  const element = create("button", label, { type: "button" });
  element.addEventListener("click", callback);
  return element;
};
const errorText = error => error?.message || "Authentication could not be completed.";

export function createMfaGate(supabase, mount, onAuthorized) {
  if (!supabase?.auth?.mfa || !mount) throw new Error("MFA is unavailable.");
  let revision = 0;
  let busy = false;
  let activeFactor = null;
  let enrollment = null;
  const status = create("p", "", { role: "status" });
  const heading = create("h2", "Protect Your NIPD Command Account");
  const intro = create("p", "An authenticator app is required before accessing workforce information.");
  const controls = create("div");
  mount.replaceChildren(heading, intro, controls, status);

  const message = (value, failed = false) => {
    status.textContent = value;
    status.className = failed ? "danger" : "";
  };
  const reset = () => {
    mount.hidden = false;
    controls.replaceChildren();
    message("");
  };
  const run = async (action) => {
    if (busy) return;
    busy = true;
    try { await action(); }
    catch (error) { message(errorText(error), true); }
    finally { busy = false; }
  };
  const inputCode = () => {
    const label = create("label", "Six-digit authenticator code ");
    const field = create("input", null, {
      type: "text", inputMode: "numeric", autocomplete: "one-time-code",
      pattern: "[0-9]{6}", maxLength: 6, required: true
    });
    label.append(field);
    return { label, field };
  };
  const verify = async (factorId, code, version) => {
    if (!/^\d{6}$/.test(code)) { message("Enter the six-digit code.", true); return; }
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) throw challenge.error;
    const result = await supabase.auth.mfa.verify({
      factorId, challengeId: challenge.data.id, code
    });
    if (result.error) throw result.error;
    // Never assume successful MFA based solely on a UI flag or the verify response.
    if (version === revision) await refresh();
  };
  const challengeScreen = (factor) => {
    reset();
    activeFactor = factor.id;
    heading.textContent = "Verify Your Authenticator";
    intro.textContent = "Enter the current code from your authenticator app.";
    const form = create("form", null);
    const {label, field} = inputCode();
    const submit = create("button", "Verify and Continue", {type:"submit"});
    form.append(label, submit);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const version = revision;
      run(async () => { submit.disabled = true; try { await verify(factor.id, field.value.trim(), version); } finally { submit.disabled = false; }});
    });
    controls.append(form);
  };
  const enrollScreen = () => {
    reset();
    activeFactor = null;
    heading.textContent = "Set Up Your Authenticator";
    intro.textContent = "Scan the QR code in Microsoft Authenticator, Google Authenticator, or another TOTP app.";
    const start = button("Set Up Authenticator", () => run(async () => {
      start.disabled = true;
      try {
        const response = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "NIPD Command" });
        if (response.error) throw response.error;
        enrollment = response.data;
        controls.replaceChildren();
        if (typeof enrollment.totp?.qr_code === "string" &&
            enrollment.totp.qr_code.startsWith("data:image/svg+xml")) {
          const qr = create("img", null);
          qr.src = enrollment.totp.qr_code;
          qr.alt = "Scan this TOTP QR code with your authenticator app";
          qr.style.maxWidth = "220px";
          controls.append(qr);
        }
        controls.append(create("p", "Manual setup key (keep private):"));
        const secret = create("code", enrollment.totp?.secret || "QR setup unavailable");
        controls.append(secret);
        const form = create("form", null);
        const {label, field} = inputCode();
        const submit = create("button", "Verify and Activate", {type:"submit"});
        form.append(label, submit);
        form.addEventListener("submit", e => {
          e.preventDefault();
          const version = revision;
          run(async () => { submit.disabled = true; try { await verify(enrollment.id, field.value.trim(), version); } finally { submit.disabled = false; }});
        });
        controls.append(form);
      } finally { start.disabled = false; }
    }));
    controls.append(start);
  };
  async function refresh() {
    const version = ++revision;
    const userResult = await supabase.auth.getUser();
    if (version !== revision) return false;
    if (userResult.error || !userResult.data.user) {
      reset();
      heading.textContent = "Sign In Required";
      intro.textContent = "Sign in before setting up your authenticator.";
      onAuthorized(false);
      return false;
    }
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw assurance.error;
    if (version !== revision) return false;
    if (assurance.data.currentLevel === "aal2") {
      mount.hidden = true;
      enrollment = null;
      onAuthorized(true);
      return true;
    }
    onAuthorized(false);
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    if (version !== revision) return false;
    const verified = factors.data.totp.find(f => f.status === "verified");
    if (verified) challengeScreen(verified);
    else enrollScreen();
    return false;
  }
  function clear() {
    ++revision;
    enrollment = null;
    activeFactor = null;
    mount.hidden = true;
    onAuthorized(false);
  }
  return { refresh, clear };
}
