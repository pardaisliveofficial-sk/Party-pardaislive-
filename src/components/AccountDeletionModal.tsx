import React, { useState, useEffect } from "react";
import { X, Trash2, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert, Mail } from "lucide-react";
import { resolveApiUrl } from "../lib/apiClient";

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onLogout: () => void;
}

export default function AccountDeletionModal({
  isOpen,
  onClose,
  userEmail = "",
  onLogout
}: AccountDeletionModalProps) {
  const [tab, setTab] = useState<"delete" | "restore">("delete");
  const [email, setEmail] = useState(userEmail);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (userEmail) setEmail(userEmail);
  }, [userEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  // Send Deletion OTP
  const handleSendDeletionCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid registered email address.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(resolveApiUrl("/api/v1/auth/send-account-deletion-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send deletion confirmation code.");
      }
      setStep("verify");
      setCooldown(60);
      setSuccess("Deletion confirmation code sent to your email. Check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Failed to send code. Please verify your email.");
    } finally {
      setLoading(false);
    }
  };

  // Confirm Deletion
  const handleConfirmDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the 6-digit confirmation code.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(resolveApiUrl("/api/v1/auth/confirm-account-deletion"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm account deletion.");
      }

      setSuccess("Account successfully scheduled for deletion. You have a 30-day grace period to restore it if you change your mind.");
      setTimeout(() => {
        onLogout();
        onClose();
      }, 3500);
    } catch (err: any) {
      setError(err?.message || "Invalid or expired deletion code.");
    } finally {
      setLoading(false);
    }
  };

  // Send Restore OTP
  const handleSendRestoreCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter your registered email address.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(resolveApiUrl("/api/v1/auth/send-account-restore-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No pending deletion found for this email.");
      }
      setStep("verify");
      setCooldown(60);
      setSuccess("Account restore code sent to your email. Check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Failed to send restore code.");
    } finally {
      setLoading(false);
    }
  };

  // Confirm Restore
  const handleConfirmRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the 6-digit restore code.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(resolveApiUrl("/api/v1/auth/restore-account"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.token) {
        throw new Error(data.error || "Failed to restore account.");
      }

      setSuccess("Account successfully restored! Redirecting to login…");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Invalid or expired restore code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#12121a] border border-red-500/40 rounded-3xl w-full max-w-md p-6 shadow-[0_0_40px_rgba(239,68,68,0.25)] relative max-h-[92vh] overflow-y-auto scrollbar-none text-left">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/50 p-2 shadow-lg mb-1">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-wider text-white">
            Account Management
          </h3>
          <p className="text-xs text-gray-400">
            30-Day Scheduled Deletion & Account Restoration
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-[#1a1a26] p-1 rounded-2xl border border-white/10 mb-4">
          <button
            type="button"
            onClick={() => {
              setTab("delete");
              setStep("request");
              setError("");
              setSuccess("");
            }}
            className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              tab === "delete"
                ? "bg-red-600 text-white shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Delete (30-Day Grace)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("restore");
              setStep("request");
              setError("");
              setSuccess("");
            }}
            className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              tab === "restore"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Restore Account
          </button>
        </div>

        {/* Notice Banner */}
        {tab === "delete" && (
          <div className="mb-4 bg-red-950/30 border border-red-500/40 rounded-2xl p-3 text-xs text-red-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>30-Day Permanent Deletion Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-300">
              Once scheduled, you will have a <strong>30-day grace period</strong>. During these 30 days, your profile and content will be hidden, but you can restore your account at any time using your email. After 30 days, all data is permanently erased.
            </p>
          </div>
        )}

        {tab === "restore" && (
          <div className="mb-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-3 text-xs text-emerald-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Restore Within 30 Days</span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-300">
              If you scheduled deletion within the last 30 days, enter your email to receive a recovery code and instantly restore full access to your account.
            </p>
          </div>
        )}

        {/* Errors & Alerts */}
        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-500/50 rounded-xl p-3 text-xs text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-300">
            {success}
          </div>
        )}

        {/* DELETION FORM */}
        {tab === "delete" && (
          <>
            {step === "request" && (
              <form onSubmit={handleSendDeletionCode} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="registered@email.com"
                      required
                      className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-red-500 text-white text-sm rounded-xl pl-10 pr-3 py-2.5 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Code…</span>
                    </>
                  ) : (
                    <span>Send Deletion Confirmation Code</span>
                  )}
                </button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleConfirmDeletion} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 text-center">
                    Enter 6-Digit Deletion Confirmation Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="• • • • • •"
                    required
                    autoFocus
                    className="w-full bg-[#12121a] border-2 border-red-500 text-white text-2xl font-black text-center tracking-[0.5em] rounded-2xl py-2.5 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Confirming…</span>
                    </>
                  ) : (
                    <span>Confirm 30-Day Account Deletion</span>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <button
                    type="button"
                    disabled={loading || cooldown > 0}
                    onClick={handleSendDeletionCode}
                    className="hover:text-white disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("request");
                      setOtp("");
                    }}
                    className="text-red-400 hover:underline"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* RESTORE FORM */}
        {tab === "restore" && (
          <>
            {step === "request" && (
              <form onSubmit={handleSendRestoreCode} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="registered@email.com"
                      required
                      className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-emerald-500 text-white text-sm rounded-xl pl-10 pr-3 py-2.5 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Code…</span>
                    </>
                  ) : (
                    <span>Send Restore Verification Code</span>
                  )}
                </button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleConfirmRestore} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 text-center">
                    Enter 6-Digit Restore Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="• • • • • •"
                    required
                    autoFocus
                    className="w-full bg-[#12121a] border-2 border-emerald-500 text-white text-2xl font-black text-center tracking-[0.5em] rounded-2xl py-2.5 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Restoring…</span>
                    </>
                  ) : (
                    <span>Restore My Account</span>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <button
                    type="button"
                    disabled={loading || cooldown > 0}
                    onClick={handleSendRestoreCode}
                    className="hover:text-white disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("request");
                      setOtp("");
                    }}
                    className="text-emerald-400 hover:underline"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
