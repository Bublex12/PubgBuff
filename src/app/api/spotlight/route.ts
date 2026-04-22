import { NextResponse } from "next/server";

import { type SpotlightRole, isSpotlightRole } from "@/lib/config";
import { Prisma } from "@/generated/prisma/client";
import { createSpotlightEntry, listSpotlightRows } from "@/lib/spotlightDb";
import { applySpotlightRowToProfile } from "@/lib/spotlightProfileSync";

export async function GET() {
  try {
    const entries = await listSpotlightRows();
    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { role?: string; value?: string };
    const roleRaw = body.role?.trim();
    const value = body.value;

    if (!roleRaw || !isSpotlightRole(roleRaw)) {
      return NextResponse.json({ error: "role должен быть streamer или esports" }, { status: 400 });
    }

    const role = roleRaw as SpotlightRole;
    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json({ error: "value обязателен" }, { status: 400 });
    }

    const created = await createSpotlightEntry(role, value);
    await applySpotlightRowToProfile(role, created.value);
    return NextResponse.json({
      entry: { id: created.id, role: created.role, value: created.value },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Такая запись уже есть в этом списке" }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
