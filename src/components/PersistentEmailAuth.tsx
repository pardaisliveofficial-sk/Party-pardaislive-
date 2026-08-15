import React, { useEffect, useState } from "react";
import { emailStatus, sendEmailOtp, verifyEmailOtp, emailPasswordLogin, createEmailPassword, requestPasswordReset, resetEmailPassword } from "../lib/apiClient";
import { resolveApiUrl } from "../lib/apiClient";

type Props = { onAuthenticated: (payload: any) => void; onGoogleSignIn?: () => void | Promise<void>; };

export default function PersistentEmailAuth({ onAuthenticated, onGoogleSignIn }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<"email"|"password"|"otp"|"profile"|"forgot">("email");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [existingNeedsPassword, setExistingNeedsPassword] = useState(false);
  const [otpNotice, setOtpNotice] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => setResendCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const fail = (e: any, fallback: string) => setError(e?.message || e?.error || fallback);

  const continueEmail = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) { setError("Enter a valid email address."); return; }
    setError(""); setBusy(true);
    try {
      const status = await emailStatus(clean);
      if (status?.exists) {
        setExistingNeedsPassword(Boolean(status?.needsPassword));
        setStep("password");
        return;
      }
      setExistingNeedsPassword(false);
      const sent = await sendEmailOtp(clean);
      if (!sent?.success) {
        if (sent?.code === "EMAIL_ALREADY_REGISTERED") {
          setExistingNeedsPassword(true);
          setStep("password");
          setError("This email is already registered. Please log in or use Forgot Password.");
          return;
        }
        throw new Error(sent?.error || "Could not send verification code.");
      }
      setOtpNotice("Verification code sent. Check your email.");
      setResendCooldown(60);
      setStep("otp");
    } catch (e) { fail(e, "Could not continue with this email."); }
    finally { setBusy(false); }
  };

  const login = async () => {
    setError(""); setBusy(true);
    try {
      const r = await emailPasswordLogin(email.trim().toLowerCase(), password);
      if (!r?.success || !r?.token || !r?.user) throw new Error(r?.error || "Incorrect email/username or password.");
      onAuthenticated(r);
    } catch (e) { fail(e, "Incorrect email/username or password."); }
    finally { setBusy(false); }
  };

  const verifyFirstEmail = async () => {
    setError(""); setOtpNotice(""); setBusy(true);
    try {
      const r = await verifyEmailOtp(email.trim().toLowerCase(), otp.trim());
      if (!r?.success || !r?.token || !r?.user) throw new Error(r?.error || "Invalid verification code.");
      setToken(r.token);
      setName(r.user.fullName || "");
      setUsername(r.user.username || "");
      setStep("profile");
    } catch (e) { fail(e, "Invalid verification code."); }
    finally { setBusy(false); }
  };

  const saveProfile = async () => {
    if (!token) { setError("Verification session expired. Please start again."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!name.trim() || username.trim().replace(/^@/, "").length < 3) { setError("Enter your name and a username of at least 3 characters."); return; }
    setError(""); setBusy(true);
    try {
      const p = await createEmailPassword(token, password);
      if (!p?.success) throw new Error(p?.error || "Could not create password.");
      const profile = await fetch(resolveApiUrl("/api/v1/auth/setup-profile"), {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ fullName: name.trim(), username: username.trim().replace(/^@/, "") })
      }).then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Could not save profile."); return d; });
      onAuthenticated({ success: true, token, user: profile.user || p.user });
    } catch (e) { fail(e, "Could not create account."); }
    finally { setBusy(false); }
  };

  const startForgot = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) { setError("Enter your registered email first."); return; }
    setError(""); setBusy(true);
    try {
      const r = await requestPasswordReset(clean);
      if (!r?.success) throw new Error(r?.error || "Could not send recovery code.");
      setStep("forgot");
    } catch (e) { fail(e, "Could not start recovery."); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (password.length < 6) { setError("New password must be at least 6 characters."); return; }
    setError(""); setBusy(true);
    try {
      const r = await resetEmailPassword(email.trim().toLowerCase(), otp, password);
      if (!r?.success || !r?.token || !r?.user) throw new Error(r?.error || "Could not reset password.");
      onAuthenticated(r);
    } catch (e) { fail(e, "Could not reset password."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-3">
    {step === "email" && <>
      {onGoogleSignIn && <button type="button" disabled={busy} onClick={onGoogleSignIn} className="w-full h-12 bg-white text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
        <span className="text-lg font-black">G</span><span>Continue with Google</span>
      </button>}
      {onGoogleSignIn && <div className="flex items-center gap-2 py-1"><div className="h-px bg-white/10 flex-1" /><span className="text-[10px] text-gray-500 uppercase tracking-widest">or</span><div className="h-px bg-white/10 flex-1" /></div>}
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm" autoComplete="email" />
      <button type="button" disabled={busy} onClick={continueEmail} className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold">{busy ? "Please wait…" : "Continue"}</button>
    </>}
    {step === "password" && <>
      <input value={email} readOnly type="email" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm" />
      <div className="relative w-full">
        <input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Password" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 pr-12 text-white text-sm" autoComplete="current-password" />
        <button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-lg" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "🙈" : "👁️"}</button>
      </div>
      {existingNeedsPassword && <p className="text-amber-300 text-xs bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">This email is already registered. If you do not know the password, use Forgot Password to recover the account.</p>}
      <button type="button" disabled={busy} onClick={login} className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold">Login</button>
      <button type="button" disabled={busy} onClick={startForgot} className="w-full py-2 bg-white/5 rounded-xl border border-white/10 text-gray-300 text-sm">Forgot Password?</button>
      <button type="button" disabled={busy} onClick={()=>{setPassword("");setStep("email");}} className="w-full py-2 text-gray-400 text-xs">Use another email</button>
    </>}
    {step === "otp" && <>
      <p className="text-xs text-gray-300">Verification code sent to <b>{email}</b>.</p>
      {otpNotice && <p className="text-green-300 text-xs bg-green-950/30 border border-green-500/30 rounded-xl p-3">{otpNotice}</p>}
      <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" placeholder="6-digit code" className="w-full bg-[#12121a] border border-[#00f5ff] rounded-xl px-3 py-3 text-white text-center tracking-widest font-bold" />
      <button type="button" disabled={busy || otp.trim().length !== 6} onClick={verifyFirstEmail} className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold">{busy ? "Verifying…" : "Verify Email"}</button>
      <button type="button" disabled={busy || resendCooldown > 0} onClick={async()=>{setError("");setOtpNotice("");setBusy(true);try{const r=await sendEmailOtp(email.trim().toLowerCase());if(!r?.success)throw new Error(r?.error||"Could not resend verification code.");setOtpNotice("Verification code sent. Check your email.");setResendCooldown(60);setOtp("");}catch(e){fail(e,"Could not resend verification code.");}finally{setBusy(false);}}} className="w-full py-2 text-gray-300 text-xs">{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}</button>
      <button type="button" disabled={busy} onClick={()=>setStep("email")} className="w-full py-2 text-gray-400 text-xs">Use another email</button>
    </>}
    {step === "profile" && <>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm" autoComplete="name" />
      <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm" autoComplete="username" />
      <input value={email} readOnly className="w-full bg-[#151520] border border-[#303040] rounded-xl px-3 py-3 text-gray-400 text-sm" />
      <div className="relative w-full">
        <input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Create password (6+ characters)" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 pr-12 text-white text-sm" autoComplete="new-password" />
        <button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-lg" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "🙈" : "👁️"}</button>
      </div>
      <button type="button" disabled={busy} onClick={saveProfile} className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold">Create Account</button>
    </>}
    {step === "forgot" && <>
      <p className="text-xs text-gray-300">Recovery code sent to <b>{email}</b>.</p>
      <input value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder="Recovery code" className="w-full bg-[#12121a] border border-[#00f5ff] rounded-xl px-3 py-3 text-white text-center tracking-widest font-bold" />
      <div className="relative w-full">
        <input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="New password (6+ characters)" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 pr-12 text-white text-sm" autoComplete="new-password" />
        <button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-lg" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "🙈" : "👁️"}</button>
      </div>
      <button type="button" disabled={busy} onClick={reset} className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold">Reset Password & Login</button>
      <button type="button" disabled={busy} onClick={async()=>{setError("");setBusy(true);try{const r=await requestPasswordReset(email.trim().toLowerCase());if(!r?.success)throw new Error(r?.error||"Could not resend recovery code.");setError("");}catch(e){fail(e,"Could not resend recovery code.");}finally{setBusy(false);}}} className="w-full py-2 text-gray-300 text-xs">Resend recovery code</button>
    </>}
    {error && <p className="text-red-300 text-xs bg-red-950/30 border border-red-500/30 rounded-xl p-3">{error}</p>}
  </div>;
}
