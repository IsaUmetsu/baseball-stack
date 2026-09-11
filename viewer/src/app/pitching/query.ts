import { query } from "@/lib/db";
import { PitcherLeaderRow, TeamPitchingRow, PitchingQueryParams } from "./types";

function buildDateWhereClause(params: PitchingQueryParams): { whereClause: string; values: any[] } {
  const { periodType, month, dow } = params;
  if (periodType === "month" && month !== undefined) {
    return { whereClause: "WHERE MONTH(gi.date) = ?", values: [month] };
  }
  if (periodType === "dow" && dow !== undefined) {
    return { whereClause: "WHERE DAYOFWEEK(gi.date) = ?", values: [dow] };
  }
  return { whereClause: "", values: [] };
}

export async function fetchPitcherLeaders(
  params: PitchingQueryParams,
  limit = 25
): Promise<PitcherLeaderRow[]> {
  const { whereClause, values } = buildDateWhereClause(params);
  const queryValues = [...values];

  const roleCondition = params.role === "reliever" ? "sp.order > 1" : "sp.order = 1";
  const roleWhere = whereClause ? `${whereClause} AND ${roleCondition}` : `WHERE ${roleCondition}`;

  let leagueFilter = "";
  if (params.league && params.league !== "ALL") {
    leagueFilter = " AND tm.league = ?";
    queryValues.push(params.league);
  }

  const minOuts = params.role === "reliever" ? 6 : 9;

  const sql = `
    SELECT 
      sp.name,
      tm.team_name AS team,
      sp.p_team AS team_initial_kana,
      tm.league,
      COUNT(DISTINCT gi.date) AS games,
      SUM(sp.outs) AS outs,
      CONCAT(FLOOR(SUM(sp.outs) / 3), IF(MOD(SUM(sp.outs), 3) > 0, CONCAT(' ', MOD(SUM(sp.outs), 3), '/3'), '')) AS ip_display,
      SUM(sp.ha) AS ha,
      SUM(sp.so) AS so,
      SUM(sp.bb) AS bb,
      SUM(sp.er) AS er,
      ROUND((SUM(sp.er) * 27) / NULLIF(SUM(sp.outs), 0), 2) AS era,
      ROUND((SUM(sp.ha) + SUM(sp.bb)) / NULLIF(SUM(sp.outs) / 3, 0), 2) AS whip
    FROM stats_pitcher sp
    JOIN game_info gi ON sp.game_info_id = gi.id
    JOIN team_master tm ON sp.p_team = tm.team_initial_kana
    ${roleWhere} ${leagueFilter}
    GROUP BY sp.name, tm.team_name, sp.p_team, tm.league
    HAVING SUM(sp.outs) >= ${minOuts}
    ORDER BY era ASC, outs DESC
    LIMIT ?;
  `;

  queryValues.push(limit);
  const rows = await query<any[]>(sql, queryValues);

  return rows.map((r) => ({
    name: String(r.name),
    team: String(r.team),
    team_initial_kana: String(r.team_initial_kana),
    league: String(r.league),
    role: params.role === "reliever" ? "reliever" : "starter",
    games: Number(r.games || 0),
    outs: Number(r.outs || 0),
    ip_display: String(r.ip_display || "0"),
    ha: Number(r.ha || 0),
    so: Number(r.so || 0),
    bb: Number(r.bb || 0),
    er: Number(r.er || 0),
    era: Number(r.era ?? 99.99),
    whip: Number(r.whip ?? 99.99),
  }));
}

export async function fetchTeamPitching(params: PitchingQueryParams): Promise<TeamPitchingRow[]> {
  const { whereClause, values } = buildDateWhereClause(params);
  let leagueFilter = "";
  const queryValues = [...values];

  if (params.league && params.league !== "ALL") {
    leagueFilter = whereClause ? " AND tm.league = ?" : "WHERE tm.league = ?";
    queryValues.push(params.league);
  }

  const sql = `
    SELECT 
      tm.team_name,
      tm.team_initial_kana,
      tm.league,
      COUNT(DISTINCT gi.date) AS games,
      ROUND(SUM(sp.outs) / 3, 1) AS total_ip,
      ROUND((SUM(sp.er) * 27) / NULLIF(SUM(sp.outs), 0), 2) AS team_era,
      ROUND((SUM(CASE WHEN sp.order = 1 THEN sp.er ELSE 0 END) * 27) / NULLIF(SUM(CASE WHEN sp.order = 1 THEN sp.outs ELSE 0 END), 0), 2) AS starter_era,
      ROUND((SUM(CASE WHEN sp.order > 1 THEN sp.er ELSE 0 END) * 27) / NULLIF(SUM(CASE WHEN sp.order > 1 THEN sp.outs ELSE 0 END), 0), 2) AS reliever_era,
      SUM(sp.so) AS total_so,
      SUM(sp.bb) AS total_bb
    FROM stats_pitcher sp
    JOIN game_info gi ON sp.game_info_id = gi.id
    JOIN team_master tm ON sp.p_team = tm.team_initial_kana
    ${whereClause} ${leagueFilter}
    GROUP BY tm.team_name, tm.team_initial_kana, tm.league
    ORDER BY team_era ASC;
  `;

  const rows = await query<any[]>(sql, queryValues);

  return rows.map((r) => ({
    team_name: String(r.team_name),
    team_initial_kana: String(r.team_initial_kana),
    league: String(r.league),
    games: Number(r.games || 0),
    total_ip: Number(r.total_ip || 0),
    team_era: Number(r.team_era ?? 99.99),
    starter_era: Number(r.starter_era ?? 99.99),
    reliever_era: Number(r.reliever_era ?? 99.99),
    total_so: Number(r.total_so || 0),
    total_bb: Number(r.total_bb || 0),
  }));
}
