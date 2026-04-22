export class PubgHttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "PubgHttpError";
    this.status = status;
    this.body = body;
  }
}

/** Краткий текст из JSON:API `errors` для логов и UI. */
export function formatPubgApiErrorBody(body: string, maxLen = 480): string {
  const raw = body.trim();
  if (!raw) {
    return "";
  }
  try {
    const parsed = JSON.parse(raw) as { errors?: Array<{ detail?: string; title?: string }> };
    const first = parsed.errors?.[0];
    const line = first?.detail ?? first?.title;
    if (line) {
      return line.length > maxLen ? `${line.slice(0, maxLen)}…` : line;
    }
  } catch {
    /* не JSON */
  }
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
}
