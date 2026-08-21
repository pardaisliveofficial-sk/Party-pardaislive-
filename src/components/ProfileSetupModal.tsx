import React, { useState } from "react";
import { X, Sparkles, User, Lock, Eye, EyeOff, RefreshCw } from "lucide-react";
import { resolveApiUrl } from "../lib/apiClient";

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: (updatedUser: any, token?: string) => void;
}

export default function ProfileSetupModal({
  isOpen,
  onClose,
  user,
  onSuccess
}: ProfileSetupModalProps) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState(user?.gender || "Male");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isGooglePending = String(user?.authProvider || "").toLowerCase() === "google" && !user?.usernameLockedAt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanName) {
      setError("Please enter your real name.");
      return;
    }

    if (isGooglePending) {
      if (cleanUsername.length < 3) {
        setError("Username must contain at least 3 characters.");
        return;
      }
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    const token = localStorage.getItem("pardais_auth_token");
    setError("");
    setLoading(true);

    try {
      if (isGooglePending) {
        const res = await fetch(resolveApiUrl("/api/v1/auth/complete-google-profile"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            fullName: cleanName,
            username: cleanUsername,
            password,
            gender
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success || !data?.user) {
          throw new Error(data?.error || "Failed to complete Google profile.");
        }

        onSuccess(data.user, data.token);
        onClose();
        return;
      }

      // Regular profile update
      const res = await fetch(resolveApiUrl("/api/v1/auth/setup-profile"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fullName: cleanName,
          username: cleanUsername || undefined,
          gender
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.user) {
        throw new Error(data?.error || "Failed to update profile.");
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#12121a] border border-[#ff007f]/40 rounded-3xl w-full max-w-md p-6 shadow-[0_0_40px_rgba(255,0,127,0.25)] relative max-h-[92vh] overflow-y-auto scrollbar-none text-left">
        
        {/* Header */}
        <div className="text-center space-y-1 mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff007f] to-[#00f5ff] p-0.5 shadow-lg mb-1">
            <div className="w-full h-full bg-[#12121a] rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#ff007f]" />
            </div>
          </div>
          <h3 className="text-lg font-black uppercase tracking-wider text-white">
            Complete Your Profile
          </h3>
          <p className="text-xs text-gray-400">
            Set your username & password to lock your account permanently
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-500/50 rounded-xl p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
              Real Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your Full Name"
              required
              className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
              Username *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 font-bold">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 25))}
                placeholder="username"
                required
                className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl pl-8 pr-3.5 py-2.5 outline-none font-mono"
              />
            </div>
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
                  onClick={() => setGender(g)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    gender === g
                      ? "bg-[#ff007f]/20 border-[#ff007f] text-white"
                      : "bg-[#1e1e2d] border-[#303040] text-gray-400 hover:text-white"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* If Google Pending -> Set Password */}
          {isGooglePending && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Create Password (6+ characters) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl pl-3.5 pr-11 py-2.5 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full bg-[#1e1e2d] border border-[#303040] focus:border-[#ff007f] text-white text-sm rounded-xl pl-3.5 pr-11 py-2.5 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-3"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Profile…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save Profile & Enter App</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
