import { NextResponse } from "next/server";

import type { SpotlightRole } from "@/lib/config";
import { deleteSpotlightEntry, getSpotlightEntryById } from "@/lib/spotlightDb";
import { clearProfileForDeletedSpotlight } from "@/lib/spotlightProfileSync";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const row = await getSpotlightEntryById(id);
    if (!row) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    await deleteSpotlightEntry(id);
    await clearProfileForDeletedSpotlight(row.role as SpotlightRole, row.normalized);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 404 });
  }
}
