const DEFAULT_TTL_MINUTES = 30;
const DEFAULT_PLATFORM = "steam";
/** С v20 API лидерборды для PC требуют platform-region shard, не `steam`. */
const DEFAULT_LEADERBOARD_SHARD = "pc-eu";

function parseTTL(value: string | undefined): number {
  if (!value) {
    return DEFAULT_TTL_MINUTES;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_TTL_MINUTES;
  }

  return parsed;
}

function parseLeaderboardShard(value: string | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  return v || DEFAULT_LEADERBOARD_SHARD;
}

export type SpotlightRole = "streamer" | "esports";

export function isSpotlightRole(value: string): value is SpotlightRole {
  return value === "streamer" || value === "esports";
}

export type SpotlightAccount = {
  /** Нормализовано для сравнения с playerId / name из матча */
  key: string;
  /** Как ввели в UI */
  label: string;
  role: SpotlightRole;
};

export const appConfig = {
  pubgApiKey: process.env.PUBG_API_KEY ?? "",
  defaultPlatform: process.env.PUBG_DEFAULT_PLATFORM ?? DEFAULT_PLATFORM,
  /**
   * Shard для `/seasons` и `/leaderboards` (PC). Примеры: pc-eu, pc-na, pc-as, pc-krjp, pc-sea, pc-oc, pc-sa, pc-ru, pc-jp.
   * См. PUBG API changelog v20 — лидерборды с Season 7+ не работают на shard `steam`.
   */
  leaderboardShard: parseLeaderboardShard(process.env.PUBG_LEADERBOARD_SHARD),
  cacheTtlMinutes: parseTTL(process.env.PUBG_CACHE_TTL_MINUTES),
  friends: (process.env.PUBG_FRIENDS ?? "")
    .split(",")
    .map((friend) => friend.trim())
    .filter(Boolean),
};

export function getCacheExpiry(base = new Date()): Date {
  return new Date(base.getTime() + appConfig.cacheTtlMinutes * 60_000);
}
