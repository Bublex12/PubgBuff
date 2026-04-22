import { NextResponse } from "next/server";

import { getMatchSummary } from "@/lib/pubg/ingestion";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { matchId } = await params;

  try {
    const summary = await getMatchSummary(matchId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
