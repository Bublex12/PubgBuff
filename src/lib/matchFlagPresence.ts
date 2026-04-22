import { loadSpotlightAccounts } from "@/lib/spotlightDb";
import { normalizePlayerProfileKey } from "@/lib/playerProfileMarks";
import { prisma } from "@/lib/prisma";
import type { LobbyPlayerRef, MatchFlagPresence, PlayerMatchRow } from "@/lib/pubg/types";

const PLATFORM = "steam";

function emptyPresence(): MatchFlagPresence {
  return { streamer: false, pro: false, top500: false };
}

export function hasAnyFlag(p: MatchFlagPresence): boolean {
  return p.streamer || p.pro || p.top500;
}

function mergePresence(a: MatchFlagPresence, b: Partial<MatchFlagPresence>): MatchFlagPresence {
  return {
    streamer: a.streamer || Boolean(b.streamer),
    pro: a.pro || Boolean(b.pro),
    top500: a.top500 || Boolean(b.top500),
  };
}

/** Ключ — нормализованный ник; значение — какие флаги есть у этого игрока в БД (метки + отслеживание). */
export async function loadMatchFlagNameIndex(): Promise<Map<string, MatchFlagPresence>> {
  const index = new Map<string, MatchFlagPresence>();

  const marks = await prisma.playerProfileMark.findMany({
    where: {
      platform: PLATFORM,
      OR: [{ isStreamer: true }, { isPro: true }, { isTop500: true }],
    },
  });

  for (const m of marks) {
    const key = m.playerName.trim().toLowerCase();
    if (!key) {
      continue;
    }
    const cur = index.get(key) ?? emptyPresence();
    index.set(
      key,
      mergePresence(cur, {
        streamer: m.isStreamer,
        pro: m.isPro,
        top500: m.isTop500,
      }),
    );
  }

  const spotlight = await loadSpotlightAccounts();
  for (const acc of spotlight) {
    const key = acc.key.trim().toLowerCase();
    if (!key) {
      continue;
    }
    const cur = index.get(key) ?? emptyPresence();
    if (acc.role === "streamer") {
      index.set(key, mergePresence(cur, { streamer: true }));
    } else if (acc.role === "esports") {
      index.set(key, mergePresence(cur, { pro: true }));
    }
  }

  return index;
}

/** Объединение флагов по нескольким никам (лобби, состав команды). */
export function aggregateFlagPresenceForNicks(
  players: Iterable<{ name: string }>,
  index: Map<string, MatchFlagPresence>,
): MatchFlagPresence {
  let out = emptyPresence();
  for (const p of players) {
    const key = normalizePlayerProfileKey(p.name);
    if (!key) {
      continue;
    }
    const hit = index.get(key);
    if (hit) {
      out = mergePresence(out, hit);
    }
  }
  return out;
}

function presenceForLobby(lobby: LobbyPlayerRef[], index: Map<string, MatchFlagPresence>): MatchFlagPresence {
  return aggregateFlagPresenceForNicks(lobby, index);
}

/** Флаги для одного ника (страница матча, строка игрока). */
export function flagPresenceForNick(name: string, index: Map<string, MatchFlagPresence>): MatchFlagPresence {
  const key = normalizePlayerProfileKey(name);
  if (!key) {
    return emptyPresence();
  }
  return index.get(key) ?? emptyPresence();
}

export async function enrichMatchesWithFlagPresence(matches: PlayerMatchRow[]): Promise<PlayerMatchRow[]> {
  if (matches.length === 0) {
    return matches;
  }
  const index = await loadMatchFlagNameIndex();
  return matches.map((m) => ({
    ...m,
    matchFlagPresence: presenceForLobby(m.lobbyPlayers, index),
  }));
}
