import { NextResponse } from "next/server";

/** Проверка живости для балансировщика / Docker HEALTHCHECK. */
export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
