import { formatPubgMapName, formatPubgWeaponName } from "@/lib/pubg/labels";
import type { JsonApiObject, JsonApiResponse, LobbyPlayerRef, PlayerMatchRow, WeaponMasteryRow } from "@/lib/pubg/types";

function safeNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function extractMatchIds(player: JsonApiObject): string[] {
  const relationship = player.relationships?.matches;
  const items = relationship?.data ?? [];
  return items.map((item) => item.id).filter(Boolean);
}

/** Ростер игрока: ники союзников (без себя) и флаг победы сквада. */
export function getRosterTeammateBundle(
  matchResponse: JsonApiResponse,
  playerId: string,
): { names: string[]; isWin: boolean } | null {
  const included = matchResponse.included ?? [];
  const rosters = included.filter((i) => i.type === "roster");
  const participants = included.filter((i) => i.type === "participant");
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));

  for (const roster of rosters) {
    const rosterParticipants = roster.relationships?.participants?.data ?? [];
    const rosterStats = safeRecord(roster.attributes?.stats);
    const isWin = safeNumber(rosterStats.rank) === 1;

    const members = rosterParticipants
      .map((relation) => participantById.get(relation.id))
      .filter((participant): participant is JsonApiObject => Boolean(participant))
      .map((participant) => ({
        playerId: safeString(safeRecord(participant.attributes?.stats).playerId),
        name: safeString(safeRecord(participant.attributes?.stats).name),
      }));

    const isPlayerInRoster = members.some((member) => member.playerId === playerId);
    if (!isPlayerInRoster) {
      continue;
    }

    const names = members
      .filter((member) => member.playerId !== playerId)
      .filter((member) => Boolean(member.name))
      .map((member) => member.name);

    return { names, isWin };
  }

  return null;
}

/** Все участники матча (participants в included), кроме текущего игрока. */
export function extractLobbyPlayers(matchResponse: JsonApiResponse, playerId: string): LobbyPlayerRef[] {
  const included = matchResponse.included ?? [];
  const participants = included.filter((i) => i.type === "participant");
  const out: LobbyPlayerRef[] = [];
  const seen = new Set<string>();

  for (const participant of participants) {
    const stats = safeRecord(participant.attributes?.stats);
    const pid = safeString(stats.playerId);
    if (!pid || pid === playerId) {
      continue;
    }
    const n = safeString(stats.name);
    if (!n) {
      continue;
    }
    if (seen.has(pid)) {
      continue;
    }
    seen.add(pid);
    out.push({ playerId: pid, name: n });
  }

  return out;
}

export function normalizeMatchForPlayer(
  matchResponse: JsonApiResponse,
  playerId: string,
): PlayerMatchRow | null {
  const match = Array.isArray(matchResponse.data) ? matchResponse.data[0] : matchResponse.data;
  if (!match) {
    return null;
  }

  const included = matchResponse.included ?? [];
  const rosterById = new Map(included.filter((i) => i.type === "roster").map((i) => [i.id, i]));
  const participants = included.filter((i) => i.type === "participant");
  const playerParticipant = participants.find((participant) => {
    const participantStats = safeRecord(participant.attributes?.stats);
    return safeString(participantStats.playerId) === playerId;
  });

  if (!playerParticipant) {
    return null;
  }

  const participantStats = safeRecord(playerParticipant.attributes?.stats);
  const playerParticipantId = playerParticipant.id;

  const playerRoster = Array.from(rosterById.values()).find((roster) => {
    const rosterParticipants = roster.relationships?.participants?.data ?? [];
    return rosterParticipants.some((participant) => participant.id === playerParticipantId);
  });

  const rosterStats = safeRecord(playerRoster?.attributes?.stats);
  const matchAttributes = match.attributes ?? {};
  const mapNameRaw = safeString(matchAttributes.mapName);
  const rosterBundle = getRosterTeammateBundle(matchResponse, playerId);
  const lobbyPlayers = extractLobbyPlayers(matchResponse, playerId);

  return {
    matchId: match.id,
    createdAt: safeString(matchAttributes.createdAt),
    mapName: formatPubgMapName(mapNameRaw),
    mapNameRaw,
    gameMode: safeString(matchAttributes.gameMode),
    placement: safeNumber(participantStats.winPlace),
    kills: safeNumber(participantStats.kills),
    assists: safeNumber(participantStats.assists),
    damageDealt: safeNumber(participantStats.damageDealt),
    headshotKills: safeNumber(participantStats.headshotKills),
    timeSurvived: safeNumber(participantStats.timeSurvived),
    teamId: safeNumber(participantStats.teamId),
    winPlace: safeNumber(rosterStats.rank),
    rosterTeammateNames: rosterBundle?.names ?? [],
    lobbyPlayers,
    matchFlagPresence: { streamer: false, pro: false, top500: false },
  };
}

export function extractTeammates(
  matchResponse: JsonApiResponse,
  playerId: string,
): Array<{ name: string; isWin: boolean }> {
  const bundle = getRosterTeammateBundle(matchResponse, playerId);
  if (!bundle) {
    return [];
  }
  return bundle.names.map((name) => ({ name, isWin: bundle.isWin }));
}

export function normalizeWeaponMastery(data: JsonApiObject | null): WeaponMasteryRow[] {
  if (!data) {
    return [];
  }

  const weaponSummaries = safeRecord(data.attributes?.weaponSummaries);
  return Object.entries(weaponSummaries)
    .map(([weapon, raw]) => {
      const item = safeRecord(raw);
      return {
        weapon: formatPubgWeaponName(weapon),
        weaponRaw: weapon,
        levelCurrent: safeNumber(item.LevelCurrent),
        xpTotal: safeNumber(item.XPTotal),
        tierCurrent: safeNumber(item.TierCurrent),
      };
    })
    .sort((a, b) => b.xpTotal - a.xpTotal)
    .slice(0, 10);
}
