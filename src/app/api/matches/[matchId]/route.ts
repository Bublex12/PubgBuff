import { NextRequest, NextResponse } from "next/server";

import { getCachedMatchDetail } from "@/lib/pubg/ingestion";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { matchId } = await params;

  try {
    const match = await getCachedMatchDetail(matchId);
    return NextResponse.json(match);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
