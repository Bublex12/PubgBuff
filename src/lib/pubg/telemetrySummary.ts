export type TelemetryEventSummary = {
  total: number;
  byType: Record<string, number>;
};

/** PUBG telemetry: массив объектов с полем `_T` (тип события). */
export function summarizeTelemetryEvents(events: unknown[]): TelemetryEventSummary {
  const byType: Record<string, number> = {};

  for (const ev of events) {
    let key = "unknown";
    if (ev !== null && typeof ev === "object" && !Array.isArray(ev) && "_T" in ev) {
      const t = (ev as { _T?: unknown })._T;
      key = typeof t === "string" ? t : String(t ?? "unknown");
    }
    byType[key] = (byType[key] ?? 0) + 1;
  }

  return { total: events.length, byType };
}
