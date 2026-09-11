import { query } from "@/lib/db";
import { StandingRow, StandingsPeriodType } from "./types";

export interface StandingsQueryParams {
  periodType?: StandingsPeriodType;
  month?: number;
  dow?: number;
  startDate?: string;
  endDate?: string;
  leagueFilter?: string;
}

export async function fetchStandings(params: StandingsQueryParams = {}): Promise<StandingRow[]> {
  const {
    periodType = "season",
    month,
    dow,
    startDate,
    endDate,
    leagueFilter,
  } = params;

  const dateConditions: string[] = ["batting_result = '試合終了'", "no_game = 0"];
  const queryParams: (string | number)[] = [];

  if (periodType === "month" && month) {
    dateConditions.push("MONTH(date) = ?");
    queryParams.push(month);
  } else if (periodType === "dow" && dow) {
    dateConditions.push("DAYOFWEEK(date) = ?");
    queryParams.push(dow);
  } else if (periodType === "custom" && startDate && endDate) {
    const start = startDate.replace(/-/g, "");
    const end = endDate.replace(/-/g, "");
    dateConditions.push("date BETWEEN ? AND ?");
    queryParams.push(start, end);
  }

  const subFilter = dateConditions.length > 0 ? `WHERE ${dateConditions.join(" AND ")}` : "";

  // サブクエリ2回分（away, home）に同じ条件を適用
  const allParams = [...queryParams, ...queryParams];

  const sql = `
    SELECT
      tm.team_name,
      tm.team_initial_kana,
      tm.team_initial,
      tm.league,
      COUNT(g.result) AS games,
      SUM(CASE WHEN g.result = 'win' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN g.result = 'lose' THEN 1 ELSE 0 END) AS losses,
      SUM(CASE WHEN g.result = 'draw' THEN 1 ELSE 0 END) AS draws,
      IFNULL(ROUND(SUM(CASE WHEN g.result = 'win' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN g.result IN ('win', 'lose') THEN 1 ELSE 0 END), 0), 3), 0) AS win_rate,
      IFNULL(SUM(g.runs_scored), 0) AS runs_scored,
      IFNULL(SUM(g.runs_allowed), 0) AS runs_allowed,
      IFNULL(SUM(g.runs_scored) - SUM(g.runs_allowed), 0) AS run_diff
    FROM team_master tm
    LEFT JOIN (
      SELECT
        away_initial AS team,
        CASE
          WHEN away_score > home_score THEN 'win'
          WHEN away_score < home_score THEN 'lose'
          ELSE 'draw'
        END AS result,
        away_score AS runs_scored,
        home_score AS runs_allowed,
        date
      FROM debug_base
      ${subFilter}
      UNION ALL
      SELECT
        home_initial AS team,
        CASE
          WHEN home_score > away_score THEN 'win'
          WHEN home_score < away_score THEN 'lose'
          ELSE 'draw'
        END AS result,
        home_score AS runs_scored,
        away_score AS runs_allowed,
        date
      FROM debug_base
      ${subFilter}
    ) g ON tm.team_initial_kana = g.team
    GROUP BY tm.team_name, tm.team_initial_kana, tm.team_initial, tm.league
    ORDER BY tm.league, win_rate DESC, wins DESC, run_diff DESC;
  `;

  const rows = await query<any[]>(sql, allParams);

  const formatted: StandingRow[] = rows.map((r) => ({
    team_name: String(r.team_name),
    team_initial_kana: String(r.team_initial_kana),
    team_initial: String(r.team_initial),
    league: String(r.league),
    games: Number(r.games) || 0,
    wins: Number(r.wins) || 0,
    losses: Number(r.losses) || 0,
    draws: Number(r.draws) || 0,
    win_rate: Number(r.win_rate) || 0,
    runs_scored: Number(r.runs_scored) || 0,
    runs_allowed: Number(r.runs_allowed) || 0,
    run_diff: Number(r.run_diff) || 0,
  }));

  // 各リーグごとに首位とのゲーム差 (Games Behind) を計算
  const leagues = ["C", "P"];
  for (const l of leagues) {
    const leagueTeams = formatted.filter((t) => t.league === l);
    if (leagueTeams.length > 0) {
      const topWins = leagueTeams[0].wins;
      const topLosses = leagueTeams[0].losses;
      leagueTeams[0].games_behind = 0;

      for (let i = 1; i < leagueTeams.length; i++) {
        const gb = ((topWins - topLosses) - (leagueTeams[i].wins - leagueTeams[i].losses)) / 2;
        leagueTeams[i].games_behind = Math.max(0, gb);
      }
    }
  }

  if (leagueFilter && leagueFilter !== "ALL") {
    return formatted.filter((t) => t.league === leagueFilter);
  }

  return formatted;
}
