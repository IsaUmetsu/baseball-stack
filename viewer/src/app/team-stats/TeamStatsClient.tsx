"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculatePresetDates } from "./dateUtils";

interface TeamStatsClientProps {
  initialData: any[];
  startDate: string;
  endDate: string;
  league: string;
  errorMsg: string | null;
}

const PRESET_DEFAULT_YEAR = 2026;

// Helper to determine which preset matches the current dates
const getPresetFromDates = (startDate: string, endDate: string, year: number): string => {
  const presets = [
    { key: 'march-april', label: '3・4月' },
    { key: 'may', label: '5月' },
    { key: 'june', label: '6月' },
    { key: 'july', label: '7月' },
    { key: 'august', label: '8月' },
    { key: 'september-october', label: '9・10月' },
    { key: 'this-week', label: '今週' }, // 'this-week' is dynamic, so it might not match perfectly if the year is different
    { key: 'all-season', label: '全期間' },
  ];

  // For 'this-week', we need to calculate it for the current date, not the default year.
  // This means 'this-week' won't be automatically selected if the page loads with a past 'this-week' range.
  // This is acceptable as 'this-week' implies the current week.
  const thisWeekDates = calculatePresetDates('this-week', new Date().getFullYear());

  for (const preset of presets) {
    if (preset.key === 'this-week') {
      if (startDate === thisWeekDates.startDate && endDate === thisWeekDates.endDate) {
        return preset.key;
      }
    } else {
      const presetDates = calculatePresetDates(preset.key, year);
      if (startDate === presetDates.startDate && endDate === presetDates.endDate) {
        return preset.key;
      }
    }
  }
  return 'custom';
};


// Stats helper formatters
function formatPct(val: any): string {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  if (num === 1) return "1.000";
  if (num === 0) return ".000";
  const str = num.toFixed(3);
  return str.startsWith("0.") ? str.slice(1) : str;
}

function formatDecimal(val: any, digits: number = 2): string {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  return num.toFixed(digits);
}

function formatInt(val: any): string {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  return num.toLocaleString();
}

type SortConfig = {
  key: string;
  direction: "asc" | "desc" | null;
};

export default function TeamStatsClient({
  initialData,
  startDate,
  endDate,
  league,
  errorMsg,
}: TeamStatsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local filter states
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [localLeague, setLocalLeague] = useState(league);
  const [localSelectedPreset, setLocalSelectedPreset] = useState<'custom' | string>(() =>
    getPresetFromDates(startDate, endDate, PRESET_DEFAULT_YEAR)
  );

  // Auto-refresh on filters change
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      startTransition(() => {
        router.push(
          `/team-stats?startDate=${localStartDate}&endDate=${localEndDate}&league=${localLeague}`
        );
      });
    }
  }, [localStartDate, localEndDate, localLeague, router]);

  // Sync state with props when page changes
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
    setLocalLeague(league);
    setLocalSelectedPreset(getPresetFromDates(startDate, endDate, PRESET_DEFAULT_YEAR));
  }, [startDate, endDate, league]);

  // Client-side sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "",
    direction: null,
  });

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPresetKey = e.target.value;
    setLocalSelectedPreset(selectedPresetKey);

    if (selectedPresetKey !== "custom") {
      const { startDate: newStartDate, endDate: newEndDate } =
        calculatePresetDates(selectedPresetKey, PRESET_DEFAULT_YEAR);
      setLocalStartDate(newStartDate);
      setLocalEndDate(newEndDate);
    }
  };

const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setLocalStartDate(e.target.value);
  setLocalSelectedPreset("custom");
};

const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setLocalEndDate(e.target.value);
  setLocalSelectedPreset("custom");
};

