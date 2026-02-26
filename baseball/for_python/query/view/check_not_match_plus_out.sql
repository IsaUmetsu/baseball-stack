CREATE VIEW `check_not_match_plus_out` AS
    SELECT 
        `L`.`g_id` AS `g_id`,
        `L`.`date` AS `date`,
        `L`.`game_no` AS `game_no`,
        `L`.`away_team_initial` AS `away_team_initial`,
        `L`.`home_team_initial` AS `home_team_initial`,
        `L`.`lb_id` AS `lb_id`,
        `L`.`inning` AS `inning`,
        `L`.`batting_result` AS `batting_result`,
        `L`.`pitching_result` AS `pitching_result`,
        `L`.`current_batter_name` AS `current_batter_name`,
        `L`.`current_pitcher_name` AS `current_pitcher_name`,
        `L`.`prev_count_out` AS `prev_count_out`,
        `L`.`plus_out_count` AS `plus_out_count`,
        `L`.`after_count_out` AS `after_count_out`,
        (CASE
            WHEN ISNULL(`R`.`after_count_out`) THEN `L`.`after_count_out`
            ELSE (`L`.`after_count_out` - `R`.`after_count_out`)
        END) AS `plus_out_count_new`,
        `L`.`eol` AS `eol`
    FROM
        (((SELECT 
            `debug_base`.`g_id` AS `g_id`,
                `debug_base`.`date` AS `date`,
                `debug_base`.`game_no` AS `game_no`,
                `debug_base`.`away_team_initial` AS `away_team_initial`,
                `debug_base`.`home_team_initial` AS `home_team_initial`,
                `debug_base`.`lb_id` AS `lb_id`,
                `debug_base`.`inning` AS `inning`,
                `debug_base`.`batting_result` AS `batting_result`,
                `debug_base`.`pitching_result` AS `pitching_result`,
                `debug_base`.`current_batter_name` AS `current_batter_name`,
                `debug_base`.`current_pitcher_name` AS `current_pitcher_name`,
                `debug_base`.`prev_count_out` AS `prev_count_out`,
                `debug_base`.`plus_out_count` AS `plus_out_count`,
                `debug_base`.`after_count_out` AS `after_count_out`,
                `debug_base`.`eol` AS `eol`
        FROM
            `baseball_2025`.`debug_base`)) `L`
        LEFT JOIN (SELECT 
            `debug_base`.`g_id` AS `g_id`,
                `debug_base`.`date` AS `date`,
                `debug_base`.`game_no` AS `game_no`,
                `debug_base`.`away_team_initial` AS `away_team_initial`,
                `debug_base`.`home_team_initial` AS `home_team_initial`,
                `debug_base`.`lb_id` AS `lb_id`,
                `debug_base`.`inning` AS `inning`,
                `debug_base`.`batting_result` AS `batting_result`,
                `debug_base`.`pitching_result` AS `pitching_result`,
                `debug_base`.`current_batter_name` AS `current_batter_name`,
                `debug_base`.`current_pitcher_name` AS `current_pitcher_name`,
                `debug_base`.`prev_count_out` AS `prev_count_out`,
                `debug_base`.`plus_out_count` AS `plus_out_count`,
                `debug_base`.`after_count_out` AS `after_count_out`,
                `debug_base`.`eol` AS `eol`
        FROM
            `baseball_2025`.`debug_base`) `R` ON (((`L`.`g_id` = `R`.`g_id`)
            AND (`L`.`lb_id` = (`R`.`lb_id` + 1))
            AND (`L`.`inning` = `R`.`inning`))))
    WHERE
        (`L`.`plus_out_count` <> (CASE
            WHEN ISNULL(`R`.`after_count_out`) THEN `L`.`after_count_out`
            ELSE (`L`.`after_count_out` - `R`.`after_count_out`)
        END))