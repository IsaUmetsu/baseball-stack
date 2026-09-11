import { query } from "@/lib/db";
import {
  DateItem,
  GameItem,
  Row,
  BattingStatsRow,
  DomainHandStatsRow,
  MajorPosStatsRow,
} from "./types";

// 1. 日付一覧（第1階層）の取得
export async function fetchDates(): Promise<DateItem[]> {
  return await query<DateItem[]>(
    `SELECT date, COUNT(*) as count 
     FROM game_info 
     WHERE no_game = 0 AND is_rg = 1 
     GROUP BY date 
     ORDER BY date DESC`
  );
}

// 2. 選択された日付の試合一覧（第2階層）の取得
export async function fetchGamesByDate(selectedDate: string): Promise<GameItem[]> {
  return await query<GameItem[]>(
    `SELECT id, date, away_team_initial, home_team_initial, game_no 
     FROM game_info 
     WHERE date = ? AND no_game = 0 AND is_rg = 1 
     ORDER BY game_no ASC`,
    [selectedDate]
  );
}

// 3. 選択中試合の基本情報を取得
export async function fetchGameInfo(gameId: number): Promise<GameItem | null> {
  const gameInfoRes = await query<GameItem[]>(
    `SELECT id, date, away_team_initial, home_team_initial, game_no 
     FROM game_info 
     WHERE id = ?`,
    [gameId]
  );
  return gameInfoRes.length > 0 ? gameInfoRes[0] : null;
}