const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(
        `/team-stats?startDate=${localStartDate}&endDate=${localEndDate}&league=${localLeague}`
      );
    });
  };

  // Run sort on data
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...initialData].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];

    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    const numA = Number(valA);
    const numB = Number(valB);

    if (!isNaN(numA) && !isNaN(numB)) {
      return sortConfig.direction === "asc" ? numA - numB : numB - numA;
    }

    const strA = String(valA);
    const strB = String(valB);
    return sortConfig.direction === "asc"
      ? strA.localeCompare(strB, "ja")
      : strB.localeCompare(strA, "ja");
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Page Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 shadow-md shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded"
            >
              ← 戻る
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              📊 チーム成績サマリー集計画面
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            リーグ・特定期間におけるチーム全体の打撃・投手・先発・救援の統合ダッシュボード
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1.5 rounded-md mt-2 md:mt-0 flex items-center gap-2">
          {isPending && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          )}
          Next.js App Router × SpreadSheet View
        </div>
      </header>

      {/* Control & Form Section */}
      <section className="bg-white border-b border-slate-200 p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-end gap-4 max-w-7xl">
          {/* Date Preset Selector */}
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <label htmlFor="date-preset" className="text-xs font-semibold text-slate-600">期間プリセット</label>
            <select
              id="date-preset"
              name="date-preset"
              className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-44"
              value={localSelectedPreset}
              onChange={handlePresetChange}
            >
              <option value="custom">カスタム (手動入力)</option>
              <option value="march-april">3・4月</option>
              <option value="may">5月</option>
              <option value="june">6月</option>
              <option value="july">7月</option>
              <option value="august">8月</option>
              <option value="september-october">9・10月</option>
              <option value="this-week">今週</option>
              <option value="all-season">全期間</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <label className="text-xs font-semibold text-slate-600">開始日 (startDate)</label>
            <input
              type="date"
              value={localStartDate}
              onChange={handleStartDateChange}
              className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-44"
              required
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <label className="text-xs font-semibold text-slate-600">終了日 (endDate)</label>
            <input
              type="date"
              value={localEndDate}
              onChange={handleEndDateChange}
              className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-44"
              required
            />
          </div>

          {/* League Selector */}
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <label className="text-xs font-semibold text-slate-600">リーグ選択</label>
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setLocalLeague("C")}
                className={`px-4 py-2 text-xs font-medium border rounded-l-md transition-colors ${localLeague === "C"
                    ? "bg-blue-600 border-blue-600 text-white font-semibold"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                セ・リーグ
              </button>
              <button
                type="button"
                onClick={() => setLocalLeague("P")}
                className={`px-4 py-2 text-xs font-medium border-t border-b border-r rounded-r-md transition-colors ${localLeague === "P"
                    ? "bg-blue-600 border-blue-600 text-white font-semibold"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                パ・リーグ
              </button>
            </div>
          </div>

          {/* Search Button */}
          <button
            type="button"
            onClick={handleSearch}
            className="ml-auto py-1.5 px-4 inline-flex justify-center border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isPending}
          >
            {isPending ? "検索中..." : "検索"}
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="p-4 md:p-6 grow flex flex-col overflow-hidden max-w-[100vw]">
        {errorMsg ? (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg text-xs font-mono max-w-4xl">
            <h2 className="font-bold text-sm mb-1">⚠️ SQLエラーまたはデータ取得失敗</h2>
            <p>{errorMsg}</p>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 text-center rounded-lg shadow-sm text-slate-400 text-xs">
            指定された期間（{startDate} 〜 {endDate}）のリーグ「{league === "C" ? "セ・リーグ" : "パ・リーグ"}」のデータが存在しないか、集計結果が0件です。
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg flex flex-col overflow-hidden grow max-h-[calc(100vh-240px)]">
            <div className="overflow-auto grow relative scrollbar-thin">
              <table className="w-full text-xs text-left border-collapse min-w-[1800px] select-none font-sans">
                {/* Headers */}
                <thead className="sticky top-0 z-30 shadow-sm">
                  {/* Category Header */}
                  <tr className="text-slate-200 font-bold divide-x divide-slate-700/30">
                    <th className="bg-slate-800 p-2 text-center sticky left-0 z-40 min-w-[40px]"></th>
                    <th className="bg-slate-800 p-2 text-center sticky left-[40px] z-40 min-w-[90px]"></th>
                    <th colSpan={5} className="bg-slate-700/90 p-2 text-center text-[11px] uppercase tracking-wider">
                      基本 / 順位
                    </th>
                    <th colSpan={8} className="bg-emerald-800/90 p-2 text-center text-[11px] uppercase tracking-wider">
                      得点・打撃
                    </th>
                    <th colSpan={4} className="bg-indigo-800/90 p-2 text-center text-[11px] uppercase tracking-wider">
                      チーム投手
                    </th>
                    <th colSpan={4} className="bg-violet-800/90 p-2 text-center text-[11px] uppercase tracking-wider">
                      先発投手
                    </th>
                    <th colSpan={3} className="bg-fuchsia-800/90 p-2 text-center text-[11px] uppercase tracking-wider">
                      救援投手
                    </th>
                  </tr>
                  {/* Fields Header */}
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 divide-x divide-slate-200">
                    <th className="p-2.5 text-center sticky left-0 bg-slate-100 z-40 min-w-[40px]">順位</th>
                    <th className="p-2.5 text-left sticky left-[40px] bg-slate-100 z-40 min-w-[90px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]">球団名</th>
                    
                    {/* Basic */}
                    <th onClick={() => handleSort("game_cnt")} className="p-2.5 text-right cursor-pointer hover:bg-slate-200 transition-colors">試合数</th>
                    <th onClick={() => handleSort("win_count")} className="p-2.5 text-right cursor-pointer hover:bg-slate-200 transition-colors">勝</th>
                    <th onClick={() => handleSort("lose_count")} className="p-2.5 text-right cursor-pointer hover:bg-slate-200 transition-colors">敗</th>
                    <th onClick={() => handleSort("draw_count")} className="p-2.5 text-right cursor-pointer hover:bg-slate-200 transition-colors">分</th>
                    <th onClick={() => handleSort("win_rate")} className="p-2.5 text-right cursor-pointer hover:bg-slate-200 transition-colors bg-slate-200/50">勝率</th>

                    {/* Batting */}
                    <th onClick={() => handleSort("run")} className="p-2.5 text-right cursor-pointer hover:bg-emerald-100 transition-colors bg-emerald-50/30">得点</th>
                    <th onClick={() => handleSort("run_ave")} className="p-2.5 text-right cursor-pointer hover:bg-emerald-100 transition-colors bg-emerald-50/30">平均得点</th>
                    <th onClick={() => handleSort("ave")} className="p-2.5 text-right cursor-pointer hover:bg-emerald-100 transition-colors bg-emerald-50/30">打率</th>
                    <th onClick={() => handleSort("hr")} className="p-2.5 text-right cursor-pointer hover:bg-emerald-100 transition-colors bg-emerald-50/30">本塁打</th>
                    <th onClick={() => handleSort("bb")} className="p-2.5 text-right cursor-pointer hover:bg-emerald-100 transition-colors bg-emerald-50/30">四球</th>
                    <th onClick={() => handleSort("onbase_ave")} className="p-2.5 text-right cursor-pointer hover:bg-emerald-100 transition-colors bg-emerald-50/30">出塁率</th>
                    <th onClick={() => handleSort("sp_ave")} className="p-2.5 text-right cursor-pointer hover:bg-emerald-100 transition-colors bg-emerald-50/30">得点圏</th>
                    <th onClick={() => handleSort("rbi_hit")} className="p-2.5 text-right cursor-pointer hover:bg-emerald-100 transition-colors bg-emerald-50/30">適時打</th>

                    {/* Pitching */}
                    <th onClick={() => handleSort("era")} className="p-2.5 text-right cursor-pointer hover:bg-indigo-100 transition-colors bg-indigo-50/30 font-semibold">防御率</th>
                    <th onClick={() => handleSort("ra")} className="p-2.5 text-right cursor-pointer hover:bg-indigo-100 transition-colors bg-indigo-50/30">失点</th>
                    <th onClick={() => handleSort("er")} className="p-2.5 text-right cursor-pointer hover:bg-indigo-100 transition-colors bg-indigo-50/30">自責点</th>
                    <th onClick={() => handleSort("hra")} className="p-2.5 text-right cursor-pointer hover:bg-indigo-100 transition-colors bg-indigo-50/30">被本塁</th>

                    {/* Starter */}
                    <th onClick={() => handleSort("s_era")} className="p-2.5 text-right cursor-pointer hover:bg-violet-100 transition-colors bg-violet-50/30">先発防御</th>
                    <th onClick={() => handleSort("qs")} className="p-2.5 text-right cursor-pointer hover:bg-violet-100 transition-colors bg-violet-50/30">QS</th>
                    <th onClick={() => handleSort("hqs")} className="p-2.5 text-right cursor-pointer hover:bg-violet-100 transition-colors bg-violet-50/30">HQS</th>
                    <th onClick={() => handleSort("st_win")} className="p-2.5 text-right cursor-pointer hover:bg-violet-100 transition-colors bg-violet-50/30">先発勝</th>

                    {/* Relief */}
                    <th onClick={() => handleSort("m_era")} className="p-2.5 text-right cursor-pointer hover:bg-fuchsia-100 transition-colors bg-fuchsia-50/30">救援防御</th>
                    <th onClick={() => handleSort("m_cnt")} className="p-2.5 text-right cursor-pointer hover:bg-fuchsia-100 transition-colors bg-fuchsia-50/30">登板数</th>
                    <th onClick={() => handleSort("m_cnt_ave")} className="p-2.5 text-right cursor-pointer hover:bg-fuchsia-100 transition-colors bg-fuchsia-50/30">平均登板</th>
                  </tr>
                </thead>
                {/* Body */}
                <tbody className="divide-y divide-slate-200">
                  {sortedData.map((row, index) => {
                    return (
                      <tr key={index} className="hover:bg-blue-50/30 transition-colors divide-x divide-slate-100">
                        {/* 順位 */}
                        <td className="p-2 text-center font-mono font-semibold text-slate-500 bg-slate-50/50 sticky left-0 z-20 border-r border-slate-200">
                          {index + 1}
                        </td>
                        {/* 球団名 */}
                        <td className="p-2 font-bold text-slate-800 bg-white sticky left-[40px] z-20 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)] border-r border-slate-200">
                          {row.team_name} <span className="text-[10px] text-slate-400 font-mono font-normal">({row.team_initial})</span>
                        </td>

                        {/* Basic */}
                        <td className="p-2 text-right font-mono text-slate-600 bg-slate-50/10">{formatInt(row.game_cnt)}</td>
                        <td className="p-2 text-right font-mono font-semibold text-blue-600 bg-slate-50/10">{formatInt(row.win_count)}</td>
                        <td className="p-2 text-right font-mono text-red-600 bg-slate-50/10">{formatInt(row.lose_count)}</td>
                        <td className="p-2 text-right font-mono text-slate-500 bg-slate-50/10">{formatInt(row.draw_count)}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900 bg-slate-100/50">{formatPct(row.win_rate)}</td>

                        {/* Batting */}
                        <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/5">{formatInt(row.run)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-emerald-50/5">{formatDecimal(row.run_ave, 2)}</td>
                        <td className="p-2 text-right font-mono font-semibold text-emerald-800 bg-emerald-50/10">{formatPct(row.ave)}</td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-700 bg-emerald-50/5">{formatInt(row.hr)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-emerald-50/5">{formatInt(row.bb)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-emerald-50/5">{formatPct(row.onbase_ave)}</td>
                        <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/5">{formatPct(row.sp_ave)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-emerald-50/5">{formatInt(row.rbi_hit)}</td>

                        {/* Pitching */}
                        <td className="p-2 text-right font-mono font-bold text-indigo-900 bg-indigo-50/10">{formatDecimal(row.era, 2)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-indigo-50/5">{formatInt(row.ra)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-indigo-50/5">{formatInt(row.er)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-indigo-50/5">{formatInt(row.hra)}</td>

                        {/* Starter */}
                        <td className="p-2 text-right font-mono text-violet-900 bg-violet-50/10">{formatDecimal(row.s_era, 2)}</td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-700 bg-violet-50/5">{formatInt(row.qs)}</td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-700 bg-violet-50/5">{formatInt(row.hqs)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-violet-50/5">{formatInt(row.st_win)}</td>

                        {/* Relief */}
                        <td className="p-2 text-right font-mono text-fuchsia-900 bg-fuchsia-50/10">{formatDecimal(row.m_era, 2)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-fuchsia-50/5">{formatInt(row.m_cnt)}</td>
                        <td className="p-2 text-right font-mono text-slate-600 bg-fuchsia-50/5">{formatDecimal(row.m_cnt_ave, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            {/* Table Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400 flex justify-between shrink-0">
              <span>※ 列ヘッダーをクリックすると、その成績項目で降順・昇順のソートが可能です。球団名・ヘッダー行はスクロール時も固定表示されます。</span>
              <span>期間: {startDate} 〜 {endDate} | {league === "C" ? "セ・リーグ" : "パ・リーグ"}</span>
            </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
