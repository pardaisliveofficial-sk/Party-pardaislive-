import { UserProfile, SavedAccount } from "../types";
import { DEFAULT_USER } from "../data";

const ACCOUNTS_STORAGE_KEY = "pardais_device_accounts";

/**
 * Retrieve all accounts saved on this device.
 */
export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is SavedAccount => 
        Boolean(item && (item.uniqueId || item.username || item.uid))
      );
    }
  } catch (err) {
    console.warn("[AccountStorage] Error reading saved accounts:", err);
  }
  return [];
}

/**
 * Save or update an account in the device list.
 */
export function saveAccountToDevice(
  user: UserProfile,
  token?: string,
  authMethod?: "password" | "google" | "otp" | "demo"
): SavedAccount[] {
  if (typeof window === "undefined" || !user) return [];
  try {
    const existingAccounts = getSavedAccounts();
    const cleanUid = user.uid || user.uniqueId || `user_${Date.now()}`;
    const cleanUsername = user.username || `User_${cleanUid.slice(-4)}`;
    const cleanFullName = user.fullName || cleanUsername;
    const cleanEmail = user.email || "";
    const cleanAvatar = user.avatar || "";
    const cleanToken = token || localStorage.getItem("pardais_auth_token") || `token_${cleanUid}_${Date.now()}`;

    const newSavedAccount: SavedAccount = {
      uid: cleanUid,
      uniqueId: user.uniqueId || cleanUid,
      username: cleanUsername,
      fullName: cleanFullName,
      email: cleanEmail,
      avatar: cleanAvatar,
      token: cleanToken,
      userProfile: { ...user, avatar: cleanAvatar },
      lastActiveAt: Date.now(),
      coins: user.coins ?? 0,
      diamonds: user.diamonds ?? 0,
      vipLevel: user.vipLevel ?? 0,
      userLevel: user.userLevel ?? 1,
      authMethod: authMethod || (user.authProvider === "google" ? "google" : "password")
    };

    // Find existing account matching by uid, uniqueId, email or username
    const existingIndex = existingAccounts.findIndex(acc => 
      (cleanUid && acc.uid === cleanUid) ||
      (user.uniqueId && acc.uniqueId === user.uniqueId) ||
      (cleanEmail && acc.email && acc.email.toLowerCase() === cleanEmail.toLowerCase()) ||
      (cleanUsername && acc.username && acc.username.toLowerCase() === cleanUsername.toLowerCase())
    );

    let updatedList: SavedAccount[];
    if (existingIndex >= 0) {
      updatedList = [...existingAccounts];
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        ...newSavedAccount,
        lastActiveAt: Date.now()
      };
    } else {
      updatedList = [newSavedAccount, ...existingAccounts];
    }

    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedList));
    return updatedList;
  } catch (err) {
    console.warn("[AccountStorage] Error saving account to device:", err);
    return getSavedAccounts();
  }
}

/**
 * Remove an account from this device.
 */
export function removeAccountFromDevice(identifier: string): SavedAccount[] {
  if (typeof window === "undefined" || !identifier) return [];
  try {
    const list = getSavedAccounts();
    const updated = list.filter(acc => 
      acc.uid !== identifier && 
      acc.uniqueId !== identifier && 
      acc.username !== identifier &&
      acc.email !== identifier
    );
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("[AccountStorage] Error removing account from device:", err);
    return getSavedAccounts();
  }
}

/**
 * Generate predefined secondary/tertiary demo accounts for instant testing
 */
export function getDemoAccounts(): Array<{
  label: string;
  slot: number;
  user: UserProfile;
  token: string;
}> {
  return [
    {
      label: "2nd Account: Malik Bilal (VIP 3)",
      slot: 2,
      token: "pardais_demo_token_slot_2_malik",
      user: {
        ...DEFAULT_USER,
        uid: "demo_user_slot_2_bilal",
        uniqueId: "PARDAIS_99812",
        username: "Malik_Bilal",
        fullName: "Malik Bilal Official",
        email: "bilal.malik.live@gmail.com",
        avatar: "",
        coverPhoto: "",
        bio: "👑 Co-Host & PK King from Lahore | Pardais Talent ⭐",
        coins: 145000,
        diamonds: 32000,
        vipLevel: 3,
        userLevel: 14,
        hostLevel: 8,
        wealthLevel: 12,
        isVerified: true,
        gender: "Male",
        country: "Pakistan",
        language: "Urdu / Punjabi"
      }
    },
    {
      label: "3rd Account: Ayesha Khan (VIP 5)",
      slot: 3,
      token: "pardais_demo_token_slot_3_ayesha",
      user: {
        ...DEFAULT_USER,
        uid: "demo_user_slot_3_ayesha",
        uniqueId: "PARDAIS_77419",
        username: "Ayesha_Queen",
        fullName: "Ayesha Noor Khan",
        email: "ayesha.khan.party@gmail.com",
        avatar: "",
        coverPhoto: "",
        bio: "💎 Top Gifter & Audio Lounge Queen | Royal Family 👑",
        coins: 480000,
        diamonds: 95000,
        vipLevel: 5,
        userLevel: 28,
        hostLevel: 16,
        wealthLevel: 22,
        isVerified: true,
        gender: "Female",
        country: "Pakistan",
        language: "Urdu / English"
      }
    },
    {
      label: "4th Account: DJ Hamza Party (Host)",
      slot: 4,
      token: "pardais_demo_token_slot_4_hamza",
      user: {
        ...DEFAULT_USER,
        uid: "demo_user_slot_4_hamza",
        uniqueId: "PARDAIS_33102",
        username: "DJ_Hamza_Party",
        fullName: "Hamza Tariq DJ",
        email: "djhamza.official@gmail.com",
        avatar: "",
        coverPhoto: "",
        bio: "🎧 Late Night Remix & Urdu Anthems | Live Daily 10 PM 🎵",
        coins: 82000,
        diamonds: 64000,
        vipLevel: 2,
        userLevel: 19,
        hostLevel: 15,
        wealthLevel: 9,
        isVerified: true,
        gender: "Male",
        country: "Pakistan",
        language: "Urdu / Pashto"
      }
    }
  ];
}
