import { query } from "@/lib/db";
import { RbiHitRow, BatterRbiRank } from "./types";

export async function fetchAvailableDates(): Promise<string[]> {
  const rows = await query<{ date: string }[]>(`
    SELECT DISTINCT gi.date
    FROM summary_point sp
    JOIN game_info gi ON sp.game_info_id = gi.id
    WHERE sp.is_rbi_hit = 1
    ORDER BY gi.date DESC;
  `);
  return rows.map((r) => r.date);
}

export async function fetchRbiHitsByDate(targetDate: string): Promise<RbiHitRow[]> {
  const d = targetDate.replace(/-/g, "");

  const sql = `
    SELECT
      sp.id,
      gi.date,
      sp.inning,
      sp.team,
      IFNULL(tm.team_initial_kana, sp.team) AS team_initial_kana,
      REPLACE(sp.batter, ' ', '') AS batter,
      sp.detail,
      sp.is_rbi_hit,
      sp.is_first,
      sp.is_tie,
      sp.is_win,
      sp.is_reversal,
      sp.is_walkoff,
      sp.is_hr
    FROM summary_point sp
    JOIN game_info gi ON sp.game_info_id = gi.id
    LEFT JOIN team_master tm ON sp.team = tm.team_name
    WHERE sp.is_rbi_hit = 1 AND gi.date = ?
    ORDER BY sp.game_info_id ASC, sp.id ASC;
  `;

  const rows = await query<any[]>(sql, [d]);
  return rows.map((r) => ({
    id: Number(r.id),
    date: String(r.date),
    inning: String(r.inning || ""),
    team: String(r.team || ""),
    team_initial_kana: String(r.team_initial_kana || ""),
    batter: String(r.batter || ""),
    detail: String(r.detail || ""),
    is_rbi_hit: Number(r.is_rbi_hit || 0),
    is_first: Number(r.is_first || 0),
    is_tie: Number(r.is_tie || 0),
    is_win: Number(r.is_win || 0),
    is_reversal: Number(r.is_reversal || 0),
    is_walkoff: Number(r.is_walkoff || 0),
    is_hr: Number(r.is_hr || 0),
  }));
}

export async function fetchBatterRbiRanking(limit = 20): Promise<BatterRbiRank[]> {
  const sql = `
    SELECT
      REPLACE(sp.batter, ' ', '') AS batter,
      sp.team,
      IFNULL(tm.team_initial_kana, sp.team) AS team_initial_kana,
      SUM(sp.is_rbi_hit) AS rbi_hits,
      SUM(sp.is_first) AS first_count,
      SUM(sp.is_tie) AS tie_count,
      SUM(sp.is_win) AS win_count,
      SUM(sp.is_reversal) AS reversal_count,
      SUM(sp.is_walkoff) AS walkoff_count,
      SUM(sp.is_hr) AS hr_count
    FROM summary_point sp
    LEFT JOIN team_master tm ON sp.team = tm.team_name
    WHERE sp.is_rbi_hit = 1
    GROUP BY REPLACE(sp.batter, ' ', ''), sp.team, tm.team_initial_kana
    ORDER BY rbi_hits DESC, win_count DESC
    LIMIT ?;
  `;

  const rows = await query<any[]>(sql, [limit]);
  return rows.map((r) => ({
    batter: String(r.batter),
    team: String(r.team),
    team_initial_kana: String(r.team_initial_kana),
    rbi_hits: Number(r.rbi_hits || 0),
    first_count: Number(r.first_count || 0),
    tie_count: Number(r.tie_count || 0),
    win_count: Number(r.win_count || 0),
    reversal_count: Number(r.reversal_count || 0),
    walkoff_count: Number(r.walkoff_count || 0),
    hr_count: Number(r.hr_count || 0),
  }));
}
