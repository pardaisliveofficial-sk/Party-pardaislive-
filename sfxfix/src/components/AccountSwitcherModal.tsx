import React, { useState } from "react";
import pardaisPartyExactLogo from "../assets/pardais-party-exact.png";
import { 
  Users, 
  Plus, 
  Check, 
  Trash2, 
  X, 
  ShieldCheck, 
  Coins, 
  Gem, 
  Crown, 
  LogIn, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { UserProfile, SavedAccount } from "../types";
import { DEFAULT_USER } from "../data";
import { 
  getSavedAccounts, 
  saveAccountToDevice, 
  removeAccountFromDevice, 
  getDemoAccounts 
} from "../lib/accountStorage";
import { 
  emailPasswordLogin, 
  sendEmailOtp, 
  verifyEmailOtp, 
  createAccount 
} from "../lib/apiClient";

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchAccount: (account: SavedAccount) => void;
  onLoginNewAccountSuccess: (user: UserProfile, token: string) => void;
  onGoogleSignIn: () => void | Promise<void>;
}

export default function AccountSwitcherModal({
  isOpen,
  onClose,
  currentUser,
  onSwitchAccount,
  onLoginNewAccountSuccess,
  onGoogleSignIn
}: AccountSwitcherModalProps) {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    const list = getSavedAccounts();
    // Ensure current user is present
    if (currentUser && (currentUser.uniqueId || currentUser.username)) {
      return saveAccountToDevice(currentUser);
    }
    return list;
  });

  const [activeTab, setActiveTab] = useState<"accounts" | "add_password" | "add_otp" | "demo">("accounts");
  
  // New account login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // OTP login fields
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState("");

  if (!isOpen) return null;

  // Refresh saved accounts list
  const refreshList = () => {
    setSavedAccounts(getSavedAccounts());
  };

  // Handle switching to an existing account
  const handleSelectAccount = (account: SavedAccount) => {
    onSwitchAccount(account);
    onClose();
  };

  // Handle removing an account from the device list
  const handleRemoveAccount = (e: React.MouseEvent, identifier: string) => {
    e.stopPropagation();
    const updated = removeAccountFromDevice(identifier);
    setSavedAccounts(updated);
  };

  // Handle password login for 2nd/3rd/4th account
  const handlePasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMessage("Please enter both email/username and password.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsLoggingIn(true);

    try {
      const data = await emailPasswordLogin(loginIdentifier.trim(), loginPassword.trim());
      // Save this new account to device list
      saveAccountToDevice(data.user, data.token, "password");
      refreshList();
      onLoginNewAccountSuccess(data.user, data.token);
      setSuccessMessage(`Logged in as @${data.user.username}!`);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err?.message || "Login failed. Check your credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle OTP send for new account
  const handleSendOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsLoggingIn(true);

    try {
      const data = await sendEmailOtp(cleanEmail);
      setIsOtpSent(true);
      setSuccessMessage(data.message || `Verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to send OTP. Try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle OTP verify for new account
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    const cleanOtp = otpCode.trim().replace(/\D/g, "");

    if (!cleanEmail || cleanOtp.length !== 6) {
      setErrorMessage("Please enter the 6-digit OTP code.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsLoggingIn(true);

    try {
      const data = await verifyEmailOtp(cleanEmail, cleanOtp);
      let targetUser = data.user;
      let targetToken = data.token;

      // If user profile is not complete yet, generate standard profile
      if (!targetUser || !targetUser.username) {
        const usernameSeed = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "_");
        const accountResult = await createAccount({
          fullName: usernameSeed,
          username: usernameSeed,
          password: "PardaisUser" + Math.floor(1000 + Math.random() * 9000),
          verificationToken: targetToken
        });
        targetUser = accountResult.user;
        targetToken = accountResult.token;
      }

      saveAccountToDevice(targetUser, targetToken, "otp");
      refreshList();
      onLoginNewAccountSuccess(targetUser, targetToken);
      setSuccessMessage(`Logged in as @${targetUser.username}!`);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid or expired OTP code.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle 1-click test switch to Demo Accounts (2nd, 3rd, 4th accounts)
  const handleQuickDemoSwitch = (demo: ReturnType<typeof getDemoAccounts>[0]) => {
    saveAccountToDevice(demo.user, demo.token, "demo");
    refreshList();
    onLoginNewAccountSuccess(demo.user, demo.token);
    setSuccessMessage(`Switched to ${demo.label}!`);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const isCurrentActive = (acc: SavedAccount) => {
    if (!currentUser) return false;
    return (
      (currentUser.uid && acc.uid === currentUser.uid) ||
      (currentUser.uniqueId && acc.uniqueId === currentUser.uniqueId) ||
      (currentUser.username && acc.username && acc.username.toLowerCase() === currentUser.username.toLowerCase())
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#151520] border-2 border-[#ff007f]/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-3.5 border-b border-white/10 bg-gradient-to-r from-purple-950/80 via-[#181828] to-pink-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#090514] border border-pink-500/50 p-0.5 flex items-center justify-center shadow-lg shadow-pink-500/30 overflow-hidden">
              <img src={pardaisPartyExactLogo} alt="Pardais Party" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>Switch Account</span>
                <span className="text-[8.5px] bg-[#ff007f]/20 text-pink-300 border border-[#ff007f]/30 px-1.5 py-0.2 rounded-full font-mono">
                  {savedAccounts.length} On Device
                </span>
              </h3>
              <p className="text-[8px] text-gray-400">Use 2nd, 3rd, 4th accounts seamlessly</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-[#0e0e16] border-b border-white/5 text-[9px] font-bold font-mono">
          <button
            type="button"
            onClick={() => {
              setActiveTab("accounts");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeTab === "accounts"
                ? "bg-gradient-to-r from-[#ff007f] to-purple-600 text-white shadow"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Accounts ({savedAccounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("add_password");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeTab === "add_password" || activeTab === "add_otp"
                ? "bg-gradient-to-r from-[#ff007f] to-purple-600 text-white shadow"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Add Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("demo");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeTab === "demo"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow"
                : "bg-white/5 text-yellow-400/80 hover:text-yellow-300"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Quick Slots</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mx-3 mt-2.5 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[8.5px] flex items-center space-x-1.5">
            <span className="shrink-0">⚠️</span>
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-3 mt-2.5 p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-[8.5px] flex items-center space-x-1.5">
            <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
            <span className="flex-1 font-bold">{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-3 overflow-y-auto flex-1 space-y-3 scrollbar-none">
          
          {/* TAB 1: SAVED ACCOUNTS LIST */}
          {activeTab === "accounts" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[8.5px] font-mono text-gray-400 px-0.5">
                <span>Select an account to switch instantly:</span>
                <span className="text-pink-400 font-bold">1-Tap Switch</span>
              </div>

              <div className="space-y-2">
                {savedAccounts.map((acc, index) => {
                  const isActive = isCurrentActive(acc);
                  return (
                    <div
                      key={acc.uid || acc.uniqueId || index}
                      onClick={() => handleSelectAccount(acc)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex items-center justify-between ${
                        isActive
                          ? "bg-gradient-to-r from-pink-950/60 via-purple-950/40 to-[#1e1e2d] border-[#ff007f] ring-1 ring-[#ff007f]/50 shadow-lg"
                          : "bg-[#1a1a28] hover:bg-[#222234] border-white/10 hover:border-pink-500/40"
                      }`}
                    >
                      {/* Left: Avatar + Details */}
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={acc.avatar || DEFAULT_USER.avatar}
                            alt={acc.username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-md"
                          />
                          {(acc.vipLevel ?? 0) > 0 && (
                            <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[6.5px] font-black px-1 rounded-full border border-black shadow">
                              V{acc.vipLevel}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-white text-[10px] font-black truncate">
                              {acc.fullName || acc.username}
                            </span>
                            {isActive && (
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[7px] font-black font-mono px-1.5 py-0.2 rounded-full flex items-center space-x-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block mr-0.5" />
                                ACTIVE
                              </span>
                            )}
                          </div>

                          <p className="text-[8px] text-gray-400 font-mono truncate">
                            @{acc.username} • <span className="text-[#00f5ff] font-bold">ID: {acc.uniqueId}</span>
                          </p>

                          {/* Stats Badges */}
                          <div className="flex items-center space-x-2 mt-1 text-[7.5px] font-mono">
                            <span className="text-yellow-400 flex items-center space-x-0.5">
                              <Coins className="w-2.5 h-2.5 text-yellow-400" />
                              <span>{(acc.coins ?? acc.userProfile?.coins ?? 0).toLocaleString()}</span>
                            </span>
                            <span className="text-cyan-400 flex items-center space-x-0.5">
                              <Gem className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{(acc.diamonds ?? acc.userProfile?.diamonds ?? 0).toLocaleString()}</span>
                            </span>
                            <span className="text-gray-400">
                              Lv.{acc.userLevel ?? acc.userProfile?.userLevel ?? 1}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        {isActive ? (
                          <div className="w-6 h-6 rounded-full bg-[#ff007f] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAccount(acc);
                            }}
                            className="bg-gradient-to-r from-[#ff007f] to-purple-600 hover:from-[#ff007f]/90 hover:to-purple-500 text-white text-[8.5px] font-black uppercase px-2.5 py-1.5 rounded-lg shadow transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Switch</span>
                          </button>
                        )}

                        {!isActive && (
                          <button
                            type="button"
                            title="Remove from device"
                            onClick={(e) => handleRemoveAccount(e, acc.uid || acc.uniqueId || acc.username)}
                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Account CTA Card */}
              <button
                type="button"
                onClick={() => setActiveTab("add_password")}
                className="w-full p-2.5 rounded-xl border border-dashed border-[#ff007f]/50 hover:border-[#ff007f] bg-[#ff007f]/5 hover:bg-[#ff007f]/10 text-white transition-all flex items-center justify-center space-x-2 cursor-pointer mt-3"
              >
                <div className="w-6 h-6 rounded-full bg-[#ff007f]/20 text-[#ff007f] flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9.5px] font-black font-mono uppercase tracking-wider text-pink-300">
                  + Add 2nd, 3rd or 4th Account
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: ADD ACCOUNT (PASSWORD OR OTP OR GOOGLE) */}
          {(activeTab === "add_password" || activeTab === "add_otp") && (
            <div className="space-y-3">
              {/* Sub-toggle: Password vs OTP vs Google */}
              <div className="flex bg-[#0a0a10] p-1 rounded-xl border border-white/10 text-[8.5px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab("add_password")}
                  className={`flex-1 py-1 rounded-lg transition-all font-bold ${
                    activeTab === "add_password"
                      ? "bg-[#ff007f] text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("add_otp")}
                  className={`flex-1 py-1 rounded-lg transition-all font-bold ${
                    activeTab === "add_otp"
                      ? "bg-[#ff007f] text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Email OTP Code
                </button>
              </div>

              {/* Google 1-Tap Login Option */}
              <button
                type="button"
                onClick={() => {
                  onGoogleSignIn();
                  onClose();
                }}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 py-2 px-3 rounded-xl text-[9.5px] font-black transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Add Account via Google Sign-In</span>
              </button>

              <div className="flex items-center my-1">
                <div className="flex-1 border-t border-white/10" />
                <span className="px-2 text-[7.5px] uppercase font-mono text-gray-500">Or use credentials</span>
                <div className="flex-1 border-t border-white/10" />
              </div>

              {/* Password Form */}
              {activeTab === "add_password" && (
                <form onSubmit={handlePasswordLoginSubmit} className="space-y-2.5">
                  <div>
                    <label className="text-[7.5px] font-mono text-gray-400 block mb-1 uppercase font-bold">
                      Email or Username
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. malik_bilal or user@gmail.com"
                        className="w-full bg-[#0d0d16] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#ff007f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[7.5px] font-mono text-gray-400 block mb-1 uppercase font-bold">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="w-full bg-[#0d0d16] border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#ff007f]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-gradient-to-r from-[#ff007f] to-purple-600 hover:from-[#ff007f]/90 hover:to-purple-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isLoggingIn ? "Logging in..." : "Login & Save to Device"}</span>
                  </button>
                </form>
              )}

              {/* OTP Form */}
              {activeTab === "add_otp" && (
                <form onSubmit={isOtpSent ? handleVerifyOtpSubmit : handleSendOtpSubmit} className="space-y-2.5">
                  <div>
                    <label className="text-[7.5px] font-mono text-gray-400 block mb-1 uppercase font-bold">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      <input
                        type="email"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="e.g. yourname@gmail.com"
                        disabled={isOtpSent}
                        className="w-full bg-[#0d0d16] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#ff007f] disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {isOtpSent && (
                    <div>
                      <label className="text-[7.5px] font-mono text-gray-400 block mb-1 uppercase font-bold">
                        6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full bg-[#0d0d16] border border-white/10 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-[#ff007f]"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-gradient-to-r from-[#ff007f] to-purple-600 hover:from-[#ff007f]/90 hover:to-purple-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isLoggingIn ? "Processing..." : isOtpSent ? "Verify & Switch Account" : "Send Verification OTP"}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: QUICK DEMO TEST SLOTS */}
          {activeTab === "demo" && (
            <div className="space-y-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[8px] leading-relaxed">
                <span className="font-bold block text-[9px] text-yellow-400 mb-0.5">⚡ Instant Multi-Account Tester</span>
                Switch instantly between 2nd, 3rd, and 4th accounts on this device in 1-click. Perfect for testing PK battles, co-hosting, and coin transactions!
              </div>

              <div className="space-y-2">
                {getDemoAccounts().map((demo) => (
                  <div
                    key={demo.slot}
                    onClick={() => handleQuickDemoSwitch(demo)}
                    className="p-2.5 rounded-xl bg-[#1a1a28] hover:bg-[#232338] border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <img
                        src={demo.user.avatar}
                        alt={demo.user.username}
                        className="w-9 h-9 rounded-full object-cover border border-amber-400/40"
                      />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-white text-[9.5px] font-black truncate">
                            {demo.user.fullName}
                          </span>
                          <span className="text-[7px] bg-purple-500/20 text-purple-300 px-1 rounded font-mono font-bold">
                            VIP {demo.user.vipLevel}
                          </span>
                        </div>
                        <p className="text-[8px] text-gray-400 font-mono">
                          @{demo.user.username} • <span className="text-yellow-400 font-bold">{demo.user.coins.toLocaleString()} Coins</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-[8px] uppercase px-2.5 py-1.5 rounded-lg shadow transition-all active:scale-95 flex items-center space-x-1"
                    >
                      <span>Slot {demo.slot}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-[#0e0e15] border-t border-white/10 text-center">
          <p className="text-[7.5px] text-gray-500 font-mono">
            Pardais Multi-Account Engine • Unlimited accounts saved safely on this device
          </p>
        </div>
      </div>
    </div>
  );
}
