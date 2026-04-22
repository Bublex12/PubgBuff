import { prisma } from "@/lib/prisma";
import { normalizePlayerProfileKey } from "@/lib/playerProfileMarks";
import type { LeaderboardRow } from "@/lib/pubg/leaderboard";

const PLATFORM = "steam";

/**
 * Обновляет метки «ТОП 500» по снимку лидерборда: только для пары seasonId + gameMode.
 * Игроки, выпавшие из топа для этой пары, сбрасываются; новый сезон для того же режима снимает старые отметки.
 */
export async function syncTop500MarksFromLeaderboard(
  rows: LeaderboardRow[],
  seasonId: string,
  gameMode: string,
): Promise<void> {
  const normalizedMode = gameMode.trim().toLowerCase();
  const season = seasonId.trim();
  if (!season || !normalizedMode || rows.length === 0) {
    return;
  }

  const keyed: Array<{ key: string; rank: number }> = [];
  for (const row of rows) {
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) {
      continue;
    }
    const key = normalizePlayerProfileKey(name);
    if (!key) {
      continue;
    }
    keyed.push({ key, rank: row.rank });
  }

  const keys = [...new Set(keyed.map((k) => k.key))];
  if (keys.length === 0) {
    return;
  }

  const rankByKey = new Map(keyed.map((k) => [k.key, k.rank]));

  await prisma.$transaction(async (tx) => {
    await tx.playerProfileMark.updateMany({
      where: {
        platform: PLATFORM,
        top500GameMode: normalizedMode,
        top500SeasonId: { not: season },
        isTop500: true,
      },
      data: {
        isTop500: false,
        top500Rank: null,
        top500SeasonId: null,
        top500GameMode: null,
      },
    });

    await tx.playerProfileMark.updateMany({
      where: {
        platform: PLATFORM,
        top500GameMode: normalizedMode,
        top500SeasonId: season,
        playerName: { notIn: keys },
        isTop500: true,
      },
      data: {
        isTop500: false,
        top500Rank: null,
        top500SeasonId: null,
        top500GameMode: null,
      },
    });

    for (const key of keys) {
      const rank = rankByKey.get(key) ?? 0;
      await tx.playerProfileMark.upsert({
        where: {
          platform_playerName: {
            platform: PLATFORM,
            playerName: key,
          },
        },
        create: {
          platform: PLATFORM,
          playerName: key,
          isStreamer: false,
          isPro: false,
          isTop500: true,
          top500Rank: rank,
          top500SeasonId: season,
          top500GameMode: normalizedMode,
        },
        update: {
          isTop500: true,
          top500Rank: rank,
          top500SeasonId: season,
          top500GameMode: normalizedMode,
        },
      });
    }
  });
}
