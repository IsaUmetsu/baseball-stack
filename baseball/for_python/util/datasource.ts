import { DataSource } from 'typeorm';
import { GameInfo, LiveHeader, LiveBody, PitchInfo, PitchCourse, PitchDetails, PitcherBatter, TeamInfo, GameOrder, BenchMemberInfo, BenchMaster, BatteryInfo, HomerunInfo, SummaryPoint, StatsPitcher, StatsBatter, StatsScoreboard } from '../entities';

const toInt = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST ?? "db",
    port: toInt(process.env.DB_PORT, 3306),
    username: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "baseball_2025",
    synchronize: false,
    entities: [GameInfo, LiveHeader, LiveBody, PitchInfo, PitchCourse, PitchDetails, PitcherBatter, TeamInfo, GameOrder, BenchMemberInfo, BenchMaster, BatteryInfo, HomerunInfo, SummaryPoint, StatsPitcher, StatsBatter, StatsScoreboard]
});
