export const RECENT_PLAYERS_STORAGE_KEY = "pubgbuff_recent_players_v1";
export const RECENT_PLAYERS_VERSION_KEY = "pubgbuff_recent_players_version_v1";
export const RECENT_PLAYERS_LIMIT = 20;

export type RecentPlayer = {
  name: string;
  lastVisitedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

const RECENT_PLAYERS_CHANGED_EVENT = "pubgbuff:recent-players-changed";

function readVersion(): number {
  if (!isBrowser()) {
    return 0;
  }

  const raw = window.localStorage.getItem(RECENT_PLAYERS_VERSION_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function bumpVersion(): number {
  if (!isBrowser()) {
    return 0;
  }

  const next = readVersion() + 1;
  window.localStorage.setItem(RECENT_PLAYERS_VERSION_KEY, String(next));
  return next;
}

function emitChanged(): void {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(RECENT_PLAYERS_CHANGED_EVENT));
}

export function getRecentPlayersSnapshot(): string {
  if (!isBrowser()) {
    return "0:[]";
  }

  const version = readVersion();
  const raw = window.localStorage.getItem(RECENT_PLAYERS_STORAGE_KEY) ?? "[]";
  return `${version}:${raw}`;
}

export function getRecentPlayersSnapshotServer(): string {
  return "0:[]";
}

export function subscribeRecentPlayers(onStoreChange: () => void): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === RECENT_PLAYERS_STORAGE_KEY || event.key === RECENT_PLAYERS_VERSION_KEY) {
      onStoreChange();
    }
  };

  const onLocal = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(RECENT_PLAYERS_CHANGED_EVENT, onLocal);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(RECENT_PLAYERS_CHANGED_EVENT, onLocal);
  };
}

export function parseRecentPlayersSnapshot(snapshot: string): RecentPlayer[] {
  const idx = snapshot.indexOf(":");
  const raw = idx >= 0 ? snapshot.slice(idx + 1) : "[]";
  return parseRecentPlayersJson(raw);
}

function parseRecentPlayersJson(raw: string): RecentPlayer[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const name = typeof record.name === "string" ? record.name.trim() : "";
        const lastVisitedAt =
          typeof record.lastVisitedAt === "string" ? record.lastVisitedAt : "";
        if (!name || !lastVisitedAt) {
          return null;
        }
        return { name, lastVisitedAt };
      })
      .filter((item): item is RecentPlayer => Boolean(item));
  } catch {
    return [];
  }
}

export function loadRecentPlayers(): RecentPlayer[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(RECENT_PLAYERS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  return parseRecentPlayersJson(raw);
}

export function saveRecentPlayers(entries: RecentPlayer[]): void {
  if (!isBrowser()) {
    return;
  }

  bumpVersion();
  window.localStorage.setItem(RECENT_PLAYERS_STORAGE_KEY, JSON.stringify(entries));
  emitChanged();
}

export function rememberRecentPlayer(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const now = new Date().toISOString();
  const existing = loadRecentPlayers().filter((item) => item.name.toLowerCase() !== trimmed.toLowerCase());
  const next: RecentPlayer[] = [{ name: trimmed, lastVisitedAt: now }, ...existing].slice(0, RECENT_PLAYERS_LIMIT);
  saveRecentPlayers(next);
}

export function removeRecentPlayer(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const next = loadRecentPlayers().filter((item) => item.name.toLowerCase() !== trimmed.toLowerCase());
  saveRecentPlayers(next);
}

export function clearRecentPlayers(): void {
  if (!isBrowser()) {
    return;
  }
  bumpVersion();
  window.localStorage.removeItem(RECENT_PLAYERS_STORAGE_KEY);
  emitChanged();
}
