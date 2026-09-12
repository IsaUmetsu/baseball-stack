import { query } from "@/lib/db";
import { BatterLeaderRow, TeamBattingRow, BattingQueryParams } from "./types";

function buildDateWhereClause(params: BattingQueryParams, alias = "gi"): { whereClause: string; values: any[] } {
  const { periodType, month, dow } = params;
  if (periodType === "month" && month !== undefined) {
    return { whereClause: `WHERE MONTH(${alias}.date) = ?`, values: [month] };
  }
  if (periodType === "dow" && dow !== undefined) {
    return { whereClause: `WHERE DAYOFWEEK(${alias}.date) = ?`, values: [dow] };
  }
  return { whereClause: "", values: [] };
}

export async function fetchBatterLeaders(params: BattingQueryParams, limit = 25): Promise<BatterLeaderRow[]> {
  const subDate = buildDateWhereClause(params, "gi_sub");
  const mainDate = buildDateWhereClause(params, "gi");

  const queryValues = [...subDate.values, ...mainDate.values];
  let mainWhere = mainDate.whereClause;

  if (params.league && params.league !== "ALL") {
    mainWhere = mainWhere ? `${mainWhere} AND tm.league = ?` : "WHERE tm.league = ?";
    queryValues.push(params.league);
  }

  const sql = `
    SELECT 
      sb.name,
      tm.team_name AS team,
      sb.b_team AS team_initial_kana,
      tm.league,
      COUNT(DISTINCT gi.date) AS games,
      SUM(sb.ab + sb.bb + sb.hbp + sb.sh + sb.is_sf) AS pa,
      SUM(sb.ab) AS ab,
      SUM(sb.hit) AS hit,
      SUM(sb.hr) AS hr,
      SUM(sb.rbi) AS rbi,
      SUM(sb.bb) AS bb,
      SUM(sb.so) AS so,
      ROUND(SUM(sb.hit) / NULLIF(SUM(sb.ab), 0), 3) AS ave,
      ROUND((SUM(sb.hit) + SUM(sb.bb) + SUM(sb.hbp)) / NULLIF(SUM(sb.ab) + SUM(sb.bb) + SUM(sb.hbp) + SUM(sb.is_sf), 0), 3) AS obp
    FROM stats_batter sb
    JOIN game_info gi ON sb.game_info_id = gi.id
    JOIN team_master tm ON sb.b_team = tm.team_initial_kana
    JOIN (
      SELECT 
        sb_sub.b_team,
        COUNT(DISTINCT sb_sub.game_info_id) AS team_games
      FROM stats_batter sb_sub
      JOIN game_info gi_sub ON sb_sub.game_info_id = gi_sub.id
      ${subDate.whereClause}
      GROUP BY sb_sub.b_team
    ) tg ON sb.b_team = tg.b_team
    ${mainWhere}
    GROUP BY sb.name, tm.team_name, sb.b_team, tm.league, tg.team_games
    HAVING tg.team_games > 0 AND pa >= CEIL(3.1 * tg.team_games) AND ab > 0
    ORDER BY ave DESC, hit DESC
    LIMIT ?;
  `;

  queryValues.push(limit);
  const rows = await query<any[]>(sql, queryValues);

  return rows.map((r) => ({
    name: String(r.name),
    team: String(r.team),
    team_initial_kana: String(r.team_initial_kana),
    league: String(r.league),
    games: Number(r.games || 0),
    pa: Number(r.pa || 0),
    ab: Number(r.ab || 0),
    hit: Number(r.hit || 0),
    hr: Number(r.hr || 0),
    rbi: Number(r.rbi || 0),
    bb: Number(r.bb || 0),
    so: Number(r.so || 0),
    ave: Number(r.ave || 0),
    obp: Number(r.obp || 0),
  }));
}

export async function fetchTeamBatting(params: BattingQueryParams): Promise<TeamBattingRow[]> {
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
      SUM(sb.ab) AS ab,
      SUM(sb.hit) AS hit,
      SUM(sb.hr) AS hr,
      SUM(sb.rbi) AS rbi,
      SUM(sb.bb) AS bb,
      SUM(sb.so) AS so,
      ROUND(SUM(sb.hit) / NULLIF(SUM(sb.ab), 0), 3) AS ave,
      ROUND((SUM(sb.hit) + SUM(sb.bb) + SUM(sb.hbp)) / NULLIF(SUM(sb.ab) + SUM(sb.bb) + SUM(sb.hbp) + SUM(sb.is_sf), 0), 3) AS obp
    FROM stats_batter sb
    JOIN game_info gi ON sb.game_info_id = gi.id
    JOIN team_master tm ON sb.b_team = tm.team_initial_kana
    ${whereClause} ${leagueFilter}
    GROUP BY tm.team_name, tm.team_initial_kana, tm.league
    ORDER BY ave DESC;
  `;

  const rows = await query<any[]>(sql, queryValues);

  return rows.map((r) => ({
    team_name: String(r.team_name),
    team_initial_kana: String(r.team_initial_kana),
    league: String(r.league),
    games: Number(r.games || 0),
    ab: Number(r.ab || 0),
    hit: Number(r.hit || 0),
    hr: Number(r.hr || 0),
    rbi: Number(r.rbi || 0),
    bb: Number(r.bb || 0),
    so: Number(r.so || 0),
    ave: Number(r.ave || 0),
    obp: Number(r.obp || 0),
  }));
}
