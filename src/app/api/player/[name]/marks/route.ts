import { NextResponse } from "next/server";

import { getPlayerProfileMark, patchPlayerProfileMark, toMarkPayload } from "@/lib/playerProfileMarks";

type Params = {
  params: Promise<{ name: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { name } = await params;
  try {
    const mark = await getPlayerProfileMark(name);
    return NextResponse.json(toMarkPayload(mark));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { name } = await params;
  try {
    const body = (await request.json()) as { isStreamer?: boolean; isPro?: boolean };
    const next = await patchPlayerProfileMark(name, {
      isStreamer: typeof body.isStreamer === "boolean" ? body.isStreamer : undefined,
      isPro: typeof body.isPro === "boolean" ? body.isPro : undefined,
    });
    return NextResponse.json(next);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
