export interface StandingRow {
  team_name: string;
  team_initial_kana: string;
  team_initial: string;
  league: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  games_behind?: number;
  runs_scored: number;
  runs_allowed: number;
  run_diff: number;
}

export type StandingsPeriodType = "season" | "month" | "dow" | "custom";
