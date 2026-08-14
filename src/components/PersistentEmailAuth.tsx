import React, { useState } from "react";
import {
  emailStatus,
  emailPasswordLogin,
  createEmailPassword,
  requestPasswordReset,
  resetEmailPassword,
  resolveApiUrl,
} from "../lib/apiClient";

type Props = {
  onAuthenticated: (payload: any) => void;
  onSendOtp: (email: string) => Promise<any>;
  onVerifyOtp: (email: string, otp: string) => Promise<any>;
};

type Step = "email" | "password" | "signupOtp" | "profile" | "forgot" | "forgotOtp";

export default function PersistentEmailAuth({ onAuthenticated, onSendOtp, onVerifyOtp }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const continueEmail = async () => {
    setError("");
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const status = await emailStatus(cleanEmail);
      if (status?.exists && !status?.needsPassword) {
        setStep("password");
      } else if (status?.exists && status?.needsPassword) {
        const result = await onSendOtp(cleanEmail);
        if (!result?.success) throw new Error(result?.error || "Could not send verification code.");
        setStep("signupOtp");
      } else {
        const result = await onSendOtp(cleanEmail);
        if (!result?.success) throw new Error(result?.error || "Could not send verification code.");
        setStep("signupOtp");
      }
    } catch (e: any) {
      setError(e?.message || "Unable to check this email.");
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    setError("");
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const r = await emailPasswordLogin(cleanEmail, password);
      if (!r?.success) throw new Error(r?.error || "Incorrect email or password.");
      onAuthenticated(r);
    } catch (e: any) {
      setError(e?.message || "Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  };

  const verifySignupEmail = async () => {
    setError("");
    if (!otp.trim()) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setBusy(true);
    try {
      const r = await onVerifyOtp(cleanEmail, otp.trim());
      if (!r?.success) throw new Error(r?.error || "Invalid verification code.");
      setToken(r.token || "");
      if (r.token && r.needsPassword) {
        setStep("profile");
      } else if (r.token && r.user) {
        onAuthenticated(r);
      } else {
        setStep("profile");
      }
    } catch (e: any) {
      setError(e?.message || "Invalid verification code.");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setError("");
    if (!token) {
      setError("Verification session expired. Please start again.");
      return;
    }
    if (!name.trim() || username.trim().replace(/^@/, "").length < 3) {
      setError("Enter your full name and a username (3+ characters).");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const p = await createEmailPassword(token, password);
      if (!p?.success) throw new Error(p?.error || "Could not create password.");

      const profile = await fetch(resolveApiUrl("/api/v1/auth/setup-profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: name.trim(),
          username: username.trim().replace(/^@/, ""),
        }),
      }).then(async (x) => {
        const body = await x.json().catch(() => ({}));
        if (!x.ok) throw new Error(body?.error || "Could not save profile.");
        return body;
      });

      onAuthenticated({ ...p, ...profile, token, user: profile.user || p.user });
    } catch (e: any) {
      setError(e?.message || "Could not create account.");
    } finally {
      setBusy(false);
    }
  };

  const startForgot = async () => {
    setError("");
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter the registered email address.");
      return;
    }
    setBusy(true);
    try {
      const r = await requestPasswordReset(cleanEmail);
      if (!r?.success) throw new Error(r?.error || "Could not start recovery.");
      setStep("forgotOtp");
    } catch (e: any) {
      setError(e?.message || "Could not start recovery.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError("");
    setBusy(true);
    try {
      if (password.length < 6) throw new Error("New password must be at least 6 characters.");
      const r = await resetEmailPassword(cleanEmail, otp.trim(), password);
      if (!r?.success) throw new Error(r?.error || "Could not reset password.");
      onAuthenticated(r);
    } catch (e: any) {
      setError(e?.message || "Could not reset password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {step === "email" && <>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email address" autoComplete="email" />
        <button disabled={busy} onClick={continueEmail}>{busy ? "Checking…" : "Continue"}</button>
      </>}

      {step === "password" && <>
        <input value={cleanEmail} readOnly type="email" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="current-password" />
        <button disabled={busy} onClick={login}>{busy ? "Signing in…" : "Login"}</button>
        <button disabled={busy} onClick={() => setStep("forgot")} className="opacity-90">Forgot password</button>
        <button disabled={busy} onClick={() => { setOtp(""); setName(""); setUsername(""); setStep("email"); }} className="opacity-90">Use another email</button>
      </>}

      {step === "signupOtp" && <>
        <input value={cleanEmail} readOnly type="email" />
        <input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder="6-digit email code" autoComplete="one-time-code" />
        <button disabled={busy} onClick={verifySignupEmail}>{busy ? "Verifying…" : "Verify Email"}</button>
        <button disabled={busy} onClick={async () => { setOtp(""); const r = await onSendOtp(cleanEmail); if (!r?.success) setError(r?.error || "Could not resend code."); }} className="opacity-90">Resend Code</button>
      </>}

      {step === "profile" && <>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoComplete="name" />
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" autoComplete="username" />
        <input value={cleanEmail} readOnly type="email" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Create password (6+ characters)" autoComplete="new-password" />
        <button disabled={busy} onClick={saveProfile}>{busy ? "Creating…" : "Create Pardais Account"}</button>
      </>}

      {step === "forgot" && <>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Registered email address" autoComplete="email" />
        <button disabled={busy} onClick={startForgot}>{busy ? "Sending…" : "Send Recovery Code"}</button>
        <button disabled={busy} onClick={() => setStep("password")} className="opacity-90">Back to Login</button>
      </>}

      {step === "forgotOtp" && <>
        <input value={cleanEmail} readOnly type="email" />
        <input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder="Recovery code" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="New password (6+ characters)" autoComplete="new-password" />
        <button disabled={busy} onClick={reset}>{busy ? "Resetting…" : "Reset Password & Login"}</button>
        <button disabled={busy} onClick={() => setStep("forgot")} className="opacity-90">Back</button>
      </>}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
