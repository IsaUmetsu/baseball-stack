import { query } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface DateItem {
  date: string;
  count: number;
}

interface GameItem {
  id: number;
  date: string;
  away_team_initial: string;
  home_team_initial: string;
  game_no: string;
}

interface Row {
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

const TEAMS = ["ヤ", "De", "神", "巨", "広", "中", "オ", "ロ", "ソ", "楽", "日", "西"];

// 日付のフォーマット関数 (YYYYMMDD -> YYYY-MM-DD)
function formatDate(dateStr: string): string {
  if (dateStr.length === 8) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }
  return dateStr;
}

export default async function Home({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const selectedDate = searchParams.date || "";
  const selectedGameId = searchParams.game_id ? Number(searchParams.game_id) : null;
  
  const search = searchParams.search || "";
  const team = searchParams.team || "";
  const result = searchParams.result || "";

  let dates: DateItem[] = [];
  let games: GameItem[] = [];
  let rows: Row[] = [];
  let selectedGameInfo: GameItem | null = null;
  let dbErr: string | null = null;

  try {
    // 1. 日付一覧（第1階層）の取得
    dates = await query<DateItem[]>(
      `SELECT date, COUNT(*) as count 
       FROM game_info 
       WHERE no_game = 0 AND is_rg = 1 
       GROUP BY date 
       ORDER BY date DESC`
    );

    // 2. 選択された日付の試合一覧（第2階層）の取得
    if (selectedDate) {
      games = await query<GameItem[]>(
        `SELECT id, date, away_team_initial, home_team_initial, game_no 
         FROM game_info 
         WHERE date = ? AND no_game = 0 AND is_rg = 1 
         ORDER BY game_no ASC`,
        [selectedDate]
      );
    }

    // 3. 選択された試合の詳細データ（第3階層）の取得
    if (selectedGameId) {
      // 選択中試合の基本情報を取得
      const gameInfoRes = await query<GameItem[]>(
        `SELECT id, date, away_team_initial, home_team_initial, game_no 
         FROM game_info 
         WHERE id = ?`,
        [selectedGameId]
      );
      if (gameInfoRes.length > 0) {
        selectedGameInfo = gameInfoRes[0];
      }

      // 詳細データ（debug_base）の絞り込み条件
      const conditions: string[] = ["g_id = ?"];
      const params: any[] = [selectedGameId];

      if (search) {
        conditions.push("(current_batter_name LIKE ? OR current_pitcher_name LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
      }
      if (team) {
        conditions.push("(away_team_initial = ? OR home_team_initial = ? OR b_team = ? OR p_team = ?)");
        params.push(team, team, team, team);
      }
      if (result) {
        conditions.push("(batting_result LIKE ? OR pitching_result LIKE ?)");
        params.push(`%${result}%`, `%${result}%`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;
      rows = await query<Row[]>(
        `SELECT * FROM debug_base ${whereClause} ORDER BY scene ASC`,
        params
      );
    }
  } catch (err: any) {
    dbErr = err?.message || "Unknown error";
  }

  // クエリパラメータ引き継ぎ用URLビルダー
  const getUrl = (updates: Record<string, string | null>) => {
    const q = new URLSearchParams();
    if (selectedDate) q.set("date", selectedDate);
    if (selectedGameId) q.set("game_id", String(selectedGameId));
    if (search) q.set("search", search);
    if (team) q.set("team", team);
    if (result) q.set("result", result);

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
        <div className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-md mt-2 md:mt-0">
          Next.js App Router × debug_base
        </div>
      </header>

      {dbErr ? (
        <div className="p-6 max-w-4xl mx-auto w-full grow">
          <div className="bg-red-50 border border-red-200 text-red-900 p-5 rounded-lg">
            <h2 className="font-bold mb-2">⚠️ DB接続エラー</h2>
            <p className="text-xs mb-3 font-mono">{dbErr}</p>
            <div className="text-xs text-slate-600 bg-white/60 p-3 rounded">
              docker-compose.yml 経由でデータベースが正常に起動し、ビュー \`debug_base\` が作成されているか確認してください。
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row grow overflow-hidden">
          {/* 左サイドバー: 日付一覧 & 試合一覧 */}
          <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-700">試合選択ナビゲーター</h2>
              <p className="text-xs text-slate-400 mt-0.5">日付と試合を選択してください</p>
            </div>

            <div className="divide-y divide-slate-100">
              {dates.map((d) => {
                const isDateSelected = selectedDate === d.date;
                const formattedD = formatDate(d.date);
                return (
                  <div key={d.date} className="flex flex-col">
                    {/* 日付項目 */}
                    <Link
                      href={getUrl({ date: d.date, game_id: null })}
                      className={`flex justify-between items-center px-4 py-3 text-sm transition-colors ${
                        isDateSelected
                          ? "bg-blue-50/70 text-blue-800 font-semibold border-l-4 border-blue-600"
                          : "text-slate-700 hover:bg-slate-50 border-l-4 border-transparent"
                      }`}
                    >
                      <span className="font-mono">{formattedD}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {d.count}試合
                      </span>
                    </Link>

                    {/* 選択された日付に紐づく試合一覧 (第2階層) */}
                    {isDateSelected && (
                      <div className="bg-slate-50/40 pl-4 py-1.5 border-t border-slate-100 flex flex-col gap-1">
                        {games.length === 0 ? (
                          <div className="text-xs text-slate-400 p-2.5 italic">試合データがありません</div>
                        ) : (
                          games.map((g) => {
                            const isGameSelected = selectedGameId === g.id;
                            return (
                              <Link
                                key={g.id}
                                href={getUrl({ game_id: String(g.id) })}
                                className={`mr-2 px-3 py-2 rounded text-xs transition-all flex items-center justify-between ${
                                  isGameSelected
                                    ? "bg-blue-600 text-white font-medium shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                                }`}
                              >
                                <span>第 {g.game_no} 試合</span>
                                <span className="font-semibold">
                                  {g.away_team_initial} vs {g.home_team_initial}
                                </span>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {dates.length === 0 && (
                <div className="text-center p-8 text-slate-400 text-sm">日付データがありません</div>
              )}
            </div>
          </aside>

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
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold font-mono">
                        第 {selectedGameInfo.game_no} 試合
                      </span>
                      <span className="text-sm text-slate-500 font-mono font-medium">
                        {formatDate(selectedGameInfo.date)}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-wide mt-1">
                      {selectedGameInfo.away_team_initial} <span className="text-slate-400 text-lg mx-2">vs</span> {selectedGameInfo.home_team_initial}
                    </h2>
                  </div>
                  
                  {/* スコア・状況ボード (簡易表示) */}
                  {rows.length > 0 && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 flex items-center gap-4 text-center font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400 font-sans">AWAY</div>
                        <div className="text-xl font-bold text-slate-700">{rows[rows.length - 1].away_score ?? 0}</div>
                      </div>
                      <div className="text-slate-300 font-bold text-lg">-</div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-sans">HOME</div>
                        <div className="text-xl font-bold text-slate-700">{rows[rows.length - 1].home_score ?? 0}</div>
                      </div>
                      <div className="border-l border-slate-200 pl-3 text-left">
                        <div className="text-[10px] text-slate-400 font-sans">SCENES</div>
                        <div className="text-sm font-bold text-slate-600">{rows.length} プレイ</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. フィルタリングパネル */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
                  <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* 選択中の日付・試合IDを隠しフィールドで保持 */}
                    <input type="hidden" name="date" value={selectedDate} />
                    <input type="hidden" name="game_id" value={String(selectedGameId)} />
                    
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">選手名 (打者/投手)</label>
                      <input name="search" defaultValue={search} placeholder="例: 周東" className="w-full border border-slate-200 rounded px-3 py-1.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">球団</label>
                      <select name="team" defaultValue={team} className="w-full border border-slate-200 rounded px-3 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none">
                        <option value="">すべて</option>
                        {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">結果 (打撃/投球)</label>
                      <input name="result" defaultValue={result} placeholder="例: 本塁打" className="w-full border border-slate-200 rounded px-3 py-1.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button type="submit" className="flex-1 bg-blue-600 text-white text-xs py-1.5 px-3 rounded hover:bg-blue-700 transition font-bold shadow-sm">
                        絞り込み
                      </button>
                      <Link 
                        href={`/?date=${selectedDate}&game_id=${selectedGameId}`} 
                        className="border border-slate-200 text-slate-600 text-xs py-1.5 px-3 rounded hover:bg-slate-50 transition text-center font-medium bg-white"
                      >
                        クリア
                      </Link>
                    </div>
                  </form>
                </div>

                {/* 3. シーン詳細テーブル */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 flex justify-between text-xs text-slate-500 font-mono font-medium">
                    <div>該当プレイ: {rows.length} 件</div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100 font-bold text-slate-600 uppercase">
                          <th className="p-3 w-16 text-center">Scene</th>
                          <th className="p-3 text-center">回</th>
                          <th className="p-3">打者</th>
                          <th className="p-3">投手</th>
                          <th className="p-3">打撃結果</th>
                          <th className="p-3">投球結果</th>
                          <th className="p-3 text-center">カウント</th>
                          <th className="p-3 text-center">スコア</th>
                          <th className="p-3">走者</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center p-12 text-slate-400">
                              条件に一致するデータがありません
                            </td>
                          </tr>
                        ) : (
                          rows.map((r, i) => {
                            const count = `${r.prev_count_ball ?? 0}-${r.prev_count_strike ?? 0} ${r.prev_count_out ?? 0}死`;
                            const runners = [
                              r.base1_player && `①${r.base1_player}`,
                              r.base2_player && `②${r.base2_player}`,
                              r.base3_player && `③${r.base3_player}`
                            ].filter(Boolean).join(" ");
                            
                            return (
                              <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                                {/* Scene */}
                                <td className="p-3 font-mono text-center font-semibold text-slate-700 bg-slate-50/20">
                                  {r.scene}
                                </td>
                                {/* 回 */}
                                <td className="p-3 text-center whitespace-nowrap">
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                    {r.inning}
                                  </span>
                                </td>
                                {/* 打者 */}
                                <td className="p-3 font-semibold text-slate-800">
                                  {r.current_batter_name}
                                </td>
                                {/* 投手 */}
                                <td className="p-3 text-slate-700">
                                  {r.current_pitcher_name}
                                </td>
                                {/* 打撃結果 */}
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
                                    r.is_hit 
                                      ? "bg-red-50 text-red-700 border border-red-100" 
                                      : "bg-slate-50 text-slate-600"
                                  }`}>
                                    {r.batting_result || "-"}
                                  </span>
                                </td>
                                {/* 投球結果 */}
                                <td className="p-3 text-slate-500 whitespace-nowrap overflow-hidden max-w-[150px] truncate" title={r.pitching_result || ""}>
                                  {r.pitching_result || "-"}
                                </td>
                                {/* カウント */}
                                <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                                  {count}
                                </td>
                                {/* 得点 (スコア状況) */}
                                <td className="p-3 text-center font-mono text-slate-600 bg-slate-50/10 font-bold">
                                  {r.away_score ?? 0}-{r.home_score ?? 0}
                                </td>
                                {/* 走者 */}
                                <td className="p-3 text-blue-600 font-medium">
                                  {runners || "-"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
