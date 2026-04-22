import type { SpotlightRole } from "@/lib/config";
import type { MatchSummary } from "@/lib/pubg/matchSummary";
import { loadSpotlightAccounts } from "@/lib/spotlightDb";

export type SpotlightHit = {
  playerId: string;
  name: string;
  roles: SpotlightRole[];
  matchedById: boolean;
  matchedByName: boolean;
};

function rolesForParticipant(
  spotlight: { key: string; role: SpotlightRole }[],
  playerId: string,
  name: string,
): { roles: SpotlightRole[]; matchedById: boolean; matchedByName: boolean } {
  const pid = playerId.trim().toLowerCase();
  const nm = name.trim().toLowerCase();
  const roles = new Set<SpotlightRole>();
  let matchedById = false;
  let matchedByName = false;

  for (const entry of spotlight) {
    if (pid && entry.key === pid) {
      roles.add(entry.role);
      matchedById = true;
    }
    if (nm && entry.key === nm) {
      roles.add(entry.role);
      matchedByName = true;
    }
  }

  return { roles: [...roles], matchedById, matchedByName };
}

/** Участники матча, которые совпали со списками из UI (/spotlight). */
export async function findSpotlightInMatch(summary: MatchSummary): Promise<SpotlightHit[]> {
  const spotlight = await loadSpotlightAccounts();
  if (spotlight.length === 0) {
    return [];
  }

  const hits: SpotlightHit[] = [];
  const seen = new Set<string>();

  for (const team of summary.teams) {
    for (const p of team.players) {
      const dedupeKey = p.playerId || p.name;
      if (!dedupeKey || seen.has(dedupeKey)) {
        continue;
      }

      const { roles, matchedById, matchedByName } = rolesForParticipant(spotlight, p.playerId, p.name);
      if (roles.length === 0) {
        continue;
      }

      seen.add(dedupeKey);
      hits.push({
        playerId: p.playerId,
        name: p.name,
        roles,
        matchedById,
        matchedByName,
      });
    }
  }

  return hits.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
