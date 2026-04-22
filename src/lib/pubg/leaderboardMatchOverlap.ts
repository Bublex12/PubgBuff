import { appConfig } from "@/lib/config";
import { getLeaderboard, getSeasons } from "@/lib/pubg/client";
import { PubgHttpError } from "@/lib/pubg/errors";
import {
  leaderboardModeCandidates,
  type LeaderboardRow,
  parseLeaderboardTop,
  resolveLiveSeason,
} from "@/lib/pubg/leaderboard";
import type { MatchSummary } from "@/lib/pubg/matchSummary";

const TOP = 100;

export type LeaderboardOverlapOk = {
  ok: true;
  seasonId: string;
  gameMode: string;
  top: LeaderboardRow[];
  inMatch: LeaderboardRow[];
  participantCount: number;
};

export type LeaderboardOverlapErr = {
  ok: false;
  message: string;
};

export type LeaderboardOverlapResult = LeaderboardOverlapOk | LeaderboardOverlapErr;

function participantIdSet(summary: MatchSummary): Set<string> {
  const ids = new Set<string>();
  for (const team of summary.teams) {
    for (const p of team.players) {
      if (p.playerId) {
        ids.add(p.playerId);
      }
    }
  }
  return ids;
}

/**
 * Берёт топ TOP из лидерборда текущего сезона (подбор gameMode по режиму матча) и сравнивает accountId с участниками матча.
 */
export async function getLeaderboardOverlapFromSummary(summary: MatchSummary): Promise<LeaderboardOverlapResult> {
  const shard = appConfig.leaderboardShard;

  try {
    const participantIds = participantIdSet(summary);

    const seasons = await getSeasons(shard);
    const seasonPick = resolveLiveSeason(seasons);
    if (!seasonPick) {
      return { ok: false, message: "Не удалось определить seasonId из /seasons (пустой ответ или нет сезонов)." };
    }
    const seasonId = seasonPick.seasonId;

    const modes = leaderboardModeCandidates(summary.gameMode);
    let lastMessage = "Лидерборд не удалось загрузить ни для одного из режимов.";

    for (const gameMode of modes) {
      try {
        const lb = await getLeaderboard(shard, seasonId, gameMode);
        const top = parseLeaderboardTop(lb, TOP);
        if (top.length === 0) {
          lastMessage = `Пустой лидерборд для режима «${gameMode}».`;
          continue;
        }

        const inMatch = top.filter((row) => participantIds.has(row.playerId));
        return {
          ok: true,
          seasonId,
          gameMode,
          top,
          inMatch,
          participantCount: participantIds.size,
        };
      } catch (error) {
        if (error instanceof PubgHttpError) {
          lastMessage = error.message;
          if (error.status === 404) {
            continue;
          }
          if (error.status === 401) {
            return { ok: false, message: "401 от PUBG API — проверь PUBG_API_KEY." };
          }
        }
        lastMessage = error instanceof Error ? error.message : "Ошибка лидерборда";
      }
    }

    return { ok: false, message: lastMessage };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return { ok: false, message };
  }
}
