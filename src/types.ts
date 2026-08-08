export enum GiftType {
  TWO_D = "2d",
  THREE_D = "3d",
  LUXURY = "luxury"
}

export interface Gift {
  id: string;
  name: string;
  cost: number;
  type: GiftType;
  icon: string; // Lucide icon name or emoji
  color: string; // Tailwind bg color class
  animationClass: string; // CSS animation descriptor
  // Advanced fields for Pardais Party Gift System
  description?: string;
  category?: string; // Popular, New, Lucky, VIP, Festival, Premium, Luxury, Event, PK, Limited Edition
  animationFile?: string; // SVG path, SVGA url, or transparent WebM
  animationFormat?: 'svg' | 'svga' | 'webm' | 'lottie' | 'mp4' | 'gif';
  animationDuration?: number; // 5, 10, 15, 30, custom
  animationDisplayType?: 'small' | 'half' | 'full' | 'ultra' | 'pk' | 'event';
  comboSupported?: boolean;
  status?: 'active' | 'inactive';
  featured?: boolean;
  limited?: boolean;
  vipOnly?: boolean;
  pkOnly?: boolean;
  eventOnly?: boolean;
  soundEffect?: string;
  priority?: number;
  sortingOrder?: number;
  isFavorite?: boolean; // client-side state / toggle
}

export interface UserProfile {
  uid?: string;
  email?: string;
  username: string;
  uniqueId: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
  gender: string;
  country: string;
  language: string;
  coins: number;
  diamonds: number;
  vipLevel: number;
  userLevel: number;
  hostLevel: number;
  wealthLevel: number;
  xp: number;
  familyId: string | null;
  agencyId: string | null;
  isVerified: boolean;
  isBanned: boolean;
  twoFactorEnabled: boolean;
  fullName?: string;
  dob?: string;
  phoneNumber?: string;
  followersCount?: number;
  followingCount?: number;
  totalLikesCount?: number;
  kycStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  kycDocumentType?: 'id_card' | 'passport';
  kycIdFront?: string;
  kycIdBack?: string;
  kycFaceVerified?: boolean;
  selectedFrameId?: string | null;
  vipSuspended?: boolean;
  deviceId?: string;
  deviceModel?: string;
  deviceLocation?: string;
  lastIp?: string;
}

export interface DeviceRecord {
  deviceId: string;
  deviceModel: string;
  deviceLocation: string;
  associatedUserIds: string[];
  associatedUsernames: string[];
  lastActive: string;
  isBlocked: boolean;
  blockedAt?: string;
  blockedReason?: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  vipLevel: number;
  userLevel: number;
  badge?: string;
  isSystem: boolean;
  isFlagged: boolean;
  flagReason?: string;
  translated?: string;
  timestamp: string;
}

export interface HostProfile {
  id: string;
  name: string;
  hostUsername?: string;
  username?: string;
  uniqueId?: string;
  channelName?: string;
  role: string;
  avatar: string;
  hostAvatar?: string;
  viewers: number;
  likes: number;
  category: "video" | "audio" | "pk";
  subCategory?: string;
  status?: string;
  isLive: boolean;
  statusText: string;
  bio: string;
  agencyId: string;
  level?: number;
  hostLevel?: number;
  inPk?: boolean;
  pkActive?: boolean;
  pkScoreHost?: number;
  pkScoreOpponent?: number;
  isDemoHost?: boolean;
  coHostUsername?: string;
  coHostName?: string;
  coHostAvatar?: string;
  opponentName?: string;
  opponentAvatar?: string;
  cameraEnabled?: boolean;
  isCamOff?: boolean;
  cameraMuted?: boolean;
  coHostCamOff?: boolean;
  coverPhoto?: string;
  showCoverPhoto?: boolean;
}

export interface PKBattle {
  isActive: boolean;
  opponentName: string;
  opponentAvatar: string;
  hostScore: number;
  opponentScore: number;
  timer: number; // in seconds
  mvp: string;
  punishment: string;
}

export interface Family {
  id: string;
  name: string;
  leader: string;
  members: number;
  rank: number;
  avatar: string;
  description: string;
}

export interface Agency {
  id: string;
  name: string;
  registeredHosts: number;
  monthlyCommission: number;
  salaryRate: string;
  ownerEmail: string;
}

export interface Transaction {
  id: string;
  type: "recharge" | "withdraw" | "gift_sent" | "gift_received" | "salary";
  amount: number;
  currency: "coins" | "diamonds" | "USD";
  timestamp: string;
  status: "Completed" | "Pending" | "Failed";
  details: string;
}

export interface LiveAnnouncement {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

export interface KycRequest {
  id: string;
  username: string;
  fullName: string;
  dob: string;
  phoneNumber: string;
  documentType: "id_card" | "passport";
  idFront: string;
  idBack: string;
  faceVerified: boolean;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
}

export interface UserStory {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  type: "text" | "photo" | "video";
  content: string;
  bgColor?: string;
  caption?: string;
  createdAt: number;
  expiresAt: number;
  likes: number;
  likedBy: string[];
  reactions: Array<{ username: string; emoji: string }>;
  replies: Array<{ id: string; username: string; fullName: string; avatar: string; text: string; createdAt: number }>;
}

