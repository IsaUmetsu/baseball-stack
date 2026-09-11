import { fetchLeftOnBaseStats } from "./query";
import LeftOnBaseClient from "./LeftOnBaseClient";
import { LeftOnBaseRow } from "./types";

export const dynamic = "force-dynamic";

export default async function LeftOnBasePage({
  searchParams,
}: {
  searchParams: { startDate?: string; endDate?: string; league?: string };
}) {
  const startDate = searchParams.startDate || "2026-03-27";
  const endDate = searchParams.endDate || "2026-04-07";
  const league = searchParams.league || "ALL";

  let initialData: LeftOnBaseRow[] = [];
  let errorMsg: string | null = null;

  try {
    initialData = await fetchLeftOnBaseStats(startDate, endDate, league);
  } catch (err: any) {
    console.error("DB Error executing LeftOnBaseStats:", err);
    errorMsg = err.message || "Failed to execute database aggregation query.";
  }

  return (
    <LeftOnBaseClient
      initialData={initialData}
      startDate={startDate}
      endDate={endDate}
      league={league}
      errorMsg={errorMsg}
    />
  );
}
