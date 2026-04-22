export type JsonApiObject = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: Array<{ id: string; type: string }> }>;
};

export type JsonApiResponse = {
  data: JsonApiObject | JsonApiObject[];
  included?: JsonApiObject[];
};

/** Участник матча (лобби), не текущий игрок. */
export type LobbyPlayerRef = {
  playerId: string;
  name: string;
};

/** Совпадение с локальными метками профиля / списками отслеживания по нику в лобби. */
export type MatchFlagPresence = {
  streamer: boolean;
  pro: boolean;
  top500: boolean;
};

export type PlayerMatchRow = {
  matchId: string;
  createdAt: string;
  mapName: string;
  mapNameRaw: string;
  gameMode: string;
  placement: number;
  kills: number;
  assists: number;
  damageDealt: number;
  headshotKills: number;
  timeSurvived: number;
  teamId: number;
  winPlace: number;
  /** Никнеймы соигроков в том же ростере (как в API), без текущего игрока. */
  rosterTeammateNames: string[];
  /** Все участники матча в `included` (лобби), кроме текущего игрока. */
  lobbyPlayers: LobbyPlayerRef[];
  /** В лобби есть игрок с меткой профиля или в «Отслеживании». */
  matchFlagPresence: MatchFlagPresence;
};

export type WeaponMasteryRow = {
  weapon: string;
  weaponRaw: string;
  levelCurrent: number;
  xpTotal: number;
  tierCurrent?: number;
};

export type PlayerDashboard = {
  playerName: string;
  playerId: string;
  platform: string;
  refreshedAt: string;
  profile: {
    matches: number;
    wins: number;
    top10: number;
    kd: number;
    winRate: number;
    avgDamage: number;
  };
  byMap: Array<{
    mapName: string;
    mapNameRaw: string;
    matches: number;
    wins: number;
    winRate: number;
    avgDamage: number;
    avgKills: number;
  }>;
  recentMatches: PlayerMatchRow[];
  /** Все игроки из лобби по загруженным матчам (минимум 1 общий матч). */
  playedWith: Array<{ playerId: string; name: string; games: number }>;
  teammates: Array<{
    teammateName: string;
    matchesTogether: number;
    winsTogether: number;
    winRate: number;
  }>;
  weaponMastery: WeaponMasteryRow[];
};
