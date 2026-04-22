import { prisma } from "@/lib/prisma";

const PLATFORM = "steam";

function safeDecodePlayerSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function normalizePlayerProfileKey(playerName: string): string {
  return playerName.trim().toLowerCase();
}

export async function getPlayerProfileMark(playerName: string) {
  const key = normalizePlayerProfileKey(safeDecodePlayerSegment(playerName));
  return prisma.playerProfileMark.findUnique({
    where: {
      platform_playerName: {
        platform: PLATFORM,
        playerName: key,
      },
    },
  });
}

export type PlayerProfileMarkPayload = {
  isStreamer: boolean;
  isPro: boolean;
  isTop500: boolean;
  top500Rank: number | null;
  top500SeasonId: string | null;
  top500GameMode: string | null;
};

export function toMarkPayload(mark: Awaited<ReturnType<typeof getPlayerProfileMark>>): PlayerProfileMarkPayload {
  return {
    isStreamer: mark?.isStreamer ?? false,
    isPro: mark?.isPro ?? false,
    isTop500: mark?.isTop500 ?? false,
    top500Rank: mark?.top500Rank ?? null,
    top500SeasonId: mark?.top500SeasonId ?? null,
    top500GameMode: mark?.top500GameMode ?? null,
  };
}

export async function patchPlayerProfileMark(
  playerName: string,
  patch: { isStreamer?: boolean; isPro?: boolean },
): Promise<PlayerProfileMarkPayload> {
  const decoded = safeDecodePlayerSegment(playerName);
  const key = normalizePlayerProfileKey(decoded);
  const existing = await getPlayerProfileMark(decoded);

  const isStreamer = patch.isStreamer ?? existing?.isStreamer ?? false;
  const isPro = patch.isPro ?? existing?.isPro ?? false;

  await prisma.playerProfileMark.upsert({
    where: {
      platform_playerName: {
        platform: PLATFORM,
        playerName: key,
      },
    },
    create: {
      platform: PLATFORM,
      playerName: key,
      isStreamer,
      isPro,
    },
    update: {
      isStreamer,
      isPro,
    },
  });

  const { syncSpotlightFromProfileMarks } = await import("@/lib/spotlightProfileSync");
  await syncSpotlightFromProfileMarks(key, decoded.trim(), { isStreamer, isPro });

  const updated = await getPlayerProfileMark(decoded);
  return toMarkPayload(updated);
}
