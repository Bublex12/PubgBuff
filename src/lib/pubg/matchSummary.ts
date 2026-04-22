import { formatPubgMapName } from "@/lib/pubg/labels";
import type { JsonApiObject, JsonApiResponse } from "@/lib/pubg/types";

export type MatchParticipantSummary = {
  name: string;
  playerId: string;
  kills: number;
  assists: number;
  damageDealt: number;
  headshotKills: number;
  winPlace: number;
  timeSurvived: number;
  teamKills: number;
  teamId: number;
};

export type MatchTeamSummary = {
  rosterId: string;
  teamRank: number;
  won: boolean;
  teamId: number;
  playerCount: number;
  totalKills: number;
  totalAssists: number;
  totalDamage: number;
  players: MatchParticipantSummary[];
};

export type MatchSummary = {
  matchId: string;
  createdAt: string;
  duration: number;
  mapName: string;
  mapNameRaw: string;
  gameMode: string;
  isCustomMatch: boolean;
  participantCount: number;
  teams: MatchTeamSummary[];
  topByDamage: MatchParticipantSummary[];
};

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

export function summarizeMatch(matchResponse: JsonApiResponse): MatchSummary | null {
  const match = Array.isArray(matchResponse.data) ? matchResponse.data[0] : matchResponse.data;
  if (!match) {
    return null;
  }

  const included = matchResponse.included ?? [];
  const participants = included.filter((item): item is JsonApiObject => item.type === "participant");
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));

  const participantRows: MatchParticipantSummary[] = participants.map((participant) => {
    const stats = safeRecord(participant.attributes?.stats);
    return {
      name: safeString(stats.name),
      playerId: safeString(stats.playerId),
      kills: safeNumber(stats.kills),
      assists: safeNumber(stats.assists),
      damageDealt: safeNumber(stats.damageDealt),
      headshotKills: safeNumber(stats.headshotKills),
      winPlace: safeNumber(stats.winPlace),
      timeSurvived: safeNumber(stats.timeSurvived),
      teamKills: safeNumber(stats.teamKills),
      teamId: safeNumber(stats.teamId),
    };
  });

  const rosters = included.filter((item): item is JsonApiObject => item.type === "roster");
  const teams: MatchTeamSummary[] = rosters.map((roster) => {
    const rosterStats = safeRecord(roster.attributes?.stats);
    const teamRank = safeNumber(rosterStats.rank);
    const won = teamRank === 1;

    const rosterParticipants = roster.relationships?.participants?.data ?? [];
    const players: MatchParticipantSummary[] = rosterParticipants
      .map((relation) => participantById.get(relation.id))
      .filter((participant): participant is JsonApiObject => Boolean(participant))
      .map((participant) => {
        const stats = safeRecord(participant.attributes?.stats);
        return {
          name: safeString(stats.name),
          playerId: safeString(stats.playerId),
          kills: safeNumber(stats.kills),
          assists: safeNumber(stats.assists),
          damageDealt: safeNumber(stats.damageDealt),
          headshotKills: safeNumber(stats.headshotKills),
          winPlace: safeNumber(stats.winPlace),
          timeSurvived: safeNumber(stats.timeSurvived),
          teamKills: safeNumber(stats.teamKills),
          teamId: safeNumber(stats.teamId),
        };
      })
      .filter((row) => Boolean(row.name))
      .sort((a, b) => b.damageDealt - a.damageDealt);

    const teamId = players[0]?.teamId ?? 0;
    const totalKills = players.reduce((sum, row) => sum + row.kills, 0);
    const totalAssists = players.reduce((sum, row) => sum + row.assists, 0);
    const totalDamage = players.reduce((sum, row) => sum + row.damageDealt, 0);

    return {
      rosterId: roster.id,
      teamRank,
      won,
      teamId,
      playerCount: players.length,
      totalKills,
      totalAssists,
      totalDamage,
      players,
    };
  });

  teams.sort((a, b) => {
    if (a.teamRank === b.teamRank) {
      return a.rosterId.localeCompare(b.rosterId);
    }
    if (a.teamRank <= 0 && b.teamRank <= 0) {
      return a.rosterId.localeCompare(b.rosterId);
    }
    if (a.teamRank <= 0) {
      return 1;
    }
    if (b.teamRank <= 0) {
      return -1;
    }
    return a.teamRank - b.teamRank;
  });

  const assignedParticipantIds = new Set<string>();
  for (const roster of rosters) {
    const rosterParticipants = roster.relationships?.participants?.data ?? [];
    for (const relation of rosterParticipants) {
      assignedParticipantIds.add(relation.id);
    }
  }

  const orphanParticipants = participants.filter((participant) => !assignedParticipantIds.has(participant.id));
  if (orphanParticipants.length > 0) {
    const players: MatchParticipantSummary[] = orphanParticipants
      .map((participant) => {
        const stats = safeRecord(participant.attributes?.stats);
        return {
          name: safeString(stats.name),
          playerId: safeString(stats.playerId),
          kills: safeNumber(stats.kills),
          assists: safeNumber(stats.assists),
          damageDealt: safeNumber(stats.damageDealt),
          headshotKills: safeNumber(stats.headshotKills),
          winPlace: safeNumber(stats.winPlace),
          timeSurvived: safeNumber(stats.timeSurvived),
          teamKills: safeNumber(stats.teamKills),
          teamId: safeNumber(stats.teamId),
        };
      })
      .filter((row) => Boolean(row.name))
      .sort((a, b) => b.damageDealt - a.damageDealt);

    if (players.length > 0) {
      const totalKills = players.reduce((sum, row) => sum + row.kills, 0);
      const totalAssists = players.reduce((sum, row) => sum + row.assists, 0);
      const totalDamage = players.reduce((sum, row) => sum + row.damageDealt, 0);

      teams.push({
        rosterId: "orphan",
        teamRank: 9999,
        won: false,
        teamId: players[0]?.teamId ?? 0,
        playerCount: players.length,
        totalKills,
        totalAssists,
        totalDamage,
        players,
      });
    }
  }

  const matchAttributes = match.attributes ?? {};
  const mapNameRaw = safeString(matchAttributes.mapName);

  const topByDamage = [...participantRows]
    .filter((row) => row.name)
    .sort((a, b) => b.damageDealt - a.damageDealt)
    .slice(0, 15);

  return {
    matchId: match.id,
    createdAt: safeString(matchAttributes.createdAt),
    duration: safeNumber(matchAttributes.duration),
    mapName: formatPubgMapName(mapNameRaw),
    mapNameRaw,
    gameMode: safeString(matchAttributes.gameMode),
    isCustomMatch: Boolean(matchAttributes.isCustomMatch),
    participantCount: participantRows.length,
    teams,
    topByDamage,
  };
}
