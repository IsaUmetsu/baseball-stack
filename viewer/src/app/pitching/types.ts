export type PitchingPeriodType = "season" | "month" | "dow";

export interface PitcherLeaderRow {
  name: string;
  team: string;
  team_initial_kana: string;
  league: string;
  role: "starter" | "reliever";
  games: number;
  outs: number;
  ip_display: string;
  ha: number;
  so: number;
  bb: number;
  er: number;
  era: number;
  whip: number;
}

export interface TeamPitchingRow {
  team_name: string;
  team_initial_kana: string;
  league: string;
  games: number;
  total_ip: number;
  team_era: number;
  starter_era: number;
  reliever_era: number;
  total_so: number;
  total_bb: number;
}

export interface PitchingQueryParams {
  periodType: PitchingPeriodType;
  month?: number;
  dow?: number;
  league?: string;
  role?: "starter" | "reliever";
}
