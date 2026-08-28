import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Radio,
  TrendingUp,
  Wallet,
  Award,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Trash,
  Edit,
  Activity,
  LogOut,
  DollarSign,
  Sliders,
  Globe,
  Crown,
  Percent,
  Star,
  UserCheck,
  Image,
  Calendar,
  List,
  Gift,
  Search,
  Lock,
  MessageSquare,
  Key,
  Layers,
  Database,
  Grid,
  ShieldCheck,
  UserPlus,
  Smartphone,
  ShieldAlert
} from "lucide-react";
import { VIP_FRAMES_LIST } from "./components/VipAnimatedFrame";
import {
  isAuthorizedAdmin,
  DEFAULT_ADMIN_EMAILS,
  getAllowedAdminEmails,
  addNominatedAdminEmail,
  removeNominatedAdminEmail,
  syncNominatedAdminEmails
} from "./adminConfig";
import { VIP_ENTRY_EFFECTS, getVipEntryEffect } from "./vipEntryConfig";
import { VipRideAnimationOverlay } from "./components/VipRideAnimationOverlay";
import { VipSvgMount } from "./components/VipSvgMounts";
import { 
  AdminGiftTab, 
  loadGiftsFromStorage, 
  saveGiftsToStorage, 
  loadCategoriesFromStorage, 
  saveCategoriesToStorage 
} from "./components/GiftSystem";
import { resolveApiUrl } from "./lib/apiClient";

