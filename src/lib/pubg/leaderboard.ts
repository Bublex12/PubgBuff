import type { JsonApiObject, JsonApiResponse } from "@/lib/pubg/types";

function toBool(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return false;
}

function isLifetimeSeasonId(id: string): boolean {
  const t = id.trim().toLowerCase();
  return t === "lifetime" || t.endsWith("lifetime");
}

export type SeasonResolution = {
  seasonId: string;
  /** Как выбрали сезон для лидерборда / отображения. */
  resolvedBy: "isCurrentSeason" | "lastNonOffseason" | "lastKnown";
};

export type LeaderboardRow = {
  rank: number;
  playerId: string;
  name: string;
};

function playerRefsFromRelationships(item: JsonApiObject): Array<{ id: string }> {
  const rels = item.relationships as Record<string, { data?: unknown }> | undefined;
  const pdata = rels?.players?.data ?? rels?.Players?.data ?? rels?.player?.data ?? rels?.Player?.data;
  if (Array.isArray(pdata)) {
    return pdata
      .filter((x): x is { id: string } => Boolean(x) && typeof x === "object" && "id" in x)
      .map((x) => ({ id: String((x as { id: unknown }).id) }))
      .filter((x) => x.id);
  }
  if (pdata && typeof pdata === "object" && "id" in pdata) {
    const id = String((pdata as { id: unknown }).id);
    return id ? [{ id }] : [];
  }
  return [];
}

function relPlayerId(item: JsonApiObject): string {
  const rels = item.relationships as Record<string, { data?: unknown }> | undefined;
  const pdata = rels?.player?.data ?? rels?.Player?.data;
  if (Array.isArray(pdata)) {
    const first = pdata[0];
    if (first && typeof first === "object" && "id" in first) {
      return String((first as { id: unknown }).id ?? "");
    }
  }
  if (pdata && typeof pdata === "object" && "id" in pdata) {
    return String((pdata as { id: unknown }).id ?? "");
  }

  const attrs = item.attributes as Record<string, unknown> | undefined;
  if (typeof attrs?.playerId === "string") {
    return attrs.playerId;
  }
  if (typeof attrs?.accountId === "string") {
    return attrs.accountId;
  }

  return "";
}

function buildPlayerNameMap(included: JsonApiObject[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const inc of included) {
    if (inc.type !== "player") {
      continue;
    }
    const attrs = inc.attributes ?? {};
    let name = typeof attrs.name === "string" ? attrs.name : "";
    if (!name && attrs.stats && typeof attrs.stats === "object") {
      const stats = attrs.stats as Record<string, unknown>;
      if (typeof stats.name === "string") {
        name = stats.name;
      }
    }
    map.set(inc.id, name);
  }
  return map;
}

function rankFromPlayerAttributes(attrs: Record<string, unknown>): number {
  const stats = typeof attrs.stats === "object" && attrs.stats ? (attrs.stats as Record<string, unknown>) : {};
  const raw = attrs.rank ?? attrs.Rank ?? stats.rank ?? stats.Rank;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 1e9;
}

function nameFromPlayerAttributes(attrs: Record<string, unknown>): string {
  if (typeof attrs.name === "string" && attrs.name) {
    return attrs.name;
  }
  const stats = typeof attrs.stats === "object" && attrs.stats ? (attrs.stats as Record<string, unknown>) : {};
  if (typeof stats.name === "string") {
    return stats.name;
  }
  return "";
}

/**
 * Формат v20+: `data` — один объект лидерборда, `relationships.players`, полные карточки в `included` (type player).
 */
function parseLeaderboardFromDataAndIncluded(
  dataObj: JsonApiObject,
  included: JsonApiObject[],
  names: Map<string, string>,
  limit: number,
): LeaderboardRow[] {
  const refs = playerRefsFromRelationships(dataObj);
  if (refs.length === 0) {
    return [];
  }

  const playerById = new Map<string, JsonApiObject>();
  for (const item of included) {
    if (item.type === "player" && item.id) {
      playerById.set(item.id, item);
    }
  }

  const rows: LeaderboardRow[] = refs.map((ref, index) => {
    const item = playerById.get(ref.id);
    const attrs = (item?.attributes ?? {}) as Record<string, unknown>;
    let rank = rankFromPlayerAttributes(attrs);
    if (rank >= 1e8) {
      rank = index + 1;
    }
    const name = nameFromPlayerAttributes(attrs) || names.get(ref.id) || "";
    return { rank, playerId: ref.id, name };
  });

  return rows
    .filter((r) => Boolean(r.playerId))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
}

