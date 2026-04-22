import { NextResponse } from "next/server";

import { getTelemetryJob, requestTelemetryForMatch } from "@/lib/pubg/ingestion";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { matchId } = await params;

  try {
    const job = await getTelemetryJob(matchId);
    if (!job) {
      return NextResponse.json({ status: "idle" });
    }

    return NextResponse.json({
      status: job.status,
      eventCount: job.eventCount,
      errorMessage: job.errorMessage,
      fetchedAt: job.fetchedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { matchId } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  try {
    const result = await requestTelemetryForMatch(matchId, { force });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
