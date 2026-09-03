import { query } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Row {
  g_id: number; scene: number; date: string | null;
  away_team_initial: string | null; home_team_initial: string | null;
  away_score: number | null; home_score: number | null;
  inning: string | null; current_batter_name: string | null;
  current_pitcher_name: string | null; batting_result: string | null;
  pitching_result: string | null; prev_count_ball: number | null;
  prev_count_strike: number | null; prev_count_out: number | null;
  base1_player: string | null; base2_player: string | null;
  base3_player: string | null; is_hit: number | null;
  is_pa: number | null; is_ab: number | null;
}

const LIMIT = 50;
const TEAMS = ["ヤ", "De", "神", "巨", "広", "中", "オ", "ロ", "ソ", "楽", "日", "西"];
export default async function Home({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";
  const team = searchParams.team || "";
  const result = searchParams.result || "";
  const offset = (page - 1) * LIMIT;

  const conditions: string[] = [];
  const params: any[] = [];

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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  let rows: Row[] = [];
  let total = 0;
  let dbErr: string | null = null;

  try {
    const countRes = await query<{ count: number }[]>(`SELECT COUNT(*) as count FROM debug_base ${where}`, params);
    total = countRes[0]?.count || 0;
    rows = await query<Row[]>(
      `SELECT * FROM debug_base ${where} ORDER BY date DESC, g_id DESC, scene DESC LIMIT ? OFFSET ?`,
      [...params, LIMIT, offset]
    );
  } catch (err: any) {
    dbErr = err?.message || "Unknown error";
  }

  const totalPages = Math.ceil(total / LIMIT);
  const getUrl = (p: number, s = search, t = team, r = result) => {
    const q = new URLSearchParams({ page: String(p) });
    if (s) q.set("search", s);
    if (t) q.set("team", t);
    if (r) q.set("result", r);
    return `/?${q.toString()}`;
  };

  return (
    <main className="p-4 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            ⚾️ プロ野球データ・ビューア <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-mono font-normal">debug_base</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">MySQL内のビュー `debug_base` を表示中 (1ページ50件)</p>
        </div>
        <div className="text-xs font-mono text-slate-400">Next.js App Router MVP</div>
      </header>

      {dbErr ? (
        <div className="bg-red-50 border border-red-200 text-red-900 p-5 rounded-lg">
          <h2 className="font-bold mb-2">⚠️ DB接続エラー</h2>
          <p className="text-xs mb-3 font-mono">{dbErr}</p>
          <div className="text-xs text-slate-600 bg-white/60 p-3 rounded">
            docker-compose.yml 経由でデータベースが正常に起動し、ビュー `debug_base` が作成されているか確認してください。
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
            <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">選手名 (打者/投手)</label>
                <input name="search" defaultValue={search} placeholder="例: 周東" className="w-full border rounded px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">球団</label>
                <select name="team" defaultValue={team} className="w-full border rounded px-3 py-1.5 text-sm bg-white">
                  <option value="">すべて</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">結果 (打撃/投球)</label>
                <input name="result" defaultValue={result} placeholder="例: 本塁打" className="w-full border rounded px-3 py-1.5 text-sm" />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white text-sm py-1.5 px-3 rounded hover:bg-blue-700 transition font-medium">検索</button>
                <Link href="/" className="border text-slate-600 text-sm py-1.5 px-3 rounded hover:bg-slate-50 transition text-center">リセット</Link>
              </div>
            </form>
          </div>
          {/* Table */}
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-4">
            <div className="bg-slate-50 px-4 py-2 border-b flex justify-between text-xs text-slate-500 font-mono">
              <div>全 {total.toLocaleString()} 件 | {offset + 1} 〜 {Math.min(offset + LIMIT, total)} 件表示</div>
              <div>ページ {page} / {totalPages || 1}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b font-semibold text-slate-700 uppercase">
                    <th className="p-3 sticky left-0 bg-slate-100 z-10 border-r shadow-[1px_0_3px_rgba(0,0,0,0.05)]">試合-Scene</th>
                    <th className="p-3">日付</th>
                    <th className="p-3 text-center">対戦</th>
                    <th className="p-3 text-center">スコア</th>
                    <th className="p-3 text-center">回</th>
                    <th className="p-3">打者</th>
                    <th className="p-3">投手</th>
                    <th className="p-3">打撃結果</th>
                    <th className="p-3">投球結果</th>
                    <th className="p-3 text-center">カウント</th>
                    <th className="p-3">走者</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {rows.length === 0 ? (
                    <tr><td colSpan={11} className="text-center p-8 text-slate-400">データがありません</td></tr>
                  ) : (
                    rows.map((r, i) => {
                      const count = `${r.prev_count_ball ?? 0}-${r.prev_count_strike ?? 0} ${r.prev_count_out ?? 0}死`;
                      const runners = [r.base1_player && `①${r.base1_player}`, r.base2_player && `②${r.base2_player}`, r.base3_player && `③${r.base3_player}`].filter(Boolean).join(" ");
                      return (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-3 font-mono sticky left-0 bg-white font-semibold border-r shadow-[1px_0_3px_rgba(0,0,0,0.03)]">{r.g_id}-{r.scene}</td>
                          <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{r.date || "-"}</td>
                          <td className="p-3 text-center whitespace-nowrap">{r.away_team_initial} vs {r.home_team_initial}</td>
                          <td className="p-3 text-center font-mono text-slate-600 bg-slate-50/40">{r.away_score}-{r.home_score}</td>
                          <td className="p-3 text-center"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">{r.inning}</span></td>
                          <td className="p-3 font-medium text-slate-800">{r.current_batter_name}</td>
                          <td className="p-3 text-slate-700">{r.current_pitcher_name}</td>
                          <td className="p-3"><span className={`px-1.5 py-0.5 rounded font-medium ${r.is_hit ? "bg-red-50 text-red-700 border border-red-100" : ""}`}>{r.batting_result || "-"}</span></td>
                          <td className="p-3 text-slate-500">{r.pitching_result || "-"}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{count}</td>
                          <td className="p-3 text-blue-600">{runners || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border text-xs text-slate-600 font-sans">
              <div>ページ {page} / {totalPages}</div>
              <div className="flex gap-1 font-medium">
                {page > 1 && <Link href={getUrl(page - 1)} className="border bg-white px-2.5 py-1 rounded hover:bg-slate-50">前へ</Link>}
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let p = page - 2 + idx;
                  if (p < 1) p = idx + 1;
                  if (p > totalPages) return null;
                  return (
                    <Link key={p} href={getUrl(p)} className={`border px-2.5 py-1 rounded transition ${p === page ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-slate-50"}`}>{p}</Link>
                  );
                })}
                {page < totalPages && <Link href={getUrl(page + 1)} className="border bg-white px-2.5 py-1 rounded hover:bg-slate-50">次へ</Link>}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

