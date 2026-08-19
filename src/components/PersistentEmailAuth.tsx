import React, { useEffect, useState } from "react";
import {
  sendEmailOtp,
  verifyEmailOtp,
  sendLoginEmailOtp,
  verifyLoginEmailOtp,
  completeEmailProfile
} from "../lib/apiClient";

type Props = {
  onAuthenticated: (payload: any) => void;
  onGoogleSignIn?: () => void | Promise<void>;
};

type Mode = "login" | "signup";
type Step = "email" | "otp" | "profile";

export default function PersistentEmailAuth({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown(v => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const cleanEmail = () => email.trim().toLowerCase();

  const fail = (e: any, fallback: string) => {
    setError(e?.message || e?.error || fallback);
  };

  const switchMode = (next: Mode) => {
    if (busy) return;
    setMode(next);
    setStep("email");
    setOtp("");
    setError("");
    setNotice("");
    setResendCooldown(0);
  };

  const requestOtp = async () => {
    const clean = cleanEmail();
    if (!clean || !clean.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setNotice("");
    setBusy(true);

    try {
      const result = mode === "signup"
        ? await sendEmailOtp(clean)
        : await sendLoginEmailOtp(clean);

      if (!result?.success) {
        if (result?.code === "EMAIL_ALREADY_REGISTERED") {
          throw new Error("This account is already registered. Please use Log In.");
        }
        if (result?.code === "ACCOUNT_NOT_FOUND") {
          throw new Error("This email is not registered. Please use Sign Up first.");
        }
        throw new Error(result?.error || "Could not send verification code.");
      }

      setOtp("");
      setNotice(
        mode === "signup"
          ? "Verification code sent to your email. Check your inbox."
          : "Login code sent to your email. Check your inbox."
      );
      setResendCooldown(60);
      setStep("otp");
    } catch (e) {
      fail(e, "Could not send the verification code.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const clean = cleanEmail();
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setError("");
    setNotice("");
    setBusy(true);

    try {
      if (mode === "login") {
        const result = await verifyLoginEmailOtp(clean, cleanOtp);
        if (!result?.success || !result?.token || !result?.user) {
          throw new Error(result?.error || "Invalid or expired verification code.");
        }
        onAuthenticated(result);
        return;
      }

      const result = await verifyEmailOtp(clean, cleanOtp);
      if (!result?.success || !result?.token || !result?.user) {
        throw new Error(result?.error || "Invalid or expired verification code.");
      }

      const verifiedToken = String(result.token).trim();
      try {
        sessionStorage.setItem("pardais_signup_token", verifiedToken);
      } catch {}

      setName(result.user?.fullName || "");
      setUsername(result.user?.username || "");
      setDob(result.user?.dob || "");
      setStep("profile");
    } catch (e) {
      fail(e, "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }

    const requestedUsername = username.trim().replace(/^@/, "");
    if (!requestedUsername || requestedUsername.length < 3) {
      setError("Enter a username with at least 3 characters.");
      return;
    }

    if (!dob) {
      setError("Select your date of birth.");
      return;
    }

    let verifiedToken = "";
    try {
      verifiedToken = String(sessionStorage.getItem("pardais_signup_token") || "").trim();
    } catch {}

    if (!verifiedToken) {
      setError("Verification session expired. Please verify your email again.");
      setStep("email");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const result = await completeEmailProfile(
        verifiedToken,
        name.trim(),
        requestedUsername,
        dob
      );

      if (!result?.success || !result?.token || !result?.user) {
        throw new Error(result?.error || "Could not complete your Pardais account.");
      }

      try {
        sessionStorage.removeItem("pardais_signup_token");
      } catch {}

      onAuthenticated(result);
    } catch (e) {
      fail(e, "Could not complete your account.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendCooldown > 0 || busy) return;

    setError("");
    setNotice("");
    setBusy(true);

    try {
      const clean = cleanEmail();
      const result = mode === "signup"
        ? await sendEmailOtp(clean)
        : await sendLoginEmailOtp(clean);

      if (!result?.success) {
        throw new Error(result?.error || "Could not resend the verification code.");
      }

      setOtp("");
      setNotice("A new verification code has been sent to your email.");
      setResendCooldown(60);
    } catch (e) {
      fail(e, "Could not resend the verification code.");
    } finally {
      setBusy(false);
    }
  };

  const backToEmail = () => {
    if (busy) return;
    setStep("email");
    setOtp("");
    setError("");
    setNotice("");
  };

  return (
    <div className="space-y-3">
      {step === "email" && (
        <>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`py-2.5 rounded-lg text-sm font-black transition-all ${
                mode === "login"
                  ? "bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white shadow-lg"
                  : "text-gray-400"
              }`}
            >
              LOG IN
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`py-2.5 rounded-lg text-sm font-black transition-all ${
                mode === "signup"
                  ? "bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white shadow-lg"
                  : "text-gray-400"
              }`}
            >
              SIGN UP
            </button>
          </div>

          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="Email address"
            className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm"
            autoComplete="email"
            disabled={busy}
          />

          <button
            type="button"
            disabled={busy}
            onClick={requestOtp}
            className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "SEND LOGIN CODE"
                : "SEND SIGNUP CODE"}
          </button>

          <p className="text-[10px] text-gray-500 text-center">
            {mode === "login"
              ? "Your registered email will receive a one-time login code."
              : "Your email will be verified first. Then you will set your profile."}
          </p>
        </>
      )}

      {step === "otp" && (
        <>
          <p className="text-xs text-gray-300">
            {mode === "login" ? "Login code" : "Signup verification code"} sent to{" "}
            <b>{email}</b>.
          </p>

          {notice && (
            <p className="text-green-300 text-xs bg-green-950/30 border border-green-500/30 rounded-xl p-3">
              {notice}
            </p>
          )}

          <input
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            className="w-full bg-[#12121a] border border-[#00f5ff] rounded-xl px-3 py-3 text-white text-center tracking-widest font-bold"
            disabled={busy}
          />

          <button
            type="button"
            disabled={busy || otp.trim().length !== 6}
            onClick={verifyCode}
            className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold"
          >
            {busy ? "Verifying…" : "VERIFY & CONTINUE"}
          </button>

          <button
            type="button"
            disabled={busy || resendCooldown > 0}
            onClick={resend}
            className="w-full py-2 text-gray-300 text-xs"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend verification code"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={backToEmail}
            className="w-full py-2 text-gray-400 text-xs"
          >
            Use another email
          </button>
        </>
      )}

      {step === "profile" && (
        <>
          <div className="text-center">
            <p className="text-sm font-black text-white">Complete Your Pardais Profile</p>
            <p className="text-[10px] text-gray-500 mt-1">
              Your email is now verified. Your Pardais ID will be permanent.
            </p>
          </div>

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full name"
            className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm"
            autoComplete="name"
            disabled={busy}
          />

          <input
            value={username}
            onChange={e => setUsername(e.target.value.replace(/\s/g, "_"))}
            placeholder="Username"
            className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm"
            autoComplete="username"
            disabled={busy}
          />

          <input
            value={email}
            readOnly
            className="w-full bg-[#151520] border border-[#303040] rounded-xl px-3 py-3 text-gray-400 text-sm"
          />

          <input
            value={dob}
            onChange={e => setDob(e.target.value)}
            type="date"
            className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm"
            disabled={busy}
          />

          <button
            type="button"
            disabled={busy}
            onClick={saveProfile}
            className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold"
          >
            {busy ? "Creating…" : "REGISTER ACCOUNT"}
          </button>

          <p className="text-[10px] text-gray-500 text-center">
            Password is not required. Login will always use your email OTP.
          </p>
        </>
      )}

      {error && (
        <p className="text-red-300 text-xs bg-red-950/30 border border-red-500/30 rounded-xl p-3">
          {error}
        </p>
      )}
    </div>
  );
}
