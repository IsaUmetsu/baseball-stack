import { query } from "@/lib/db";
import BatRc5Client from "./BatRc5Client";
import { BAT_RC5_QUERY } from "./query";

export const dynamic = "force-dynamic";

const TEAMS = {
  H: "ソ", M: "ロ", E: "楽", F: "日", L: "西", B: "オ",
  G: "巨", T: "神", De: "デ", D: "中", C: "広", S: "ヤ",
};

const LEAGUES = {
  P: ["H", "M", "E", "F", "L", "B"],
  C: ["G", "T", "De", "D", "C", "S"],
};

export default async function BatRc5Page({
  searchParams,
}: {
  searchParams: { date?: string; league?: string; team?: string };
}) {
  const targetDate = searchParams.date || new Date().toISOString().split("T")[0];
  const targetLeague = (searchParams.league || "P") as keyof typeof LEAGUES;
  const targetTeam = searchParams.team || "%";

  let initialData: any[] = [];
  let errorMsg: string | null = null;

  try {
    const teamInitialLike = targetTeam === "%" ? "%" : TEAMS[targetTeam as keyof typeof TEAMS] || "";

    const leagueTeams = LEAGUES[targetLeague] || [];
    const teamInitialsForIn = targetTeam === "%" 
      ? leagueTeams.map(t => TEAMS[t]) 
      : [TEAMS[targetTeam as keyof typeof TEAMS]];

    const params = [
      teamInitialLike,
      teamInitialsForIn,
      teamInitialsForIn,
      targetDate.replace(/-/g, ""),
      teamInitialLike,
      teamInitialsForIn,
      teamInitialsForIn,
      targetDate.replace(/-/g, ""),
      targetLeague,
    ];

    initialData = await query<any[]>(BAT_RC5_QUERY, params);
    if (initialData.length === 0) {
        console.log("Query executed successfully, but returned 0 rows. This might be because no players met the criteria (e.g., minimum PAs).")
    }

  } catch (err: any) {
    console.error("--- DB Error in Final Implementation ---", err);
    errorMsg = err.message || "Failed to execute query.";
  }

  return (
    <BatRc5Client
      initialData={initialData}
      targetDate={targetDate}
      targetLeague={targetLeague}
      targetTeam={targetTeam}
      errorMsg={errorMsg}
    />
  );
}
