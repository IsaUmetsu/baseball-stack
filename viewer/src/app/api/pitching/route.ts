import { NextRequest, NextResponse } from "next/server";
import { fetchPitcherLeaders, fetchTeamPitching } from "@/app/pitching/query";
import { PitchingPeriodType } from "@/app/pitching/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "player";
  const role = (searchParams.get("role") as "starter" | "reliever") || "starter";
  const periodType = (searchParams.get("period") as PitchingPeriodType) || "season";
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
  const dow = searchParams.get("dow") ? Number(searchParams.get("dow")) : undefined;
  const league = searchParams.get("league") || undefined;

  const params = { periodType, month, dow, league, role };

  try {
    if (type === "team") {
      const rows = await fetchTeamPitching(params);
      return NextResponse.json(rows);
    } else {
      const rows = await fetchPitcherLeaders(params, 30);
      return NextResponse.json(rows);
    }
  } catch (error) {
    console.error("Failed to fetch pitching stats:", error);
    return NextResponse.json({ error: "Failed to fetch pitching stats" }, { status: 500 });
  }
}
