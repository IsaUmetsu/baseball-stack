export interface RbiHitRow {
  id: number;
  date: string;
  inning: string;
  team: string;
  team_initial_kana: string;
  batter: string;
  detail: string;
  is_rbi_hit: number;
  is_first: number;
  is_tie: number;
  is_win: number;
  is_reversal: number;
  is_walkoff: number;
  is_hr: number;
  season_count?: number;
}

export interface BatterRbiRank {
  batter: string;
  team: string;
  team_initial_kana: string;
  rbi_hits: number;
  first_count: number;
  tie_count: number;
  win_count: number;
  reversal_count: number;
  walkoff_count: number;
  hr_count: number;
}
