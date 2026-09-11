export interface DateItem {
  date: string;
  count: number;
}

export interface GameItem {
  id: number;
  date: string;
  away_team_initial: string;
  home_team_initial: string;
  game_no: string;
}

export interface Row {
  g_id: number;
  scene: number;
  date: string | null;
  away_team_initial: string | null;
  home_team_initial: string | null;
  away_score: number | null;
  home_score: number | null;
  inning: string | null;
  current_batter_name: string | null;
  current_pitcher_name: string | null;
  batting_result: string | null;
  pitching_result: string | null;
  prev_count_ball: number | null;
  prev_count_strike: number | null;
  prev_count_out: number | null;
  base1_player: string | null;
  base2_player: string | null;
  base3_player: string | null;
  is_hit: number | null;
  is_pa: number | null;
  is_ab: number | null;
}

export interface BattingStatsRow {
  batter: string;
  all_bat: number;
  pa: number;
  b_team: string;
  bat: number;
  hit: number;
  onbase: number;
  total_base: number;
  average: number;
  average_onbase: number;
  average_slugging: number;
  ops: number;
  hr: number;
  rbi: number;
  bb: number;
  hbp: number;
}

export interface DomainHandStatsRow {
  current_batter_name: string;
  b_team: string;
  pa: number;
  ab: number;
  hit: number;
  ave: number;
  r_pa: number;
  r_ab: number;
  r_hit: number;
  r_ave: number;
  r_diff: number;
  l_pa: number;
  l_ab: number;
  l_hit: number;
  l_ave: number;
  l_diff: number;
}

export interface MajorPosStatsRow {
  sort_order: number;
  pos_name: string;
  batter: string;
  pos_ab: number;
  total_ab: number;
  total_hit: number;
  ave: number;
  hr: number;
  rbi: number;
}

export const TEAMS = ["ヤ", "De", "神", "巨", "広", "中", "オ", "ロ", "ソ", "楽", "日", "西"];
