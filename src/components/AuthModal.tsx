import React, { useState, useEffect } from "react";
import pardaisPartyExactLogo from "../assets/pardais-party-exact.png";
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Trash2
} from "lucide-react";
import { 
  resolveApiUrl,
  createAccount,
  verifyEmailOtp,
  sendEmailOtp,
  emailPasswordLogin,
  requestPasswordReset,
  resetEmailPassword
} from "../lib/apiClient";
import { getSavedAccounts, saveAccountToDevice } from "../lib/accountStorage";
import { SavedAccount } from "../types";
import { getInitialAvatarData } from "../lib/avatarFallback";
import { DEFAULT_USER } from "../data";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any, token: string) => void;
  onGoogleSignIn: () => void | Promise<void>;
  initialTab?: "login" | "signup" | "forgot";
  actionReason?: string;
  isGateMode?: boolean;
  onOpenDeletionModal?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  onGoogleSignIn,
  initialTab = "login",
  actionReason,
  isGateMode = false,
  onOpenDeletionModal
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "forgot">(initialTab);
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup fields
  const [signupStep, setSignupStep] = useState<"email" | "otp" | "register">("email");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupGender, setSignupGender] = useState("Male");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupToken, setSignupToken] = useState("");

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "reset">("email");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Reset errors when switching tabs
  const switchTab = (tab: "login" | "signup" | "forgot") => {
    setActiveTab(tab);
    setErrorMsg("");
    setSuccessMsg("");
    if (tab === "signup" && signupStep === "register" && !signupToken) {
      setSignupStep("email");
    }
  };

  if (!isOpen) return null;

  // 1. Password Login (Email or Username + Password)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginIdentifier.trim();
    if (!identifier || !loginPassword) {
      setErrorMsg("Please enter your registered email/username and password.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const data = await emailPasswordLogin(identifier, loginPassword);
      onSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Login failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Sign Up - Step 1: Send OTP
  const handleSendSignupOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = signupEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const data = await sendEmailOtp(cleanEmail);
      setSignupStep("otp");
      setResendCooldown(60);
      setSuccessMsg(data.message || `Verification OTP sent to ${cleanEmail}. Check your inbox.`);
    } catch (err: any) {
      if (err?.code === "EMAIL_ALREADY_REGISTERED") {
        setLoginIdentifier(cleanEmail);
        switchTab("login");
        setErrorMsg("This email is already registered. Please log in with your password.");
        return;
      }
      setErrorMsg(err?.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Sign Up - Step 2: Verify OTP
  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanOtp = signupOtp.trim().replace(/\D/g, "");

    if (!cleanEmail || cleanOtp.length !== 6) {
      setErrorMsg("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const data = await verifyEmailOtp(cleanEmail, cleanOtp);

      setSignupToken(data.token);
      try { sessionStorage.setItem("pardais_signup_token", data.token); } catch {}
      
      if (data.user?.fullName) setSignupFullName(data.user.fullName);
      if (data.user?.username) setSignupUsername(data.user.username);
      
      setSignupStep("register");
      setSuccessMsg("Email verified! Complete your name, username and password.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Verification code is incorrect or expired.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Sign Up - Step 3: Complete Registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = signupFullName.trim();
    const username = signupUsername.trim().replace(/^@/, "");
    const pass = signupPassword;
    const confirmPass = signupConfirmPassword;

    if (!name) {
      setErrorMsg("Please enter your real name.");
      return;
    }
    if (username.length < 3) {
      setErrorMsg("Username must contain at least 3 characters.");
      return;
    }
    if (!pass || pass.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (pass !== confirmPass) {
      setErrorMsg("Passwords do not match. Please verify both entries.");
      return;
    }

    const token = signupToken || sessionStorage.getItem("pardais_signup_token");
    if (!token) {
      setErrorMsg("Verification session expired. Please verify your email again.");
      setSignupStep("email");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const data = await createAccount({
        fullName: name,
        username,
        password: pass,
        gender: signupGender,
        email: signupEmail,
        verificationToken: token
      });

      try { sessionStorage.removeItem("pardais_signup_token"); } catch {}

      const finalToken = data.token || token;
      onSuccess(data.user, finalToken);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Account creation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password - Step 1: Send Reset OTP
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const data = await requestPasswordReset(cleanEmail);
      setForgotStep("reset");
      setResendCooldown(60);
      setSuccessMsg(data.message || `Recovery OTP sent to ${cleanEmail}. Check your inbox.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not send recovery code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 6. Forgot Password - Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const cleanOtp = forgotOtp.trim().replace(/\D/g, "");

    if (!cleanEmail || cleanOtp.length !== 6) {
      setErrorMsg("Please enter the 6-digit recovery code.");
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg("Passwords do not match. Please verify both entries.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const data = await resetEmailPassword(cleanEmail, cleanOtp, forgotNewPassword);
      onSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Password reset failed. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isGateMode ? "w-full max-w-sm my-auto" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"}`}>
      <div className="bg-[#12121e] border border-pink-500/30 rounded-[32px] w-full max-w-sm p-6 shadow-[0_0_40px_rgba(255,0,127,0.2)] relative max-h-[95vh] overflow-y-auto scrollbar-none text-left">
        
        {/* Close Button (Hidden in Gate Mode) */}
        {!isGateMode && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Header with Neon Pardais Logo */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-1">
            <div className="w-20 h-20 relative flex items-center justify-center">
              <img
                src={pardaisPartyExactLogo}
                alt="Pardais Party"
                className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,0,127,0.5)]"
                draggable={false}
              />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight">
            {activeTab === "signup" ? "Create Your Account" : activeTab === "forgot" ? "Reset Password" : "Welcome Back"}
          </h2>
          
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            {activeTab === "signup"
              ? "Sign up once. Your Pardais ID and profile stay permanent."
              : activeTab === "forgot"
              ? "Enter your email to recover your Pardais account."
              : "Sign in to access your rooms, chat & profile."}
          </p>
        </div>

        {/* Auth Tabs (Login / Sign Up) */}
        {activeTab !== "forgot" && (
          <div className="grid grid-cols-2 gap-2 bg-[#0d0d15] p-1 rounded-2xl border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={`py-3 text-sm font-bold rounded-xl transition-all ${
                activeTab === "login"
                  ? "bg-[#1e1e2d] text-white shadow-lg border border-white/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className={`py-3 text-sm font-bold rounded-xl transition-all ${
                activeTab === "signup"
                  ? "bg-gradient-to-r from-[#ff007f] via-[#c026d3] to-[#7b2cbf] text-white shadow-lg shadow-pink-600/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Alerts / Error & Success banners */}
        {errorMsg && (
          <div className="mb-4 bg-red-950/50 border border-red-500/60 rounded-2xl p-3 flex items-start gap-2.5 text-red-200 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-950/50 border border-emerald-500/60 rounded-2xl p-3 flex items-start gap-2.5 text-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{successMsg}</div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: LOG IN */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "login" && (
          <div className="space-y-4">
            {/* Quick-Switch Saved Accounts on this Device */}
            {(() => {
              const savedList = getSavedAccounts();
              if (savedList.length === 0) return null;
              return (
                <div className="p-2.5 rounded-2xl bg-[#161626] border border-pink-500/30 space-y-2 mb-3">
                  <div className="flex items-center justify-between text-[8px] font-mono text-gray-400">
                    <span className="text-pink-300 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>👥</span> Saved Accounts on Device ({savedList.length})
                    </span>
                    <span className="text-gray-500">1-Tap Login</span>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-none">
                    {savedList.map((acc, idx) => (
                      <div
                        key={acc.uid || acc.uniqueId || idx}
                        onClick={() => {
                          onSuccess(acc.userProfile, acc.token);
                          onClose();
                        }}
                        className="flex items-center justify-between p-1.5 rounded-xl bg-black/40 hover:bg-[#ff007f]/20 border border-white/5 hover:border-[#ff007f]/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <img
                            src={acc.avatar || getInitialAvatarData(acc.fullName || acc.username)}
                            alt={acc.username}
                            className="w-7 h-7 rounded-full object-cover border border-white/10"
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-white text-[9px] font-bold truncate group-hover:text-pink-300">
                              {acc.fullName || acc.username}
                            </p>
                            <p className="text-[7.5px] text-gray-400 font-mono truncate">
                              @{acc.username}
                            </p>
                          </div>
                        </div>

                        <span className="text-[7.5px] bg-[#ff007f]/20 group-hover:bg-[#ff007f] text-pink-300 group-hover:text-white font-bold px-2 py-1 rounded-lg transition-all font-mono">
                          Switch →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Address or Username
              </label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="pardaisliveofficial@gmail.com"
                required
                autoComplete="username"
                className="w-full bg-[#dde7f5] text-gray-900 font-medium text-sm rounded-2xl px-4 py-3.5 outline-none transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchTab("forgot")}
                  className="text-xs text-pink-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#dde7f5] text-gray-900 font-medium text-sm rounded-2xl px-4 py-3.5 pr-12 outline-none transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-pink-500"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-gray-600 hover:text-gray-900"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ff007f] via-[#c026d3] to-[#7b2cbf] hover:opacity-95 active:scale-98 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg shadow-pink-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Logging in…</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[11px] text-gray-500 uppercase tracking-widest font-mono">OR</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Google Sign-in */}
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 active:scale-98 text-gray-900 font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Continue with Google</span>
              </div>
            </button>

            {/* Apple Sign-in */}
            <button
              type="button"
              onClick={() => setErrorMsg("Apple Sign-In is coming in the next update. Please use Email OTP or Google Sign-In.")}
              className="w-full bg-white hover:bg-gray-100 active:scale-98 text-gray-900 font-bold text-sm py-3 rounded-2xl shadow-md transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-base"></span>
                <span>Continue with Apple</span>
              </div>
              <span className="text-[10px] text-gray-500 font-normal mt-0.5">Coming Soon</span>
            </button>
          </form>
        </div>
      )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: SIGN UP (3-Step Wizard) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "signup" && (
          <div>
            {/* STEP 1: Enter Email */}
            {signupStep === "email" && (
              <form onSubmit={handleSendSignupOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="pardaisliveofficial@gmail.com"
                    required
                    autoComplete="email"
                    className="w-full bg-[#dde7f5] text-gray-900 font-medium text-sm rounded-2xl px-4 py-3.5 outline-none transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#ff007f] via-[#c026d3] to-[#7b2cbf] hover:opacity-95 active:scale-98 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg shadow-pink-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending OTP Code…</span>
                    </>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="h-px bg-white/10 flex-1" />
                  <span className="text-[11px] text-gray-500 uppercase tracking-widest font-mono">OR</span>
                  <div className="h-px bg-white/10 flex-1" />
                </div>

                {/* Google Sign-in */}
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-100 active:scale-98 text-gray-900 font-bold text-sm py-3 rounded-2xl shadow-md transition-all flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Continue with Google</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-normal mt-0.5">Instant Access</span>
                </button>

                {/* Apple Sign-in */}
                <button
                  type="button"
                  onClick={() => setErrorMsg("Apple Sign-In is coming in the next update. Please use Email OTP or Google Sign-In.")}
                  className="w-full bg-white hover:bg-gray-100 active:scale-98 text-gray-900 font-bold text-sm py-3 rounded-2xl shadow-md transition-all flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base"></span>
                    <span>Continue with Apple</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-normal mt-0.5">Coming Soon</span>
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-gray-400">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchTab("login")}
                      className="text-[#ff007f] font-bold hover:underline"
                    >
                      Log In
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {signupStep === "otp" && (
              <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                <div className="bg-[#1a1a26] border border-cyan-500/30 rounded-2xl p-3 text-center">
                  <p className="text-xs text-gray-300">
                    Verification code sent to:
                  </p>
                  <p className="text-sm font-bold text-[#00f5ff] truncate mt-0.5">
                    {signupEmail}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 text-center">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={signupOtp}
                    onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="• • • • • •"
                    required
                    autoFocus
                    className="w-full bg-[#12121a] border-2 border-[#00f5ff] focus:border-[#ff007f] text-white text-2xl font-black text-center tracking-[0.5em] rounded-2xl py-3 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || signupOtp.trim().length !== 6}
                  className="w-full bg-gradient-to-r from-[#00f5ff] to-[#7b2cbf] text-black font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Code & Proceed</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={loading || resendCooldown > 0}
                    onClick={() => handleSendSignupOtp()}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend OTP Code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignupStep("email");
                      setSignupOtp("");
                      setErrorMsg("");
                    }}
                    className="text-xs text-[#ff007f] hover:underline"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Complete Registration (Name, Username, Password, Confirm Password) */}
            {signupStep === "register" && (
              <form onSubmit={handleCompleteRegistration} className="space-y-3.5">
                {/* Verified Email Indicator */}
                <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs">
                  <span className="text-gray-400">Verified Email:</span>
                  <span className="font-bold text-emerald-300 truncate max-w-[200px]">{signupEmail}</span>
                </div>

                {/* Permanent Pardais ID Badge */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-950/40 via-[#16162a] to-pink-950/40 border border-pink-500/30 rounded-xl p-2.5 text-[10px]">
                  <ShieldCheck className="w-4 h-4 text-pink-400 shrink-0" />
                  <div className="text-gray-300 leading-snug">
                    <span className="text-white font-bold">Permanent Pardais ID:</span> A unique permanent ID will be assigned and locked to your profile. It will never change across any sessions or updates.
                  </div>
                </div>

                {/* Real Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Real Name *
                  </label>
                  <input
                    type="text"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    placeholder="Your Full Name"
                    required
                    autoComplete="name"
                    className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all placeholder:text-gray-500"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Username (Unique ID) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 font-bold">@</span>
                    <input
                      type="text"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 25))}
                      placeholder="username"
                      required
                      autoComplete="username"
                      className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl pl-8 pr-3.5 py-2.5 outline-none transition-all placeholder:text-gray-500 font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 mt-0.5">
                    Letters, numbers and underscores only. Locked permanently after setup.
                  </p>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Male", "Female", "Other"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSignupGender(g)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          signupGender === g
                            ? "bg-[#ff007f]/20 border-[#ff007f] text-white"
                            : "bg-[#1e1e2d] border-[#303040] text-gray-400 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create Password */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Create Password (6+ chars) *
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create a strong password"
                      required
                      autoComplete="new-password"
                      className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl pl-3.5 pr-11 py-2.5 outline-none transition-all placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupConfirmPassword ? "text" : "password"}
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      autoComplete="new-password"
                      className={`w-full bg-[#1e1e2d] border ${
                        signupConfirmPassword && signupPassword !== signupConfirmPassword
                          ? "border-red-500"
                          : "border-[#303040] focus:border-[#ff007f]"
                      } text-white text-sm rounded-xl pl-3.5 pr-11 py-2.5 outline-none transition-all placeholder:text-gray-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                      aria-label={showSignupConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
                    <p className="text-[10px] text-red-400 mt-1">Passwords do not match!</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#ff007f] via-[#c026d3] to-[#7b2cbf] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-pink-600/30 transition-all hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Account…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Complete Registration & Enter App</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: FORGOT PASSWORD */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "forgot" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => switchTab("login")}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                ← Back to Log In
              </button>
            </div>

            {forgotStep === "email" && (
              <form onSubmit={handleSendForgotOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Your Registered Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter registered email"
                      required
                      autoComplete="email"
                      className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl pl-10 pr-3.5 py-3 outline-none transition-all placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Recovery Code…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send Recovery Code</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {forgotStep === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1 text-center">
                    Enter 6-Digit Recovery OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="• • • • • •"
                    required
                    autoFocus
                    className="w-full bg-[#12121a] border-2 border-[#00f5ff] focus:border-[#ff007f] text-white text-xl font-black text-center tracking-[0.4em] rounded-xl py-2.5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    New Password (6+ characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? "text" : "password"}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      autoComplete="new-password"
                      className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl pl-3.5 pr-11 py-2.5 outline-none transition-all placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotConfirmPassword ? "text" : "password"}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      autoComplete="new-password"
                      className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl pl-3.5 pr-11 py-2.5 outline-none transition-all placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                    >
                      {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#00f5ff] to-[#7b2cbf] text-black font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Reset Password & Log In</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* 30-Day Account Deletion / Restoration Access */}
        {onOpenDeletionModal && (
          <div className="text-center pt-3.5 border-t border-white/10 mt-4">
            <button
              type="button"
              onClick={onOpenDeletionModal}
              className="text-[11px] text-gray-400 hover:text-red-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400/80" />
              <span>Schedule 30-Day Account Deletion or Restore Account</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