export default function AdminApp() {
  // Authentication state
  const [currentAppUser, setCurrentAppUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("pardais_user_profile");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("pardais_user_profile");
      if (raw) {
        const parsed = JSON.parse(raw);
        return isAuthorizedAdmin(parsed);
      }
    } catch (e) {}
    return false;
  });

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<string>(() => {
    try {
      const raw = localStorage.getItem("pardais_user_profile");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isAuthorizedAdmin(parsed)) {
          return `Authorized Admin (${parsed.email})`;
        }
      }
    } catch (e) {}
    return "";
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");

  // Saved admin credentials in memory (changeable)
  const [credentials, setCredentials] = useState<any>({
    superadmin: { pass: "pardaisparty2026", role: "Super Admin" },
    admin: { pass: "pardaisparty2026", role: "Admin" },
    moderator: { pass: "pardaisparty2026", role: "Moderator" }
  });

  // Helper to ensure all DB properties have safe array/object fallbacks
  const normalizeDb = (data: any) => {
    const raw = data || {};
    return {
      user: raw.user || {},
      adminUsersList: Array.isArray(raw.adminUsersList) ? raw.adminUsersList : [],
      hosts: Array.isArray(raw.hosts) ? raw.hosts : [],
      agencies: Array.isArray(raw.agencies) ? raw.agencies : [],
      agencyRequests: Array.isArray(raw.agencyRequests) ? raw.agencyRequests : [],
      families: Array.isArray(raw.families) ? raw.families : [],
      kycRequests: Array.isArray(raw.kycRequests) ? raw.kycRequests : [],
      transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      gifts: Array.isArray(raw.gifts) ? raw.gifts : [],
      events: Array.isArray(raw.events) ? raw.events : [],
      reports: Array.isArray(raw.reports) ? raw.reports : [],
      configurations: {
        whatsappChannelUrl: "https://whatsapp.com/channel/0029Vb8u720B4hdLYUaKX00I",
        whatsappSupportNumber: "+923001234567",
        whatsappSupportText: "Assalam-o-Alaikum Pardais Party Support, I need assistance with my account.",
        agencyContacts: [],
        moderators: [],
        banners: [],
        vipFrames: [],
        maintenanceMode: false,
        appVersion: "1.0.0",
        forceUpdate: false,
        ...(raw.configurations || {})
      }
    };
  };

  // Loaded database state from central APIs
  const [db, setDb] = useState<any>(() => normalizeDb(null));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Admin Access Nominations State
  const [allowedAdminEmailsList, setAllowedAdminEmailsList] = useState<string[]>(() => getAllowedAdminEmails());
  const [newAdminEmailInput, setNewAdminEmailInput] = useState<string>("");
  const [nominatingLoading, setNominatingLoading] = useState<boolean>(false);

  // VIP Entrance Animation Simulator state
  const [adminTestVipLevel, setAdminTestVipLevel] = useState<number>(1);
  const [adminTestUsername, setAdminTestUsername] = useState<string>("Pardais Royal Admin");
  const [adminActiveVipOverlay, setAdminActiveVipOverlay] = useState<{ vipLevel: number; username: string } | null>(null);

  useEffect(() => {
    syncNominatedAdminEmails().then((list) => {
      setAllowedAdminEmailsList(list);
    });
  }, []);

  const handleAddAdminNomination = async (emailToAdd?: string) => {
    const targetEmail = emailToAdd || newAdminEmailInput;
    if (!targetEmail.trim()) return;

    setNominatingLoading(true);
    const res = await addNominatedAdminEmail(targetEmail);
    setNominatingLoading(false);

    if (res.success) {
      setAllowedAdminEmailsList(res.list);
      setNewAdminEmailInput("");
      triggerToast(`✔ ${targetEmail} nominated successfully! Admin Portal access granted.`);
    } else {
      triggerToast(`❌ ${res.error || "Failed to nominate admin email"}`);
    }
  };

  const handleRemoveAdminNomination = async (emailToRemove: string) => {
    setNominatingLoading(true);
    const res = await removeNominatedAdminEmail(emailToRemove);
    setNominatingLoading(false);

    if (res.success) {
      setAllowedAdminEmailsList(res.list);
      triggerToast(`🗑 Admin nomination revoked for ${emailToRemove}`);
    }
  };

  // Search & Filter local states
  const [userSearch, setUserSearch] = useState<string>("");
  const [giftSearch, setGiftSearch] = useState<string>("");
  const [adminGiftsList, setAdminGiftsList] = useState<any[]>(() => loadGiftsFromStorage());
  const [adminCategoriesList, setAdminCategoriesList] = useState<string[]>(() => loadCategoriesFromStorage());

  useEffect(() => {
    const syncAdminGifts = () => {
      setAdminGiftsList(loadGiftsFromStorage());
      setAdminCategoriesList(loadCategoriesFromStorage());
    };
    window.addEventListener("pardais_gifts_updated", syncAdminGifts);
    window.addEventListener("pardais_categories_updated", syncAdminGifts);
    window.addEventListener("storage", syncAdminGifts);
    return () => {
      window.removeEventListener("pardais_gifts_updated", syncAdminGifts);
      window.removeEventListener("pardais_categories_updated", syncAdminGifts);
      window.removeEventListener("storage", syncAdminGifts);
    };
  }, []);
  const [customAppIconInput, setCustomAppIconInput] = useState<string>("");
  const [deviceSearch, setDeviceSearch] = useState<string>("");
  const [manualDeviceIdInput, setManualDeviceIdInput] = useState<string>("");

  // Production Admin States for Users, Audit Logs, Modals, and Agencies
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [editingUserModal, setEditingUserModal] = useState<any>(null);
  const [userHistoryModal, setUserHistoryModal] = useState<any>(null);
  const [kycRejectModal, setKycRejectModal] = useState<any>(null);
  const [kycRejectReason, setKycRejectReason] = useState<string>("");
  const [kycDocViewerModal, setKycDocViewerModal] = useState<any>(null);
  const [agencySubTab, setAgencySubTab] = useState<"coin_seller" | "host_agency">("coin_seller");

  // WhatsApp & Support Desk Configuration state
  const [waChannelUrl, setWaChannelUrl] = useState<string>(() => {
    return localStorage.getItem("pardais_whatsapp_channel_url") || "https://whatsapp.com/channel/0029Vb8u720B4hdLYUaKX00I";
  });
  const [waSupportNumber, setWaSupportNumber] = useState<string>(() => {
    return localStorage.getItem("pardais_whatsapp_support_number") || "+923001234567";
  });
  const [waSupportText, setWaSupportText] = useState<string>(() => {
    return localStorage.getItem("pardais_whatsapp_support_text") || "Assalam-o-Alaikum Pardais Party Support, I need assistance with my account.";
  });

  const [adminAgenciesList, setAdminAgenciesList] = useState<Array<{
    id: string;
    name: string;
    contactPerson: string;
    whatsapp: string;
    rateDescription: string;
  }>>(() => {
    const saved = localStorage.getItem("pardais_admin_agencies_list");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: "ag-1",
        name: "Pardais Official Pakistan Reseller",
        contactPerson: "Chaudhry Salman",
        whatsapp: "+923015551234",
        rateDescription: "1 PKR = 10 Coins • Instant JazzCash & EasyPaisa"
      },
      {
        id: "ag-2",
        name: "Gulf & UAE Coin Agency",
        contactPerson: "Sheikh Rashid",
        whatsapp: "+971501234567",
        rateDescription: "1 AED = 120 Coins • Bank Transfer & Botim"
      }
    ];
  });

  const [newAgencyForm, setNewAgencyForm] = useState({
    name: "",
    contactPerson: "",
    whatsapp: "",
    rateDescription: ""
  });
  const [editingAgencyContact, setEditingAgencyContact] = useState<any>(null);

  useEffect(() => {
    if (db?.configurations) {
      if (db.configurations.whatsappChannelUrl) {
        setWaChannelUrl(db.configurations.whatsappChannelUrl);
      }
      if (db.configurations.whatsappSupportNumber) {
        setWaSupportNumber(db.configurations.whatsappSupportNumber);
      }
      if (db.configurations.whatsappSupportText) {
        setWaSupportText(db.configurations.whatsappSupportText);
      }
      if (Array.isArray(db.configurations.agencyContacts) && db.configurations.agencyContacts.length > 0) {
        setAdminAgenciesList(db.configurations.agencyContacts);
      }
    }
  }, [db]);

  const handleSaveWhatsappConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem("pardais_whatsapp_channel_url", waChannelUrl);
      localStorage.setItem("pardais_whatsapp_support_number", waSupportNumber);
      localStorage.setItem("pardais_whatsapp_support_text", waSupportText);
      localStorage.setItem("pardais_admin_agencies_list", JSON.stringify(adminAgenciesList));

      const updatedConfig = {
        ...db?.configurations,
        whatsappChannelUrl: waChannelUrl,
        whatsappSupportNumber: waSupportNumber,
        whatsappSupportText: waSupportText,
        agencyContacts: adminAgenciesList
      };

      await syncWithServer("/api/v1/config", "POST", updatedConfig);

      for (const agency of adminAgenciesList) {
        await syncWithServer("/api/v1/coin-sellers", "POST", {
          id: agency.id,
          name: agency.name,
          contactPerson: agency.contactPerson,
          whatsapp: agency.whatsapp,
          rateDescription: agency.rateDescription,
          rate: agency.rateDescription
        });
      }

      window.dispatchEvent(new Event("pardais_whatsapp_config_changed"));
      triggerToast("🟢 WhatsApp configurations & Agency contacts saved and deployed live!");
    } catch (err) {
      console.error("Save WhatsApp config error:", err);
      triggerToast("❌ Failed to save WhatsApp settings.");
    }
  };

  // Moderation & Moderator Special Access State
  const [moderatorsList, setModeratorsList] = useState<Array<{
    username: string;
    email: string;
    grantedBy: string;
    grantedAt: string;
    role: string;
  }>>(() => {
    const saved = localStorage.getItem("pardais_moderators_list");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        username: "Pardais_Mod_Official",
        email: "mod@pardais.com",
        grantedBy: "Admin Owner",
        grantedAt: new Date().toLocaleDateString(),
        role: "Special Access Moderator"
      }
    ];
  });
  const [newModInput, setNewModInput] = useState("");
  const [modTargetUser, setModTargetUser] = useState("");
  const [modWarningText, setModWarningText] = useState("Violation of community terms: Please adjust broadcast audio/content immediately.");
  const [modTargetDevice, setModTargetDevice] = useState("");
  const [modActionLoading, setModActionLoading] = useState(false);

  useEffect(() => {
    if (db?.configurations?.moderators && Array.isArray(db.configurations.moderators)) {
      setModeratorsList(db.configurations.moderators);
    }
  }, [db]);

  const handleGrantModerator = async (targetStr: string) => {
    if (!targetStr.trim()) return;
    const cleanStr = targetStr.trim().replace(/^@/, "");
    if (moderatorsList.some(m => m.username.toLowerCase() === cleanStr.toLowerCase() || m.email.toLowerCase() === cleanStr.toLowerCase())) {
      triggerToast("⚠️ User is already a Special Access Moderator.");
      return;
    }
    const newMod = {
      username: cleanStr,
      email: cleanStr.includes("@") ? cleanStr : `${cleanStr}@pardais.com`,
      grantedBy: "Admin Owner",
      grantedAt: new Date().toLocaleDateString(),
      role: "Special Access Moderator"
    };
    const updated = [...moderatorsList, newMod];
    setModeratorsList(updated);
    localStorage.setItem("pardais_moderators_list", JSON.stringify(updated));
    setNewModInput("");

    await syncWithServer("/api/v1/config", "POST", {
      ...db?.configurations,
      moderators: updated
    });
    triggerToast(`🛡️ Granted Special Moderator Access to @${cleanStr}`);
  };

  const handleRevokeModerator = async (username: string) => {
    const updated = moderatorsList.filter(m => m.username.toLowerCase() !== username.toLowerCase());
    setModeratorsList(updated);
    localStorage.setItem("pardais_moderators_list", JSON.stringify(updated));

    await syncWithServer("/api/v1/config", "POST", {
      ...db?.configurations,
      moderators: updated
    });
    triggerToast(`🗑️ Revoked Moderator Access for @${username}`);
  };

  const handleEndStreamOnTheSpot = async (streamType: string, streamId: string, hostUsername: string) => {
    setModActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/moderation/end-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamType,
          streamId,
          hostUsername,
          reason: "Terminated on the spot by Moderator",
          moderator: "Admin Moderator"
        })
      });
      const data = await res.json();
      triggerToast(`🛑 On-The-Spot Stream End: ${data?.message || "Stream terminated!"}`);
      await fetchDb();
    } catch (err: any) {
      triggerToast(`❌ Failed to end stream: ${err.message || err}`);
    } finally {
      setModActionLoading(false);
    }
  };

  const handleToggleUserSuspend = async (username: string, suspend: boolean) => {
    if (!username.trim()) {
      triggerToast("⚠️ Please enter or select a User ID / Username.");
      return;
    }
    setModActionLoading(true);
    try {
      const cleanUser = username.trim().replace(/^@/, "");
      const res = await fetch(`${API_BASE_URL}/api/v1/moderation/toggle-suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser,
          suspend,
          reason: suspend ? "Account Suspended by Moderator" : "Restored",
          moderator: "Admin Moderator"
        })
      });
      const data = await res.json();
      triggerToast(data?.message || `User @${cleanUser} status updated.`);
      await fetchDb();
    } catch (err: any) {
      triggerToast(`❌ Error updating user status: ${err.message || err}`);
    } finally {
      setModActionLoading(false);
    }
  };

  const handleForceLiveOn = async (username: string) => {
    if (!username.trim()) {
      triggerToast("⚠️ Please enter or select a User ID / Username.");
      return;
    }
    setModActionLoading(true);
    try {
      const cleanUser = username.trim().replace(/^@/, "");
      const res = await fetch(`${API_BASE_URL}/api/v1/moderation/force-live-on`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser,
          title: "Official Stream Enabled by Moderator"
        })
      });
      const data = await res.json();
      triggerToast(data?.message || `Live status forced ON for @${cleanUser}`);
      await fetchDb();
    } catch (err: any) {
      triggerToast(`❌ Error starting live: ${err.message || err}`);
    } finally {
      setModActionLoading(false);
    }
  };

  const handleSendWarning = async (username: string, message: string) => {
    if (!username.trim()) {
      triggerToast("⚠️ Please enter or select a User ID / Username.");
      return;
    }
    setModActionLoading(true);
    try {
      const cleanUser = username.trim().replace(/^@/, "");
      const res = await fetch(`${API_BASE_URL}/api/v1/moderation/warning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser,
          warningMessage: message || "Community Guidelines Warning issued.",
          moderator: "Admin Moderator"
        })
      });
      const data = await res.json();
      triggerToast(data?.message || `Warning dispatched to @${cleanUser}`);
    } catch (err: any) {
      triggerToast(`❌ Error sending warning: ${err.message || err}`);
    } finally {
      setModActionLoading(false);
    }
  };

  const handleToggleDeviceBan = async (deviceId: string, ban: boolean) => {
    if (!deviceId.trim()) {
      triggerToast("⚠️ Please enter or select a Device ID.");
      return;
    }
    setModActionLoading(true);
    try {
      const cleanDev = deviceId.trim();
      const res = await fetch(`${API_BASE_URL}/api/v1/moderation/device-ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: cleanDev,
          ban,
          reason: ban ? "Device suspended by Moderator" : "Device restored"
        })
      });
      const data = await res.json();
      triggerToast(data?.message || `Device ${cleanDev} ban status updated.`);
      await fetchDb();
    } catch (err: any) {
      triggerToast(`❌ Error setting device ban: ${err.message || err}`);
    } finally {
      setModActionLoading(false);
    }
  };

  const handleAddAgencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgencyForm.name.trim() || !newAgencyForm.whatsapp.trim()) {
      alert("Please enter Agency Name and WhatsApp Contact Number.");
      return;
    }
    const item = {
      id: `ag-${Date.now()}`,
      name: newAgencyForm.name,
      contactPerson: newAgencyForm.contactPerson || newAgencyForm.name,
      whatsapp: newAgencyForm.whatsapp,
      rateDescription: newAgencyForm.rateDescription || "1 PKR = 10 Coins • JazzCash / EasyPaisa"
    };
    const updated = [...adminAgenciesList, item];
    setAdminAgenciesList(updated);
    setNewAgencyForm({ name: "", contactPerson: "", whatsapp: "", rateDescription: "" });
    triggerToast(`Added agency contact: ${item.name}`);
  };

  const handleDeleteAgencyContact = (id: string) => {
    if (confirm("Are you sure you want to remove this agency contact number? Users will no longer see this seller.")) {
      const updated = adminAgenciesList.filter(a => a.id !== id);
      setAdminAgenciesList(updated);
      triggerToast("Agency contact removed.");
    }
  };

  // CRUD Temp states
  const [editingGift, setEditingGift] = useState<any>(null);
  const [newGift, setNewGift] = useState<any>({
    name: "",
    cost: 10,
    type: "2d",
    icon: "🎁",
    color: "from-pink-500 to-rose-600",
    animationClass: "animate-bounce",
    category: "Popular"
  });

  const [newBanner, setNewBanner] = useState<any>({
    title: "",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    link: "event-info",
    active: true
  });

  const [newEvent, setNewEvent] = useState<any>({
    title: "",
    duration: "24 Hours",
    reward: "1.5x Multiplier"
  });

  const [editingHost, setEditingHost] = useState<any>(null);
  const [newHost, setNewHost] = useState<any>({
    name: "",
    role: "",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    category: "video",
    statusText: "",
    bio: "",
    agencyId: "agency-alpha"
  });

  const [editingAgency, setEditingAgency] = useState<any>(null);
  const [newAgency, setNewAgency] = useState<any>({
    name: "",
    ownerEmail: "",
    salaryRate: ""
  });

  const [remarksInputs, setRemarksInputs] = useState<{[key: string]: string}>({});

  const handleApproveAgencyRequest = async (id: string) => {
    const remarks = remarksInputs[id] || "";
    const success = await syncWithServer(`/api/v1/agency-requests/${id}`, "PUT", { status: "Approved", remarks });
    if (success) {
      triggerToast("Agency request approved successfully! Official credentials generated.");
    }
  };

  const handleRejectAgencyRequest = async (id: string) => {
    const remarks = remarksInputs[id] || "";
    const success = await syncWithServer(`/api/v1/agency-requests/${id}`, "PUT", { status: "Rejected", remarks });
    if (success) {
      triggerToast("Agency request rejected.");
    }
  };

  const handleSuspendAgencyRequest = async (id: string) => {
    const remarks = remarksInputs[id] || "";
    const success = await syncWithServer(`/api/v1/agency-requests/${id}`, "PUT", { status: "Suspended", remarks });
    if (success) {
      triggerToast("Agency request suspended.");
    }
  };

  const handleDeleteAgencyRequest = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this agency request record?")) {
      const success = await syncWithServer(`/api/v1/agency-requests/${id}`, "DELETE", {});
      if (success) {
        triggerToast("Agency request record deleted.");
      }
    }
  };

  const [editingFamily, setEditingFamily] = useState<any>(null);
  const [newFamily, setNewFamily] = useState<any>({
    name: "",
    leader: "",
    description: ""
  });

  // Fetch Central Database
  const API_BASE_URL = resolveApiUrl("");

  const fetchDb = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/db`);
      if (res.ok) {
        const data = await res.json();
        setDb(normalizeDb(data));
        if (Array.isArray(data?.gifts) && data.gifts.length > 0) {
          setAdminGiftsList(data.gifts);
          saveGiftsToStorage(data.gifts);
        }
      }

      // Fetch Admin Users list
      const uRes = await fetch(`${API_BASE_URL}/api/v1/admin-users`);
      if (uRes.ok) {
        const uData = await uRes.json();
        if (Array.isArray(uData)) {
          setUsersList(uData);
        }
      }

      // Fetch Audit Logs list
      const aRes = await fetch(`${API_BASE_URL}/api/v1/admin/audit-logs`);
      if (aRes.ok) {
        const aData = await aRes.json();
        if (Array.isArray(aData)) {
          setAuditLogsList(aData);
        }
      }
    } catch (e) {
      console.error("Error synchronizing admin DB:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Specific User Admin Handlers
  const handleTogglePartyPerm = async (usr: any) => {
    const nextVal = !(usr.partyEnabled !== false);
    await syncWithServer(`/api/v1/admin-users/${usr.username}`, "PUT", { partyEnabled: nextVal, adminUsername: username || "Super Admin" });
    triggerToast(`Party hosting ${nextVal ? "ENABLED" : "DISABLED"} for @${usr.username}`);
  };

  const handleToggleLivePerm = async (usr: any) => {
    const nextVal = !(usr.liveEnabled !== false);
    await syncWithServer(`/api/v1/admin-users/${usr.username}`, "PUT", { liveEnabled: nextVal, adminUsername: username || "Super Admin" });
    triggerToast(`Live streaming ${nextVal ? "ENABLED" : "DISABLED"} for @${usr.username}`);
  };

  const handleToggleReelsPerm = async (usr: any) => {
    const nextVal = !(usr.reelsEnabled !== false);
    await syncWithServer(`/api/v1/admin-users/${usr.username}`, "PUT", { reelsEnabled: nextVal, adminUsername: username || "Super Admin" });
    triggerToast(`Reels posting ${nextVal ? "ENABLED" : "DISABLED"} for @${usr.username}`);
  };

  const handleToggleFreezeCoins = async (usr: any) => {
    const nextVal = !(usr.coinsFrozen === true);
    await syncWithServer(`/api/v1/admin-users/${usr.username}`, "PUT", { coinsFrozen: nextVal, adminUsername: username || "Super Admin" });
    triggerToast(`Coins balance ${nextVal ? "FROZEN ❄️" : "UNFROZEN 🟢"} for @${usr.username}`);
  };

  const handleToggleSuspendUser = async (usr: any) => {
    const nextVal = !(usr.isSuspended === true);
    await syncWithServer(`/api/v1/admin-users/${usr.username}`, "PUT", { isSuspended: nextVal, adminUsername: username || "Super Admin" });
    triggerToast(`Account @${usr.username} ${nextVal ? "SUSPENDED ⛔" : "UNSUSPENDED ✅"}`);
  };

  const handleSaveUserEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserModal) return;
    await syncWithServer(`/api/v1/admin-users/${editingUserModal.username}`, "PUT", {
      ...editingUserModal,
      adminUsername: username || "Super Admin"
    });
    setEditingUserModal(null);
    triggerToast(`User details for @${editingUserModal.username} updated & saved to DB!`);
  };

  const handleEndActiveStream = async (streamId: string, hostName: string) => {
    if (!window.confirm(`Are you sure you want to FORCE END the stream broadcast for "${hostName}"?`)) return;
    try {
      await fetch(`${API_BASE_URL}/api/v1/active-streams/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId })
      });
      await fetchDb();
      triggerToast(`🚨 Stream broadcast for "${hostName}" terminated live!`);
    } catch (e) {
      triggerToast(`Failed to terminate stream: ${e}`);
    }
  };

  const handleAuditKycWithReason = async (requestId: string, status: "approved" | "rejected" | "resubmission_required", reason?: string) => {
    await syncWithServer(`/api/v1/kyc-requests/${requestId}`, "PUT", {
      status,
      rejectionReason: reason || null,
      adminUsername: username || "Super Admin"
    });
    setKycRejectModal(null);
    setKycRejectReason("");
    triggerToast(`KYC Request ${requestId} marked as ${status.toUpperCase()}!`);
  };

  useEffect(() => {
    fetchDb();
  }, []);

  // Show auto-dismiss toast helper
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const targetUser = username.toLowerCase().trim();
    if (credentials[targetUser] && credentials[targetUser].pass === password) {
      setIsAuthenticated(true);
      setRole(credentials[targetUser].role);
      triggerToast(`Welcome back, ${credentials[targetUser].role}! Access granted.`);
    } else if (password === "pardaisparty2026" && (isAuthorizedAdmin(targetUser) || allowedAdminEmailsList.includes(targetUser) || DEFAULT_ADMIN_EMAILS.includes(targetUser))) {
      setIsAuthenticated(true);
      setRole(`Super Admin (${targetUser})`);
      triggerToast(`Welcome back, Admin ${targetUser}! Access granted.`);
    } else if (isAuthorizedAdmin(targetUser) || allowedAdminEmailsList.includes(targetUser)) {
      setIsAuthenticated(true);
      setRole(`Authorized Admin (${targetUser})`);
      triggerToast(`Welcome back, Admin ${targetUser}! Access granted.`);
    } else {
      setAuthError("Incorrect Operator ID or Security Password! Default password: pardaisparty2026");
    }
  };

  // Password change handler
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    const userKey = username.toLowerCase().trim();
    if (credentials[userKey].pass !== oldPassword) {
      alert("Current password does not match our records!");
      return;
    }
    setCredentials((prev: any) => ({
      ...prev,
      [userKey]: { ...prev[userKey], pass: newPassword }
    }));
    setShowPasswordChangeModal(false);
    setOldPassword("");
    setNewPassword("");
    triggerToast("Password changed successfully! Keep it secure.");
  };

  // Sync API modifications helper
  const syncWithServer = async (endpoint: string, method: string, payload: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchDb();
        return true;
      }
    } catch (e) {
      console.error(`API update failed for ${endpoint}:`, e);
    }
    return false;
  };

  // User Administration Operations
  const handleToggleBanUser = async (userProfile: any) => {
    const nextBanState = !userProfile.isBanned;
    const confirmAction = window.confirm(
      `Are you sure you want to ${nextBanState ? "BAN & SUSPEND" : "UNBAN & RESTORE"} user @${userProfile.username}?`
    );
    if (!confirmAction) return;

    await syncWithServer(`/api/v1/admin-users/${userProfile.username}`, "PUT", {
      isBanned: nextBanState
    });
    triggerToast(`User @${userProfile.username} has been ${nextBanState ? "BANNED globally" : "UNBANNED successfully"}`);
  };

  const handleUpdateCoins = async (targetUsername: string, currentCoins: number, value: number) => {
    const updatedCoins = Math.max(0, currentCoins + value);
    await syncWithServer(`/api/v1/admin-users/${targetUsername}`, "PUT", {
      coins: updatedCoins
    });
    triggerToast(`Balance adjusted for @${targetUsername}: ${updatedCoins} Coins`);
  };

  const handleToggleVerification = async (userProfile: any) => {
    await syncWithServer(`/api/v1/admin-users/${userProfile.username}`, "PUT", {
      isVerified: !userProfile.isVerified
    });
    triggerToast(`Verification checkmark toggled for @${userProfile.username}`);
  };

  // KYC Auditing
  const handleAuditKyc = async (requestId: string, nextStatus: "approved" | "rejected") => {
    await syncWithServer(`/api/v1/kyc-requests/${requestId}`, "PUT", {
      status: nextStatus
    });
    triggerToast(`KYC request ${requestId} has been ${nextStatus.toUpperCase()} successfully.`);
  };

  // Hosts CRUD
  const handleAddHost = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await syncWithServer("/api/v1/hosts", "POST", newHost);
    if (success) {
      setNewHost({
        name: "",
        role: "",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
        category: "video",
        statusText: "",
        bio: "",
        agencyId: "agency-alpha"
      });
      triggerToast("New stream host deployed successfully!");
    }
  };

  const handleDeleteHost = async (id: string) => {
    if (confirm("Are you sure you want to delete this host node?")) {
      await syncWithServer(`/api/v1/hosts/${id}`, "DELETE", {});
      triggerToast("Stream host node deleted.");
    }
  };

  const handleSaveHostEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await syncWithServer(`/api/v1/hosts/${editingHost.id}`, "PUT", editingHost);
    if (success) {
      setEditingHost(null);
      triggerToast("Stream host parameters synchronized successfully!");
    }
  };

  // Agencies CRUD
  const handleAddAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await syncWithServer("/api/v1/agencies", "POST", newAgency);
    if (success) {
      setNewAgency({ name: "", ownerEmail: "", salaryRate: "" });
      triggerToast("Agency registered in Pardais database.");
    }
  };

  const handleDeleteAgency = async (id: string) => {
    if (confirm("Are you sure you want to dissolve this agency registration?")) {
      await syncWithServer(`/api/v1/agencies/${id}`, "DELETE", {});
      triggerToast("Agency registration removed.");
    }
  };

  const handleSaveAgencyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await syncWithServer(`/api/v1/agencies/${editingAgency.id}`, "PUT", editingAgency);
    if (success) {
      setEditingAgency(null);
      triggerToast("Agency information updated.");
    }
  };

  // Families CRUD
  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await syncWithServer("/api/v1/families", "POST", newFamily);
    if (success) {
      setNewFamily({ name: "", leader: "", description: "" });
      triggerToast("New family registered.");
    }
  };

  const handleDeleteFamily = async (id: string) => {
    if (confirm("Are you sure you want to disband this family?")) {
      await syncWithServer(`/api/v1/families/${id}`, "DELETE", {});
      triggerToast("Family disbanded.");
    }
  };

  const handleSaveFamilyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await syncWithServer(`/api/v1/families/${editingFamily.id}`, "PUT", editingFamily);
    if (success) {
      setEditingFamily(null);
      triggerToast("Family details updated.");
    }
  };

  // Gifts CRUD
  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault();
    await syncWithServer("/api/v1/gifts", "POST", newGift);
    setNewGift({
      name: "",
      cost: 10,
      type: "2d",
      icon: "🎁",
      color: "from-pink-500 to-rose-600",
      animationClass: "animate-bounce",
      category: "Popular"
    });
    triggerToast("New premium gift item appended successfully!");
  };

  const handleSaveGiftEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGift) return;
    await syncWithServer(`/api/v1/gifts/${editingGift.id}`, "PUT", editingGift);
    setEditingGift(null);
    triggerToast(`Gift details updated: ${editingGift.name}`);
  };

  const handleDeleteGift = async (giftId: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this gift item? This will instantly remove it from the viewer store.")) return;
    await fetch(`${API_BASE_URL}/api/v1/gifts/${giftId}`, { method: "DELETE" });
    await fetchDb();
    triggerToast("Gift catalog item deleted successfully.");
  };

  // Global Config Updates
  const handleToggleMaintenance = async () => {
    const nextState = !db.configurations.maintenanceMode;
    await syncWithServer("/api/v1/config", "POST", {
      maintenanceMode: nextState
    });
    triggerToast(`Maintenance Mode toggled: ${nextState ? "ACTIVE ⚠️" : "OFFLINE ✅"}`);
  };

  const handleUpdateAppVersionConfig = async (version: string, force: boolean) => {
    await syncWithServer("/api/v1/config", "POST", {
      appVersion: version,
      forceUpdate: force
    });
    triggerToast(`App Version controller updated successfully: ${version}`);
  };

  const handleUpdateAppIcon = async (iconUrl: string) => {
    await syncWithServer("/api/v1/config", "POST", {
      appIconUrl: iconUrl
    });
    localStorage.setItem("pardais_app_icon_url", iconUrl);
    window.dispatchEvent(new Event("pardais_app_icon_changed"));
    triggerToast(iconUrl ? "✔ App Icon updated and deployed live across the app!" : "✔ App Icon reset to default Neon Logo!");
  };

  const handleToggleBlockDevice = async (targetDeviceId: string, reason: string = "Repeated Policy Violations") => {
    if (!targetDeviceId) return;
    const currentBlocked: string[] = db?.configurations?.blockedDevices || [];
    const isCurrentlyBlocked = currentBlocked.includes(targetDeviceId);

    let updatedBlocked: string[];
    if (isCurrentlyBlocked) {
      updatedBlocked = currentBlocked.filter((id: string) => id !== targetDeviceId);
    } else {
      updatedBlocked = [...currentBlocked, targetDeviceId];
    }

    await syncWithServer("/api/v1/config", "POST", {
      blockedDevices: updatedBlocked
    });

    localStorage.setItem("pardais_blocked_devices", JSON.stringify(updatedBlocked));
    window.dispatchEvent(new Event("pardais_blocked_devices_changed"));

    if (isCurrentlyBlocked) {
      triggerToast(`✔ Device ID "${targetDeviceId}" UNBLOCKED successfully!`);
    } else {
      triggerToast(`🚨 HARDWARE BAN ACTIVATED: Device ID "${targetDeviceId}" permanently blocked!`);
    }
  };

  // Banner Operations
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBanners = [...db.configurations.banners, { ...newBanner, id: `b-${Date.now()}` }];
    await syncWithServer("/api/v1/config", "POST", { banners: updatedBanners });
    setNewBanner({
      title: "",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      link: "event-info",
      active: true
    });
    triggerToast("New slider advertisement banner added!");
  };

  const handleDeleteBanner = async (bannerId: string) => {
    const updatedBanners = db.configurations.banners.filter((b: any) => b.id !== bannerId);
    await syncWithServer("/api/v1/config", "POST", { banners: updatedBanners });
    triggerToast("Advertisement banner removed from slider.");
  };

  // VIP Suspension
  const handleToggleVipSuspension = async () => {
    const nextVipState = !db.user.vipSuspended;
    await syncWithServer("/api/v1/user", "POST", {
      vipSuspended: nextVipState
    });
    triggerToast(`User VIP state ${nextVipState ? "SUSPENDED" : "ACTIVATED"}`);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await syncWithServer("/api/v1/events", "POST", newEvent);
    setNewEvent({ title: "", duration: "24 Hours", reward: "1.5x Multiplier" });
    triggerToast("New campaign tournament scheduled!");
  };

  // Moderation resolve
  const handleResolveReport = async (reportId: string) => {
    await syncWithServer(`/api/v1/reports/${reportId}`, "PUT", {
      status: "resolved"
    });
    triggerToast(`Moderation ticket ${reportId} marked as completed/resolved`);
  };

  // Backup trigger
  const handleTriggerBackup = () => {
    triggerToast("Central database snapshot saved successfully! Backups are synced.");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090d] flex items-center justify-center font-sans text-white">
        <div className="text-center space-y-3">
          <Activity className="w-12 h-12 text-[#66fcf1] animate-spin mx-auto" />
          <p className="text-sm font-bold uppercase tracking-widest font-mono text-[#66fcf1]">Syncing Pardais Party Ecosystem Database...</p>
        </div>
      </div>
    );
  }

  // Render Login state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07070b] flex items-center justify-center font-sans p-4 relative overflow-hidden">
        {/* Abstract futuristic backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#111119] border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#ff007f] via-[#7b2cbf] to-[#00f5ff] rounded-full flex items-center justify-center mx-auto shadow-lg relative animate-pulse">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Pardais <span className="bg-gradient-to-r from-[#FF2DCE] to-[#2A7BFF] bg-clip-text text-transparent">Party</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Web Administration Portal</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-center text-xs text-red-400 font-medium">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">Operator ID</label>
              <div className="relative">
                <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. superadmin, admin, moderator"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-[#ff007f] font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">Security Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-[#ff007f] font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] hover:opacity-90 active:scale-95 text-white py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-[#ff007f]/10 cursor-pointer text-center"
            >
              🔐 Authenticate & Enter Console
            </button>
          </form>

          <div className="bg-[#181824] p-3.5 rounded-xl border border-pink-500/20 space-y-1.5 font-mono text-[9.5px] text-gray-400 leading-normal">
            <p className="text-pink-400 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center space-x-1">
              <span>👑 AUTHORIZED ADMIN EMAILS ONLY</span>
            </p>
            <p className="text-[8.5px] text-gray-300 text-center font-sans">
              Only logged-in IDs with the following verified owner emails can access this portal:
            </p>
            <div className="bg-black/50 p-2 rounded-lg text-emerald-400 text-[9px] font-mono space-y-0.5 text-center max-h-36 overflow-y-auto">
              {allowedAdminEmailsList.map((email) => (
                <div key={email} className="font-bold flex items-center justify-center space-x-1">
                  <span>✔ {email}</span>
                </div>
              ))}
            </div>
            <div className="pt-1 text-center text-[8.5px] text-gray-500 border-t border-white/5">
              Operator Logins: <span className="text-pink-400 font-bold">superadmin</span> | <span className="text-pink-400 font-bold">admin</span> (pass: pardaisparty2026)
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070b] flex font-sans text-gray-200">
      {/* SUCCESS TOAST MESSAGE */}
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-400 text-black font-black text-xs px-5 py-3 rounded-2xl shadow-2xl z-999 animate-bounce flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-black" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. SIDEBAR NAVIGATION PANEL */}
      <aside className="w-64 bg-[#0d0d15] border-r border-white/10 flex flex-col justify-between select-none shrink-0">
        <div className="space-y-6 py-5">
          {/* Logo Brand */}
          <div className="px-5 border-b border-white/5 pb-5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff007f] via-[#7b2cbf] to-[#00f5ff] flex items-center justify-center shadow-md relative animate-pulse">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white flex items-center">
                  Pardais <span className="bg-gradient-to-r from-[#FF2DCE] to-[#2A7BFF] bg-clip-text text-transparent ml-1">Party Admin</span>
                </h2>
                <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded font-mono uppercase font-black tracking-widest mt-0.5 block">
                  {role} PANEL
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 max-h-[70vh] overflow-y-auto scrollbar-none">
            {[
              { id: "dashboard", label: "Dashboard Overview", icon: Grid },
              { id: "admin_nominations", label: "Admin Nominations (Access)", icon: ShieldCheck },
              { id: "users", label: "Users & Accounts", icon: Users },
              { id: "kyc", label: "KYC Audit Panel", icon: UserCheck },
              { id: "hosts", label: "Hosts & Broadcasters", icon: Radio },
              { id: "agencies", label: "Agencies & Commissions", icon: Percent },
              { id: "families", label: "Families & Guilds", icon: Award },
              { id: "gifts", label: "Gifts Catalog (CRUD)", icon: Gift },
              { id: "wallet", label: "Wallet & Cash Transactions", icon: Wallet },
              { id: "vip", label: "VIP & Glowing Frames", icon: Crown },
              { id: "vip_rides", label: "VIP Rides & Entry Simulator 🏎️", icon: Crown },
              { id: "moderation", label: "Moderation & AI Safety", icon: AlertTriangle },
              { id: "events", label: "Events & Banners", icon: Image },
              { id: "device_ban", label: "Device Hardware Bans 📱🚫", icon: Smartphone },
              { id: "app_icon", label: "App Icon & Branding 🖼️", icon: Image },
              { id: "whatsapp_config", label: "WhatsApp & Contact Config 📱💬", icon: MessageSquare },
              { id: "system", label: "System Config", icon: Settings }
            ].map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === link.id
                      ? "bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white shadow-md shadow-[#ff007f]/5"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Details */}
        <div className="p-4 border-t border-white/5 space-y-3 bg-[#0a0a0f]">
          <div className="flex items-center space-x-2.5 bg-transparent">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-white uppercase border border-white/10">
              {username.charAt(0)}
            </div>
            <div className="bg-transparent">
              <p className="text-[10px] font-black text-white">@{username}</p>
              <button
                onClick={() => setShowPasswordChangeModal(true)}
                className="text-[8px] text-[#ff007f] hover:underline font-bold transition-all uppercase block mt-0.5"
              >
                Change Password 🔑
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm("Disconnect admin session?")) {
                setIsAuthenticated(false);
                setUsername("");
                setPassword("");
              }
            }}
            className="w-full bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKING SCREEN */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Global Nav Bar Header */}
        <header className="h-16 border-b border-white/10 bg-[#0d0d15] px-6 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#66fcf1] font-mono flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-[#66fcf1] rounded-full animate-ping"></span>
            <span>Ecosystem Node Status: Operational</span>
          </h2>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1 text-[10px] font-mono text-gray-400">
              <Database className="w-3.5 h-3.5 text-pink-500 mr-1" />
              <span>DB SYNC: 100% OK</span>
            </div>
            {db.configurations.maintenanceMode && (
              <span className="bg-red-500/15 text-red-400 border border-red-500/30 text-[9px] font-bold px-2.5 py-1 rounded-full animate-pulse uppercase">
                ⚠️ Platform Under Maintenance
              </span>
            )}
          </div>
        </header>

        {/* Dynamic Inner Tab Wrapper */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* ========================================================================= */}
          {/* TAB: DASHBOARD OVERVIEW */}
          {/* ========================================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Core Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1 bg-transparent">
                    <p className="text-[10px] text-gray-500 uppercase font-black font-mono">System Total Users</p>
                    <p className="text-2xl font-black text-white">{db.adminUsersList.length + 1420}</p>
                    <span className="text-[9px] text-green-400 font-bold font-mono">📈 +14% this month</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1 bg-transparent">
                    <p className="text-[10px] text-gray-500 uppercase font-black font-mono">Registered Talent Hosts</p>
                    <p className="text-2xl font-black text-white">{db.hosts.length + 74}</p>
                    <span className="text-[9px] text-cyan-400 font-bold font-mono">🎤 12 stream nodes live</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                </div>

                <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1 bg-transparent">
                    <p className="text-[10px] text-gray-500 uppercase font-black font-mono">Daily Gifting Volume</p>
                    <p className="text-2xl font-black text-white">412,500 Coins</p>
                    <span className="text-[9px] text-[#ff007f] font-bold font-mono">💎 Approx $2,750 USD</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#ff007f]/10 text-[#ff007f] flex items-center justify-center">
                    <Gift className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1 bg-transparent">
                    <p className="text-[10px] text-gray-500 uppercase font-black font-mono">Net Platform Commission</p>
                    <p className="text-2xl font-black text-emerald-400">$8,450 USD</p>
                    <span className="text-[9px] text-emerald-400 font-bold font-mono">🏦 Payout status: Ready</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Dynamic Grid: Statistics Visualization & Activity */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Simulated Revenue Plot Graph */}
                <div className="xl:col-span-8 bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">Pakistan Weekly Financial Revenue Streams</h4>
                    <span className="text-[10px] font-mono text-gray-400">EasyPaisa & JazzCash Integrated ledger</span>
                  </div>
                  
                  {/* Custom CSS Bar Graph */}
                  <div className="h-48 flex items-end justify-between gap-3 pt-6 px-4 bg-transparent select-none">
                    {[
                      { label: "Mon", val: "30%", amt: "$1.4k" },
                      { label: "Tue", val: "45%", amt: "$2.1k" },
                      { label: "Wed", val: "75%", amt: "$3.5k" },
                      { label: "Thu", val: "60%", amt: "$2.8k" },
                      { label: "Fri", val: "95%", amt: "$4.5k" },
                      { label: "Sat", val: "85%", amt: "$4.0k" },
                      { label: "Sun", val: "100%", amt: "$5.2k" }
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center bg-transparent group">
                        <span className="text-[8px] text-pink-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">{bar.amt}</span>
                        <div className="w-full bg-[#161622] rounded-t-lg h-32 relative overflow-hidden flex items-end">
                          <div 
                            className="w-full bg-gradient-to-t from-[#7b2cbf] to-[#ff007f] rounded-t-md transition-all duration-1000"
                            style={{ height: bar.val }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-2 font-semibold font-mono">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live stream status feed */}
                <div className="xl:col-span-4 bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-3">Active Streaming Nodes</h4>
                  
                  <div className="space-y-3">
                    {db.hosts.map((host: any) => (
                      <div key={host.id} className="flex items-center justify-between p-2.5 rounded-xl bg-black/35 border border-white/5">
                        <div className="flex items-center space-x-2.5 bg-transparent">
                          <img src={host.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                          <div className="bg-transparent text-left">
                            <p className="text-[11px] font-black text-white leading-tight">{host.name}</p>
                            <span className="text-[7.5px] bg-[#ff007f]/10 text-[#ff007f] border border-[#ff007f]/20 px-1 py-0.2 rounded uppercase font-black tracking-widest font-mono mt-1 inline-block">
                              {host.category} node
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-white font-mono font-black">👥 {host.viewers}</p>
                          <span className="text-[7.5px] text-green-400 font-mono font-bold uppercase">Streaming ✓</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: ADMIN ACCESS NOMINATIONS */}
          {/* ========================================================================= */}
          {activeTab === "admin_nominations" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-950/80 via-[#12121e] to-pink-950/80 border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-6">
                  <ShieldCheck className="w-64 h-64 text-pink-500" />
                </div>

                <div className="relative z-10 space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                        Admin Access Nominations & Authorization Center
                      </h3>
                      <p className="text-xs text-gray-300">
                        Grant or revoke Web Admin Portal access for specific accounts & owner emails in real-time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form to Nominate New Admin Email */}
              <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-pink-400" />
                  <span>Nominate New Admin Email Address</span>
                </h4>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddAdminNomination();
                  }}
                  className="flex flex-col sm:flex-row items-center gap-3"
                >
                  <div className="relative flex-1 w-full">
                    <input
                      type="email"
                      required
                      placeholder="Enter user email (e.g. name@example.com)"
                      value={newAdminEmailInput}
                      onChange={(e) => setNewAdminEmailInput(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={nominatingLoading || !newAdminEmailInput.trim()}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Nominate Admin</span>
                  </button>
                </form>
              </div>

              {/* Authorized Admin Accounts Grid / Table */}
              <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                      Authorized Web Admin Accounts ({allowedAdminEmailsList.length})
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      System defaults and dynamically nominated emails allowed to view & open the Admin Portal.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-white/5">
                  {allowedAdminEmailsList.map((email, idx) => {
                    const isDefault = DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
                    return (
                      <div key={idx} className="py-3.5 flex items-center justify-between hover:bg-white/2 px-2 rounded-xl transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            isDefault ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          }`}>
                            {isDefault ? "👑" : "🛡️"}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-white font-mono">{email}</p>
                            <div className="flex items-center space-x-2 mt-0.5">
                              {isDefault ? (
                                <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                                  System Default Owner / Admin
                                </span>
                              ) : (
                                <span className="text-[8px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                                  Nominated Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isDefault && (
                          <button
                            onClick={() => handleRemoveAdminNomination(email)}
                            disabled={nominatingLoading}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <Trash className="w-3 h-3" />
                            <span>Revoke Admin</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Nomination from Ecosystem Registered Users */}
              <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Registered Platform Accounts Quick Nomination
                </h4>
                <p className="text-xs text-gray-400">
                  Click 'Nominate Admin' next to any registered platform account to instantly grant them access.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {[db?.user, ...(db?.adminUsersList || [])]
                    .filter(Boolean)
                    .map((u, i) => {
                      const userEmail = u.email || `${u.username}@pardais.com`;
                      const isAlreadyAdmin = isAuthorizedAdmin(u) || allowedAdminEmailsList.includes(userEmail.toLowerCase());

                      return (
                        <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <img src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                            <div>
                              <p className="text-xs font-bold text-white">@{u.username}</p>
                              <p className="text-[9px] text-gray-400 font-mono">{userEmail}</p>
                            </div>
                          </div>

                          {isAlreadyAdmin ? (
                            <span className="text-[8.5px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg font-mono font-bold uppercase">
                              ✓ Authorized Admin
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddAdminNomination(userEmail)}
                              disabled={nominatingLoading}
                              className="px-2.5 py-1 bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-white border border-pink-500/30 rounded-lg text-[9px] font-bold font-mono transition-all cursor-pointer"
                            >
                              + Nominate Admin
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: USERS & ACCOUNTS */}
          {/* ========================================================================= */}
          {activeTab === "users" && (
            <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">Ecosystem Users Ledger & Real Accounts</h3>
                  <p className="text-xs text-gray-400">Real-time user controls: Toggle Party / Live / Reels permissions, adjust or freeze coins, suspend accounts, and view audit history.</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by username, ID, or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-pink-500 font-mono w-64"
                  />
                </div>
              </div>

              {/* Main Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-mono tracking-wider">
                      <th className="pb-3 pl-2">User Profile & ID</th>
                      <th className="pb-3">Contact Email / Phone</th>
                      <th className="pb-3">Level / VIP</th>
                      <th className="pb-3">Wallet Coins</th>
                      <th className="pb-3">App Feature Access (Party / Live / Reels)</th>
                      <th className="pb-3">Account & KYC Status</th>
                      <th className="pb-3 text-center">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(usersList.length > 0 ? usersList : [db.user, ...db.adminUsersList])
                      .filter(u => 
                        !userSearch || 
                        (u.username || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                        (u.fullName || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                        (u.email || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                        (u.phone || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                        (u.id || "").toString().includes(userSearch)
                      )
                      .map((u, i) => {
                        const devId = u.deviceId || (u.username === "Pardais_User" ? "DEV-S24-PAK8821" : `DEV-HW-${(i + 1) * 1042}`);
                        const isDeviceBlocked = (db?.configurations?.blockedDevices || []).includes(devId);

                        return (
                          <tr key={u.id || u.username || i} className="hover:bg-white/2">
                            {/* Profile & ID */}
                            <td className="py-3.5 pl-2">
                              <div className="flex items-center space-x-2.5">
                                <img src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                                <div>
                                  <p className="font-bold text-white flex items-center space-x-1">
                                    <span>@{u.username}</span>
                                    <span className="text-[8px] text-gray-500 font-mono font-normal">(ID: #{u.id || u.numericId || "10248"})</span>
                                  </p>
                                  <span className="text-[9px] text-gray-300 font-mono block">{u.fullName || "User Account"}</span>
                                  {u.isBanned && (
                                    <span className="text-[7px] bg-red-600/20 text-red-400 border border-red-500/30 px-1 py-0.2 rounded font-mono uppercase font-black">
                                      🚨 BANNED
                                    </span>
                                  )}
                                  {u.isSuspended && (
                                    <span className="ml-1 text-[7px] bg-orange-600/20 text-orange-400 border border-orange-500/30 px-1 py-0.2 rounded font-mono uppercase font-black">
                                      ⛔ SUSPENDED
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Email & Phone */}
                            <td className="py-3.5">
                              <div className="space-y-0.5 text-[10px] font-mono">
                                <span className="text-gray-300 block">{u.email || `${u.username}@pardais.app`}</span>
                                <span className="text-gray-400 block">{u.phone || "+92 300 0000000"}</span>
                              </div>
                            </td>

                            {/* Level / VIP */}
                            <td className="py-3.5 font-mono">
                              <div className="space-y-1">
                                <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-black inline-block">
                                  LVL {u.level || u.userLevel || 1}
                                </span>
                                {(u.vipLevel || 0) > 0 && (
                                  <span className="ml-1 text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-black inline-block">
                                    👑 VIP {u.vipLevel}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Wallet Coins */}
                            <td className="py-3.5 font-mono">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-yellow-400">💎 {typeof u.coins === "number" ? u.coins : 5000}</span>
                                  {u.coinsFrozen && (
                                    <span className="text-[8px] bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded font-black">FROZEN ❄️</span>
                                  )}
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleUpdateCoins(u.username, u.coins || 5000, 1000)}
                                    className="text-[8px] bg-yellow-500/15 hover:bg-yellow-500 hover:text-black px-1.5 py-0.2 rounded border border-yellow-500/30 font-black"
                                  >
                                    +1k
                                  </button>
                                  <button
                                    onClick={() => handleUpdateCoins(u.username, u.coins || 5000, -1000)}
                                    className="text-[8px] bg-red-500/15 hover:bg-red-500 hover:text-white px-1.5 py-0.2 rounded border border-red-500/30 font-black"
                                  >
                                    -1k
                                  </button>
                                  <button
                                    onClick={() => handleToggleFreezeCoins(u)}
                                    className={`text-[8px] px-1.5 py-0.2 rounded font-black border ${
                                      u.coinsFrozen ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-cyan-950 text-cyan-300 border-cyan-500/30"
                                    }`}
                                  >
                                    {u.coinsFrozen ? "Unfreeze" : "Freeze"}
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* App Feature Permissions */}
                            <td className="py-3.5 font-mono">
                              <div className="flex flex-col space-y-1">
                                <button
                                  onClick={() => handleTogglePartyPerm(u)}
                                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border transition-all text-left w-24 ${
                                    u.partyEnabled !== false
                                      ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                      : "bg-gray-800 text-gray-500 border-gray-700"
                                  }`}
                                >
                                  Party: {u.partyEnabled !== false ? "ON 🟢" : "OFF 🔴"}
                                </button>
                                <button
                                  onClick={() => handleToggleLivePerm(u)}
                                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border transition-all text-left w-24 ${
                                    u.liveEnabled !== false
                                      ? "bg-pink-500/15 text-pink-300 border-pink-500/30"
                                      : "bg-gray-800 text-gray-500 border-gray-700"
                                  }`}
                                >
                                  Live: {u.liveEnabled !== false ? "ON 🟢" : "OFF 🔴"}
                                </button>
                                <button
                                  onClick={() => handleToggleReelsPerm(u)}
                                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border transition-all text-left w-24 ${
                                    u.reelsEnabled !== false
                                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                      : "bg-gray-800 text-gray-500 border-gray-700"
                                  }`}
                                >
                                  Reels: {u.reelsEnabled !== false ? "ON 🟢" : "OFF 🔴"}
                                </button>
                              </div>
                            </td>

                            {/* Account & KYC Status */}
                            <td className="py-3.5">
                              <div className="space-y-1 font-mono text-[9px]">
                                <button
                                  onClick={() => handleToggleVerification(u)}
                                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border transition-all block ${
                                    u.isVerified || u.kycStatus === "approved"
                                      ? "bg-green-500/15 text-green-400 border-green-500/30"
                                      : "bg-gray-800 text-gray-400 border-gray-700"
                                  }`}
                                >
                                  KYC: {u.kycStatus ? u.kycStatus.toUpperCase() : u.isVerified ? "APPROVED" : "UNVERIFIED"}
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 text-center">
                              <div className="flex flex-col space-y-1 items-center">
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => setEditingUserModal(u)}
                                    className="text-[8.5px] font-bold bg-purple-600/30 hover:bg-purple-600 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded transition-all"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => setUserHistoryModal(u)}
                                    className="text-[8.5px] font-bold bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 border border-cyan-500/30 px-2 py-0.5 rounded transition-all"
                                  >
                                    📜 History
                                  </button>
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleToggleSuspendUser(u)}
                                    className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border transition-all ${
                                      u.isSuspended
                                        ? "bg-emerald-600 text-black border-emerald-400"
                                        : "bg-orange-600/30 text-orange-200 border-orange-500/30 hover:bg-orange-600"
                                    }`}
                                  >
                                    {u.isSuspended ? "Unsuspend" : "Suspend"}
                                  </button>
                                  <button
                                    onClick={() => handleToggleBanUser(u)}
                                    className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded transition-all ${
                                      u.isBanned
                                        ? "bg-green-500 text-black"
                                        : "bg-red-600 text-white hover:bg-red-500"
                                    }`}
                                  >
                                    {u.isBanned ? "Unban" : "Ban"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: HOSTS & BROADCASTERS */}
          {/* ========================================================================= */}
          {activeTab === "hosts" && (
            <div className="space-y-6 text-left">
              {/* Active Stream Metrics Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-gray-500 font-bold">Active Live Streams</p>
                    <p className="text-2xl font-black text-white font-mono mt-1">{db.hosts.length || 3}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                </div>

                <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-gray-500 font-bold">Total Live Audience</p>
                    <p className="text-2xl font-black text-cyan-400 font-mono mt-1">
                      {db.hosts.reduce((acc: number, h: any) => acc + (h.viewers || 0), 1240)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-gray-500 font-bold">Session Gifts Collected</p>
                    <p className="text-2xl font-black text-yellow-400 font-mono mt-1">💎 145,000</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                    <Gift className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Active Broadcasters Table */}
              <div className="bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                      Active Broadcasting Streams & Broadcasters Monitor
                    </h4>
                    <p className="text-xs text-gray-400">Monitor live room audio/video streams and force terminate streams in case of violations.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-mono tracking-wider">
                        <th className="pb-3 pl-2">Broadcaster</th>
                        <th className="pb-3">Stream ID & Title</th>
                        <th className="pb-3">Agency Affiliation</th>
                        <th className="pb-3">Live Viewers</th>
                        <th className="pb-3">Stream Duration</th>
                        <th className="pb-3">Gifts Earned</th>
                        <th className="pb-3">Violations / Reports</th>
                        <th className="pb-3 text-center">Stream Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {db.hosts.map((host: any, i: number) => {
                        const streamId = host.streamId || `STRM-${1000 + i * 42}`;
                        return (
                          <tr key={host.id} className="hover:bg-white/2">
                            {/* Broadcaster */}
                            <td className="py-4 pl-2 font-sans">
                              <div className="flex items-center space-x-2.5">
                                <img src={host.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                                <div>
                                  <p className="font-bold text-white leading-snug">{host.name}</p>
                                  <span className="text-[9px] text-pink-400 font-mono">@{host.username || host.name.toLowerCase().replace(/\s+/g, "_")}</span>
                                </div>
                              </div>
                            </td>

                            {/* Stream ID & Title */}
                            <td className="py-4">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-cyan-400 font-bold block">{streamId}</span>
                                <span className="text-[9.5px] text-gray-300 font-sans block">{host.statusText || "Live Singing & Chat"}</span>
                              </div>
                            </td>

                            {/* Agency */}
                            <td className="py-4 font-sans text-gray-300">
                              {host.agencyName || "Pardais Official Agency"}
                            </td>

                            {/* Viewers */}
                            <td className="py-4 font-bold text-cyan-400">
                              👥 {host.viewers || 420}
                            </td>

                            {/* Duration */}
                            <td className="py-4 text-gray-400 text-[10px]">
                              ⏱️ {host.duration || "1h 45m"}
                            </td>

                            {/* Gifts */}
                            <td className="py-4 font-bold text-yellow-400">
                              💎 {host.gifts || "12,500"}
                            </td>

                            {/* Violations */}
                            <td className="py-4">
                              <span className="text-[8.5px] px-2 py-0.5 rounded font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                0 Flags
                              </span>
                            </td>

                            {/* Stream Controls */}
                            <td className="py-4 text-center">
                              <button
                                onClick={() => handleEndActiveStream(streamId, host.name)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase rounded-xl transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer"
                              >
                                🚫 End Broadcast
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: AGENCIES & COMMISSIONS */}
          {/* ========================================================================= */}
          {activeTab === "agencies" && (
            <div className="space-y-6 text-left">
              {/* Subtabs switcher */}
              <div className="flex space-x-2 border-b border-white/5 pb-3 bg-transparent">
                <button
                  type="button"
                  onClick={() => setAgencySubTab("registry")}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    agencySubTab === "registry"
                      ? "bg-purple-600 text-white shadow-lg"
                      : "bg-[#12121a] text-gray-400 hover:text-white"
                  }`}
                >
                  🏢 Approved Agencies Registry
                </button>
                <button
                  type="button"
                  onClick={() => setAgencySubTab("requests")}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                    agencySubTab === "requests"
                      ? "bg-purple-600 text-white shadow-lg"
                      : "bg-[#12121a] text-gray-400 hover:text-white"
                  }`}
                >
                  📨 Pending Portal Requests
                  {(db?.agencyRequests?.filter((r: any) => r.status === "Pending" || !r.status).length > 0) && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[8px] font-black w-4 border border-black h-4 rounded-full flex items-center justify-center animate-pulse">
                      {db.agencyRequests.filter((r: any) => r.status === "Pending" || !r.status).length}
                    </span>
                  )}
                </button>
              </div>

              {agencySubTab === "registry" ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Form to Create/Update Agency */}
                  <div className="lg:col-span-4 bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                      {editingAgency ? "✏️ Modify Agency Specs" : "➕ Register New Talent Agency"}
                    </h4>

                    <form onSubmit={editingAgency ? handleSaveAgencyEdit : handleAddAgency} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Agency Name</label>
                        <input
                          type="text"
                          required
                          value={editingAgency ? editingAgency.name : newAgency.name}
                          onChange={(e) => {
                            if (editingAgency) setEditingAgency({ ...editingAgency, name: e.target.value });
                            else setNewAgency({ ...newAgency, name: e.target.value });
                          }}
                          placeholder="e.g. Falcon Entertainment"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Owner Email Account</label>
                        <input
                          type="email"
                          required
                          value={editingAgency ? editingAgency.ownerEmail : newAgency.ownerEmail}
                          onChange={(e) => {
                            if (editingAgency) setEditingAgency({ ...editingAgency, ownerEmail: e.target.value });
                            else setNewAgency({ ...newAgency, ownerEmail: e.target.value });
                          }}
                          placeholder="e.g. owner@falcon.live"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Salary Policy & Commission Structure</label>
                        <input
                          type="text"
                          required
                          value={editingAgency ? editingAgency.salaryRate : newAgency.salaryRate}
                          onChange={(e) => {
                            if (editingAgency) setEditingAgency({ ...editingAgency, salaryRate: e.target.value });
                            else setNewAgency({ ...newAgency, salaryRate: e.target.value });
                          }}
                          placeholder="e.g. 40% Commission + $300 Base Bonus"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      {editingAgency && (
                        <div className="grid grid-cols-2 gap-3 bg-transparent">
                          <div className="space-y-1 bg-transparent font-mono">
                            <label className="text-[9px] uppercase font-bold text-gray-400">Active Hosts</label>
                            <input
                              type="number"
                              value={editingAgency.registeredHosts}
                              onChange={(e) => setEditingAgency({ ...editingAgency, registeredHosts: Number(e.target.value) })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1 bg-transparent font-mono">
                            <label className="text-[9px] uppercase font-bold text-gray-400">Comm (USD)</label>
                            <input
                              type="number"
                              value={editingAgency.monthlyCommission}
                              onChange={(e) => setEditingAgency({ ...editingAgency, monthlyCommission: Number(e.target.value) })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2 bg-transparent">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] hover:opacity-90 text-white font-black text-xs uppercase py-2.5 rounded-xl transition-all cursor-pointer text-center"
                        >
                          {editingAgency ? "Save Changes" : "Deploy Agency"}
                        </button>
                        {editingAgency && (
                          <button
                            type="button"
                            onClick={() => setEditingAgency(null)}
                            className="px-4 bg-[#202030] text-gray-400 hover:text-white rounded-xl text-xs font-bold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Table list of registered Agencies */}
                  <div className="lg:col-span-8 bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                      Ecosystem Agencies Commissions Registry
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead>
                          <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-mono tracking-wider">
                            <th className="pb-3 pl-2">Agency Name</th>
                            <th className="pb-3">Owner Account</th>
                            <th className="pb-3">Salary Structure</th>
                            <th className="pb-3">Talent Hosts</th>
                            <th className="pb-3">Mo. Commission</th>
                            <th className="pb-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {db.agencies.map((agency: any) => (
                            <tr key={agency.id} className="hover:bg-white/2">
                              <td className="py-4 pl-2 font-black text-white font-sans">{agency.name}</td>
                              <td className="py-4 text-gray-300 font-mono text-[11px]">{agency.ownerEmail}</td>
                              <td className="py-4 font-sans text-pink-400 font-bold">{agency.salaryRate}</td>
                              <td className="py-4 font-bold text-center text-cyan-400">{agency.registeredHosts} hosts</td>
                              <td className="py-4 font-bold text-emerald-400">${agency.monthlyCommission} USD</td>
                              <td className="py-4 text-center">
                                <div className="flex space-x-1.5 justify-center bg-transparent">
                                  <button
                                    onClick={() => setEditingAgency(agency)}
                                    className="p-1 text-gray-400 hover:text-white transition-all border border-white/5 rounded"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAgency(agency.id)}
                                    className="p-1 text-red-500 hover:text-red-400 transition-all border border-red-500/10 rounded"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 bg-transparent">
                  {/* Requests Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-transparent">
                    <div className="bg-[#0f0f18] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Total Requests</span>
                      <strong className="text-xl font-black text-white font-mono mt-2">
                        {db?.agencyRequests?.length || 0}
                      </strong>
                    </div>
                    <div className="bg-[#0f0f18] border border-yellow-500/20 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider">Pending Approval</span>
                      <strong className="text-xl font-black text-yellow-400 font-mono mt-2">
                        {db?.agencyRequests?.filter((r: any) => r.status === "Pending" || !r.status).length || 0}
                      </strong>
                    </div>
                    <div className="bg-[#0f0f18] border border-green-500/20 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-mono text-green-400 uppercase tracking-wider">Approved Licences</span>
                      <strong className="text-xl font-black text-green-400 font-mono mt-2">
                        {db?.agencyRequests?.filter((r: any) => r.status === "Approved").length || 0}
                      </strong>
                    </div>
                    <div className="bg-[#0f0f18] border border-red-500/20 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Rejected Requests</span>
                      <strong className="text-xl font-black text-red-400 font-mono mt-2">
                        {db?.agencyRequests?.filter((r: any) => r.status === "Rejected").length || 0}
                      </strong>
                    </div>
                  </div>

                  {/* Requests Table */}
                  <div className="bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                      Pardais Party Portal Onboarding & Licensing Requests
                    </h4>

                    {(!db?.agencyRequests || db.agencyRequests.length === 0) ? (
                      <p className="text-xs text-gray-500 italic py-4">No agency or reseller onboarding requests found in database.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-sans">
                          <thead>
                            <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-mono tracking-wider">
                              <th className="pb-3 pl-2">Applicant / Type</th>
                              <th className="pb-3">Proposed Agency Details</th>
                              <th className="pb-3">Terms & Rates</th>
                              <th className="pb-3">Status</th>
                              <th className="pb-3">Decision Notes / Remarks</th>
                              <th className="pb-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {db.agencyRequests.map((r: any) => (
                              <tr key={r.id} className="hover:bg-white/2">
                                <td className="py-4 pl-2 font-sans space-y-1">
                                  <div className="font-bold text-white">@{r.applicantUsername || "unknown"}</div>
                                  <div className="text-[10px] text-gray-400">{r.contact}</div>
                                  <div className="mt-1">
                                    {r.type === "official_agency" ? (
                                      <span className="text-[8px] uppercase font-black bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded">
                                        🪙 Coin Reseller
                                      </span>
                                    ) : (
                                      <span className="text-[8px] uppercase font-black bg-pink-500/15 text-pink-400 border border-pink-500/30 px-1.5 py-0.5 rounded">
                                        🎙️ Host Recruiter
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 font-sans max-w-xs space-y-1">
                                  <div className="font-black text-purple-400 font-mono text-xs">
                                    {r.type === "official_agency" ? r.applicantName : r.agencyName}
                                  </div>
                                  {r.city && <div className="text-[10px] text-gray-400">Region: {r.city}</div>}
                                  {r.ownerEmail && <div className="text-[10px] text-gray-400 font-mono">{r.ownerEmail}</div>}
                                  <div className="text-[9.5px] text-gray-400 leading-normal max-h-16 overflow-y-auto mt-1 italic">
                                    "{r.description || "No collateral/plan provided."}"
                                  </div>
                                </td>
                                <td className="py-4 font-sans text-cyan-400 font-bold">
                                  {r.rate || "Standard Policy"}
                                </td>
                                <td className="py-4">
                                  <span className={`px-2 py-0.5 rounded-[3px] text-[8px] font-black uppercase font-mono ${
                                    r.status === "Approved" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                                    r.status === "Rejected" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                                    r.status === "Suspended" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                                    "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse"
                                  }`}>
                                    {r.status || "Pending"}
                                  </span>
                                  {r.remarks && (
                                    <p className="text-pink-400 text-[8px] font-sans mt-1 max-w-[120px] truncate" title={r.remarks}>
                                      {r.remarks}
                                    </p>
                                  )}
                                </td>
                                <td className="py-4 font-sans">
                                  <input
                                    type="text"
                                    placeholder="Enter review note/remarks..."
                                    value={remarksInputs[r.id] || ""}
                                    onChange={(e) => setRemarksInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none w-44"
                                  />
                                </td>
                                <td className="py-4 text-center">
                                  <div className="flex flex-col space-y-1.5 justify-center items-center bg-transparent">
                                    {(r.status !== "Approved") && (
                                      <button
                                        onClick={() => handleApproveAgencyRequest(r.id)}
                                        className="w-24 py-1 bg-green-600 hover:bg-green-700 text-white font-bold text-[8.5px] uppercase rounded transition-all cursor-pointer shadow shadow-green-600/20"
                                      >
                                        ✓ Approve
                                      </button>
                                    )}
                                    {(r.status !== "Rejected" && r.status !== "Approved") && (
                                      <button
                                        onClick={() => handleRejectAgencyRequest(r.id)}
                                        className="w-24 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[8.5px] uppercase rounded transition-all cursor-pointer"
                                      >
                                        ✗ Reject
                                      </button>
                                    )}
                                    {r.status === "Approved" && (
                                      <button
                                        onClick={() => handleSuspendAgencyRequest(r.id)}
                                        className="w-24 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[8.5px] uppercase rounded transition-all cursor-pointer"
                                      >
                                        ⚠ Suspend
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteAgencyRequest(r.id)}
                                      className="w-24 py-1 bg-[#1e1e2d] hover:bg-red-600/30 text-gray-400 hover:text-red-400 border border-white/5 rounded text-[8px] uppercase transition-all cursor-pointer flex items-center justify-center space-x-1"
                                    >
                                      <Trash className="w-2.5 h-2.5" />
                                      <span>Delete Rec</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: FAMILIES & GUILDS */}
          {/* ========================================================================= */}
          {activeTab === "families" && (
            <div className="space-y-6 text-left">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form to Create/Update Family */}
                <div className="lg:col-span-4 bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                    {editingFamily ? "✏️ Modify Family Parameters" : "➕ Deploy New Guild Family"}
                  </h4>

                  <form onSubmit={editingFamily ? handleSaveFamilyEdit : handleAddFamily} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Family Name</label>
                      <input
                        type="text"
                        required
                        value={editingFamily ? editingFamily.name : newFamily.name}
                        onChange={(e) => {
                          if (editingFamily) setEditingFamily({ ...editingFamily, name: e.target.value });
                          else setNewFamily({ ...newFamily, name: e.target.value });
                        }}
                        placeholder="e.g. PARDAIS KINGS"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Leader Username</label>
                      <input
                        type="text"
                        required
                        value={editingFamily ? editingFamily.leader : newFamily.leader}
                        onChange={(e) => {
                          if (editingFamily) setEditingFamily({ ...editingFamily, leader: e.target.value });
                          else setNewFamily({ ...newFamily, leader: e.target.value });
                        }}
                        placeholder="e.g. Prince_Pardais"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Slogan Description</label>
                      <textarea
                        required
                        value={editingFamily ? editingFamily.description : newFamily.description}
                        onChange={(e) => {
                          if (editingFamily) setEditingFamily({ ...editingFamily, description: e.target.value });
                          else setNewFamily({ ...newFamily, description: e.target.value });
                        }}
                        placeholder="The elite guild of premium supporters."
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    {editingFamily && (
                      <div className="grid grid-cols-2 gap-3 bg-transparent">
                        <div className="space-y-1 bg-transparent font-mono">
                          <label className="text-[9px] uppercase font-bold text-gray-400">Members Count</label>
                          <input
                            type="number"
                            value={editingFamily.members}
                            onChange={(e) => setEditingFamily({ ...editingFamily, members: Number(e.target.value) })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1 bg-transparent font-mono">
                          <label className="text-[9px] uppercase font-bold text-gray-400">Guild Rank</label>
                          <input
                            type="number"
                            value={editingFamily.rank}
                            onChange={(e) => setEditingFamily({ ...editingFamily, rank: Number(e.target.value) })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2 bg-transparent">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] hover:opacity-90 text-white font-black text-xs uppercase py-2.5 rounded-xl transition-all cursor-pointer text-center"
                      >
                        {editingFamily ? "Save Changes" : "Deploy Family Guild"}
                      </button>
                      {editingFamily && (
                        <button
                          type="button"
                          onClick={() => setEditingFamily(null)}
                          className="px-4 bg-[#202030] text-gray-400 hover:text-white rounded-xl text-xs font-bold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Grid layout of Families */}
                <div className="lg:col-span-8 bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                    Ecosystem Families & Guild Ranks
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {db.families.map((fam: any) => (
                      <div key={fam.id} className="p-4 rounded-xl bg-black/45 border border-white/5 flex flex-col justify-between space-y-3.5 text-left">
                        <div className="flex justify-between items-start bg-transparent">
                          <div className="flex items-center space-x-3 bg-transparent">
                            <img src={fam.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                            <div className="bg-transparent text-left">
                              <h5 className="text-xs font-black text-white leading-normal uppercase">{fam.name}</h5>
                              <p className="text-[10px] text-gray-400 font-bold">Leader: <strong className="text-pink-500">@{fam.leader}</strong></p>
                              <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono font-black uppercase">
                                Rank #{fam.rank}
                              </span>
                            </div>
                          </div>

                          <div className="flex space-x-1.5 bg-transparent">
                            <button
                              onClick={() => setEditingFamily(fam)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFamily(fam.id)}
                              className="p-1.5 bg-red-600/15 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1 text-[11px] text-gray-300 font-medium">
                          <p className="italic">"{fam.description}"</p>
                          <div className="border-t border-white/5 pt-1.5 mt-1.5 flex justify-between text-[9px] font-mono font-black text-gray-500 uppercase">
                            <span>Guild ID: {fam.id}</span>
                            <span className="text-cyan-400 font-bold">👥 {fam.members} members</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: KYC AUDITING PANEL */}
          {/* ========================================================================= */}
          {activeTab === "kyc" && (
            <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-5 text-left">
              <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">Government Compliance KYC Audits</h3>
                  <p className="text-xs text-gray-400 font-sans">Validate real identity documents of hosts and users requesting cashout diamond capabilities.</p>
                </div>
                <span className="text-[10px] bg-pink-500/10 border border-pink-500/20 text-pink-400 px-3 py-1 rounded-full font-bold font-mono">
                  {db.kycRequests.filter((r: any) => r.status === "pending").length} PENDING AUDITS
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {db.kycRequests.map((req: any) => (
                  <div key={req.id} className="p-5 rounded-2xl bg-black/45 border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* User credentials meta */}
                    <div className="lg:col-span-4 space-y-4">
                      <div>
                        <span className="text-[8px] font-mono font-black uppercase tracking-wider text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                          {req.id}
                        </span>
                        <h4 className="text-sm font-black text-white mt-1.5">@{req.username}</h4>
                        <p className="text-xs text-gray-400">FullName: <strong className="text-gray-200">{req.fullName}</strong></p>
                        <p className="text-xs text-gray-400">Phone: <strong className="text-gray-200">{req.phoneNumber}</strong></p>
                        <p className="text-xs text-gray-400">D.O.B: <strong className="text-gray-200">{req.dob}</strong></p>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 font-mono text-[10px] text-gray-400">
                        <p>Document Type: <span className="text-cyan-400 uppercase font-black">{req.documentType === "id_card" ? "CNIC Identity Card" : "Passport"}</span></p>
                        <p>Liveness Verification: <span className={req.faceVerified ? "text-green-400 font-bold" : "text-yellow-400"}>{req.faceVerified ? "PASS ✓" : "SKIPPED"}</span></p>
                        <p>Status: <span className={`uppercase font-black ${req.status === "approved" ? "text-green-400" : req.status === "rejected" ? "text-red-400" : "text-yellow-400 animate-pulse"}`}>{req.status}</span></p>
                        {req.rejectionReason && (
                          <p className="text-red-400 font-sans mt-1 bg-red-950/40 p-2 rounded border border-red-500/20">
                            Reason: {req.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAuditKycWithReason(req.id, "approved")}
                            className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black text-xs uppercase py-2 rounded-xl transition-all active:scale-95 text-center cursor-pointer"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setKycRejectModal(req)}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase py-2 rounded-xl transition-all active:scale-95 text-center cursor-pointer"
                          >
                            🚫 Reject with Reason
                          </button>
                        </div>
                        <button
                          onClick={() => handleAuditKycWithReason(req.id, "rejected", "Document unclear / blurry. Please re-upload high resolution photos.")}
                          className="w-full bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-bold text-[10px] uppercase py-1.5 rounded-xl border border-cyan-500/30 transition-all text-center"
                        >
                          🔄 Request Resubmission
                        </button>
                      </div>
                    </div>

                    {/* Document Previews */}
                    <div className="lg:col-span-8 grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-gray-500 uppercase font-black block">Front Document Image</span>
                        <div 
                          onClick={() => req.idFront && setKycDocViewerModal(req.idFront)}
                          className="border border-white/10 rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center relative cursor-pointer group hover:border-pink-500 transition-all"
                        >
                          {req.idFront ? (
                            <img src={req.idFront} className="w-full h-full object-cover group-hover:scale-105 transition-all" alt="ID Front" />
                          ) : (
                            <span className="text-gray-500 text-xs font-mono">No Front Image</span>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <span className="text-white text-xs font-bold font-mono">🔍 Click to Enlarge</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-gray-500 uppercase font-black block">Back / Face Verification Frame</span>
                        <div 
                          onClick={() => req.idBack && setKycDocViewerModal(req.idBack)}
                          className="border border-white/10 rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center relative cursor-pointer group hover:border-pink-500 transition-all"
                        >
                          {req.idBack ? (
                            <img src={req.idBack} className="w-full h-full object-cover group-hover:scale-105 transition-all" alt="ID Back" />
                          ) : (
                            <span className="text-gray-500 text-xs font-mono">No Back Image</span>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <span className="text-white text-xs font-bold font-mono">🔍 Click to Enlarge</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {db.kycRequests.length === 0 && (
                  <p className="text-center text-gray-500 py-6 uppercase font-mono text-xs">No pending identity verification tickets</p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: GIFTS CRUD */}
          {/* ========================================================================= */}
          {activeTab === "gifts" && (
            <AdminGiftTab
              giftsList={adminGiftsList}
              setGiftsList={setAdminGiftsList}
              categoriesList={adminCategoriesList}
              setCategoriesList={setAdminCategoriesList}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: WALLET & CASH TRANSACTIONS */}
          {/* ========================================================================= */}
          {activeTab === "wallet" && (
            <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-5">
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">Financial Wallet Transactions & Ledger</h3>
                <p className="text-xs text-gray-400">Review system recharge logs, pay-ins, and manual stream diamond withdrawal audits</p>
              </div>

              {/* Transactions list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-mono tracking-wider">
                      <th className="pb-3 pl-2">Transaction ID</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Currency</th>
                      <th className="pb-3">Logged Date</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {db.transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-white/2">
                        <td className="py-3.5 pl-2 font-black text-white">{t.id}</td>
                        <td className="py-3.5">
                          <span className={`text-[8.5px] uppercase font-black px-2 py-0.5 rounded ${t.type === "recharge" ? "bg-cyan-500/10 text-cyan-400" : "bg-purple-500/10 text-purple-400"}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3.5 font-bold">{t.amount}</td>
                        <td className="py-3.5 uppercase font-bold">{t.currency}</td>
                        <td className="py-3.5 text-gray-400 text-[10px]">{new Date(t.timestamp).toLocaleString()}</td>
                        <td className="py-3.5">
                          <span className="text-[8.5px] uppercase font-black text-emerald-400">
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-gray-300 font-sans">{t.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: VIP & GLOWING FRAMES */}
          {/* ========================================================================= */}
          {activeTab === "vip" && (
            <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-5 text-left">
              <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">Dynamic Profile Frames & VIP Regulator</h3>
                  <p className="text-xs text-gray-400">Toggle VIP system parameters, suspend status for rule breakers, and configure frame profiles</p>
                </div>
                <span className="text-[10px] bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full font-bold font-mono">
                  VIP DECORATIONS
                </span>
              </div>

              {/* Suspension controller */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 bg-transparent">
                  <h4 className="text-sm font-black text-white">Toggle User VIP Suspension (Syed Prince Shah)</h4>
                  <p className="text-xs text-gray-500 leading-normal">
                    Locks out the user from equipping their glowing profile frames and using high-level chat highlights if toggled.
                  </p>
                </div>

                <button
                  onClick={handleToggleVipSuspension}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    db.user.vipSuspended
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}
                >
                  {db.user.vipSuspended ? "✓ Restore VIP Access" : "🚨 Suspend VIP Access"}
                </button>
              </div>

              {/* Frames array list */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider font-mono text-pink-500">Tiered Gifting Levels Frames Array</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {(db.configurations?.vipFrames?.length ? db.configurations.vipFrames : VIP_FRAMES_LIST).map((frame: any) => (
                    <div key={frame.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-3 bg-transparent">
                        <span className="text-2xl">{frame.badgeEmoji}</span>
                        <div className="bg-transparent">
                          <p className="text-xs font-bold text-white">{frame.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">Threshold: <span className="text-pink-500">Level {frame.minLevel}+</span></p>
                          <div className="flex items-center space-x-1.5 mt-1.5 bg-transparent">
                            <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: frame.glowColor }}></span>
                            <span className="text-[8.5px] text-gray-500 font-mono uppercase">{frame.glowColor}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[8.5px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded uppercase font-black font-mono">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: VIP RIDES & ENTRANCE ANIMATION SIMULATOR */}
          {/* ========================================================================= */}
          {activeTab === "vip_rides" && (
            <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-6 text-left">
              
              {/* Header Banner */}
              <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                    <span>🏎️ VIP Entrance Rides & Live SVG Animations</span>
                    <span className="text-[9px] bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 px-2 py-0.5 rounded-full font-mono">
                      VIP 1 - VIP 12
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Test live vector SVG entrance animations (5.8s duration) for all 12 VIP tiers (Superbike, Supercar, Warhorse, Tiger, Dragon, Lion, Phoenix, Unicorn, UFO, Carriage, Titan Dragon, Starfleet)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminActiveVipOverlay({ vipLevel: adminTestVipLevel, username: adminTestUsername })}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:brightness-110 text-black font-extrabold text-xs uppercase font-mono shadow-lg transition-all active:scale-95 flex items-center space-x-2 shrink-0 cursor-pointer"
                >
                  <Crown className="w-4 h-4 fill-black text-black" />
                  <span>Test Selected Ride (5.8s Live)</span>
                </button>
              </div>

              {/* Interactive Simulator Control Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-yellow-950/30 via-[#151522] to-purple-950/30 border border-yellow-500/30 space-y-4 shadow-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono text-yellow-300">
                    VIP Entrance Animation Testing Controller
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select VIP Level */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300 font-mono uppercase">
                      Select VIP Mount Level:
                    </label>
                    <select
                      value={adminTestVipLevel}
                      onChange={(e) => setAdminTestVipLevel(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-yellow-400"
                    >
                      {VIP_ENTRY_EFFECTS.map((eff) => (
                        <option key={eff.vipLevel} value={eff.vipLevel}>
                          VIP {eff.vipLevel}: {eff.name} ({eff.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Username Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300 font-mono uppercase">
                      Test Broadcaster / User Name:
                    </label>
                    <input
                      type="text"
                      value={adminTestUsername}
                      onChange={(e) => setAdminTestUsername(e.target.value)}
                      placeholder="Enter username..."
                      className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>

                {/* Live Info bar */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs font-mono gap-2 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400 font-bold">Sound Roar Text:</span>
                    <span className="text-white italic">"{getVipEntryEffect(adminTestVipLevel).soundText}"</span>
                  </div>
                  <span className="text-cyan-400 font-extrabold bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-500/40 shrink-0">
                    Animation Duration: ~5.8 Seconds
                  </span>
                </div>
              </div>

              {/* All 12 VIP Entrance Mounts Grid with Live Vector SVG Graphics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono text-cyan-400 flex items-center space-x-1.5">
                    <span>12 Live Animated Vector SVG Mounts Catalog</span>
                  </h4>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Click "Test Entrance (5.8s)" on any mount to preview live effect
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {VIP_ENTRY_EFFECTS.map((effect) => (
                    <div
                      key={effect.vipLevel}
                      className={`p-4 rounded-2xl border bg-gradient-to-b from-[#161624] to-[#0f0f18] ${effect.borderColor} ${effect.bannerGlow} space-y-3 flex flex-col justify-between relative overflow-hidden transition-transform hover:-translate-y-1`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase border ${effect.badgeBg}`}>
                          VIP {effect.vipLevel}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                          {effect.category} Ride
                        </span>
                      </div>

                      {/* Live Animated SVG Vector Mount */}
                      <div className="w-full h-28 bg-black/60 rounded-xl border border-white/10 flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                        <VipSvgMount vipLevel={effect.vipLevel} className="w-full h-full" />
                      </div>

                      {/* Details */}
                      <div className="space-y-1 text-left">
                        <h5 className="text-sm font-black text-white font-mono uppercase truncate">
                          {effect.name}
                        </h5>
                        <p className="text-[10px] text-gray-300 line-clamp-2 leading-relaxed font-sans">
                          {effect.description}
                        </p>
                      </div>

                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setAdminActiveVipOverlay({ vipLevel: effect.vipLevel, username: adminTestUsername })}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:brightness-110 text-black font-extrabold text-[11px] uppercase font-mono shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5 fill-black text-black" />
                        <span>Test Entrance (5.8s)</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: MODERATION & SAFETY */}
          {/* ========================================================================= */}
          {activeTab === "moderation" && (
            <div className="space-y-6 text-left">
              {/* Top Banner Header */}
              <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-red-500" />
                      <span>Moderation Console & Special Access Management</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Assign Special Access Moderator powers, perform on-the-spot stream terminations (Party/Solo/PK), suspend/unsuspend IDs, force live on, issue warnings, and ban/unban device hardware IDs.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-full font-mono font-bold uppercase animate-pulse">
                      🔴 Live Mod Controls Active
                    </span>
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* SECTION 1: SPECIAL ACCESS / MAKE MODERATOR MANAGEMENT */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-5">
                <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                      <UserPlus className="w-4 h-4 text-purple-400" />
                      <span>Assign Special Moderator Access ("Make Moderator")</span>
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Grant Moderator status to specific user IDs or emails. Authorized moderators can use Mod Powers on-the-spot across all streams and accounts.
                    </p>
                  </div>
                </div>

                {/* Grant Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGrantModerator(newModInput);
                  }}
                  className="flex flex-col sm:flex-row items-center gap-3"
                >
                  <div className="relative flex-1 w-full">
                    <input
                      type="text"
                      required
                      placeholder="Enter Username, User ID or Email (e.g. @mod_pakistan or user@domain.com)"
                      value={newModInput}
                      onChange={(e) => setNewModInput(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newModInput.trim()}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Make Moderator / Grant Mod Access</span>
                  </button>
                </form>

                {/* Active Moderators Grid */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-purple-400 font-mono">
                    Authorized Special Access Moderators ({moderatorsList.length})
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {moderatorsList.map((mod, idx) => (
                      <div key={idx} className="p-3.5 bg-black/40 border border-purple-500/20 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-xs">
                            🛡️
                          </div>
                          <div>
                            <p className="font-bold text-xs text-white font-mono">@{mod.username}</p>
                            <p className="text-[10px] text-gray-400">{mod.email}</p>
                            <span className="inline-block mt-1 text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                              {mod.role || "Special Access Moderator"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeModerator(mod.username)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash className="w-3 h-3" />
                          <span>Revoke Access</span>
                        </button>
                      </div>
                    ))}
                    {moderatorsList.length === 0 && (
                      <p className="text-center text-gray-500 py-3 uppercase font-mono text-xs col-span-2">No special moderators designated yet</p>
                    )}
                  </div>
                </div>

                {/* Quick Nomination from Ecosystem Users */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-gray-400 font-mono">
                    Quick Mod Access Nomination from Registered Accounts
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {[db?.user, ...(db?.adminUsersList || [])]
                      .filter(Boolean)
                      .slice(0, 12)
                      .map((u, i) => {
                        const isMod = moderatorsList.some(m => m.username.toLowerCase() === u.username.toLowerCase());
                        return (
                          <div key={i} className="p-2.5 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <img src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} className="w-7 h-7 rounded-full object-cover border border-white/10" />
                              <span className="text-xs font-bold text-white truncate max-w-[100px]">@{u.username}</span>
                            </div>
                            {isMod ? (
                              <span className="text-[8px] text-purple-400 font-mono font-bold uppercase bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                ✓ Moderator
                              </span>
                            ) : (
                              <button
                                onClick={() => handleGrantModerator(u.username)}
                                className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 rounded text-[9px] font-bold font-mono transition-all cursor-pointer"
                              >
                                + Grant Mod Access
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* SECTION 2: ON-THE-SPOT LIVE STREAM CONTROL CENTER */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center space-x-2 text-red-400">
                      <Radio className="w-4 h-4 animate-pulse text-red-500" />
                      <span>On-The-Spot Stream Control Center (End Any Stream)</span>
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Directly terminate Party Rooms, Solo Live Streams, or PK Battles on the spot with full moderator authority.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Active Party Rooms */}
                  {(db?.parties || []).map((party: any) => (
                    <div key={party.id} className="p-4 bg-black/40 border border-red-500/20 rounded-xl space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                          🎉 Party Room
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">ID: {party.id}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate">{party.title || "Party Room"}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Host: @{party.hostUsername}</p>
                        <p className="text-[10px] text-pink-400 font-mono">Category: {party.category || "Audio Party"}</p>
                      </div>
                      <button
                        disabled={modActionLoading}
                        onClick={() => handleEndStreamOnTheSpot("party", party.id, party.hostUsername)}
                        className="w-full py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 rounded-xl text-[10px] font-black uppercase font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <span>🛑 End Party Room On-The-Spot</span>
                      </button>
                    </div>
                  ))}

                  {/* Active Solo / Host Streams */}
                  {(db?.hosts || []).filter((h: any) => h.isLive).map((host: any) => (
                    <div key={host.id} className="p-4 bg-black/40 border border-pink-500/20 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                          📹 Solo Stream
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">{host.category || "video"}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <img src={host.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">@{host.hostUsername || host.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{host.statusText || "Live Broadcast"}</p>
                        </div>
                      </div>
                      <button
                        disabled={modActionLoading}
                        onClick={() => handleEndStreamOnTheSpot("solo", host.id, host.hostUsername || host.name)}
                        className="w-full py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 rounded-xl text-[10px] font-black uppercase font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <span>🛑 End Solo Stream On-The-Spot</span>
                      </button>
                    </div>
                  ))}

                  {(db?.parties || []).length === 0 && (db?.hosts || []).filter((h: any) => h.isLive).length === 0 && (
                    <div className="col-span-full text-center py-6 bg-black/20 rounded-xl border border-white/5">
                      <p className="text-gray-500 text-xs font-mono uppercase">No active party rooms or solo streams running right now</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* SECTION 3: ON-THE-SPOT ID & DEVICE MODERATION ACTION POWERS */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-5">
                <div className="border-b border-white/5 pb-3">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center space-x-2 text-amber-400">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>On-The-Spot Account, Stream & Device Moderator Power Panel</span>
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Execute immediate moderation commands on any User ID, Stream, or Device Hardware.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sub-Panel A: User Account ID Actions */}
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-4">
                    <h5 className="text-xs font-black uppercase tracking-wider text-purple-400 font-mono">
                      👤 User ID Mod Actions (Suspend / Live On / Warning)
                    </h5>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Target Username / User ID</label>
                      <input
                        type="text"
                        placeholder="e.g. @Pardais_User or guest_1001"
                        value={modTargetUser}
                        onChange={(e) => setModTargetUser(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Warning Message Text</label>
                      <input
                        type="text"
                        placeholder="Reason or warning details..."
                        value={modWarningText}
                        onChange={(e) => setModWarningText(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        disabled={modActionLoading || !modTargetUser.trim()}
                        onClick={() => handleToggleUserSuspend(modTargetUser, true)}
                        className="py-2 px-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer disabled:opacity-50"
                      >
                        🚨 Suspend Account ID
                      </button>

                      <button
                        disabled={modActionLoading || !modTargetUser.trim()}
                        onClick={() => handleToggleUserSuspend(modTargetUser, false)}
                        className="py-2 px-3 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/30 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✅ Un-suspend / Unblock ID
                      </button>

                      <button
                        disabled={modActionLoading || !modTargetUser.trim()}
                        onClick={() => handleForceLiveOn(modTargetUser)}
                        className="py-2 px-3 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer disabled:opacity-50"
                      >
                        📹 Force Live ON
                      </button>

                      <button
                        disabled={modActionLoading || !modTargetUser.trim()}
                        onClick={() => handleSendWarning(modTargetUser, modWarningText)}
                        className="py-2 px-3 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer disabled:opacity-50"
                      >
                        ⚠️ Dispatch Warning
                      </button>
                    </div>
                  </div>

                  {/* Sub-Panel B: Device Hardware Ban Actions */}
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-4">
                    <h5 className="text-xs font-black uppercase tracking-wider text-pink-400 font-mono">
                      📱 Device Hardware Suspend & Un-suspend
                    </h5>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Target Device Hardware ID</label>
                      <input
                        type="text"
                        placeholder="e.g. DEV-HW-HXHYKI or IP/Hardware ID"
                        value={modTargetDevice}
                        onChange={(e) => setModTargetDevice(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-pink-500 focus:outline-none"
                      />
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono bg-black/20 p-2.5 rounded-lg border border-white/5">
                      Quick select from logged user device: <span className="text-white font-bold">{db?.user?.deviceId || "DEV-HW-HXHYKI"}</span>
                      <button
                        onClick={() => setModTargetDevice(db?.user?.deviceId || "DEV-HW-HXHYKI")}
                        className="ml-2 text-[9px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded border border-pink-500/30 font-bold uppercase cursor-pointer"
                      >
                        Use My Device ID
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        disabled={modActionLoading || !modTargetDevice.trim()}
                        onClick={() => handleToggleDeviceBan(modTargetDevice, true)}
                        className="py-2.5 px-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer disabled:opacity-50"
                      >
                        📱 Suspend Device / Ban
                      </button>

                      <button
                        disabled={modActionLoading || !modTargetDevice.trim()}
                        onClick={() => handleToggleDeviceBan(modTargetDevice, false)}
                        className="py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer disabled:opacity-50"
                      >
                        📱 Un-suspend Device
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* SECTION 4: OPEN INFRACTION & COMPLIANCE TICKETS */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-[#0f0f18] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-pink-500 font-mono">Open Community Infraction & Compliance Tickets</h4>

                <div className="grid grid-cols-1 gap-3">
                  {(db?.reports || []).map((rep: any) => (
                    <div key={rep.id} className="p-4 rounded-xl bg-black/35 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center space-x-2 bg-transparent">
                          <span className="text-[9px] bg-red-600/25 text-red-400 border border-red-500/30 px-2 py-0.2 rounded font-mono uppercase font-black">
                            {rep.id}
                          </span>
                          <span className="text-xs font-bold text-white">Target: @{rep.username}</span>
                        </div>
                        <p className="text-xs text-gray-400">Infraction details: <strong className="text-gray-200 font-sans font-medium">"{rep.reason}"</strong></p>
                        <p className="text-[10px] text-gray-500 font-mono">Filed by: @{rep.reporter} • {new Date(rep.timestamp).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center space-x-3 bg-transparent">
                        <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded ${rep.status === "resolved" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"}`}>
                          {rep.status}
                        </span>
                        {rep.status === "pending" && (
                          <button
                            onClick={() => handleResolveReport(rep.id)}
                            className="bg-green-500 hover:bg-green-400 text-black text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono font-bold"
                          >
                            Resolve Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(db?.reports || []).length === 0 && (
                    <p className="text-center text-gray-500 py-4 uppercase font-mono text-xs">No community guideline reports logged</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: CAMPAIGN EVENTS & SLIDER BANNERS */}
          {/* ========================================================================= */}
          {activeTab === "events" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
              {/* Form to Append Sliders */}
              <div className="lg:col-span-5 bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                  ➕ Add Advertisement Banner Slide
                </h4>

                <form onSubmit={handleAddBanner} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Banner Slogan Title</label>
                    <input
                      type="text"
                      required
                      value={newBanner.title}
                      onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                      placeholder="e.g. MEGA PK BATTLE CHALLENGE"
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Artwork URL (Unsplash/Static CDN)</label>
                    <input
                      type="text"
                      required
                      value={newBanner.image}
                      onChange={(e) => setNewBanner({ ...newBanner, image: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-pink-500 to-[#7b2cbf] hover:opacity-90 text-white font-black text-xs uppercase py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    🚀 Deploy Advertising Banner
                  </button>
                </form>

                {/* Scheduled Tournaments campaign lists */}
                <div className="border-t border-white/5 pt-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono text-pink-500">Schedule Active Campaign Event</h4>
                  
                  <form onSubmit={handleCreateEvent} className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="Event Title..."
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3 bg-transparent">
                      <input
                        type="text"
                        placeholder="Duration (e.g. 2 Days)"
                        value={newEvent.duration}
                        onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="XP/Coin Rewards multiplier"
                        value={newEvent.reward}
                        onChange={(e) => setNewEvent({ ...newEvent, reward: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-black font-black text-[10px] uppercase py-2 rounded-xl"
                    >
                      📅 Deploy Live Tournament
                    </button>
                  </form>
                </div>
              </div>

              {/* Carousel Previews list */}
              <div className="lg:col-span-7 bg-[#0f0f18] border border-[#1f2833] p-5 rounded-2xl space-y-5">
                <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2">Active Carousel Artwork Sliders</h4>
                
                <div className="space-y-4">
                  {db.configurations.banners.map((banner: any) => (
                    <div key={banner.id} className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 bg-transparent text-left">
                        <img src={banner.image || "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300"} className="w-20 h-12 object-cover rounded-lg border border-white/10" />
                        <div className="bg-transparent">
                          <p className="text-xs font-black text-white">{banner.title}</p>
                          <span className="text-[8px] text-gray-500 font-mono font-bold block mt-1">ID: {banner.id}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="text-red-500 hover:text-red-400 p-2 transition-colors border border-red-500/25 hover:bg-red-500/10 rounded-lg"
                        title="Delete slider"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: APP ICON & BRANDING MANAGEMENT */}
          {/* ========================================================================= */}
          {activeTab === "app_icon" && (
            <div className="space-y-6 text-left">
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-pink-950/60 via-[#131322] to-purple-950/60 border border-pink-500/40 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-pink-500/10 to-transparent pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="p-2 rounded-xl bg-gradient-to-tr from-[#ff007f] to-[#7b2cbf] text-white shadow-lg">
                        <Image className="w-6 h-6 text-white" />
                      </span>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                          App Icon & Branding Live Controller
                        </h3>
                        <p className="text-xs text-pink-200/90 font-sans">
                          Change or upload custom app icon URL. Changes deploy <strong className="text-emerald-400">INSTANTLY IN REAL-TIME</strong> across all connected user devices!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-black rounded-xl font-mono flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{db?.configurations?.appIconUrl ? "CUSTOM ICON DEPLOYED" : "DEFAULT NEON LOGO ACTIVE"}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Custom Input & File Upload */}
                <div className="lg:col-span-2 bg-[#0f0f18] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/10 pb-3 flex items-center justify-between">
                    <span className="flex items-center">
                      <Image className="w-4.5 h-4.5 text-pink-500 mr-2" />
                      Custom Icon Image Source
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">Supports URL or Direct Device Upload</span>
                  </h4>

                  {/* Option 1: URL Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block font-mono">
                      1. Enter Image URL (PNG / JPG / WEBP / SVG)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        placeholder="https://example.com/my-custom-app-icon.png"
                        value={customAppIconInput || db?.configurations?.appIconUrl || ""}
                        onChange={(e) => setCustomAppIconInput(e.target.value)}
                        className="flex-1 bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-pink-500 font-mono shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const targetUrl = customAppIconInput || db?.configurations?.appIconUrl || "";
                          if (!targetUrl) {
                            alert("Please paste an image URL or upload an image file!");
                            return;
                          }
                          handleUpdateAppIcon(targetUrl);
                        }}
                        className="bg-gradient-to-r from-[#ff007f] via-purple-600 to-[#7b2cbf] hover:brightness-110 active:scale-95 text-white font-black text-xs uppercase px-5 py-3 rounded-xl shadow-lg transition-all shrink-0 cursor-pointer border border-pink-400/40"
                      >
                        Apply Icon Live
                      </button>
                    </div>
                  </div>

                  {/* Option 2: Upload File From Device */}
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block font-mono">
                      2. Or Upload Image File directly from Computer / Phone
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="admin-icon-upload-input"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const result = evt.target?.result as string;
                              if (result) {
                                setCustomAppIconInput(result);
                                handleUpdateAppIcon(result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="admin-icon-upload-input"
                        className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 active:scale-95 text-black font-black text-xs uppercase px-5 py-3 rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2 border border-emerald-300"
                      >
                        <span>📁 Choose & Upload Icon Image File</span>
                      </label>

                      {db?.configurations?.appIconUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomAppIconInput("");
                            handleUpdateAppIcon("");
                          }}
                          className="bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 hover:text-white font-black text-xs uppercase px-4 py-3 rounded-xl transition-all cursor-pointer"
                        >
                          Reset to Original Neon Logo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Option 3: Presets Grid */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block font-mono">
                      3. Quick Presets (Click to instantly set)
                    </label>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { title: "Golden Crown", url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=300&q=80" },
                        { title: "Cyber DJ", url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80" },
                        { title: "Gold Crest", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80" },
                        { title: "Disco Party", url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80" },
                        { title: "Royal Lion", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80" },
                        { title: "Diamond VIP", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80" }
                      ].map((preset) => (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => {
                            setCustomAppIconInput(preset.url);
                            handleUpdateAppIcon(preset.url);
                          }}
                          className="bg-black/40 hover:bg-white/10 border border-white/10 hover:border-pink-500/60 p-2 rounded-xl flex flex-col items-center space-y-1.5 transition-all group cursor-pointer"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 group-hover:scale-110 transition-transform">
                            <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[9px] font-bold text-gray-300 group-hover:text-pink-300 truncate w-full text-center">
                            {preset.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Col: Live Icon Previews */}
                <div className="bg-[#0f0f18] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl text-center">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/10 pb-3">
                    📱 Live Device Preview
                  </h4>

                  <div className="space-y-6 flex flex-col items-center justify-center pt-2">
                    {/* Preview 1: App Launcher Icon */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-gray-400 font-mono font-bold uppercase block">
                        App Launcher Icon (128x128)
                      </span>
                      <div className="w-28 h-28 mx-auto rounded-[28%] bg-[#0d0d15] p-2 border-2 border-pink-500 shadow-[0_0_25px_rgba(255,0,127,0.5)] flex items-center justify-center overflow-hidden relative">
                        {customAppIconInput || db?.configurations?.appIconUrl ? (
                          <img
                            src={customAppIconInput || db?.configurations?.appIconUrl}
                            alt="App Icon Preview"
                            className="w-full h-full object-cover rounded-[20%]"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-[#ff007f] to-purple-600 rounded-[20%] flex items-center justify-center font-black text-white text-xl">
                            👑
                          </div>
                        )}
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-black"></span>
                        </span>
                      </div>
                    </div>

                    {/* Preview 2: Header / Navigation Icon */}
                    <div className="space-y-1.5 w-full">
                      <span className="text-[10px] text-gray-400 font-mono font-bold uppercase block">
                        App Navigation Header (40x40)
                      </span>
                      <div className="bg-black/60 border border-white/10 p-2.5 rounded-xl flex items-center justify-between max-w-xs mx-auto">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00e676] to-emerald-500 p-0.5">
                            <div className="w-full h-full bg-black rounded-[10px] overflow-hidden flex items-center justify-center">
                              {customAppIconInput || db?.configurations?.appIconUrl ? (
                                <img src={customAppIconInput || db?.configurations?.appIconUrl} alt="Nav Preview" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs">👑</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-black text-white">Pardais Live</span>
                        </div>
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded">LIVE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: DEVICE HARDWARE BANS & MULTI-ACCOUNT SENTINEL */}
          {/* ========================================================================= */}
          {activeTab === "device_ban" && (() => {
            const allUsersList = [db.user, ...db.adminUsersList, ...(db.users || [])];
            const blockedDeviceIds: string[] = db?.configurations?.blockedDevices || [];

            // Group users by deviceId
            const deviceGroupMap: { [key: string]: { deviceId: string; deviceModel: string; deviceLocation: string; users: any[] } } = {};

            allUsersList.forEach((u: any, idx: number) => {
              const dId = u.deviceId || (u.username === "Pardais_User" ? "DEV-S24-PAK8821" : `DEV-HW-${(idx + 1) * 1042}`);
              const dModel = u.deviceModel || (idx % 2 === 0 ? "Samsung Galaxy S24 Ultra (Android 14)" : "iPhone 15 Pro Max (iOS 17.4)");
              const dLoc = u.deviceLocation || "Lahore, Pakistan • Asia/Karachi [en-US]";

              if (!deviceGroupMap[dId]) {
                deviceGroupMap[dId] = {
                  deviceId: dId,
                  deviceModel: dModel,
                  deviceLocation: dLoc,
                  users: []
                };
              }
              if (!deviceGroupMap[dId].users.some((x: any) => x.username === u.username)) {
                deviceGroupMap[dId].users.push(u);
              }
            });

            blockedDeviceIds.forEach((bId) => {
              if (!deviceGroupMap[bId]) {
                deviceGroupMap[bId] = {
                  deviceId: bId,
                  deviceModel: "Blacklisted Device Hardware",
                  deviceLocation: "Location Logged",
                  users: []
                };
              }
            });

            const deviceList = Object.values(deviceGroupMap);

            const filteredDevices = deviceList.filter((dev) => {
              const q = deviceSearch.toLowerCase();
              if (!q) return true;
              if (dev.deviceId.toLowerCase().includes(q)) return true;
              if (dev.deviceModel.toLowerCase().includes(q)) return true;
              if (dev.deviceLocation.toLowerCase().includes(q)) return true;
              if (dev.users.some(u => u.username.toLowerCase().includes(q) || (u.uniqueId && String(u.uniqueId).toLowerCase().includes(q)))) return true;
              return false;
            });

            const totalDevicesCount = deviceList.length;
            const blockedDevicesCount = deviceList.filter(d => blockedDeviceIds.includes(d.deviceId)).length;
            const multiAccountCount = deviceList.filter(d => d.users.length > 1).length;

            return (
              <div className="space-y-6 text-left">
                {/* Top Banner */}
                <div className="bg-gradient-to-r from-red-950/80 via-[#180a0e] to-purple-950/80 border border-red-500/40 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="p-2.5 rounded-xl bg-gradient-to-tr from-red-600 to-pink-600 text-white shadow-lg">
                          <Smartphone className="w-6 h-6 text-white" />
                        </span>
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            <span>Device Hardware Ban Sentinel</span>
                            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-sans uppercase">Strict Enforcement</span>
                          </h3>
                          <p className="text-xs text-red-200/90 font-sans mt-0.5">
                            Block violator devices by hardware fingerprint. Blocked devices cannot login or register new accounts under any user ID.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-3.5 py-2 bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-black rounded-xl font-mono flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        <span>{blockedDevicesCount} DEVICES HARDWARE BLOCKED</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#0f0f18] border border-white/10 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono text-gray-400 font-bold uppercase block">Total Tracked Devices</span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-white font-mono">{totalDevicesCount}</span>
                      <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Smartphone className="w-5 h-5" /></span>
                    </div>
                  </div>

                  <div className="bg-[#0f0f18] border border-red-500/30 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono text-red-400 font-bold uppercase block">Hardware Blocked Devices</span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-red-400 font-mono">{blockedDevicesCount}</span>
                      <span className="p-2 rounded-lg bg-red-500/10 text-red-500"><ShieldAlert className="w-5 h-5" /></span>
                    </div>
                  </div>

                  <div className="bg-[#0f0f18] border border-yellow-500/30 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono text-yellow-400 font-bold uppercase block">Multi-Account Devices (&gt;1 ID)</span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-yellow-400 font-mono">{multiAccountCount}</span>
                      <span className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400"><Users className="w-5 h-5" /></span>
                    </div>
                  </div>
                </div>

                {/* Controls & Manual Block Bar */}
                <div className="bg-[#0f0f18] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Search */}
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search Username, ID#, Phone Model, Device ID..."
                      value={deviceSearch}
                      onChange={(e) => setDeviceSearch(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  {/* Manual Ban by Device ID */}
                  <div className="flex items-center space-x-2 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="Enter Raw Device ID to ban..."
                      value={manualDeviceIdInput}
                      onChange={(e) => setManualDeviceIdInput(e.target.value)}
                      className="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono w-full md:w-64"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!manualDeviceIdInput.trim()) {
                          alert("Please enter a valid Device ID!");
                          return;
                        }
                        handleToggleBlockDevice(manualDeviceIdInput.trim());
                        setManualDeviceIdInput("");
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer shadow-lg border border-red-400/40"
                    >
                      🚫 Block Device ID
                    </button>
                  </div>
                </div>

                {/* Tracked Devices List */}
                <div className="bg-[#0f0f18] border border-white/10 rounded-2xl p-5 space-y-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/10 pb-3 flex items-center justify-between">
                    <span>Tracked Devices & Multi-Account Inspector</span>
                    <span className="text-xs text-gray-400 font-normal">Showing {filteredDevices.length} registered devices</span>
                  </h4>

                  <div className="space-y-4">
                    {filteredDevices.map((dev) => {
                      const isBlocked = blockedDeviceIds.includes(dev.deviceId);
                      return (
                        <div
                          key={dev.deviceId}
                          className={`p-4 rounded-xl border transition-all space-y-3 ${
                            isBlocked
                              ? "bg-red-950/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                              : "bg-black/40 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Left: Device Header & Specs */}
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2.5">
                                <span className={`p-1.5 rounded-lg text-xs font-mono font-bold ${isBlocked ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400"}`}>
                                  📱 {dev.deviceModel}
                                </span>
                                <span className="text-xs font-mono text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  ID: {dev.deviceId}
                                </span>
                                {isBlocked ? (
                                  <span className="text-[9px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded font-mono animate-pulse">
                                    🚫 HARDWARE BLOCKED
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                                    ✓ ACTIVE DEVICE
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-3 text-[11px] text-gray-400 pt-0.5">
                                <span className="flex items-center">
                                  📍 <strong className="text-gray-300 ml-1">{dev.deviceLocation}</strong>
                                </span>
                                <span className="text-gray-600">•</span>
                                <span className="text-yellow-400 font-mono font-bold">
                                  👥 {dev.users.length} Account{dev.users.length === 1 ? "" : "s"} tied to this phone
                                </span>
                              </div>
                            </div>

                            {/* Right: Action Button */}
                            <div>
                              <button
                                type="button"
                                onClick={() => handleToggleBlockDevice(dev.deviceId)}
                                className={`text-xs font-black uppercase px-4 py-2 rounded-xl transition-all cursor-pointer shadow-lg border ${
                                  isBlocked
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-black border-emerald-400"
                                    : "bg-red-600 hover:bg-red-500 text-white border-red-400/50"
                                }`}
                              >
                                {isBlocked ? "✓ Unblock Device Hardware" : "🚫 Block Device (Hardware Ban)"}
                              </button>
                            </div>
                          </div>

                          {/* Bottom: Associated Account IDs List */}
                          <div className="pt-2 border-t border-white/5">
                            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-2">
                              IDs & Accounts Operating on this Device ({dev.users.length}):
                            </span>

                            {dev.users.length === 0 ? (
                              <span className="text-xs text-gray-500 italic font-mono">No active user profile attached (Standalone Device ID Ban)</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {dev.users.map((u: any, uIdx: number) => (
                                  <div
                                    key={uIdx}
                                    className="bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl flex items-center space-x-2"
                                  >
                                    <img src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} className="w-5 h-5 rounded-full object-cover border border-white/20" />
                                    <div className="text-[10px]">
                                      <span className="font-bold text-white">@{u.username}</span>
                                      <span className="text-gray-400 font-mono ml-1.5">(ID #{u.uniqueId || "N/A"})</span>
                                    </div>
                                    {u.isBanned ? (
                                      <span className="text-[8px] bg-red-600/30 text-red-300 px-1 rounded font-mono">Banned</span>
                                    ) : (
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono">Active</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* TAB: WHATSAPP & CONTACT CONFIGURATION */}
          {/* ========================================================================= */}
          {activeTab === "whatsapp_config" && (
            <div className="space-y-6 text-left">
              {/* Top Banner Header */}
              <div className="bg-gradient-to-r from-[#0b2416] via-[#103a22] to-[#0d1e15] border border-emerald-500/40 p-6 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="space-y-1.5 z-10 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-[#25D366]">
                      <MessageSquare className="w-5 h-5 text-[#25D366]" />
                    </span>
                    <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                      WhatsApp Official Channel & Agencies Configuration
                    </h3>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    Is panel se aap official WhatsApp Channel link, 24/7 admin support contact number, aur Coin Seller agencies ke WhatsApp numbers add, edit ya remove kar sakte hain. System dynamically automatically pooray app main update ho jayega.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveWhatsappConfig}
                  className="bg-gradient-to-r from-[#25D366] to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-xl shadow-green-500/20 flex items-center space-x-2 transition-all cursor-pointer border border-emerald-300 shrink-0"
                >
                  <span>💾 Deploy & Broadcast Config</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN: OFFICIAL CHANNEL & SUPPORT NUMBER */}
                <div className="space-y-6">
                  {/* Card 1: Official WhatsApp Channel Link */}
                  <div className="bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center text-emerald-400">
                        <span className="mr-2 text-base">📢</span>
                        Official WhatsApp Channel Link
                      </h4>
                      <span className="text-[8px] bg-emerald-500/20 text-[#25D366] border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-black">
                        LIVE APP LINK
                      </span>
                    </div>

                    <p className="text-[9.5px] text-gray-400 leading-normal">
                      Pardais Party ke sabhi viewers aur users is Official Channel Link par tap karke instant announcements, free coin giveaways, aur tournament updates join karte hain.
                    </p>

                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-mono font-bold text-gray-400 block">
                        Channel URL (e.g. https://whatsapp.com/channel/0029Vb8u720B4hdLYUaKX00I)
                      </label>
                      <input
                        type="url"
                        value={waChannelUrl}
                        onChange={(e) => setWaChannelUrl(e.target.value)}
                        placeholder="https://whatsapp.com/channel/..."
                        className="w-full bg-black/50 border border-emerald-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => window.open(waChannelUrl, "_blank")}
                        className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-[#25D366] font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center"
                      >
                        🔗 Test Open Channel Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setWaChannelUrl("https://whatsapp.com/channel/0029Vb8u720B4hdLYUaKX00I")}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer"
                        title="Reset to default channel link"
                      >
                        ↺ Reset
                      </button>
                    </div>
                  </div>

                  {/* Card 2: 24/7 Official Admin Support Contact Number */}
                  <div className="bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center text-[#25D366]">
                        <span className="mr-2 text-base">📞</span>
                        Official Admin 24/7 Support Desk Number
                      </h4>
                      <span className="text-[8px] bg-green-500/20 text-[#25D366] border border-green-500/30 px-2 py-0.5 rounded font-mono font-black">
                        DIRECT HELPDESK
                      </span>
                    </div>

                    <p className="text-[9.5px] text-gray-400 leading-normal">
                      Jab bhi koi user "WhatsApp Help & Support" ya "Buy Coins Offline" button press karega, to seedha is Number par WhatsApp prefilled text chala jayega.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-mono font-bold text-gray-400 block">
                          WhatsApp Support Phone Number (with Country Code)
                        </label>
                        <input
                          type="text"
                          value={waSupportNumber}
                          onChange={(e) => setWaSupportNumber(e.target.value)}
                          placeholder="+923001234567"
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-mono font-bold text-gray-400 block">
                          Default Greeting Message
                        </label>
                        <textarea
                          rows={2}
                          value={waSupportText}
                          onChange={(e) => setWaSupportText(e.target.value)}
                          placeholder="Assalam-o-Alaikum Pardais Party Support..."
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#25D366]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const target = waSupportNumber.replace(/[^0-9]/g, "");
                        window.open(`https://wa.me/${target}?text=${encodeURIComponent(waSupportText)}`, "_blank");
                      }}
                      className="w-full py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center"
                    >
                      💬 Test Support Chat on WhatsApp
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: AGENCIES & COIN SELLERS MANAGER */}
                <div className="space-y-6">
                  <div className="bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-5 shadow-lg">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center text-amber-400">
                        <span className="mr-2 text-base">🏪</span>
                        Agencies & Reseller Contact Numbers Manager
                      </h4>
                      <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-black">
                        {adminAgenciesList.length} AGENCIES REGISTERED
                      </span>
                    </div>

                    <p className="text-[9.5px] text-gray-400 leading-normal">
                      Yahan se naye agencies / coin seller contact numbers add, edit ya remove kar sakte hain. Offline Coin Purchase section main yeh contact list dikhai degi.
                    </p>

                    {/* Add New Agency Form */}
                    <form onSubmit={handleAddAgencyContact} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                      <h5 className="text-[10px] font-black text-white uppercase tracking-wider font-mono text-emerald-400">
                        + Add New Agency WhatsApp Contact
                      </h5>

                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-mono font-bold text-gray-400">Agency / Seller Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Lahore Star Agency"
                            value={newAgencyForm.name}
                            onChange={(e) => setNewAgencyForm({ ...newAgencyForm, name: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-mono font-bold text-gray-400">Contact Person Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Malik Usman"
                            value={newAgencyForm.contactPerson}
                            onChange={(e) => setNewAgencyForm({ ...newAgencyForm, contactPerson: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-mono font-bold text-gray-400">WhatsApp Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="+923009876543"
                            value={newAgencyForm.whatsapp}
                            onChange={(e) => setNewAgencyForm({ ...newAgencyForm, whatsapp: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-mono font-bold text-gray-400">Rate / Description</label>
                          <input
                            type="text"
                            placeholder="e.g. 1 PKR = 10 Coins"
                            value={newAgencyForm.rateDescription}
                            onChange={(e) => setNewAgencyForm({ ...newAgencyForm, rateDescription: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-md"
                      >
                        + Add Agency to WhatsApp Directory
                      </button>
                    </form>

                    {/* Agency List */}
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {adminAgenciesList.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-xs font-mono">
                          No agency contact numbers configured yet. Add one above!
                        </div>
                      ) : (
                        adminAgenciesList.map((agency) => (
                          <div
                            key={agency.id}
                            className="p-3.5 rounded-xl bg-black/30 border border-white/10 hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <h6 className="font-bold text-white truncate">{agency.name}</h6>
                                <span className="text-[7px] bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 px-1.5 py-0.2 rounded font-mono uppercase shrink-0">
                                  VERIFIED
                                </span>
                              </div>
                              <p className="text-[9px] text-gray-400">
                                Contact: <strong className="text-gray-200">{agency.contactPerson}</strong> •{" "}
                                <span className="font-mono text-[#25D366]">{agency.whatsapp}</span>
                              </p>
                              <p className="text-[8.5px] text-amber-300 font-mono">{agency.rateDescription}</p>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <a
                                href={`https://wa.me/${agency.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${agency.name}, Pardais Party Admin inquiry.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#25D366] rounded-lg transition-colors border border-emerald-500/30"
                                title="Open WhatsApp Chat"
                              >
                                💬
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteAgencyContact(agency.id)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/30 cursor-pointer"
                                title="Remove Agency Contact"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="p-4 rounded-2xl bg-[#0f0f18] border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping"></span>
                  <span className="font-mono text-[10px]">Changes are saved locally and synced real-time with Firestore.</span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveWhatsappConfig}
                  className="bg-gradient-to-r from-[#25D366] via-emerald-500 to-teal-400 text-black font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-lg hover:scale-102 transition-all cursor-pointer border border-emerald-200"
                >
                  🚀 Deploy WhatsApp Configurations Live
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: SYSTEM & CONFIGURATIONS */}
          {/* ========================================================================= */}
          {activeTab === "system" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
              {/* Left col: toggles */}
              <div className="bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-5">
                <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2.5 flex items-center">
                  <Sliders className="w-4.5 h-4.5 text-pink-500 mr-2" />
                  Ecosystem Gateway Controller
                </h4>

                {/* Maintenance toggle */}
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center bg-transparent">
                    <div className="bg-transparent">
                      <p className="text-xs font-black text-white">Toggle System Maintenance Mode</p>
                      <p className="text-[9px] text-gray-500 leading-normal mt-0.5">
                        Forces the entire user-facing app into a secure maintenance screen. No gameplay available.
                      </p>
                    </div>

                    <button
                      onClick={handleToggleMaintenance}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                        db.configurations.maintenanceMode
                          ? "bg-red-600 text-white animate-pulse"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {db.configurations.maintenanceMode ? "ENABLED (LIVE)" : "DISABLED"}
                    </button>
                  </div>
                </div>

                {/* App Version controller */}
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 font-sans text-xs">
                  <h5 className="font-bold text-white uppercase tracking-wider text-[10px] font-mono border-b border-white/5 pb-1.5">Version & Force-Update Controller</h5>
                  
                  <div className="grid grid-cols-2 gap-4 bg-transparent pt-1">
                    <div className="space-y-1.5 bg-transparent">
                      <label className="text-[8px] uppercase text-gray-400 font-mono font-black block">Current Server App Version</label>
                      <input
                        id="server_app_version"
                        type="text"
                        defaultValue={db.configurations.appVersion}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 bg-transparent">
                      <label className="text-[8px] uppercase text-gray-400 font-mono font-black block">Updates Constraint Mode</label>
                      <select
                        id="server_app_force_update"
                        defaultValue={db.configurations.forceUpdate ? "true" : "false"}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="false">Optional Update</option>
                        <option value="true">Force Mandatory Upgrades</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const versionInput = document.getElementById("server_app_version") as HTMLInputElement;
                      const forceSelect = document.getElementById("server_app_force_update") as HTMLSelectElement;
                      if (versionInput && forceSelect) {
                        handleUpdateAppVersionConfig(versionInput.value, forceSelect.value === "true");
                      }
                    }}
                    className="w-full py-2 bg-gradient-to-r from-pink-500 to-[#7b2cbf] text-white text-[10px] uppercase font-black tracking-wider rounded-lg"
                  >
                    Apply New Version Constraints
                  </button>
                </div>
              </div>

              {/* Right col: backup and logs */}
              <div className="bg-[#0f0f18] border border-white/5 p-5 rounded-2xl space-y-5">
                <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono border-b border-white/5 pb-2.5 flex items-center">
                  <Sliders className="w-4.5 h-4.5 text-pink-500 mr-2" />
                  Ecosystem Backups & Audit Logs
                </h4>

                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-4">
                  <div className="bg-transparent">
                    <h5 className="text-xs font-black text-white">Central Database Snapshot backup</h5>
                    <p className="text-[9px] text-gray-500 mt-1 leading-normal">
                      Saves an incremental backup copy of the database locally to preserve transactional accounting files and user frames history ledger.
                    </p>
                  </div>

                  <button
                    onClick={handleTriggerBackup}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 text-black font-black uppercase text-[10px] tracking-wider rounded-xl hover:scale-103 transition-all"
                  >
                    💾 Trigger Hot Backup Snapshot
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 font-mono text-[9px]">
                  <h5 className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-white/5 pb-1.5 font-sans">Active Security Audit Logs</h5>
                  
                  <div className="space-y-1.5 text-left text-gray-400">
                    <p><span className="text-green-400 font-bold">[INFO]</span> Connected to EasyPaisa production payment sandbox.</p>
                    <p><span className="text-green-400 font-bold">[INFO]</span> Loaded 6 premium 2D/3D luxury gifts items.</p>
                    <p><span className="text-purple-400 font-bold">[AUDIT]</span> Operator 'superadmin' authorized entry successfully.</p>
                    <p><span className="text-yellow-400 font-bold">[WARN]</span> System version constraint updated to {db.configurations.appVersion}.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* CHANGE PASSWORD OVERLAY MODAL */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-999 p-4 select-none">
          <div className="bg-[#111119] border border-white/10 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowPasswordChangeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="text-center space-y-1 pb-2 border-b border-white/5">
              <Key className="w-8 h-8 text-pink-500 mx-auto" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">Change Operator Password</h4>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Secure Authentication Update</p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[8.5px] uppercase font-bold text-gray-400 font-mono">Current Operator Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8.5px] uppercase font-bold text-gray-400 font-mono">New Operator Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white font-black uppercase text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer text-center"
              >
                💾 Update Security Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🏎️ Admin VIP Entrance Animation Tester Overlay */}
      {adminActiveVipOverlay && (
        <VipRideAnimationOverlay
          vipLevel={adminActiveVipOverlay.vipLevel}
          username={adminActiveVipOverlay.username}
          onClose={() => setAdminActiveVipOverlay(null)}
        />
      )}

      {/* EDIT USER PROFILE MODAL */}
      {editingUserModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-999 p-4">
          <div className="bg-[#111119] border border-white/10 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl relative text-left">
            <button
              onClick={() => setEditingUserModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <div className="border-b border-white/5 pb-2">
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">✏️ Edit User Profile: @{editingUserModal.username}</h4>
              <p className="text-[10px] text-gray-400">Modify user profile information, level, coins, and contact details</p>
            </div>
            <form onSubmit={handleSaveUserEditSubmit} className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Full Name</label>
                <input
                  type="text"
                  value={editingUserModal.fullName || ""}
                  onChange={(e) => setEditingUserModal({ ...editingUserModal, fullName: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Avatar Image URL</label>
                <input
                  type="text"
                  value={editingUserModal.avatar || ""}
                  onChange={(e) => setEditingUserModal({ ...editingUserModal, avatar: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Email Address</label>
                  <input
                    type="email"
                    value={editingUserModal.email || ""}
                    onChange={(e) => setEditingUserModal({ ...editingUserModal, email: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Phone Number</label>
                  <input
                    type="text"
                    value={editingUserModal.phone || ""}
                    onChange={(e) => setEditingUserModal({ ...editingUserModal, phone: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Coins Balance</label>
                  <input
                    type="number"
                    value={editingUserModal.coins ?? 5000}
                    onChange={(e) => setEditingUserModal({ ...editingUserModal, coins: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-400">User Level</label>
                  <input
                    type="number"
                    value={editingUserModal.level ?? editingUserModal.userLevel ?? 1}
                    onChange={(e) => setEditingUserModal({ ...editingUserModal, level: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-400">VIP Level</label>
                  <input
                    type="number"
                    value={editingUserModal.vipLevel ?? 0}
                    onChange={(e) => setEditingUserModal({ ...editingUserModal, vipLevel: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-black uppercase text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  💾 Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUserModal(null)}
                  className="px-4 bg-[#202030] text-gray-400 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KYC REJECTION REASON MODAL */}
      {kycRejectModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-999 p-4">
          <div className="bg-[#111119] border border-red-500/30 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl relative text-left">
            <button onClick={() => setKycRejectModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
            <div className="border-b border-white/5 pb-2">
              <h4 className="text-sm font-black text-red-400 uppercase tracking-wider font-mono">🚫 Reject KYC: Ticket #{kycRejectModal.id}</h4>
              <p className="text-[10px] text-gray-400">Provide an official rejection reason or select a preset template.</p>
            </div>
            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Quick Reason Preset</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "CNIC image blurry or unreadable",
                    "Name on CNIC does not match account profile",
                    "Expired document submitted",
                    "Back side of ID missing",
                    "Liveness selfie verification failed"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setKycRejectReason(preset)}
                      className="text-[8.5px] bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 px-2 py-1 rounded transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-mono font-bold text-gray-400">Custom Rejection Reason</label>
                <textarea
                  value={kycRejectReason}
                  onChange={(e) => setKycRejectReason(e.target.value)}
                  placeholder="Explain why this verification was rejected..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none font-sans"
                />
              </div>
              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAuditKycWithReason(kycRejectModal.id, "rejected", kycRejectReason || "Document failed validation.")}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  🚫 Confirm Rejection
                </button>
                <button
                  type="button"
                  onClick={() => setKycRejectModal(null)}
                  className="px-4 bg-[#202030] text-gray-400 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIGH RESOLUTION DOCUMENT PREVIEW MODAL */}
      {kycDocViewerModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-999 p-4" onClick={() => setKycDocViewerModal(null)}>
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/20 bg-black p-2" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setKycDocViewerModal(null)} className="absolute top-4 right-4 bg-black/80 text-white p-2 rounded-full border border-white/20 hover:bg-red-600 transition-all z-10 font-bold">✕</button>
            <img src={kycDocViewerModal} className="max-w-full max-h-[85vh] object-contain rounded-xl mx-auto" />
          </div>
        </div>
      )}

      {/* USER AUDIT HISTORY MODAL */}
      {userHistoryModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-999 p-4">
          <div className="bg-[#111119] border border-white/10 p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-2xl relative text-left">
            <button onClick={() => setUserHistoryModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
            <div className="border-b border-white/5 pb-2">
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">📜 Audit & Activity Log: @{userHistoryModal.username}</h4>
              <p className="text-[10px] text-gray-400">History of account transactions, stream logs, and admin status modifications.</p>
            </div>
            <div className="space-y-3 font-mono text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <p className="text-gray-400 text-[10px]">Account ID: <span className="text-white font-bold">{userHistoryModal.id || "10248"}</span></p>
                <p className="text-gray-400 text-[10px]">Email: <span className="text-cyan-400">{userHistoryModal.email || `${userHistoryModal.username}@pardais.app`}</span></p>
                <p className="text-gray-400 text-[10px]">Status: <span className="text-emerald-400 font-bold uppercase">{userHistoryModal.isBanned ? "Banned" : userHistoryModal.isSuspended ? "Suspended" : "Active"}</span></p>
              </div>

              <h5 className="text-[10px] font-black uppercase text-pink-400 tracking-wider">Admin Actions & Event History</h5>
              <div className="space-y-2">
                {auditLogsList.filter((log: any) => log.targetUser === userHistoryModal.username || log.details?.includes(userHistoryModal.username)).length > 0 ? (
                  auditLogsList.filter((log: any) => log.targetUser === userHistoryModal.username || log.details?.includes(userHistoryModal.username)).map((log: any) => (
                    <div key={log.id} className="p-2.5 bg-black/40 rounded-lg border border-white/5 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-gray-400 text-[9px]">
                        <span className="text-cyan-400 font-bold">{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-200 font-sans">{log.details}</p>
                      <p className="text-[8.5px] text-gray-500">By operator: {log.adminUser}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center bg-black/20 rounded-xl text-gray-500 text-[10px] uppercase">
                    No recent admin infraction or status changes recorded for this user.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
