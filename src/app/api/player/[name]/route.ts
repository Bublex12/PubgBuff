import { NextRequest, NextResponse } from "next/server";

import { getPlayerDashboard } from "@/lib/pubg/ingestion";

type Params = {
  params: Promise<{ name: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { name } = await params;
  const searchParams = request.nextUrl.searchParams;
  const forceRefresh = searchParams.get("refresh") === "1";

  try {
    const dashboard = await getPlayerDashboard(name, { forceRefresh });
    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
