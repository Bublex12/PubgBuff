import { buildDashboard } from "@/lib/analytics/aggregations";
import { Prisma } from "@/generated/prisma/client";
import { appConfig, getCacheExpiry } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getMatchById, getPlayerByName, getWeaponMastery } from "@/lib/pubg/client";
import { summarizeMatch } from "@/lib/pubg/matchSummary";
import { enrichMatchesWithFlagPresence } from "@/lib/matchFlagPresence";
import { extractMatchIds, extractTeammates, normalizeMatchForPlayer, normalizeWeaponMastery } from "@/lib/pubg/normalize";
import { downloadTelemetryEvents, extractTelemetryUrlFromMatch } from "@/lib/pubg/telemetry";
import { summarizeTelemetryEvents } from "@/lib/pubg/telemetrySummary";
import type { JsonApiObject, JsonApiResponse, PlayerDashboard } from "@/lib/pubg/types";

type DashboardOptions = {
  forceRefresh?: boolean;
};

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

export async function getPlayerDashboard(
  playerName: string,
  options: DashboardOptions = {},
): Promise<PlayerDashboard> {
  const platform = "steam";
  const normalizedName = playerName.trim().toLowerCase();
  const now = new Date();
  const forceRefresh = options.forceRefresh ?? false;

  const cachedPlayer = await prisma.playerCache.findUnique({
    where: {
      platform_playerName: {
        platform,
        playerName: normalizedName,
      },
    },
  });

  let playerPayload: JsonApiObject;
  let activePlatform: string;

  if (!cachedPlayer || forceRefresh || isExpired(cachedPlayer.expiresAt)) {
    const player = await getPlayerByName(playerName, platform);
    activePlatform = platform;
    playerPayload = player;

    await prisma.playerCache.upsert({
      where: {
        platform_playerName: {
          platform: activePlatform,
          playerName: normalizedName,
        },
      },
      create: {
        platform: activePlatform,
        playerName: normalizedName,
        playerId: playerPayload.id,
        payload: playerPayload as Prisma.InputJsonValue,
        fetchedAt: now,
        expiresAt: getCacheExpiry(now),
      },
      update: {
        playerId: playerPayload.id,
        payload: playerPayload as Prisma.InputJsonValue,
        fetchedAt: now,
        expiresAt: getCacheExpiry(now),
      },
    });
  } else {
    playerPayload = cachedPlayer.payload as JsonApiObject;
    activePlatform = cachedPlayer.platform;
  }

  const player = playerPayload;
  const playerId = player.id;
  const displayName = String(player.attributes?.name ?? playerName);
  const matchIds = extractMatchIds(player).slice(0, 30);

  const matchResponses: JsonApiResponse[] = [];
  for (const matchId of matchIds) {
    const cachedMatch = await prisma.matchCache.findUnique({
      where: {
        platform_matchId: {
          platform: activePlatform,
          matchId,
        },
      },
    });

    if (!cachedMatch || forceRefresh || isExpired(cachedMatch.expiresAt)) {
      const match = await getMatchById(matchId, activePlatform);
      matchResponses.push(match);
      await prisma.matchCache.upsert({
        where: {
          platform_matchId: {
            platform: activePlatform,
            matchId,
          },
        },
        create: {
          platform: activePlatform,
          matchId,
          payload: match as Prisma.InputJsonValue,
          fetchedAt: now,
          expiresAt: getCacheExpiry(now),
        },
        update: {
          payload: match as Prisma.InputJsonValue,
          fetchedAt: now,
          expiresAt: getCacheExpiry(now),
        },
      });
    } else {
      matchResponses.push(cachedMatch.payload as JsonApiResponse);
    }
  }

  const rows = matchResponses
    .map((response) => normalizeMatchForPlayer(response, playerId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const matchesWithFlags = await enrichMatchesWithFlagPresence(rows);

  const teammateRows = matchResponses.flatMap((response) => extractTeammates(response, playerId));
  const weaponMasteryResponse = await getWeaponMastery(playerId, activePlatform).catch(() => null);
  const weaponMasteryRows = normalizeWeaponMastery(weaponMasteryResponse);

  return buildDashboard({
    playerName: displayName,
    playerId,
    platform: activePlatform,
    refreshedAt: now.toISOString(),
    matches: matchesWithFlags,
    weaponMastery: weaponMasteryRows,
    friendsAllowList: appConfig.friends,
    teammatesFromMatches: teammateRows,
  });
}

export async function getCachedMatchDetail(matchId: string) {
  const platform = "steam";
  const now = new Date();
  const cachedMatch = await prisma.matchCache.findUnique({
    where: {
      platform_matchId: {
        platform,
        matchId,
      },
    },
  });

  if (cachedMatch && !isExpired(cachedMatch.expiresAt)) {
    return cachedMatch.payload as JsonApiResponse;
  }

  const freshMatch = await getMatchById(matchId, platform);
  await prisma.matchCache.upsert({
    where: {
      platform_matchId: {
        platform,
        matchId,
      },
    },
    create: {
      platform,
      matchId,
      payload: freshMatch as Prisma.InputJsonValue,
      fetchedAt: now,
      expiresAt: getCacheExpiry(now),
    },
    update: {
      payload: freshMatch as Prisma.InputJsonValue,
      fetchedAt: now,
      expiresAt: getCacheExpiry(now),
    },
  });

  return freshMatch;
}

export async function getMatchSummary(matchId: string) {
  const match = await getCachedMatchDetail(matchId);
  const summary = summarizeMatch(match);
  if (!summary) {
    throw new Error("Failed to summarize match payload");
  }
  return summary;
}

export async function getTelemetryJob(matchId: string) {
  const platform = "steam";
  return prisma.telemetryCache.findUnique({
    where: {
      platform_matchId: {
        platform,
        matchId,
      },
    },
  });
}

/** Повторно качает JSON телеметрии с CDN и считает сводку по `_T` (тяжёлая операция). */
export async function getTelemetryAnalysis(matchId: string) {
  const job = await getTelemetryJob(matchId);
  if (!job || job.status !== "ready" || !job.telemetryUrl) {
    return null;
  }

  const events = await downloadTelemetryEvents(job.telemetryUrl);

  if (!Array.isArray(events)) {
    throw new Error("Telemetry JSON is not an array");
  }

  return {
    matchId,
    eventCount: events.length,
    summary: summarizeTelemetryEvents(events),
    telemetryFetchedAt: job.fetchedAt,
  };
}

export async function requestTelemetryForMatch(matchId: string, options: { force?: boolean } = {}) {
  const platform = "steam";
  const now = new Date();
  const force = options.force ?? false;

  const existing = await prisma.telemetryCache.findUnique({
    where: {
      platform_matchId: {
        platform,
        matchId,
      },
    },
  });

  if (existing && existing.status === "ready" && !force) {
    return {
      status: "ready" as const,
      eventCount: existing.eventCount ?? 0,
      telemetryUrl: existing.telemetryUrl,
    };
  }

  const shouldExtractUrl = force || !existing?.telemetryUrl;
  if (shouldExtractUrl) {
    const match = await getCachedMatchDetail(matchId);
    const extractedUrl = extractTelemetryUrlFromMatch(match);
    if (!extractedUrl) {
      await prisma.telemetryCache.upsert({
        where: {
          platform_matchId: {
            platform,
            matchId,
          },
        },
        create: {
          platform,
          matchId,
          telemetryUrl: "",
          status: "error",
          errorMessage: "Telemetry URL not found in match payload",
          fetchedAt: now,
        },
        update: {
          telemetryUrl: "",
          status: "error",
          errorMessage: "Telemetry URL not found in match payload",
          fetchedAt: now,
        },
      });

      return { status: "error" as const, message: "Telemetry URL not found in match payload" };
    }

    await prisma.telemetryCache.upsert({
      where: {
        platform_matchId: {
          platform,
          matchId,
        },
      },
      create: {
        platform,
        matchId,
        telemetryUrl: extractedUrl,
        status: "downloading",
        errorMessage: null,
        fetchedAt: null,
      },
      update: {
        telemetryUrl: extractedUrl,
        status: "downloading",
        errorMessage: null,
        fetchedAt: null,
      },
    });
  }

  const resolved = await prisma.telemetryCache.findUnique({
    where: {
      platform_matchId: {
        platform,
        matchId,
      },
    },
  });

  if (!resolved?.telemetryUrl) {
    return { status: "error" as const, message: "Telemetry URL missing" };
  }

  try {
    const events = await downloadTelemetryEvents(resolved.telemetryUrl);
    if (!Array.isArray(events)) {
      throw new Error("Telemetry JSON is not an array");
    }

    await prisma.telemetryCache.update({
      where: {
        platform_matchId: {
          platform,
          matchId,
        },
      },
      data: {
        status: "ready",
        errorMessage: null,
        eventCount: events.length,
        fetchedAt: now,
      },
    });

    return { status: "ready" as const, eventCount: events.length, telemetryUrl: resolved.telemetryUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown telemetry error";

    await prisma.telemetryCache.update({
      where: {
        platform_matchId: {
          platform,
          matchId,
        },
      },
      data: {
        status: "error",
        errorMessage: message,
        fetchedAt: now,
      },
    });

    return { status: "error" as const, message };
  }
}