// 4. 試合詳細シーン（debug_base）の取得
export async function fetchGameScenes(
  gameId: number,
  search?: string,
  team?: string,
  result?: string
): Promise<Row[]> {
  const conditions: string[] = ["g_id = ?"];
  const params: any[] = [gameId];

  if (search) {
    conditions.push("(current_batter_name LIKE ? OR current_pitcher_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (team) {
    conditions.push("(away_team_initial = ? OR home_team_initial = ? OR b_team = ? OR p_team = ?)");
    params.push(team, team, team, team);
  }
  if (result) {
    conditions.push("(batting_result LIKE ? OR pitching_result LIKE ?)");
    params.push(`%${result}%`, `%${result}%`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  return await query<Row[]>(
    `SELECT * FROM debug_base ${whereClause} ORDER BY scene ASC`,
    params
  );
}

// 5. 直近5試合の成績を動的に取得するヘルパー関数
export async function fetchTeamRecentStats(teamInitial: string, selectedDate: string) {
  const games = await query<{ id: number }[]>(
    `SELECT id FROM game_info 
     WHERE (away_team_initial = ? OR home_team_initial = ?) 
       AND no_game = 0 
       AND is_rg = 1 
       AND date <= ? 
     ORDER BY date DESC, game_no DESC
     LIMIT 5`,
    [teamInitial, teamInitial, selectedDate]
  );
  if (games.length === 0) {
    return { stats: [], count: 0 };
  }
  const gameIds = games.map((g) => g.id);
  const placeholders = gameIds.map(() => "?").join(",");
  const sql = `
    SELECT 
      base.batter AS batter,
      base.all_bat AS all_bat,
      base.pa AS pa,
      base.b_team AS b_team,
      base.bat AS bat,
      base.hit AS hit,
      base.onbase AS onbase,
      base.total_base AS total_base,
      base.average AS average,
      base.average_onbase AS average_onbase,
      base.average_slugging AS average_slugging,
      (base.average_onbase + base.average_slugging) AS ops,
      IFNULL(other.hr, 0) AS hr,
      IFNULL(other.rbi, 0) AS rbi,
      IFNULL(other.bb, 0) AS bb,
      IFNULL(other.hbp, 0) AS hbp
    FROM (
      SELECT 
        REPLACE(current_batter_name, ' ', '') AS batter,
        COUNT(current_batter_name) AS all_bat,
        SUM(is_pa) AS pa,
        b_team,
        SUM(is_ab) AS bat,
        SUM(is_hit) AS hit,
        SUM(is_onbase) AS onbase,
        SUM(total_base) AS total_base,
        ROUND((SUM(is_hit) / SUM(is_ab)), 3) AS average,
        ROUND((SUM(is_onbase) / SUM(is_pa)), 3) AS average_onbase,
        ROUND((SUM(total_base) / SUM(is_pa)), 3) AS average_slugging
      FROM debug_base 
      WHERE is_pa = 1 
        AND b_team = ? 
        AND g_id IN (${placeholders})
      GROUP BY current_batter_name, b_team
      HAVING pa >= (3.1 * ?)
    ) base 
    LEFT JOIN (
      SELECT 
        b_team,
        name,
        REPLACE(name, ' ', '') AS batter,
        SUM(rbi) AS rbi,
        SUM(hr) AS hr,
        SUM(bb) AS bb,
        SUM(hbp) AS hbp
      FROM stats_batter 
      WHERE b_team = ? 
        AND game_info_id IN (${placeholders})
      GROUP BY name, b_team
    ) other 
    ON base.batter = other.batter AND base.b_team = other.b_team
    ORDER BY ops DESC, average DESC
  `;
  const params = [
    teamInitial,
    ...gameIds,
    games.length,
    teamInitial,
    ...gameIds,
  ];
  const stats = await query<BattingStatsRow[]>(sql, params);
  return { stats, count: games.length };
}

// 6. 対左右投手成績を取得するヘルパー関数
export async function fetchTeamDomainHandStats(teamInitial: string, selectedDate: string) {
  const sql = `
    SELECT 
      REPLACE(total.current_batter_name, ' ', '') AS current_batter_name,
      total.b_team,
      total.pa, total.ab, total.hit,
      total.ave,
      IFNULL(R.r_pa, 0) AS r_pa,
      IFNULL(R.r_ab, 0) AS r_ab,
      IFNULL(R.r_hit, 0) AS r_hit,
      IFNULL(R.r_ave, 0) AS r_ave,
      ROUND(IFNULL(R.r_ave, 0) - total.ave, 3) AS r_diff,
      IFNULL(L.l_pa, 0) AS l_pa,
      IFNULL(L.l_ab, 0) AS l_ab,
      IFNULL(L.l_hit, 0) AS l_hit,
      IFNULL(L.l_ave, 0) AS l_ave,
      ROUND(IFNULL(L.l_ave, 0) - total.ave, 3) AS l_diff
    FROM
      (
        SELECT 
          base.current_batter_name,
          base.b_team,
          SUM(base.is_pa) AS pa,
          SUM(base.is_ab) AS ab,
          SUM(base.is_hit) AS hit,
          ROUND(SUM(base.is_hit) / SUM(base.is_ab), 3) AS ave,
          game.game_cnt
        FROM
          debug_base base
        LEFT JOIN (
          SELECT 
            tm.team_initial_kana AS team_initial,
            IFNULL(away.game_cnt, 0) + IFNULL(home.game_cnt, 0) AS game_cnt
          FROM
            team_master tm
          LEFT JOIN (
            SELECT 
              away_team_initial AS team_initial,
              COUNT(away_team_initial) AS game_cnt
            FROM
              game_info
            WHERE
              no_game = 0
              AND is_rg = 1
              AND date <= ?
            GROUP BY away_team_initial
          ) AS away ON away.team_initial = tm.team_initial_kana
          LEFT JOIN (
            SELECT 
              home_team_initial AS team_initial,
              COUNT(home_team_initial) AS game_cnt
            FROM
              game_info
            WHERE
              no_game = 0
              AND is_rg = 1
              AND date <= ?
            GROUP BY home_team_initial
          ) AS home ON home.team_initial = tm.team_initial_kana
        ) game ON game.team_initial = base.b_team
        WHERE
          CHAR_LENGTH(base.current_batter_name) > 0
          AND base.date <= ?
        GROUP BY base.current_batter_name, base.b_team
        HAVING pa >= 2 * IFNULL(game.game_cnt, 0)
      ) AS total
      LEFT JOIN (
        SELECT 
          current_batter_name,
          b_team,
          SUM(is_pa) AS r_pa,
          SUM(is_ab) AS r_ab,
          SUM(is_hit) AS r_hit,
          ROUND(SUM(is_hit) / SUM(is_ab), 3) AS r_ave
        FROM
          debug_base base
        WHERE
          CHAR_LENGTH(current_batter_name) > 0
          AND current_pitcher_domain_hand = '右投'
          AND date <= ?
        GROUP BY current_batter_name, b_team
      ) AS R ON R.current_batter_name = total.current_batter_name AND R.b_team = total.b_team
      LEFT JOIN (
        SELECT 
          current_batter_name,
          b_team,
          SUM(is_pa) AS l_pa,
          SUM(is_ab) AS l_ab,
          SUM(is_hit) AS l_hit,
          ROUND(SUM(is_hit) / SUM(is_ab), 3) AS l_ave
        FROM
          debug_base base
        WHERE
          CHAR_LENGTH(current_batter_name) > 0
          AND current_pitcher_domain_hand = '左投'
          AND date <= ?
        GROUP BY current_batter_name, b_team
      ) AS L ON L.current_batter_name = total.current_batter_name AND L.b_team = total.b_team
    WHERE total.b_team = ?
    ORDER BY ave DESC
  `;
  const params = [selectedDate, selectedDate, selectedDate, selectedDate, selectedDate, teamInitial];
  return await query<DomainHandStatsRow[]>(sql, params);
}


// 7. 主要守備位置別成績を取得するヘルパー関数
export async function fetchTeamMajorPosStats(teamInitial: string, selectedDate: string) {
  const sql = `
    WITH pos_list AS (
      SELECT '捕' AS pos, '捕手' AS pos_name, 1 AS sort_order UNION ALL
      SELECT '一', '一塁手', 2 UNION ALL
      SELECT '二', '二塁手', 3 UNION ALL
      SELECT '三', '三塁手', 4 UNION ALL
      SELECT '遊', '遊撃手', 5 UNION ALL
      SELECT '左', '左翼手', 6 UNION ALL
      SELECT '中', '中堅手', 7 UNION ALL
      SELECT '右', '右翼手', 8 UNION ALL
      SELECT '指', '指名打者', 9
    ),
    pos_batter_ab AS (
      SELECT
        p.pos,
        p.pos_name,
        p.sort_order,
        sb.b_team,
        sb.name,
        SUM(sb.ab) AS pos_ab
      FROM pos_list p
      JOIN stats_batter sb ON sb.position LIKE CONCAT('%', p.pos, '%')
      JOIN game_info gi ON sb.game_info_id = gi.id
      WHERE gi.date <= ?
        AND gi.no_game = 0
        AND gi.is_rg = 1
        AND sb.b_team = ?
      GROUP BY p.pos, p.pos_name, p.sort_order, sb.b_team, sb.name
    ),
    ranked_pos AS (
      SELECT
        pos,
        pos_name,
        sort_order,
        b_team,
        name,
        pos_ab,
        ROW_NUMBER() OVER (PARTITION BY pos, b_team ORDER BY pos_ab DESC, name ASC) AS rn
      FROM pos_batter_ab
    ),
    top_players AS (
      SELECT pos, pos_name, sort_order, b_team, name, pos_ab
      FROM ranked_pos
      WHERE rn = 1
    )
    SELECT
      tp.sort_order,
      tp.pos_name,
      REPLACE(tp.name, ' ', '') AS batter,
      tp.pos_ab,
      SUM(sb.ab) AS total_ab,
      SUM(sb.hit) AS total_hit,
      ROUND(SUM(sb.hit) / SUM(sb.ab), 3) AS ave,
      SUM(sb.hr) AS hr,
      SUM(sb.rbi) AS rbi
    FROM top_players tp
    JOIN stats_batter sb ON sb.b_team = tp.b_team AND sb.name = tp.name
    JOIN game_info gi ON sb.game_info_id = gi.id
    WHERE gi.date <= ?
      AND gi.no_game = 0
      AND gi.is_rg = 1
    GROUP BY tp.sort_order, tp.pos_name, tp.name, tp.pos_ab
    ORDER BY tp.sort_order ASC
  `;
  return await query<MajorPosStatsRow[]>(sql, [selectedDate, teamInitial, selectedDate]);
}

