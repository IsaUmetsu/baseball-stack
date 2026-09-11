import Link from "next/link";
import {
  DateItem,
  GameItem,
  Row,
  BattingStatsRow,
  DomainHandStatsRow,
  MajorPosStatsRow,
} from "./types";
import {
  fetchDates,
  fetchGamesByDate,
  fetchGameInfo,
  fetchGameScenes,
  fetchTeamRecentStats,
  fetchTeamDomainHandStats,
  fetchTeamMajorPosStats,
} from "./queries";
import { GameNavigator } from "./components/GameNavigator";
import { GameSummaryHeader } from "./components/GameSummaryHeader";
import { GameFilterPanel } from "./components/GameFilterPanel";
import { GameTabs } from "./components/GameTabs";
import { SceneTable } from "./components/SceneTable";
import { RecentStatsTable } from "./components/RecentStatsTable";
import { DomainHandTable } from "./components/DomainHandTable";
import { MajorPosTable } from "./components/MajorPosTable";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const selectedDate = searchParams.date || "";
  const selectedGameId = searchParams.game_id ? Number(searchParams.game_id) : null;
  const currentTab = searchParams.tab || "details";

  const search = searchParams.search || "";
  const team = searchParams.team || "";
  const result = searchParams.result || "";

  let dates: DateItem[] = [];
  let games: GameItem[] = [];
  let rows: Row[] = [];
  let selectedGameInfo: GameItem | null = null;

  let awayRecentStats: BattingStatsRow[] = [];
  let homeRecentStats: BattingStatsRow[] = [];
  let awayRecentGamesCount = 0;
  let homeRecentGamesCount = 0;

  let awayDomainHandStats: DomainHandStatsRow[] = [];
  let homeDomainHandStats: DomainHandStatsRow[] = [];

  let awayMajorPosStats: MajorPosStatsRow[] = [];
  let homeMajorPosStats: MajorPosStatsRow[] = [];

  let dbErr: string | null = null;

  try {
    dates = await fetchDates();

    if (selectedDate) {
      games = await fetchGamesByDate(selectedDate);
    }

    if (selectedGameId) {
      selectedGameInfo = await fetchGameInfo(selectedGameId);
      rows = await fetchGameScenes(selectedGameId, search, team, result);

      if (currentTab === "rc5" && selectedGameInfo) {
        const awayRes = await fetchTeamRecentStats(selectedGameInfo.away_team_initial, selectedGameInfo.date);
        awayRecentStats = awayRes.stats;
        awayRecentGamesCount = awayRes.count;

        const homeRes = await fetchTeamRecentStats(selectedGameInfo.home_team_initial, selectedGameInfo.date);
        homeRecentStats = homeRes.stats;
        homeRecentGamesCount = homeRes.count;
      }

      if (currentTab === "hand" && selectedGameInfo) {
        awayDomainHandStats = await fetchTeamDomainHandStats(selectedGameInfo.away_team_initial, selectedGameInfo.date);
        homeDomainHandStats = await fetchTeamDomainHandStats(selectedGameInfo.home_team_initial, selectedGameInfo.date);
      }

      if (currentTab === "pos" && selectedGameInfo) {
        awayMajorPosStats = await fetchTeamMajorPosStats(selectedGameInfo.away_team_initial, selectedGameInfo.date);
        homeMajorPosStats = await fetchTeamMajorPosStats(selectedGameInfo.home_team_initial, selectedGameInfo.date);
      }
    }
  } catch (err: any) {
    dbErr = err?.message || "Unknown error";
  }

  const getUrl = (updates: Record<string, string | null>) => {
    const q = new URLSearchParams();
    if (selectedDate) q.set("date", selectedDate);
    if (selectedGameId) q.set("game_id", String(selectedGameId));
    if (search) q.set("search", search);
    if (team) q.set("team", team);
    if (result) q.set("result", result);
    if (currentTab) q.set("tab", currentTab);

    Object.entries(updates).forEach(([k, v]) => {
      if (v === null) {
        q.delete(k);
      } else {
        q.set(k, v);
      }
    });
    return `/?${q.toString()}`;
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* 全体ヘッダー */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 shrink-0 shadow-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            ⚾️ プロ野球データ・ビューア
          </h1>
          <p className="text-xs text-slate-400 mt-1">日付・試合ごとのドリルダウン閲覧ツール</p>
        </div>
        <div className="flex items-center gap-3 mt-2 md:mt-0">
          <Link
            href="/left-on-base"
            className="text-xs bg-slate-700 hover:bg-slate-600 hover:scale-[1.02] active:scale-[0.98] text-white font-bold px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-1.5 shadow-sm"
          >
            ⚾️ 残塁数・得点 (LOB)
          </Link>
          <Link
            href="/runs-allowed"
            className="text-xs bg-slate-700 hover:bg-slate-600 hover:scale-[1.02] active:scale-[0.98] text-white font-bold px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-1.5 shadow-sm"
          >
            ⏱️ イニング別得失点
          </Link>
          <Link
            href="/team-stats"
            className="text-xs bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] text-white font-bold px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-1.5 shadow-sm"
          >
            📊 チーム成績サマリー
          </Link>
          <div className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-2 rounded-md">
            Next.js App Router × debug_base
          </div>
        </div>
      </header>

      {dbErr ? (
        <div className="p-6 max-w-4xl mx-auto w-full grow">
          <div className="bg-red-50 border border-red-200 text-red-900 p-5 rounded-lg">
            <h2 className="font-bold mb-2">⚠️ DB接続エラー</h2>
            <p className="text-xs mb-3 font-mono">{dbErr}</p>
            <div className="text-xs text-slate-600 bg-white/60 p-3 rounded">
              docker-compose.yml 経由でデータベースが正常に起動し、ビュー debug_base が作成されているか確認してください。
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row grow overflow-hidden">
          {/* 左サイドバー: 日付一覧 & 試合一覧 */}
          <GameNavigator
            dates={dates}
            games={games}
            selectedDate={selectedDate}
            selectedGameId={selectedGameId}
            getUrl={getUrl}
          />

          {/* メイン詳細画面 (第3階層) */}
          <section className="flex-1 bg-slate-50/50 flex flex-col overflow-y-auto p-4 md:p-6">
            {!selectedGameId || !selectedGameInfo ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                <span className="text-5xl mb-4">🏟️</span>
                <p className="text-sm font-medium">左側のナビゲーターから日付と試合を選択してください。</p>
                <p className="text-xs mt-1 text-slate-400">選択した試合の詳細な1打席ごとのデータが表示されます。</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
                {/* 1. 固定サマリーヘッダー */}
                <GameSummaryHeader
                  gameInfo={selectedGameInfo}
                  lastRow={rows.length > 0 ? rows[rows.length - 1] : undefined}
                  totalScenes={rows.length}
                />

                {/* タブ選択UI */}
                <GameTabs currentTab={currentTab} getUrl={getUrl} />

                {currentTab === "details" ? (
                  <>
                    {/* 2. フィルタリングパネル */}
                    <GameFilterPanel
                      selectedDate={selectedDate}
                      selectedGameId={selectedGameId}
                      search={search}
                      team={team}
                      result={result}
                    />

                    {/* 3. シーン詳細テーブル */}
                    <SceneTable rows={rows} />
                  </>
                ) : currentTab === "rc5" ? (
                  <div className="flex flex-col gap-6">
                    <RecentStatsTable
                      teamLabel="AWAY"
                      teamInitial={selectedGameInfo.away_team_initial}
                      stats={awayRecentStats}
                      count={awayRecentGamesCount}
                    />
                    <RecentStatsTable
                      teamLabel="HOME"
                      teamInitial={selectedGameInfo.home_team_initial}
                      stats={homeRecentStats}
                      count={homeRecentGamesCount}
                    />
                  </div>
                ) : currentTab === "hand" ? (
                  <div className="flex flex-col gap-6">
                    <DomainHandTable
                      teamLabel="AWAY"
                      teamInitial={selectedGameInfo.away_team_initial}
                      stats={awayDomainHandStats}
                    />
                    <DomainHandTable
                      teamLabel="HOME"
                      teamInitial={selectedGameInfo.home_team_initial}
                      stats={homeDomainHandStats}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <MajorPosTable
                      teamLabel="AWAY"
                      teamInitial={selectedGameInfo.away_team_initial}
                      stats={awayMajorPosStats}
                    />
                    <MajorPosTable
                      teamLabel="HOME"
                      teamInitial={selectedGameInfo.home_team_initial}
                      stats={homeMajorPosStats}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
