import { NextRequest, NextResponse } from "next/server";
import { fetchRbiHitsByDate, fetchBatterRbiRanking } from "@/app/rbi-hits/query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const mode = searchParams.get("mode");

  try {
    if (mode === "ranking") {
      const ranking = await fetchBatterRbiRanking(30);
      return NextResponse.json(ranking);
    }

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const hits = await fetchRbiHitsByDate(date);
    return NextResponse.json(hits);
  } catch (error) {
    console.error("Failed to fetch rbi hits:", error);
    return NextResponse.json({ error: "Failed to fetch rbi hits" }, { status: 500 });
  }
}
