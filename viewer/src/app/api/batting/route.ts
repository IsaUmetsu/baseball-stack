import { NextRequest, NextResponse } from "next/server";
import { fetchBatterLeaders, fetchTeamBatting } from "@/app/batting/query";
import { BattingPeriodType } from "@/app/batting/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "player";
  const periodType = (searchParams.get("period") as BattingPeriodType) || "season";
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
  const dow = searchParams.get("dow") ? Number(searchParams.get("dow")) : undefined;
  const league = searchParams.get("league") || undefined;

  const params = { periodType, month, dow, league };

  try {
    if (type === "team") {
      const rows = await fetchTeamBatting(params);
      return NextResponse.json(rows);
    } else {
      const rows = await fetchBatterLeaders(params, 30);
      return NextResponse.json(rows);
    }
  } catch (error) {
    console.error("Failed to fetch batting stats:", error);
    return NextResponse.json({ error: "Failed to fetch batting stats" }, { status: 500 });
  }
}
