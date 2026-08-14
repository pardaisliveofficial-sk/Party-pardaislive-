import React, { useState } from "react";
import { emailPasswordLogin, createEmailPassword, requestPasswordReset, resetEmailPassword } from "../lib/apiClient";

type Props = {
  onAuthenticated: (payload: any) => void;
  onSendOtp: (email: string) => Promise<any>;
  onVerifyOtp: (email: string, otp: string) => Promise<any>;
};

/**
 * Persistent email auth UI logic:
 * - Returning users: password login (no OTP)
 * - New users: email OTP -> create password/profile
 * - Forgot password: email OTP only for recovery
 */
export default function PersistentEmailAuth({ onAuthenticated, onSendOtp, onVerifyOtp }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<"email"|"password"|"otp"|"profile"|"forgotOtp"|"reset">("email");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const continueEmail = async () => {
    setError("");
    // The backend password-login response is deliberately used only to
    // determine whether a password already exists; an incorrect password
    // is expected here, so the app should normally expose the password step.
    setStep("password");
  };

  const login = async () => {
    setError("");
    const r = await emailPasswordLogin(email, password);
    if (!r?.success) { setError(r?.error || "Unable to sign in."); return; }
    onAuthenticated(r);
  };

  const verifyFirstEmail = async () => {
    setError("");
    const r = await onVerifyOtp(email, otp);
    if (!r?.success) { setError(r?.error || "Invalid verification code."); return; }
    setToken(r.token || "");
    setStep("profile");
  };

  const saveProfile = async () => {
    if (!token) return;
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    const p = await createEmailPassword(token, password);
    if (!p?.success) { setError(p?.error || "Could not create password."); return; }
    const profile = await fetch("/api/v1/auth/setup-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ fullName: name, username })
    }).then(x => x.json());
    if (!profile?.success) { setError(profile?.error || "Could not save profile."); return; }
    onAuthenticated({ ...p, ...profile, token });
  };

  const startForgot = async () => {
    setError("");
    const r = await requestPasswordReset(email);
    if (!r?.success) { setError(r?.error || "Could not start recovery."); return; }
    setStep("forgotOtp");
  };

  const reset = async () => {
    setError("");
    const r = await resetEmailPassword(email, otp, password);
    if (!r?.success) { setError(r?.error || "Could not reset password."); return; }
    onAuthenticated(r);
  };

  return (
    <div className="space-y-3">
      {step === "email" && <>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address" />
        <button onClick={continueEmail}>Continue</button>
      </>}

      {step === "password" && <>
        <input value={email} readOnly type="email" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" />
        <button onClick={login}>Login</button>
        <button onClick={()=>{setOtp("");setStep("forgotOtp")}}>Forgot password</button>
        <button onClick={async()=>{setError(""); const r=await onSendOtp(email); if(r?.success)setStep("otp"); else setError(r?.error||"Could not send code.");}}>New email / verify with code</button>
      </>}

      {step === "otp" && <>
        <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit email code" />
        <button onClick={verifyFirstEmail}>Verify email</button>
      </>}

      {step === "profile" && <>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" />
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" />
        <input value={email} readOnly />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Create password" />
        <button onClick={saveProfile}>Create account</button>
      </>}

      {step === "forgotOtp" && <>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address" />
        <button onClick={startForgot}>Send recovery code</button>
        <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Recovery code" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="New password" />
        <button onClick={reset}>Reset password</button>
      </>}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
