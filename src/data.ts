import { Gift, GiftType, HostProfile, UserProfile, Family, Agency } from "./types";

export const DEFAULT_USER: UserProfile = {
  username: "Pardais_User",
  uniqueId: "pardes_1001",
  avatar: "",
  coverPhoto: "",
  bio: "Welcome to Pardes Party! 🌟",
  gender: "Male",
  country: "Pakistan",
  language: "Urdu / Hinglish",
  coins: 0,
  diamonds: 0,
  vipLevel: 0,
  userLevel: 1,
  hostLevel: 1,
  wealthLevel: 1,
  xp: 0,
  familyId: "",
  agencyId: "",
  isVerified: false,
  isBanned: false,
  twoFactorEnabled: false,
  fullName: "",
  dob: "",
  phoneNumber: "",
  kycStatus: "none",
  followersCount: 0,
  followingCount: 0,
  totalLikesCount: 0
};

export const MOCK_GIFTS: Gift[] = [
  { id: "g-rose", name: "Red Rose", cost: 10, type: GiftType.TWO_D, icon: "🌹", color: "from-pink-500 to-rose-600", animationClass: "animate-bounce" },
  { id: "g-heart", name: "Love Heart", cost: 99, type: GiftType.TWO_D, icon: "💖", color: "from-red-500 to-pink-500", animationClass: "animate-pulse" },
  { id: "g-crown", name: "VIP Crown", cost: 999, type: GiftType.THREE_D, icon: "👑", color: "from-yellow-400 to-amber-600", animationClass: "animate-spin" },
  { id: "g-car", name: "Sports Car", cost: 4999, type: GiftType.LUXURY, icon: "🏎️", color: "from-blue-500 to-indigo-600", animationClass: "animate-bounce" },
  { id: "g-rocket", name: "Space Rocket", cost: 9999, type: GiftType.LUXURY, icon: "🚀", color: "from-purple-600 to-pink-600", animationClass: "animate-pulse" },
  { id: "g-dragon", name: "Golden Dragon", cost: 29999, type: GiftType.LUXURY, icon: "🐉", color: "from-amber-500 to-red-600", animationClass: "animate-bounce" }
];

export const MOCK_HOSTS: HostProfile[] = [];

export const MOCK_FAMILIES: Family[] = [];

export const MOCK_AGENCIES: Agency[] = [];

export const DAILY_MISSIONS = [
  { id: "m-1", title: "Double tap to send 100 Likes", xpReward: 50, coinsReward: 10, status: "Pending", current: 0, target: 100 },
  { id: "m-2", title: "Send any gift to a live host", xpReward: 100, coinsReward: 50, status: "Pending", current: 0, target: 1 },
  { id: "m-3", title: "Type 3 messages in Live Chat", xpReward: 40, coinsReward: 15, status: "Pending", current: 0, target: 3 },
  { id: "m-4", title: "Explore a premium Audio Room", xpReward: 60, coinsReward: 20, status: "Pending", current: 0, target: 1 },
  { id: "m-5", title: "Share Pardais Party host stream with friends", xpReward: 50, coinsReward: 25, status: "Pending", current: 0, target: 1 }
];

export const STATIC_COMMENTS_POOL: string[] = [];
