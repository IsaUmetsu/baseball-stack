export const TEAM_STATS_QUERY = `
SELECT
  total.*,
  bat.*,
  era.*,
  ROUND(era.m_cnt / total.game_cnt, 2) AS m_cnt_ave,
  ROUND(bat.run / total.game_cnt, 2) AS run_ave,
  ifnull(rbi_hit.rbi_hit, 0) as rbi_hit
FROM
  (
    SELECT
      tm.team_name,
      base.team_initial_kana,
      base.team_initial,
      base.game_cnt,
      IFNULL(away.win_count_away, 0) + IFNULL(home.win_count_home, 0) AS win_count,
      IFNULL(away.lose_count_away, 0) + IFNULL(home.lose_count_home, 0) AS lose_count,
      IFNULL(away.draw_count_away, 0) + IFNULL(home.draw_count_home, 0) AS draw_count,
      ROUND(
        (
          IFNULL(away.win_count_away, 0) + IFNULL(home.win_count_home, 0)
        ) / (
          base.game_cnt - (
            IFNULL(away.draw_count_away, 0) + IFNULL(home.draw_count_home, 0)
          )
        ),
        3
      ) AS win_rate,
      tm.hashtag
    FROM
      (
        SELECT
          tm.team_initial_kana AS team_initial_kana,
          tm.team_initial AS team_initial,
          IFNULL(away.game_cnt, 0) AS away_game_cnt,
          IFNULL(home.game_cnt, 0) AS home_game_cnt,
          (
            IFNULL(away.game_cnt, 0) + IFNULL(home.game_cnt, 0)
          ) AS game_cnt
        FROM
          (
            (
              team_master tm
              LEFT JOIN (
                SELECT
                  away_team_initial AS team_initial,
                  COUNT(away_team_initial) AS game_cnt
                FROM
                  game_info
                WHERE
                  date BETWEEN ? AND ?
                  AND no_game = 0
                  AND is_rg = 1
                GROUP BY
                  away_team_initial
              ) away ON ((away.team_initial = tm.team_initial_kana))
            )
            LEFT JOIN (
              SELECT
                home_team_initial AS team_initial,
                COUNT(home_team_initial) AS game_cnt
              FROM
                game_info
              WHERE
                date BETWEEN ? AND ?
                AND no_game = 0
                AND is_rg = 1
              GROUP BY
                home_team_initial
            ) home ON ((home.team_initial = tm.team_initial_kana))
          )
      ) base
      LEFT JOIN (
        SELECT
          away_initial AS team_initial,
          COUNT(
            away_initial = CASE
              WHEN home_score > away_score THEN home_initial
              WHEN home_score < away_score THEN away_initial
              ELSE NULL
            END
            OR NULL
          ) AS win_count_away,
          COUNT(
            away_initial = CASE
              WHEN home_score < away_score THEN home_initial
              WHEN home_score > away_score THEN away_initial
              ELSE NULL
            END
            OR NULL
          ) AS lose_count_away,
          COUNT(
            away_initial = CASE
              WHEN home_score = away_score THEN away_initial
              ELSE NULL
            END
            OR NULL
          ) AS draw_count_away,
          eol
        FROM
          debug_base
        WHERE
          no_game = 0
          AND batting_result = '試合終了'
          AND date BETWEEN ? AND ?
        GROUP BY
          away_initial
      ) away ON away.team_initial = base.team_initial_kana
      LEFT JOIN (
        SELECT
          home_initial AS team_initial,
          COUNT(
            home_initial = CASE
              WHEN home_score > away_score THEN home_initial
              WHEN home_score < away_score THEN away_initial
              ELSE NULL
            END
            OR NULL
          ) AS win_count_home,
          COUNT(
            home_initial = CASE
              WHEN home_score < away_score THEN home_initial
              WHEN home_score > away_score THEN away_initial
              ELSE NULL
            END
            OR NULL
          ) AS lose_count_home,
          COUNT(
            home_initial = CASE
              WHEN home_score = away_score THEN home_initial
              ELSE NULL
            END
            OR NULL
          ) AS draw_count_home,
          eol
        FROM
          debug_base
        WHERE
          no_game = 0
          AND batting_result = '試合終了'
          AND date BETWEEN ? AND ?
        GROUP BY
          home_initial
      ) home ON home.team_initial = base.team_initial_kana
      LEFT JOIN team_master tm ON base.team_initial_kana = tm.team_initial_kana
  ) AS total
  LEFT JOIN (
    SELECT
      base.*,
      rbi,
      run,
      hr,
      sp_ab,
      sp_hit,
      sp_ave,
      bb
    FROM
      (
        SELECT
          b_team,
          SUM(is_ab) AS ab,
          SUM(is_hit) AS hit,
          ROUND(SUM(is_hit) / SUM(is_ab), 3) AS ave,
          SUM(is_pa) AS pa,
          SUM(is_onbase) AS onbase,
          ROUND(SUM(is_onbase) / SUM(is_pa), 3) AS onbase_ave
        FROM
          debug_base
        WHERE
          date BETWEEN ? AND ?
          AND CHAR_LENGTH(b_team) > 0
        GROUP BY
          b_team
      ) base
      LEFT JOIN (
        SELECT
          b_team,
          SUM(rbi) AS rbi,
          SUM(run) AS run,
          SUM(hr) AS hr,
          SUM(bb) AS bb
        FROM
          debug_stats_batter
        WHERE
          date BETWEEN ? AND ?
        GROUP BY
          b_team
      ) spe ON base.b_team = spe.b_team
      LEFT JOIN (
        SELECT
          b_team,
          SUM(is_ab) AS sp_ab,
          SUM(is_hit) AS sp_hit,
          ROUND(SUM(is_hit) / SUM(is_ab), 3) AS sp_ave
        FROM
          debug_base
        WHERE
          date BETWEEN ? AND ?
          AND (
            base2_player IS NOT NULL
            OR base3_player IS NOT NULL
          )
        GROUP BY
          b_team
      ) sc ON base.b_team = sc.b_team
  ) bat ON total.team_initial_kana = bat.b_team
  LEFT JOIN (
    SELECT
      g.*,
      st.era AS s_era,
      CONCAT(
        st.outs DIV 3,
        CASE
          WHEN st.outs MOD 3 > 0 THEN CONCAT('.', TRUNCATE(st.outs, 0) MOD 3)
          ELSE ''
        END
      ) AS s_ip,
      st.qs,
      st.hqs,
      st.bb,
      st.win AS st_win,
      md.era AS m_era,
      md.bb AS m_bb,
      md.cnt AS m_cnt
    FROM
      (
        SELECT
          p_team AS tm,
          CONCAT(
            SUM(outs) DIV 3,
            CASE
              WHEN SUM(outs) MOD 3 > 0 THEN CONCAT('.', SUM(outs) MOD 3)
              ELSE ''
            END
          ) AS inning,
          SUM(ra) AS ra,
          SUM(er) AS er,
          SUM(hra) AS hra,
          ROUND(SUM(er) * 27 / SUM(outs), 2) AS era
        FROM
          debug_stats_pitcher sp
        WHERE
          date BETWEEN ? AND ?
        GROUP BY
          p_team
      ) AS g
      LEFT JOIN (
        SELECT
          p_team AS tm,
          CONCAT(
            SUM(outs) DIV 3,
            CASE
              WHEN SUM(outs) MOD 3 > 0 THEN CONCAT('.', SUM(outs) MOD 3)
              ELSE ''
            END
          ) AS ip,
          AVG(outs) AS outs,
          SUM(bb) AS bb,
          SUM(ra) AS ra,
          SUM(er) AS er,
          COUNT(
            result = '勝'
            OR NULL
          ) AS win,
          ROUND(SUM(er) * 27 / SUM(outs), 2) AS era,
          COUNT(
            (
              ip >= 6
              AND er <= 3
            )
            OR NULL
          ) AS qs,
          COUNT(
            (
              ip >= 7
              AND er <= 2
            )
            OR NULL
          ) AS hqs
        FROM
          debug_stats_pitcher sp
        WHERE
          sp.order = 1
          AND date BETWEEN ? AND ?
        GROUP BY
          p_team
      ) st ON g.tm = st.tm
      LEFT JOIN (
        SELECT
          p_team AS tm,
          CONCAT(
            SUM(outs) DIV 3,
            CASE
              WHEN SUM(outs) MOD 3 > 0 THEN CONCAT('.', SUM(outs) MOD 3)
              ELSE ''
            END
          ) AS inning,
          COUNT(name) AS cnt,
          SUM(bb) AS bb,
          SUM(ra) AS ra,
          SUM(er) AS er,
          ROUND(SUM(er) * 27 / SUM(outs), 2) AS era
        FROM
          debug_stats_pitcher sp
        WHERE
          sp.order > 1
          AND date BETWEEN ? AND ?
        GROUP BY
          p_team
      ) AS md ON g.tm = md.tm
  ) era ON era.tm = total.team_initial_kana
  LEFT JOIN (
    SELECT
      team_initial_kana,
      SUM(is_rbi_hit) AS rbi_hit
    FROM
      summary_point sp
      LEFT JOIN game_info gi ON sp.game_info_id = gi.id
      LEFT JOIN team_master tm ON sp.team = tm.team_name
    WHERE
      is_rbi_hit = 1 AND gi.is_rg = 1
      AND gi.date BETWEEN ? AND ?
    GROUP BY
      team_initial_kana
  ) rbi_hit ON rbi_hit.team_initial_kana = total.team_initial_kana
WHERE
  total.team_initial_kana IN (
    SELECT
      team_initial_kana
    FROM
      team_master
    WHERE league = ?
  )
ORDER BY
  win_rate DESC,
  win_count DESC;
`;
