export interface InningRunsRow {
  team_name: string;
  team_initial_kana: string;
  team_initial: string;
  league: string;
  inning: number;
  runs: number;
  runs_allowed: number;
}

export interface TeamInningStats {
  team_name: string;
  team_initial_kana: string;
  team_initial: string;
  league: string;
  innings: {
    inning: number;
    runs: number;
    runs_allowed: number;
    diff: number;
  }[];
  total_runs: number;
  total_runs_allowed: number;
  total_diff: number;
}
