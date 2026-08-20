import React, { useState, useEffect } from "react";
import { 
  Lock, 
  Mail, 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { 
  emailStatus, 
  sendEmailOtp, 
  verifyEmailOtp, 
  emailPasswordLogin, 
  requestPasswordReset, 
  resetEmailPassword,
  resolveApiUrl 
} from "../lib/apiClient";

interface AuthScreenProps {
  onAuthenticated: (payload: { success: boolean; token: string; user: any }) => void;
  onGoogleSignIn: () => void | Promise<void>;
  initialMode?: "login" | "signup" | "forgot";
}

export default function AuthScreen({ 
  onAuthenticated, 
  onGoogleSignIn, 
  initialMode = "login" 
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Signup flow steps
  const [signupStep, setSignupStep] = useState<"email" | "otp" | "profile">("email");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupGender, setSignupGender] = useState("Male");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  // Forgot password flow steps
  const [forgotStep, setForgotStep] = useState<"email" | "otp_password">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  
  // General status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [resendCooldown]);

  const clearMessages = () => {
    setError("");
    setSuccessMsg("");
  };

  // Switch tabs cleanly
  const switchMode = (newMode: "login" | "signup" | "forgot") => {
    clearMessages();
    setMode(newMode);
    if (newMode === "signup") {
      setSignupStep("email");
      setSignupOtp("");
      setSignupToken("");
    } else if (newMode === "forgot") {
      setForgotStep("email");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    }
  };

  // 1. ================= HANDLE LOGIN =================
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginIdentifier.trim();
    if (!cleanId) {
      setError("Please enter your email or username.");
      return;
    }
    if (!loginPassword) {
      setError("Please enter your password.");
      return;
    }

    clearMessages();
    setLoading(true);
    try {
      const response = await emailPasswordLogin(cleanId, loginPassword);
      if (!response?.success || !response?.token || !response?.user) {
        throw new Error(response?.error || "Incorrect login credentials. Please check your password or use Forgot Password.");
      }
      onAuthenticated({
        success: true,
        token: response.token,
        user: response.user
      });
    } catch (err: any) {
      setError(err?.message || "Login failed. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  // 2. ================= HANDLE SIGNUP: STEP 1 (Send Email OTP) =================
  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = signupEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    clearMessages();
    setLoading(true);
    try {
      // Check if email already has a complete registered account
      const status = await emailStatus(cleanEmail);
      if (status?.exists && !status?.needsPassword) {
        setError("This email is already registered. Please log in or use Forgot Password.");
        setLoginIdentifier(cleanEmail);
        setMode("login");
        setLoading(false);
        return;
      }

      const sent = await sendEmailOtp(cleanEmail);
      if (!sent?.success) {
        if (sent?.code === "EMAIL_ALREADY_REGISTERED") {
          setError("This email is already registered. Please switch to Login.");
          setLoginIdentifier(cleanEmail);
          setMode("login");
          return;
        }
        throw new Error(sent?.error || "Could not send verification code. Please check your email.");
      }

      setSuccessMsg(`Verification code sent to ${cleanEmail}. Please check your email inbox and enter the 6-digit code below.`);
      setResendCooldown(60);
      setSignupStep("otp");
    } catch (err: any) {
      setError(err?.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // 3. ================= HANDLE SIGNUP: STEP 2 (Verify OTP) =================
  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanOtp = signupOtp.trim().replace(/\D/g, "");

    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    clearMessages();
    setLoading(true);
    try {
      const result = await verifyEmailOtp(cleanEmail, cleanOtp);
      if (!result?.success || !result?.token) {
        throw new Error(result?.error || "Invalid or expired verification code.");
      }

      const verifiedToken = String(result.token).trim();
      setSignupToken(verifiedToken);
      try {
        sessionStorage.setItem("pardais_signup_token", verifiedToken);
      } catch {}

      setSignupFullName(result?.user?.fullName || "");
      setSignupUsername(result?.user?.username || cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20));
      setSuccessMsg("Email verified! Now complete your permanent Pardais profile.");
      setSignupStep("profile");
    } catch (err: any) {
      setError(err?.message || "Verification code is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  // 4. ================= HANDLE SIGNUP: STEP 3 (Create Account & Lock Username) =================
  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    let tokenToUse = signupToken;
    if (!tokenToUse) {
      try {
        tokenToUse = sessionStorage.getItem("pardais_signup_token") || "";
      } catch {}
    }

    if (!tokenToUse) {
      setError("Your verification session expired. Please verify your email again.");
      setSignupStep("email");
      return;
    }

    const cleanName = signupFullName.trim();
    const cleanUsername = signupUsername.trim().replace(/^@/, "");

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    clearMessages();
    setLoading(true);
    try {
      const response = await fetch(resolveApiUrl("/api/v1/auth/create-account"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenToUse}`
        },
        body: JSON.stringify({
          fullName: cleanName,
          username: cleanUsername,
          password: signupPassword,
          gender: signupGender,
          verificationToken: tokenToUse
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.user || !data?.token) {
        throw new Error(data?.error || "Account creation failed. Please try a different username.");
      }

      try {
        sessionStorage.removeItem("pardais_signup_token");
      } catch {}

      onAuthenticated({
        success: true,
        token: data.token,
        user: data.user
      });
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 5. ================= HANDLE FORGOT PASSWORD: STEP 1 (Send Recovery OTP) =================
  const handleSendRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter your registered email address.");
      return;
    }

    clearMessages();
    setLoading(true);
    try {
      const result = await requestPasswordReset(cleanEmail);
      if (!result?.success) {
        throw new Error(result?.error || "No registered account found with this email.");
      }

      setSuccessMsg(`Recovery code sent to ${cleanEmail}. Please check your email inbox and enter the 6-digit code below.`);
      setResendCooldown(60);
      setForgotStep("otp_password");
    } catch (err: any) {
      setError(err?.message || "Could not send recovery code. Ensure this email is registered.");
    } finally {
      setLoading(false);
    }
  };

  // 6. ================= HANDLE FORGOT PASSWORD: STEP 2 (Reset Password & Login) =================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const cleanOtp = forgotOtp.trim().replace(/\D/g, "");

    if (cleanOtp.length !== 6) {
      setError("Please enter the 6-digit recovery code.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    clearMessages();
    setLoading(true);
    try {
      const result = await resetEmailPassword(cleanEmail, cleanOtp, forgotNewPassword);
      if (!result?.success || !result?.token || !result?.user) {
        throw new Error(result?.error || "Password reset failed. Invalid or expired recovery code.");
      }

      onAuthenticated({
        success: true,
        token: result.token,
        user: result.user
      });
    } catch (err: any) {
      setError(err?.message || "Could not reset password. Please check the recovery code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 text-white select-none">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#ff007f] via-[#7b2cbf] to-[#00f5ff] p-0.5 mx-auto shadow-[0_0_30px_rgba(255,0,127,0.35)] animate-pulse flex items-center justify-center">
          <div className="w-full h-full bg-[#0a0a12] rounded-[22px] flex items-center justify-center">
            <span className="text-3xl">🎙️</span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-wider uppercase font-mono bg-gradient-to-r from-pink-400 via-[#ff007f] to-cyan-300 bg-clip-text text-transparent">
            Pardais Party
          </h2>
          <p className="text-xs text-gray-300 font-medium tracking-wide">
            Live Audio Lounges • PK Battles • Global Communities
          </p>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex bg-[#12121e] p-1 rounded-2xl border border-white/10 mb-5 shadow-inner">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            mode === "login"
              ? "bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white shadow-lg shadow-pink-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            mode === "signup"
              ? "bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white shadow-lg shadow-pink-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="mb-4 bg-red-950/60 border border-red-500/60 rounded-2xl p-3.5 flex items-start space-x-2.5 animate-fade-in shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-200 leading-snug">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl p-3.5 flex items-start space-x-2.5 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-200 leading-snug">{successMsg}</p>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. LOGIN VIEW */}
      {/* ============================================================== */}
      {mode === "login" && (
        <form onSubmit={handlePasswordLogin} className="space-y-4 animate-fade-in">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1.5 flex items-center space-x-1">
              <Mail className="w-3.5 h-3.5 text-pink-400" />
              <span>Email Address or @Username</span>
            </label>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="e.g. saif@gmail.com or @saif_official"
              required
              autoComplete="username"
              className="w-full bg-[#161626] border border-[#303046] focus:border-[#ff007f] focus:ring-1 focus:ring-[#ff007f] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 transition-all outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-pink-400" />
                <span>Password</span>
              </label>
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your account password"
                required
                autoComplete="current-password"
                className="w-full bg-[#161626] border border-[#303046] focus:border-[#ff007f] focus:ring-1 focus:ring-[#ff007f] rounded-2xl px-4 py-3.5 pr-12 text-sm text-white placeholder-gray-500 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#ff007f] via-purple-600 to-[#7b2cbf] hover:from-pink-500 hover:to-purple-500 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-pink-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Logging In…</span>
              </>
            ) : (
              <>
                <span>Log In & Enter</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Social / Google Sign-In Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative bg-[#0b0c10] px-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              or continue with
            </span>
          </div>

          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 bg-white hover:bg-gray-100 active:scale-[0.98] text-gray-900 font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center space-x-3 cursor-pointer"
          >
            <span className="w-5 h-5 flex items-center justify-center font-black text-base text-blue-600">
              G
            </span>
            <span>Continue with Google</span>
          </button>
        </form>
      )}

      {/* ============================================================== */}
      {/* 2. SIGN UP VIEW */}
      {/* ============================================================== */}
      {mode === "signup" && (
        <div className="animate-fade-in space-y-4">
          {/* STEP 1: Enter Email */}
          {signupStep === "email" && (
            <form onSubmit={handleSendSignupOtp} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1.5 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-pink-400" />
                  <span>Your Email Address</span>
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-[#161626] border border-[#303046] focus:border-[#ff007f] focus:ring-1 focus:ring-[#ff007f] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 transition-all outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                  We'll send a 6-digit verification code to confirm ownership.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] hover:from-pink-500 hover:to-purple-500 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-pink-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Code…</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative my-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-[#0b0c10] px-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  or sign up with
                </span>
              </div>

              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 bg-white hover:bg-gray-100 active:scale-[0.98] text-gray-900 font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center space-x-3 cursor-pointer"
              >
                <span className="w-5 h-5 flex items-center justify-center font-black text-base text-blue-600">
                  G
                </span>
                <span>Continue with Google</span>
              </button>
            </form>
          )}

          {/* STEP 2: Verify 6-digit OTP */}
          {signupStep === "otp" && (
            <form onSubmit={handleVerifySignupOtp} className="space-y-4">
              <div className="text-center space-y-1 mb-2">
                <p className="text-xs text-gray-300">
                  Verification code sent to:
                </p>
                <p className="text-sm font-bold text-pink-400">{signupEmail}</p>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1.5 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="w-full bg-[#12121a] border-2 border-cyan-400 focus:border-[#ff007f] rounded-2xl px-4 py-3.5 text-xl font-mono text-center tracking-[0.5em] text-cyan-300 placeholder-gray-600 outline-none shadow-[0_0_20px_rgba(0,245,255,0.15)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || signupOtp.trim().length !== 6}
                className="w-full py-3.5 bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-pink-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code…</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep("email");
                    clearMessages();
                  }}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ← Change Email
                </button>
                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={async () => {
                    clearMessages();
                    setLoading(true);
                    try {
                      const res = await sendEmailOtp(signupEmail.trim().toLowerCase());
                      if (!res?.success) throw new Error(res?.error || "Could not resend code.");
                      setSuccessMsg("New verification code sent!");
                      setResendCooldown(60);
                    } catch (err: any) {
                      setError(err?.message || "Failed to resend code.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer disabled:opacity-40"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Mandatory Profile Setup (Name, Permanent Username, Password, Gender) */}
          {signupStep === "profile" && (
            <form onSubmit={handleCompleteSignup} className="space-y-3.5">
              <div className="bg-gradient-to-r from-pink-950/40 via-purple-950/40 to-cyan-950/40 border border-[#ff007f]/40 p-3 rounded-2xl space-y-1">
                <p className="text-[10px] text-pink-300 font-bold uppercase tracking-wider flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mandatory Account Setup</span>
                </p>
                <p className="text-[11px] text-gray-300 leading-snug">
                  Your username and Pardais ID are permanent and will be locked upon registration.
                </p>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  placeholder="e.g. Saif Khokhar"
                  required
                  autoComplete="name"
                  className="w-full bg-[#161626] border border-[#303046] focus:border-[#ff007f] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1 flex items-center justify-between">
                  <span>Permanent Username *</span>
                  <span className="text-[9px] text-pink-400 font-normal">Non-editable after creation</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 25))}
                    placeholder="username"
                    required
                    autoComplete="username"
                    className="w-full bg-[#161626] border border-[#303046] focus:border-[#ff007f] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                    Gender
                  </label>
                  <select
                    value={signupGender}
                    onChange={(e) => setSignupGender(e.target.value)}
                    className="w-full bg-[#161626] border border-[#303046] focus:border-[#ff007f] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                    Verified Email
                  </label>
                  <input
                    type="text"
                    value={signupEmail}
                    readOnly
                    className="w-full bg-[#101018] border border-[#252535] rounded-xl px-3 py-2.5 text-xs text-gray-400 truncate outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  Create Password (min. 6 characters) *
                </label>
                <div className="relative">
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#161626] border border-[#303046] focus:border-[#ff007f] rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showSignupConfirmPassword ? "text" : "password"}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#161626] border border-[#303046] focus:border-[#ff007f] rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#ff007f] via-purple-600 to-[#00f5ff] hover:from-pink-500 hover:to-cyan-400 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-pink-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Complete Registration & Enter</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. FORGOT PASSWORD / ACCOUNT RECOVERY VIEW */}
      {/* ============================================================== */}
      {mode === "forgot" && (
        <div className="animate-fade-in space-y-4">
          <div className="border-b border-white/10 pb-3 mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Recover Account / Forgot Password</span>
            </h3>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              Back to Login
            </button>
          </div>

          {forgotStep === "email" && (
            <form onSubmit={handleSendRecoveryOtp} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1.5">
                  Enter Your Registered Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-[#161626] border border-[#303046] focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                  We'll send a 6-digit recovery code. Your existing user data (coins, friends, username, ID) will be completely preserved.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Recovery Code…</span>
                  </>
                ) : (
                  <>
                    <span>Send Recovery Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {forgotStep === "otp_password" && (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="text-center space-y-1 mb-1">
                <p className="text-xs text-gray-300">Recovery code sent to:</p>
                <p className="text-sm font-bold text-cyan-400">{forgotEmail}</p>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  6-Digit Recovery Code
                </label>
                <input
                  type="text"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  required
                  className="w-full bg-[#12121a] border-2 border-cyan-400 focus:border-[#ff007f] rounded-xl px-3.5 py-2.5 text-lg font-mono text-center tracking-[0.4em] text-cyan-300 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  New Password (min. 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showForgotNewPassword ? "text" : "password"}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#161626] border border-[#303046] focus:border-cyan-400 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  className="w-full bg-[#161626] border border-[#303046] focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-[#7b2cbf] text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resetting Password…</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Reset Password & Enter App</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setForgotStep("email")}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ← Change Email
                </button>
                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={async () => {
                    clearMessages();
                    setLoading(true);
                    try {
                      const res = await requestPasswordReset(forgotEmail.trim().toLowerCase());
                      if (!res?.success) throw new Error(res?.error || "Could not resend recovery code.");
                      setSuccessMsg("New recovery code sent!");
                      setResendCooldown(60);
                    } catch (err: any) {
                      setError(err?.message || "Failed to resend code.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer disabled:opacity-40"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Trust & Durability Footnote */}
      <div className="mt-8 text-center text-[10px] text-gray-500 space-y-1">
        <p className="flex items-center justify-center space-x-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Encrypted Authentication & Permanent Data Persistence</span>
        </p>
        <p>Pardais Party Live © 2026 • Soulverse Apps</p>
      </div>
    </div>
  );
}
