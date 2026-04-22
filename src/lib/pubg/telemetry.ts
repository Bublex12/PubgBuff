import { gunzipSync } from "node:zlib";

import type { JsonApiObject, JsonApiResponse } from "@/lib/pubg/types";

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isTelemetryAsset(asset: JsonApiObject): boolean {
  const attrs = asset.attributes ?? {};
  const name = safeString(attrs.name).toLowerCase();
  if (name === "telemetry") {
    return true;
  }

  const url = safeString(attrs.URL) || safeString(attrs.url);
  return url.includes("telemetry") || url.includes("telemetry-cdn");
}

function getAssetUrl(asset: JsonApiObject): string {
  const attrs = asset.attributes ?? {};
  return safeString(attrs.URL) || safeString(attrs.url);
}

export function extractTelemetryUrlFromMatch(matchResponse: JsonApiResponse): string | null {
  const match = Array.isArray(matchResponse.data) ? matchResponse.data[0] : matchResponse.data;
  if (!match) {
    return null;
  }

  const included = matchResponse.included ?? [];
  const includedById = new Map(included.map((item) => [item.id, item]));

  const assetRelations = match.relationships?.assets?.data ?? [];
  for (const relation of assetRelations) {
    const asset = includedById.get(relation.id);
    if (!asset || asset.type !== "asset") {
      continue;
    }
    if (!isTelemetryAsset(asset)) {
      continue;
    }

    const url = getAssetUrl(asset);
    if (url) {
      return url;
    }
  }

  for (const item of included) {
    if (item.type !== "asset") {
      continue;
    }
    if (!isTelemetryAsset(item)) {
      continue;
    }
    const url = getAssetUrl(item);
    if (url) {
      return url;
    }
  }

  return null;
}

function isGzipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

function looksLikeJsonPrefix(text: string): boolean {
  const t = text.trim();
  return t.startsWith("[") || t.startsWith("{");
}

export async function downloadTelemetryEvents(telemetryUrl: string): Promise<unknown[]> {
  const response = await fetch(telemetryUrl, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telemetry download failed (${response.status}): ${body}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("Telemetry download returned empty body");
  }

  // Реальные gzip-байты начинаются с 1f 8b (RFC 1952). Нельзя ориентироваться только на
  // Content-Encoding / .gz в URL: undici часто уже распаковывает тело, а заголовок может
  // остаться — тогда gunzip даёт "incorrect header check".
  if (isGzipBuffer(buffer)) {
    const jsonText = gunzipSync(buffer).toString("utf8");
    return JSON.parse(jsonText) as unknown[];
  }

  const asUtf8 = buffer.toString("utf8");
  if (looksLikeJsonPrefix(asUtf8)) {
    return JSON.parse(asUtf8.trim()) as unknown[];
  }

  const headHex = buffer.subarray(0, Math.min(8, buffer.length)).toString("hex");
  throw new Error(
    `Telemetry payload is neither gzip (magic 1f8b) nor JSON text. URL ends: …${telemetryUrl.slice(-48)} · head: ${headHex}`,
  );
}
