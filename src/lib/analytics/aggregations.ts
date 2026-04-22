import type { PlayerMatchRow, PlayerDashboard, WeaponMasteryRow } from "@/lib/pubg/types";

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function buildDashboard(params: {
  playerName: string;
  playerId: string;
  platform: string;
  refreshedAt: string;
  matches: PlayerMatchRow[];
  weaponMastery: WeaponMasteryRow[];
  friendsAllowList: string[];
  teammatesFromMatches: Array<{ name: string; isWin: boolean }>;
}): PlayerDashboard {
  const { matches, teammatesFromMatches, friendsAllowList } = params;
  const totalMatches = matches.length;
  const wins = matches.filter((match) => match.winPlace === 1 || match.placement === 1).length;
  const top10 = matches.filter((match) => match.placement > 0 && match.placement <= 10).length;
  const totalKills = matches.reduce((sum, match) => sum + match.kills, 0);
  const totalDamage = matches.reduce((sum, match) => sum + match.damageDealt, 0);
  const deaths = Math.max(1, totalMatches - wins);

  const byMapSource = new Map<
    string,
    { mapName: string; mapNameRaw: string; matches: number; wins: number; kills: number; damage: number }
  >();
  for (const match of matches) {
    const key = match.mapNameRaw || match.mapName;
    const bucket =
      byMapSource.get(key) ?? {
        mapName: match.mapName,
        mapNameRaw: match.mapNameRaw,
        matches: 0,
        wins: 0,
        kills: 0,
        damage: 0,
      };
    bucket.mapName = match.mapName;
    bucket.mapNameRaw = match.mapNameRaw;
    bucket.matches += 1;
    bucket.kills += match.kills;
    bucket.damage += match.damageDealt;
    if (match.winPlace === 1 || match.placement === 1) {
      bucket.wins += 1;
    }
    byMapSource.set(key, bucket);
  }

  const byMap = Array.from(byMapSource.values())
    .map((values) => ({
      mapName: values.mapName,
      mapNameRaw: values.mapNameRaw,
      matches: values.matches,
      wins: values.wins,
      winRate: round((values.wins / values.matches) * 100),
      avgDamage: round(values.damage / values.matches),
      avgKills: round(values.kills / values.matches),
    }))
    .sort((a, b) => b.matches - a.matches);

  const friendsFilter = new Set(friendsAllowList.map((name) => name.toLowerCase()));
  const teammateSource = new Map<string, { matchesTogether: number; winsTogether: number }>();

  for (const teammate of teammatesFromMatches) {
    const normalized = teammate.name.toLowerCase();
    if (friendsFilter.size > 0 && !friendsFilter.has(normalized)) {
      continue;
    }

    const bucket = teammateSource.get(teammate.name) ?? { matchesTogether: 0, winsTogether: 0 };
    bucket.matchesTogether += 1;
    if (teammate.isWin) {
      bucket.winsTogether += 1;
    }
    teammateSource.set(teammate.name, bucket);
  }

  const teammates = Array.from(teammateSource.entries())
    .map(([teammateName, data]) => ({
      teammateName,
      matchesTogether: data.matchesTogether,
      winsTogether: data.winsTogether,
      winRate: round((data.winsTogether / data.matchesTogether) * 100),
    }))
    .sort((a, b) => b.matchesTogether - a.matchesTogether)
    .slice(0, 15);

  const playedWithMap = new Map<string, { name: string; games: number }>();
  for (const match of matches) {
    const seenInMatch = new Set<string>();
    for (const p of match.lobbyPlayers) {
      if (seenInMatch.has(p.playerId)) {
        continue;
      }
      seenInMatch.add(p.playerId);
      const existing = playedWithMap.get(p.playerId);
      if (existing) {
        existing.games += 1;
      } else {
        playedWithMap.set(p.playerId, { name: p.name, games: 1 });
      }
    }
  }
  const playedWith = Array.from(playedWithMap.entries())
    .map(([playerId, data]) => ({ playerId, name: data.name, games: data.games }))
    .sort((a, b) => b.games - a.games);

  const sortedMatches = [...matches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    playerName: params.playerName,
    playerId: params.playerId,
    platform: params.platform,
    refreshedAt: params.refreshedAt,
    profile: {
      matches: totalMatches,
      wins,
      top10,
      kd: round(totalKills / deaths),
      winRate: totalMatches > 0 ? round((wins / totalMatches) * 100) : 0,
      avgDamage: totalMatches > 0 ? round(totalDamage / totalMatches) : 0,
    },
    byMap,
    recentMatches: sortedMatches.slice(0, 30),
    playedWith,
    teammates,
    weaponMastery: params.weaponMastery,
  };
}
