import { appConfig } from "@/lib/config";
import { syncTop500MarksFromLeaderboard } from "@/lib/leaderboardTop500Sync";
import { getLeaderboard, getSeasons } from "@/lib/pubg/client";
import { formatPubgApiErrorBody, PubgHttpError } from "@/lib/pubg/errors";
import { parseLeaderboardTop, resolveLiveSeason, type LeaderboardRow, type SeasonResolution } from "@/lib/pubg/leaderboard";

export type LeaderboardPageData =
  | { ok: true; seasonId: string; gameMode: string; rows: LeaderboardRow[]; season: SeasonResolution }
  | { ok: false; message: string };

export async function getLeaderboardPageData(gameMode: string): Promise<LeaderboardPageData> {
  const mode = gameMode.trim().toLowerCase();
  if (!mode) {
    return { ok: false, message: "Пустой режим" };
  }

  const shard = appConfig.leaderboardShard;

  try {
    const seasons = await getSeasons(shard);
    const season = resolveLiveSeason(seasons);
    if (!season) {
      return { ok: false, message: "Не удалось определить сезон (пустой /seasons)." };
    }

    const raw = await getLeaderboard(shard, season.seasonId, mode);
    const rows = parseLeaderboardTop(raw, 500);
    if (rows.length > 0) {
      await syncTop500MarksFromLeaderboard(rows, season.seasonId, mode);
    }
    return { ok: true, seasonId: season.seasonId, gameMode: mode, rows, season };
  } catch (error) {
    let message = error instanceof Error ? error.message : "Ошибка загрузки лидерборда";
    if (error instanceof PubgHttpError && error.body) {
      const detail = formatPubgApiErrorBody(error.body);
      if (detail) {
        message = `${message} — ${detail}`;
      }
    }
    if (error instanceof PubgHttpError && error.status === 400) {
      message = `${message} (shard «${shard}». Для своего региона задай PUBG_LEADERBOARD_SHARD, напр. pc-na, pc-as, pc-krjp.)`;
    }
    return { ok: false, message };
  }
}
