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

interface BattingStatsRow {
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

interface DomainHandStatsRow {
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

interface MajorPosStatsRow {
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

const TEAMS = ["ヤ", "De", "神", "巨", "広", "中", "オ", "ロ", "ソ", "楽", "日", "西"];

// 日付のフォーマット関数 (YYYYMMDD -> YYYY-MM-DD)
function formatDate(dateStr: string): string {
  if (dateStr.length === 8) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }
  return dateStr;
}

// 少数フォーマット用関数
function formatDecimal(val: any, digits: number = 3): string {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  return num.toFixed(digits);
}

// 差分フォーマット用関数
function formatDiff(val: any): string {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  const str = num.toFixed(3);
  return num > 0 ? `+${str}` : str;
}
// 直近5試合の成績を動的に取得するヘルパー関数
async function fetchTeamRecentStats(teamInitial: string, selectedDate: string) {
  const games = await query<{ id: number }[]>(
    `SELECT id FROM game_info 
     WHERE (away_team_initial = ? OR home_team_initial = ?) 
       AND no_game = 0 
       AND is_rg = 1 
       AND date <= ? 
     ORDER BY date DESC, game_no DESC
     LIMIT 5`,
    [teamInitial, teamInitial, selectedDate]
  );
  if (games.length === 0) {
    return { stats: [], count: 0 };
  }
  const gameIds = games.map(g => g.id);
  const placeholders = gameIds.map(() => "?").join(",");
  const sql = `
    SELECT 
      base.batter AS batter,
      base.all_bat AS all_bat,
      base.pa AS pa,
      base.b_team AS b_team,
      base.bat AS bat,
      base.hit AS hit,
      base.onbase AS onbase,
      base.total_base AS total_base,
      base.average AS average,
      base.average_onbase AS average_onbase,
      base.average_slugging AS average_slugging,
      (base.average_onbase + base.average_slugging) AS ops,
      IFNULL(other.hr, 0) AS hr,
      IFNULL(other.rbi, 0) AS rbi,
      IFNULL(other.bb, 0) AS bb,
      IFNULL(other.hbp, 0) AS hbp
    FROM (
      SELECT 
        REPLACE(current_batter_name, ' ', '') AS batter,
        COUNT(current_batter_name) AS all_bat,
        SUM(is_pa) AS pa,
        b_team,
        SUM(is_ab) AS bat,
        SUM(is_hit) AS hit,
        SUM(is_onbase) AS onbase,
        SUM(total_base) AS total_base,
        ROUND((SUM(is_hit) / SUM(is_ab)), 3) AS average,
        ROUND((SUM(is_onbase) / SUM(is_pa)), 3) AS average_onbase,
        ROUND((SUM(total_base) / SUM(is_pa)), 3) AS average_slugging
      FROM debug_base 
      WHERE is_pa = 1 
        AND b_team = ? 
        AND g_id IN (${placeholders})
      GROUP BY current_batter_name, b_team
      HAVING pa >= (3.1 * ?)
    ) base 
    LEFT JOIN (
      SELECT 
        b_team,
        name,
        REPLACE(name, ' ', '') AS batter,
        SUM(rbi) AS rbi,
        SUM(hr) AS hr,
        SUM(bb) AS bb,
        SUM(hbp) AS hbp
      FROM stats_batter 
      WHERE b_team = ? 
        AND game_info_id IN (${placeholders})
      GROUP BY name, b_team
    ) other 
    ON base.batter = other.batter AND base.b_team = other.b_team
    ORDER BY ops DESC, average DESC
  `;
  const params = [
    teamInitial, ...gameIds, games.length,
    teamInitial, ...gameIds
  ];
  const stats = await query<BattingStatsRow[]>(sql, params);
  return { stats, count: games.length };
}
// 統計情報のテーブルを表示するコンポーネント（横スクロール・ヘッダー固定・選手名固定対応）
function renderStatsTable(teamLabel: string, teamInitial: string, stats: BattingStatsRow[], count: number) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
        <div className="font-bold text-slate-700 text-sm">
          {teamLabel}: {teamInitial} 球団 (直近 {count} 試合の打撃成績)
        </div>
        <div className="text-xs text-slate-400">規定打席: {(count * 3.1).toFixed(1)} PA以上</div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse relative">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr className="border-b border-slate-100 font-bold text-slate-600 uppercase text-center">
              <th className="p-3 text-left sticky left-0 bg-slate-50 z-20 min-w-[100px]">打者</th>
              <th className="p-3 min-w-[60px]">打席</th>
              <th className="p-3 min-w-[60px]">打数</th>
              <th className="p-3 min-w-[60px]">安打</th>
              <th className="p-3 min-w-[60px]">本塁打</th>
              <th className="p-3 min-w-[60px]">打点</th>
              <th className="p-3 min-w-[60px]">四球</th>
              <th className="p-3 min-w-[60px]">死球</th>
              <th className="p-3 min-w-[70px]">打率</th>
              <th className="p-3 min-w-[70px]">出塁率</th>
              <th className="p-3 min-w-[70px]">長打率</th>
              <th className="p-3 min-w-[70px] bg-blue-50/50">OPS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center p-12 text-slate-400">
                  該当選手がいません（規定打席に達している選手がいません）
                </td>
              </tr>
            ) : (
              stats.map((s, i) => (
                <tr key={i} className="hover:bg-blue-50/20 transition-colors text-center">
                  <td className="p-3 text-left font-semibold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {s.batter}
                  </td>
                  <td className="p-3 font-mono text-slate-600">{s.pa}</td>
                  <td className="p-3 font-mono text-slate-600">{s.bat}</td>
                  <td className="p-3 font-mono text-slate-600">{s.hit}</td>
                  <td className="p-3 font-mono text-slate-600 font-semibold">{s.hr}</td>
                  <td className="p-3 font-mono text-slate-600 font-semibold">{s.rbi}</td>
                  <td className="p-3 font-mono text-slate-600">{s.bb}</td>
                  <td className="p-3 font-mono text-slate-600">{s.hbp}</td>
                  <td className="p-3 font-mono text-slate-700 font-medium">
                    {formatDecimal(s.average)}
                  </td>
                  <td className="p-3 font-mono text-slate-700">
                    {formatDecimal(s.average_onbase)}
                  </td>
                  <td className="p-3 font-mono text-slate-700">
                    {formatDecimal(s.average_slugging)}
                  </td>
                  <td className="p-3 font-mono font-bold text-blue-600 bg-blue-50/20">
                    {formatDecimal(s.ops)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 対左右投手成績を取得するヘルパー関数
async function fetchTeamDomainHandStats(teamInitial: string, selectedDate: string) {
  const sql = `
    SELECT 
      REPLACE(total.current_batter_name, ' ', '') AS current_batter_name,
      total.b_team,
      total.pa, total.ab, total.hit,
      total.ave,
      IFNULL(R.r_pa, 0) AS r_pa,
      IFNULL(R.r_ab, 0) AS r_ab,
      IFNULL(R.r_hit, 0) AS r_hit,
      IFNULL(R.r_ave, 0) AS r_ave,
      ROUND(IFNULL(R.r_ave, 0) - total.ave, 3) AS r_diff,
      IFNULL(L.l_pa, 0) AS l_pa,
      IFNULL(L.l_ab, 0) AS l_ab,
      IFNULL(L.l_hit, 0) AS l_hit,
      IFNULL(L.l_ave, 0) AS l_ave,
      ROUND(IFNULL(L.l_ave, 0) - total.ave, 3) AS l_diff
    FROM
      (
        SELECT 
          base.current_batter_name,
          base.b_team,
          SUM(base.is_pa) AS pa,
          SUM(base.is_ab) AS ab,
          SUM(base.is_hit) AS hit,
          ROUND(SUM(base.is_hit) / SUM(base.is_ab), 3) AS ave,
          game.game_cnt
        FROM
          debug_base base
        LEFT JOIN (
          SELECT 
            tm.team_initial_kana AS team_initial,
            IFNULL(away.game_cnt, 0) + IFNULL(home.game_cnt, 0) AS game_cnt
          FROM
            team_master tm
          LEFT JOIN (
            SELECT 
              away_team_initial AS team_initial,
              COUNT(away_team_initial) AS game_cnt
            FROM
              game_info
            WHERE
              no_game = 0
              AND is_rg = 1
              AND date <= ?
            GROUP BY away_team_initial
          ) AS away ON away.team_initial = tm.team_initial_kana
          LEFT JOIN (
            SELECT 
              home_team_initial AS team_initial,
              COUNT(home_team_initial) AS game_cnt
            FROM
              game_info
            WHERE
              no_game = 0
              AND is_rg = 1
              AND date <= ?
            GROUP BY home_team_initial
          ) AS home ON home.team_initial = tm.team_initial_kana
        ) game ON game.team_initial = base.b_team
        WHERE
          CHAR_LENGTH(base.current_batter_name) > 0
          AND base.date <= ?
        GROUP BY base.current_batter_name, base.b_team
        HAVING pa >= 2 * IFNULL(game.game_cnt, 0)
      ) AS total
      LEFT JOIN (
        SELECT 
          current_batter_name,
          b_team,
          SUM(is_pa) AS r_pa,
          SUM(is_ab) AS r_ab,
          SUM(is_hit) AS r_hit,
          ROUND(SUM(is_hit) / SUM(is_ab), 3) AS r_ave
        FROM
          debug_base base
        WHERE
          CHAR_LENGTH(current_batter_name) > 0
          AND current_pitcher_domain_hand = '右投'
          AND date <= ?
        GROUP BY current_batter_name, b_team
      ) AS R ON R.current_batter_name = total.current_batter_name AND R.b_team = total.b_team
      LEFT JOIN (
        SELECT 
          current_batter_name,
          b_team,
          SUM(is_pa) AS l_pa,
          SUM(is_ab) AS l_ab,
          SUM(is_hit) AS l_hit,
          ROUND(SUM(is_hit) / SUM(is_ab), 3) AS l_ave
        FROM
          debug_base base
        WHERE
          CHAR_LENGTH(current_batter_name) > 0
          AND current_pitcher_domain_hand = '左投'
          AND date <= ?
        GROUP BY current_batter_name, b_team
      ) AS L ON L.current_batter_name = total.current_batter_name AND L.b_team = total.b_team
    WHERE total.b_team = ?
    ORDER BY ave DESC
  `;
  const params = [selectedDate, selectedDate, selectedDate, selectedDate, selectedDate, teamInitial];
  return await query<DomainHandStatsRow[]>(sql, params);
}

// 対左右成績テーブル描画ヘルパー関数
function renderDomainHandTable(teamLabel: string, teamInitial: string, stats: DomainHandStatsRow[]) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
        <div className="font-bold text-slate-700 text-sm">
          {teamLabel}: {teamInitial} 球団 (対左右投手 打撃成績)
        </div>
        <div className="text-xs text-slate-400">規定: 試合数 × 2 打席以上</div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse relative">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr className="border-b border-slate-100 font-bold text-slate-600 uppercase text-center">
              <th className="p-3 text-left sticky left-0 bg-slate-50 z-20 min-w-[100px]" rowSpan={2}>打者</th>
              <th className="p-2 border-b border-r border-slate-200 bg-slate-100/70" colSpan={4}>通算</th>
              <th className="p-2 border-b border-r border-slate-200 bg-amber-50/70 text-amber-900" colSpan={5}>対右投手</th>
              <th className="p-2 border-b border-slate-200 bg-emerald-50/70 text-emerald-900" colSpan={5}>対左投手</th>
            </tr>
            <tr className="border-b border-slate-100 font-bold text-slate-600 uppercase text-center text-[11px]">
              {/* 通算 */}
              <th className="p-2 min-w-[50px] bg-slate-50">打席</th>
              <th className="p-2 min-w-[50px] bg-slate-50">打数</th>
              <th className="p-2 min-w-[50px] bg-slate-50">安打</th>
              <th className="p-2 min-w-[60px] bg-slate-50 border-r border-slate-200">打率</th>
              {/* 対右 */}
              <th className="p-2 min-w-[50px] bg-amber-50/30">打席</th>
              <th className="p-2 min-w-[50px] bg-amber-50/30">打数</th>
              <th className="p-2 min-w-[50px] bg-amber-50/30">安打</th>
              <th className="p-2 min-w-[60px] bg-amber-50/30 font-bold text-amber-900">打率</th>
              <th className="p-2 min-w-[60px] bg-amber-50/30 border-r border-slate-200">差分</th>
              {/* 対左 */}
              <th className="p-2 min-w-[50px] bg-emerald-50/30">打席</th>
              <th className="p-2 min-w-[50px] bg-emerald-50/30">打数</th>
              <th className="p-2 min-w-[50px] bg-emerald-50/30">安打</th>
              <th className="p-2 min-w-[60px] bg-emerald-50/30 font-bold text-emerald-900">打率</th>
              <th className="p-2 min-w-[60px] bg-emerald-50/30">差分</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center p-12 text-slate-400">
                  該当選手がいません（規定打席に達している選手がいません）
                </td>
              </tr>
            ) : (
              stats.map((s, i) => (
                <tr key={i} className="hover:bg-blue-50/20 transition-colors text-center">
                  <td className="p-3 text-left font-semibold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {s.current_batter_name}
                  </td>
                  {/* 通算 */}
                  <td className="p-2 font-mono text-slate-600">{s.pa}</td>
                  <td className="p-2 font-mono text-slate-600">{s.ab}</td>
                  <td className="p-2 font-mono text-slate-600">{s.hit}</td>
                  <td className="p-2 font-mono font-bold text-slate-800 border-r border-slate-200">
                    {formatDecimal(s.ave)}
                  </td>
                  {/* 対右 */}
                  <td className="p-2 font-mono text-slate-600 bg-amber-50/10">{s.r_pa}</td>
                  <td className="p-2 font-mono text-slate-600 bg-amber-50/10">{s.r_ab}</td>
                  <td className="p-2 font-mono text-slate-600 bg-amber-50/10">{s.r_hit}</td>
                  <td className="p-2 font-mono font-bold text-amber-900 bg-amber-50/20">
                    {formatDecimal(s.r_ave)}
                  </td>
                  <td className={`p-2 font-mono text-xs border-r border-slate-200 bg-amber-50/10 ${
                    s.r_diff > 0 ? "text-red-600 font-bold" : s.r_diff < 0 ? "text-blue-600" : "text-slate-400"
                  }`}>
                    {formatDiff(s.r_diff)}
                  </td>
                  {/* 対左 */}
                  <td className="p-2 font-mono text-slate-600 bg-emerald-50/10">{s.l_pa}</td>
                  <td className="p-2 font-mono text-slate-600 bg-emerald-50/10">{s.l_ab}</td>
                  <td className="p-2 font-mono text-slate-600 bg-emerald-50/10">{s.l_hit}</td>
                  <td className="p-2 font-mono font-bold text-emerald-900 bg-emerald-50/20">
                    {formatDecimal(s.l_ave)}
                  </td>
                  <td className={`p-2 font-mono text-xs bg-emerald-50/10 ${
                    s.l_diff > 0 ? "text-red-600 font-bold" : s.l_diff < 0 ? "text-blue-600" : "text-slate-400"
                  }`}>
                    {formatDiff(s.l_diff)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 主要守備位置別成績を取得するヘルパー関数
async function fetchTeamMajorPosStats(teamInitial: string, selectedDate: string) {
  const sql = `
    WITH pos_list AS (
      SELECT '捕' AS pos, '捕手' AS pos_name, 1 AS sort_order UNION ALL
      SELECT '一', '一塁手', 2 UNION ALL
      SELECT '二', '二塁手', 3 UNION ALL
      SELECT '三', '三塁手', 4 UNION ALL
      SELECT '遊', '遊撃手', 5 UNION ALL
      SELECT '左', '左翼手', 6 UNION ALL
      SELECT '中', '中堅手', 7 UNION ALL
      SELECT '右', '右翼手', 8 UNION ALL
      SELECT '指', '指名打者', 9
    ),
    pos_batter_ab AS (
      SELECT
        p.pos,
        p.pos_name,
        p.sort_order,
        sb.b_team,
        sb.name,
        SUM(sb.ab) AS pos_ab
      FROM pos_list p
      JOIN stats_batter sb ON sb.position LIKE CONCAT('%', p.pos, '%')
      JOIN game_info gi ON sb.game_info_id = gi.id
      WHERE gi.date <= ?
        AND gi.no_game = 0
        AND gi.is_rg = 1
        AND sb.b_team = ?
      GROUP BY p.pos, p.pos_name, p.sort_order, sb.b_team, sb.name
    ),
    ranked_pos AS (
      SELECT
        pos,
        pos_name,
        sort_order,
        b_team,
        name,
        pos_ab,
        ROW_NUMBER() OVER (PARTITION BY pos, b_team ORDER BY pos_ab DESC, name ASC) AS rn
      FROM pos_batter_ab
    ),
    top_players AS (
      SELECT pos, pos_name, sort_order, b_team, name, pos_ab
      FROM ranked_pos
      WHERE rn = 1
    )
    SELECT
      tp.sort_order,
      tp.pos_name,
      REPLACE(tp.name, ' ', '') AS batter,
      tp.pos_ab,
      SUM(sb.ab) AS total_ab,
      SUM(sb.hit) AS total_hit,
      ROUND(SUM(sb.hit) / SUM(sb.ab), 3) AS ave,
      SUM(sb.hr) AS hr,
      SUM(sb.rbi) AS rbi
    FROM top_players tp
    JOIN stats_batter sb ON sb.b_team = tp.b_team AND sb.name = tp.name
    JOIN game_info gi ON sb.game_info_id = gi.id
    WHERE gi.date <= ?
      AND gi.no_game = 0
      AND gi.is_rg = 1
    GROUP BY tp.sort_order, tp.pos_name, tp.name, tp.pos_ab
    ORDER BY tp.sort_order ASC
  `;
  return await query<MajorPosStatsRow[]>(sql, [selectedDate, teamInitial, selectedDate]);
}

// 主要守備位置別成績テーブル描画ヘルパー関数
function renderMajorPosTable(teamLabel: string, teamInitial: string, stats: MajorPosStatsRow[]) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
        <div className="font-bold text-slate-700 text-sm">
          {teamLabel}: {teamInitial} 球団 (主要守備位置別 打撃成績)
        </div>
        <div className="text-xs text-slate-400">※各守備位置で最多打数の選手</div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse relative">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr className="border-b border-slate-100 font-bold text-slate-600 uppercase text-center">
              <th className="p-3 text-center sticky left-0 bg-slate-50 z-20 min-w-[90px]">守備位置</th>
              <th className="p-3 text-left min-w-[100px]">選手名</th>
              <th className="p-3 min-w-[70px]">守備時打数</th>
              <th className="p-3 min-w-[70px]">通算打数</th>
              <th className="p-3 min-w-[60px]">安打</th>
              <th className="p-3 min-w-[60px]">本塁打</th>
              <th className="p-3 min-w-[60px]">打点</th>
              <th className="p-3 min-w-[70px] bg-blue-50/50">打率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-12 text-slate-400">
                  該当データがありません
                </td>
              </tr>
            ) : (
              stats.map((s, i) => (
                <tr key={i} className="hover:bg-blue-50/20 transition-colors text-center">
                  <td className="p-3 font-semibold text-slate-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                      {s.pos_name}
                    </span>
                  </td>
                  <td className="p-3 text-left font-semibold text-slate-800">
                    {s.batter}
                  </td>
                  <td className="p-3 font-mono text-slate-500">{s.pos_ab}</td>
                  <td className="p-3 font-mono text-slate-600">{s.total_ab}</td>
                  <td className="p-3 font-mono text-slate-600">{s.total_hit}</td>
                  <td className="p-3 font-mono text-slate-600 font-semibold">{s.hr}</td>
                  <td className="p-3 font-mono text-slate-600 font-semibold">{s.rbi}</td>
                  <td className="p-3 font-mono font-bold text-blue-600 bg-blue-50/20">
                    {formatDecimal(s.ave)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}





export default async function Home({ searchParams }: { searchParams: Record<string, string | undefined> }) {
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

      // タブ2: 直近5試合成績 (rc5) の動的データ取得
      if (currentTab === "rc5" && selectedGameInfo) {
        const awayRes = await fetchTeamRecentStats(selectedGameInfo.away_team_initial, selectedGameInfo.date);
        awayRecentStats = awayRes.stats;
        awayRecentGamesCount = awayRes.count;

        const homeRes = await fetchTeamRecentStats(selectedGameInfo.home_team_initial, selectedGameInfo.date);
        homeRecentStats = homeRes.stats;
        homeRecentGamesCount = homeRes.count;
      }

      // タブ3: 対左右投手成績 (hand) の動的データ取得
      if (currentTab === "hand" && selectedGameInfo) {
        awayDomainHandStats = await fetchTeamDomainHandStats(selectedGameInfo.away_team_initial, selectedGameInfo.date);
        homeDomainHandStats = await fetchTeamDomainHandStats(selectedGameInfo.home_team_initial, selectedGameInfo.date);
      }

      // タブ4: 主要守備位置別成績 (pos) の動的データ取得
      if (currentTab === "pos" && selectedGameInfo) {
        awayMajorPosStats = await fetchTeamMajorPosStats(selectedGameInfo.away_team_initial, selectedGameInfo.date);
        homeMajorPosStats = await fetchTeamMajorPosStats(selectedGameInfo.home_team_initial, selectedGameInfo.date);
      }
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
                {/* タブ選択UI */}
                <div className="flex border-b border-slate-200">
                  <Link
                    href={getUrl({ tab: "details" })}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
                      currentTab === "details"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    📋 試合詳細データ
                  </Link>
                  <Link
                    href={getUrl({ tab: "rc5" })}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
                      currentTab === "rc5"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    📈 直近5試合成績 (RC5)
                  </Link>
                  <Link
                    href={getUrl({ tab: "hand" })}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
                      currentTab === "hand"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    ⚾️ 対左右投手成績
                  </Link>
                  <Link
                    href={getUrl({ tab: "pos" })}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
                      currentTab === "pos"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🛡️ 主要守備位置別成績
                  </Link>
                </div>

                {currentTab === "details" ? (
                  <>
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
                  </>
                ) : currentTab === "rc5" ? (
                  <div className="flex flex-col gap-6">
                    {renderStatsTable("AWAY", selectedGameInfo.away_team_initial, awayRecentStats, awayRecentGamesCount)}
                    {renderStatsTable("HOME", selectedGameInfo.home_team_initial, homeRecentStats, homeRecentGamesCount)}
                  </div>
                ) : currentTab === "hand" ? (
                  <div className="flex flex-col gap-6">
                    {renderDomainHandTable("AWAY", selectedGameInfo.away_team_initial, awayDomainHandStats)}
                    {renderDomainHandTable("HOME", selectedGameInfo.home_team_initial, homeDomainHandStats)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {renderMajorPosTable("AWAY", selectedGameInfo.away_team_initial, awayMajorPosStats)}
                    {renderMajorPosTable("HOME", selectedGameInfo.home_team_initial, homeMajorPosStats)}
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
