export const BAT_RC5_QUERY = `
SELECT
  base.batter,
  base.pa,
  base.bat,
  base.hit,
  base.average,
  other.hr,
  other.rbi,
  base.b_team AS team
FROM (
  SELECT
    REPLACE(current_batter_name, ' ', '') AS batter,
    SUM(is_pa) AS pa,
    b_team,
    SUM(is_ab) AS bat,
    SUM(is_hit) AS hit,
    ROUND(SUM(is_hit) / SUM(is_ab), 3) AS average
  FROM
    baseball_2026.debug_base
  WHERE
    is_pa = 1 AND
    b_team LIKE ? AND
    g_id IN (
      SELECT id FROM (
        SELECT id FROM baseball_2026.game_info
        WHERE (home_team_initial IN (?) OR away_team_initial IN (?)) AND date <= ?
        ORDER BY date DESC LIMIT 5
      ) as recent_games
    )
  GROUP BY current_batter_name, b_team
  HAVING pa >= 15.5
) AS base
LEFT JOIN (
  SELECT
    b_team,
    name,
    REPLACE(name, ' ', '') AS batter,
    SUM(rbi) AS rbi,
    SUM(hr) AS hr
  FROM
    baseball_2026.stats_batter
  WHERE
    b_team LIKE ? AND
    game_info_id IN (
      SELECT id FROM (
        SELECT id FROM baseball_2026.game_info
        WHERE (home_team_initial IN (?) OR away_team_initial IN (?)) AND date <= ?
        ORDER BY date DESC LIMIT 5
      ) as recent_games
    )
  GROUP BY name, b_team
) AS other ON base.batter = other.batter AND base.b_team = other.b_team
LEFT JOIN
  baseball_2026.team_master tm ON base.b_team = tm.team_initial_kana
WHERE
  tm.league LIKE ?
ORDER BY average DESC;
`;