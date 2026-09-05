import { query } from "@/lib/db";
import BatRc5Client from "./BatRc5Client";
import { BAT_RC5_QUERY, BAT_RC5_LEAGUE_QUERY } from "./query";

export const dynamic = "force-dynamic";

const TEAMS = {
  H: "ソ", M: "ロ", E: "楽", F: "日", L: "西", B: "オ",
  G: "巨", T: "神", De: "デ", D: "中", C: "広", S: "ヤ",
};

const LEAGUES = {
  P: ["H", "M", "E", "F", "L", "B"],
  C: ["G", "T", "De", "D", "C", "S"],
  NPB: ["H", "M", "E", "F", "L", "B", "G", "T", "De", "D", "C", "S"],
};

const LEAGUE_TEAM_INITIALS = {
  P: ['ソ', 'ロ', '楽', '日', '西', 'オ'],
  C: ['巨', '神', 'デ', '中', '広', 'ヤ'],
  NPB: ['ソ', 'ロ', '楽', '日', '西', 'オ', '巨', '神', 'デ', '中', '広', 'ヤ'],
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
    let q: string;
    let params: any[];

    if (targetTeam === "%") {
      q = BAT_RC5_LEAGUE_QUERY;
      params = [LEAGUE_TEAM_INITIALS[targetLeague]];
    } else {
      q = BAT_RC5_QUERY;
      const teamInitialLike = TEAMS[targetTeam as keyof typeof TEAMS] || "";
      const leagueTeams = LEAGUES[targetLeague] || [];
      const teamInitialsForIn = [TEAMS[targetTeam as keyof typeof TEAMS]];

      params = [
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
    }
    
    initialData = await query<any[]>(q, params);
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
