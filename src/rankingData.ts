import { dbDataCache } from "./db/firebaseDb";
import { getInitialAvatarData } from "./lib/avatarFallback";
import { getHostLevelFromName, getVipLevelFromUserLevel } from "./levelUtils";

export interface RankItem {
  rank: number;
  name: string;
  avatar: string;
  score: number; // Diamonds for host, Coins for gifter
  level: number;
  vipLevel: number;
  isLive?: boolean;
}

export function getRankingData(
  type: "host" | "gifter", 
  period: "hourly" | "daily" | "weekly" | "monthly",
  customUsersList?: any[]
): RankItem[] {
  const usersToRank: any[] = customUsersList && customUsersList.length > 0
    ? customUsersList
    : (Array.isArray(dbDataCache?.users) && dbDataCache.users.length > 0 ? dbDataCache.users : []);

  // Include current user if available in cache
  const currentUser = dbDataCache?.user;
  let combined = [...usersToRank];
  if (currentUser && !combined.some((u: any) => (u.uniqueId || u.username) === (currentUser.uniqueId || currentUser.username))) {
    combined.push(currentUser);
  }

  const items: RankItem[] = combined.map((u: any) => {
    let score = 0;
    if (type === "host") {
      score = Number(u.diamonds) || Number(u.totalLikesCount) || 0;
    } else {
      score = Number(u.coins) || (Number(u.xp) || 0);
    }

    const calculatedLevel = Number(u.userLevel || u.hostLevel) || getHostLevelFromName(u.username || u.fullName || "");
    const calculatedVip = Number(u.vipLevel) || getVipLevelFromUserLevel(calculatedLevel);

    return {
      rank: 0,
      name: u.fullName || u.username || "User",
      avatar: u.avatar || getInitialAvatarData(u.fullName || u.username),
      score,
      level: calculatedLevel,
      vipLevel: calculatedVip,
      isLive: !!u.isLive
    };
  });

  // Sort descending by score
  items.sort((a, b) => b.score - a.score);

  // Assign ranks
  items.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return items;
}
