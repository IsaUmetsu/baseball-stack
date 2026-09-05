import { query } from "@/lib/db";
import TeamStatsClient from "./TeamStatsClient";
import { TEAM_STATS_QUERY } from "./query";

export const dynamic = "force-dynamic";

export default async function TeamStatsPage({
  searchParams,
}: {
  searchParams: { startDate?: string; endDate?: string; league?: string };
}) {
  const startDate = searchParams.startDate || "2026-03-27";
  const endDate = searchParams.endDate || "2026-04-07";
  const league = searchParams.league || "C";

  // convert standard date (YYYY-MM-DD) to DB format (YYYYMMDD)
  const start = startDate.replace(/-/g, "");
  const end = endDate.replace(/-/g, "");

  // parameters for the 11 pairs of date bounds, plus the 1 league selection
  const params = [
    start, end, // base away
    start, end, // base home
    start, end, // away stats
    start, end, // home stats
    start, end, // bat base
    start, end, // bat spe
    start, end, // bat sc
    start, end, // era g
    start, end, // era st
    start, end, // era md
    start, end, // rbi_hit
    league
  ];

  let initialData: any[] = [];
  let errorMsg: string | null = null;

  try {
    initialData = await query<any[]>(TEAM_STATS_QUERY, params);
  } catch (err: any) {
    console.error("DB Error executing TeamStatsQuery:", err);
    errorMsg = err.message || "Failed to execute database aggregation query.";
  }

  return (
    <TeamStatsClient
      initialData={initialData}
      startDate={startDate}
      endDate={endDate}
      league={league}
      errorMsg={errorMsg}
    />
  );
}
