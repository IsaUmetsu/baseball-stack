import { fetchInningRunsStats } from "./query";
import RunsAllowedClient from "./RunsAllowedClient";
import { TeamInningStats } from "./types";

export const dynamic = "force-dynamic";

export default async function RunsAllowedPage({
  searchParams,
}: {
  searchParams: { startDate?: string; endDate?: string; league?: string };
}) {
  const startDate = searchParams.startDate || "2026-03-27";
  const endDate = searchParams.endDate || "2026-04-07";
  const league = searchParams.league || "ALL";

  let initialData: TeamInningStats[] = [];
  let errorMsg: string | null = null;

  try {
    initialData = await fetchInningRunsStats(startDate, endDate, league);
  } catch (err: any) {
    console.error("DB Error executing InningRunsStats:", err);
    errorMsg = err.message || "Failed to execute database aggregation query.";
  }

  return (
    <RunsAllowedClient
      initialData={initialData}
      startDate={startDate}
      endDate={endDate}
      league={league}
      errorMsg={errorMsg}
    />
  );
}