/** Топ игроков из ответа /leaderboards/{season}/{gameMode} (до limit). */
export function parseLeaderboardTop(response: JsonApiResponse, limit: number): LeaderboardRow[] {
  const included = response.included ?? [];
  const names = buildPlayerNameMap(included);

  const fromIncluded = included
    .filter((i) => /leaderboard/i.test(i.type))
    .map((item) => {
      const attrs = item.attributes ?? {};
      const rank = Number(attrs.rank ?? attrs.Rank ?? 1e9);
      const playerId = relPlayerId(item);
      return {
        rank: Number.isFinite(rank) ? rank : 1e9,
        playerId,
        name: playerId ? (names.get(playerId) ?? "") : "",
      };
    })
    .filter((r) => Boolean(r.playerId))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);

  if (fromIncluded.length > 0) {
    return fromIncluded;
  }

  const data = response.data;
  if (!Array.isArray(data) && data && typeof data === "object") {
    const dataObj = data as JsonApiObject;
    const fromPlayers = parseLeaderboardFromDataAndIncluded(dataObj, included, names, limit);
    if (fromPlayers.length > 0) {
      return fromPlayers;
    }
  }

  const fromPlayerObjects = included
    .filter((i) => i.type === "player")
    .map((item) => {
      const attrs = (item.attributes ?? {}) as Record<string, unknown>;
      const rank = rankFromPlayerAttributes(attrs);
      const playerId = item.id;
      return {
        rank,
        playerId,
        name: nameFromPlayerAttributes(attrs) || names.get(playerId) || "",
      };
    })
    .filter((r) => Boolean(r.playerId) && r.rank < 1e8)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);

  if (fromPlayerObjects.length > 0) {
    return fromPlayerObjects;
  }

  const rows: JsonApiObject[] = Array.isArray(data) ? data : data ? [data as JsonApiObject] : [];

  return rows
    .map((item) => {
      const attrs = item.attributes ?? {};
      const rank = Number(attrs.rank ?? attrs.Rank ?? 1e9);
      const playerId = relPlayerId(item);
      return {
        rank: Number.isFinite(rank) ? rank : 1e9,
        playerId,
        name: playerId ? (names.get(playerId) ?? "") : "",
      };
    })
    .filter((r) => Boolean(r.playerId))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
}

/**
 * Сезон «как сейчас в игре»: сначала объекты с isCurrentSeason (не offseason),
 * иначе последний в ответе API среди не‑offseason (типичный порядок — от старых к новым).
 */
export function resolveLiveSeason(seasonsResponse: JsonApiResponse): SeasonResolution | null {
  const list = Array.isArray(seasonsResponse.data) ? seasonsResponse.data : [];
  if (list.length === 0) {
    return null;
  }

  type Row = { id: string; isCurrentSeason: boolean; isOffseason: boolean; order: number };

  const rows: Row[] = list
    .map((s, order) => {
      const attrs = s.attributes ?? {};
      return {
        id: s.id,
        isCurrentSeason: toBool(attrs.isCurrentSeason),
        isOffseason: toBool(attrs.isOffseason),
        order,
      };
    })
    .filter((r) => r.id && !isLifetimeSeasonId(r.id));

  if (rows.length === 0) {
    return null;
  }

  const current = rows.filter((r) => r.isCurrentSeason);
  if (current.length > 0) {
    const playable = current.filter((r) => !r.isOffseason);
    const pool = playable.length > 0 ? playable : current;
    const chosen = pool.reduce((a, b) => (a.order > b.order ? a : b));
    return { seasonId: chosen.id, resolvedBy: "isCurrentSeason" };
  }

  const inSeason = rows.filter((r) => !r.isOffseason);
  if (inSeason.length > 0) {
    const chosen = inSeason.reduce((a, b) => (a.order > b.order ? a : b));
    return { seasonId: chosen.id, resolvedBy: "lastNonOffseason" };
  }

  const chosen = rows.reduce((a, b) => (a.order > b.order ? a : b));
  return { seasonId: chosen.id, resolvedBy: "lastKnown" };
}

export function pickCurrentSeasonId(seasonsResponse: JsonApiResponse): string | null {
  return resolveLiveSeason(seasonsResponse)?.seasonId ?? null;
}

/** Порядок попыток gameMode для лидерборда по режиму матча. */
export function leaderboardModeCandidates(matchGameMode: string): string[] {
  const g = matchGameMode.trim().toLowerCase();
  const out: string[] = [];
  const add = (x: string) => {
    const t = x.trim().toLowerCase();
    if (t && !out.includes(t)) {
      out.push(t);
    }
  };

  add(g);
  add(g.replace(/^ranked-/, ""));
  add(g.replace(/^normal-/, ""));
  add(g.replace(/^competitive-/, ""));
  add(g.replace(/^esports-/, ""));
  add(g.replace(/^war-/, ""));
  add(g.replace(/^zombie-/, ""));
  add(g.replace(/^conquest-/, ""));
  add(g.replace(/^seasonal-/, ""));
  add(g.replace(/^airoyale-/, ""));

  for (const core of ["squad-fpp", "duo-fpp", "solo-fpp", "squad", "duo", "solo"]) {
    add(core);
  }

  return out;
}
