import { NextRequest, NextResponse } from "next/server";
import { fetchStandings } from "@/app/standings/query";
import { StandingsPeriodType } from "@/app/standings/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") as StandingsPeriodType) || "season";
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
  const dow = searchParams.get("dow") ? Number(searchParams.get("dow")) : undefined;
  const league = searchParams.get("league") || undefined;

  try {
    const rows = await fetchStandings({
      periodType: period,
      month,
      dow,
      leagueFilter: league,
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch standings:", error);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
