import { query } from "@/lib/db";
import { LeftOnBaseRow } from "./types";

export const LEFT_ON_BASE_QUERY = `
SELECT
  L.b_team,
  IFNULL(tm.team_name, L.b_team) AS team_name,
  IFNULL(tm.team_initial, L.b_team) AS team_initial,
  IFNULL(tm.league, 'C') AS league,
  L.lob,
  IFNULL(R.runs, 0) AS runs,
  IFNULL(G.game_count, 1) AS game_count,
  ROUND(L.lob / IFNULL(G.game_count, 1), 2) AS lob_per_game,
  ROUND(IFNULL(R.runs, 0) / IFNULL(G.game_count, 1), 2) AS runs_per_game
FROM
  (
    SELECT
      debug_base.b_team,
      SUM(
        CASE WHEN base1_player IS NULL THEN 0 ELSE 1 END
        + CASE WHEN base2_player IS NULL THEN 0 ELSE 1 END
        + CASE WHEN base3_player IS NULL THEN 0 ELSE 1 END
        - CASE WHEN pitching_result LIKE '%盗塁失敗%' THEN 1 ELSE 0 END
        - CASE WHEN batting_result LIKE '%併殺%' OR pitching_result LIKE '%併殺%' THEN 1 ELSE 0 END
        - CASE WHEN pitching_result LIKE '%牽制%アウト%' THEN 1 ELSE 0 END
      ) AS lob
    FROM
      debug_base
    WHERE
      date BETWEEN ? AND ?
      AND after_count_out = 3
    GROUP BY
      b_team
  ) L
  LEFT JOIN (
    SELECT
      b_team,
      SUM(run) AS runs
    FROM
      debug_stats_batter
    WHERE
      date BETWEEN ? AND ?
    GROUP BY
      b_team
  ) R ON L.b_team = R.b_team
  LEFT JOIN (
    SELECT
      tm2.team_initial_kana,
      (IFNULL(away.cnt, 0) + IFNULL(home.cnt, 0)) AS game_count
    FROM
      team_master tm2
      LEFT JOIN (
        SELECT away_team_initial AS tm_ini, COUNT(id) AS cnt
        FROM game_info
        WHERE date BETWEEN ? AND ? AND no_game = 0 AND is_rg = 1
        GROUP BY away_team_initial
      ) away ON tm2.team_initial_kana = away.tm_ini
      LEFT JOIN (
        SELECT home_team_initial AS tm_ini, COUNT(id) AS cnt
        FROM game_info
        WHERE date BETWEEN ? AND ? AND no_game = 0 AND is_rg = 1
        GROUP BY home_team_initial
      ) home ON tm2.team_initial_kana = home.tm_ini
  ) G ON G.team_initial_kana = L.b_team
  LEFT JOIN team_master tm ON tm.team_initial_kana = L.b_team
ORDER BY
  L.lob DESC, R.runs DESC;
`;

export async function fetchLeftOnBaseStats(
  startDate: string,
  endDate: string,
  leagueFilter?: string
): Promise<LeftOnBaseRow[]> {
  const start = startDate.replace(/-/g, "");
  const end = endDate.replace(/-/g, "");

  const rows = await query<LeftOnBaseRow[]>(LEFT_ON_BASE_QUERY, [
    start, end, // L
    start, end, // R
    start, end, // G away
    start, end, // G home
  ]);

  if (!leagueFilter || leagueFilter === "ALL") {
    return rows;
  }
  return rows.filter((r) => r.league === leagueFilter);
}
