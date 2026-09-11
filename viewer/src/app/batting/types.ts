export type BattingPeriodType = "season" | "month" | "dow";

export interface BatterLeaderRow {
  name: string;
  team: string;
  team_initial_kana: string;
  league: string;
  games: number;
  ab: number;
  hit: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  ave: number;
  obp: number;
}

export interface TeamBattingRow {
  team_name: string;
  team_initial_kana: string;
  league: string;
  games: number;
  ab: number;
  hit: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  ave: number;
  obp: number;
}

export interface BattingQueryParams {
  periodType: BattingPeriodType;
  month?: number;
  dow?: number;
  league?: string;
  sortKey?: string;
}
