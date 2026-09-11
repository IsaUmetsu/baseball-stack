import { query } from "@/lib/db";
import { InningRunsRow, TeamInningStats } from "./types";

export const INNING_RUNS_QUERY = `
SELECT
  tm.team_name,
  tm.team_initial_kana,
  tm.team_initial,
  tm.league,
  inn.inning,
  IFNULL(R.runs, 0) AS runs,
  IFNULL(RA.runs_allowed, 0) AS runs_allowed
FROM
  team_master tm
  CROSS JOIN (
    SELECT 1 AS inning UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
  ) inn
  LEFT JOIN (
    SELECT
      b_team,
      CASE WHEN ing_num >= 10 THEN 10 ELSE ing_num END AS inning,
      SUM(plus_score) AS runs
    FROM
      debug_base
    WHERE
      date BETWEEN ? AND ?
      AND plus_score > 0
    GROUP BY
      b_team,
      CASE WHEN ing_num >= 10 THEN 10 ELSE ing_num END
  ) R ON R.b_team = tm.team_initial_kana AND R.inning = inn.inning
  LEFT JOIN (
    SELECT
      p_team,
      CASE WHEN ing_num >= 10 THEN 10 ELSE ing_num END AS inning,
      SUM(plus_score) AS runs_allowed
    FROM
      debug_base
    WHERE
      date BETWEEN ? AND ?
      AND plus_score > 0
    GROUP BY
      p_team,
      CASE WHEN ing_num >= 10 THEN 10 ELSE ing_num END
  ) RA ON RA.p_team = tm.team_initial_kana AND RA.inning = inn.inning
ORDER BY
  tm.league, tm.team_initial_kana, inn.inning;
`;

export async function fetchInningRunsStats(
  startDate: string,
  endDate: string,
  leagueFilter?: string
): Promise<TeamInningStats[]> {
  const start = startDate.replace(/-/g, "");
  const end = endDate.replace(/-/g, "");

  const rows = await query<InningRunsRow[]>(INNING_RUNS_QUERY, [start, end, start, end]);

  // グループ化して TeamInningStats に変換
  const teamMap = new Map<string, TeamInningStats>();

  for (const r of rows) {
    if (leagueFilter && leagueFilter !== "ALL" && r.league !== leagueFilter) {
      continue;
    }

    if (!teamMap.has(r.team_initial_kana)) {
      teamMap.set(r.team_initial_kana, {
        team_name: r.team_name,
        team_initial_kana: r.team_initial_kana,
        team_initial: r.team_initial,
        league: r.league,
        innings: [],
        total_runs: 0,
        total_runs_allowed: 0,
        total_diff: 0,
      });
    }

    const team = teamMap.get(r.team_initial_kana)!;
    const runs = Number(r.runs) || 0;
    const runsAllowed = Number(r.runs_allowed) || 0;
    const diff = runs - runsAllowed;

    team.innings.push({
      inning: Number(r.inning),
      runs,
      runs_allowed: runsAllowed,
      diff,
    });
    team.total_runs += runs;
    team.total_runs_allowed += runsAllowed;
    team.total_diff += diff;
  }

  return Array.from(teamMap.values());
}

