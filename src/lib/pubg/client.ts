import { appConfig } from "@/lib/config";
import { PubgHttpError } from "@/lib/pubg/errors";
import type { JsonApiObject, JsonApiResponse } from "@/lib/pubg/types";

const BASE_URL = "https://api.pubg.com/shards";

function getHeaders() {
  if (!appConfig.pubgApiKey) {
    throw new Error("PUBG_API_KEY is not configured");
  }

  return {
    Authorization: `Bearer ${appConfig.pubgApiKey}`,
    Accept: "application/vnd.api+json",
    "Accept-Encoding": "gzip",
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPubg<T>(url: string, retries = 2): Promise<T> {
  const response = await fetch(url, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (response.status === 429 && retries > 0) {
    const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "1");
    await sleep(Math.max(1, retryAfterSeconds) * 1000);
    return fetchPubg<T>(url, retries - 1);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new PubgHttpError(`PUBG API request failed (${response.status})`, response.status, errorText);
  }

  return (await response.json()) as T;
}

/** Для SSR: кэш Next.js (лидерборды и сезоны меняются редко). */
export async function fetchPubgCached<T>(
  url: string,
  revalidateSeconds: number,
  retries = 2,
): Promise<T> {
  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: revalidateSeconds },
  });

  if (response.status === 429 && retries > 0) {
    const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "1");
    await sleep(Math.max(1, retryAfterSeconds) * 1000);
    return fetchPubgCached<T>(url, revalidateSeconds, retries - 1);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new PubgHttpError(`PUBG API request failed (${response.status})`, response.status, errorText);
  }

  return (await response.json()) as T;
}

export async function getSeasons(platform: string): Promise<JsonApiResponse> {
  return fetchPubgCached<JsonApiResponse>(`${BASE_URL}/${platform}/seasons`, 86_400);
}

export async function getLeaderboard(platform: string, seasonId: string, gameMode: string): Promise<JsonApiResponse> {
  return fetchPubgCached<JsonApiResponse>(
    `${BASE_URL}/${platform}/leaderboards/${encodeURIComponent(seasonId)}/${encodeURIComponent(gameMode)}`,
    7_200,
  );
}

export async function getPlayerByName(
  playerName: string,
  platform: string,
): Promise<JsonApiObject> {
  const encodedName = encodeURIComponent(playerName);
  const response = await fetchPubg<JsonApiResponse>(
    `${BASE_URL}/${platform}/players?filter[playerNames]=${encodedName}`,
  );

  if (!Array.isArray(response.data) || response.data.length === 0) {
    throw new Error(`Player "${playerName}" not found on ${platform}`);
  }

  return response.data[0];
}

export async function getMatchById(matchId: string, platform: string): Promise<JsonApiResponse> {
  return fetchPubg<JsonApiResponse>(`${BASE_URL}/${platform}/matches/${matchId}`);
}

export async function getWeaponMastery(
  playerId: string,
  platform: string,
): Promise<JsonApiObject | null> {
  const response = await fetchPubg<JsonApiResponse>(
    `${BASE_URL}/${platform}/players/${playerId}/weapon_mastery`,
  );

  if (Array.isArray(response.data)) {
    return response.data[0] ?? null;
  }

  return response.data ?? null;
}
