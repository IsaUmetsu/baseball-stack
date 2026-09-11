"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeamInningStats } from "./types";

interface Props {
  initialData: TeamInningStats[];
  startDate: string;
  endDate: string;
  league: string;
  errorMsg: string | null;
}

export default function RunsAllowedClient({
  initialData,
  startDate,
  endDate,
  league,
  errorMsg,
}: Props) {
  const router = useRouter();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [lg, setLg] = useState(league);
  const [displayMode, setDisplayMode] = useState<"both" | "runs" | "runsAllowed" | "diff">("both");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/runs-allowed?startDate=${start}&endDate=${end}&league=${lg}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 shadow-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            ⚾️ イニング別得失点サマリー
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            チームごとの各イニング（1〜10回）における得点・失点・得失点差
          </p>
        </div>
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          <Link
            href="/"
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-2 rounded-md transition duration-150 flex items-center gap-1"
          >
            🏟️ 試合詳細へ戻る
          </Link>
          <Link
            href="/left-on-base"
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-2 rounded-md transition duration-150 flex items-center gap-1"
          >
            ⚾️ 残塁数・得点 (LOB)
          </Link>
          <Link
            href="/team-stats"
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-md transition duration-150 flex items-center gap-1"
          >
            📊 チーム成績サマリー
          </Link>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
        {/* フィルタ & 表示切替 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <form onSubmit={handleApply} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">期間:</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-xs text-slate-400">〜</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">リーグ:</label>
              <select
                value={lg}
                onChange={(e) => setLg(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="ALL">両リーグ (12球団)</option>
                <option value="C">セ・リーグ</option>
                <option value="P">パ・リーグ</option>
              </select>
            </div>

            <button
              type="submit"
              className="text-xs bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-4 py-1.5 rounded transition shadow-sm"
            >
              更新
            </button>
          </form>

          {/* 表示モード選択 */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setDisplayMode("both")}
              className={`px-2.5 py-1 rounded font-bold transition ${
                displayMode === "both"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              得点 / 失点
            </button>
            <button
              onClick={() => setDisplayMode("runs")}
              className={`px-2.5 py-1 rounded font-bold transition ${
                displayMode === "runs"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              得点のみ
            </button>
            <button
              onClick={() => setDisplayMode("runsAllowed")}
              className={`px-2.5 py-1 rounded font-bold transition ${
                displayMode === "runsAllowed"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              失点のみ
            </button>
            <button
              onClick={() => setDisplayMode("diff")}
              className={`px-2.5 py-1 rounded font-bold transition ${
                displayMode === "diff"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              得失点差
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg text-xs">
            {errorMsg}
          </div>
        )}

        {/* データテーブル */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="py-3 px-3 text-center border-r border-slate-200">リーグ</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[120px]">チーム</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((inn) => (
                    <th key={inn} className="py-3 px-2 text-center border-r border-slate-200 min-w-[64px]">
                      {inn === 10 ? "10回〜" : `${inn}回`}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center bg-slate-200/80 font-black min-w-[80px]">
                    合計
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {initialData.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-8 text-slate-400 font-medium">
                      該当するデータがありません。
                    </td>
                  </tr>
                ) : (
                  initialData.map((team, idx) => (
                    <tr
                      key={team.team_initial_kana}
                      className={idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-100/60"}
                    >
                      <td className="py-2.5 px-3 text-center font-bold border-r border-slate-200 text-slate-500">
                        {team.league === "C" ? "セ" : "パ"}
                      </td>
                      <td className="py-2.5 px-4 font-bold border-r border-slate-200 text-slate-900">
                        <span className="font-mono text-[10px] text-slate-400 mr-1.5">
                          [{team.team_initial}]
                        </span>
                        {team.team_name}
                      </td>

                      {/* 1〜10回 */}
                      {team.innings.map((inn) => (
                        <td
                          key={inn.inning}
                          className="py-2.5 px-2 text-center border-r border-slate-200 font-mono"
                        >
                          {displayMode === "both" && (
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span className="text-blue-600 font-bold">{inn.runs}</span>
                              <span className="text-rose-500 text-[11px]">{inn.runs_allowed}</span>
                            </div>
                          )}
                          {displayMode === "runs" && (
                            <span className="text-blue-600 font-bold">{inn.runs}</span>
                          )}
                          {displayMode === "runsAllowed" && (
                            <span className="text-rose-500 font-bold">{inn.runs_allowed}</span>
                          )}
                          {displayMode === "diff" && (
                            <span
                              className={`font-bold ${
                                inn.diff > 0
                                  ? "text-blue-600"
                                  : inn.diff < 0
                                  ? "text-rose-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {inn.diff > 0 ? `+${inn.diff}` : inn.diff}
                            </span>
                          )}
                        </td>
                      ))}

                      {/* 合計 */}
                      <td className="py-2.5 px-3 text-center bg-slate-100/60 font-mono font-black">
                        {displayMode === "both" && (
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span className="text-blue-700">{team.total_runs}</span>
                            <span className="text-rose-600 text-[11px]">{team.total_runs_allowed}</span>
                          </div>
                        )}
                        {displayMode === "runs" && (
                          <span className="text-blue-700">{team.total_runs}</span>
                        )}
                        {displayMode === "runsAllowed" && (
                          <span className="text-rose-600">{team.total_runs_allowed}</span>
                        )}
                        {displayMode === "diff" && (
                          <span
                            className={
                              team.total_diff > 0
                                ? "text-blue-700"
                                : team.total_diff < 0
                                ? "text-rose-600"
                                : "text-slate-500"
                            }
                          >
                            {team.total_diff > 0 ? `+${team.total_diff}` : team.total_diff}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div>
              ※ 得点 / 失点表示時: <span className="text-blue-600 font-bold">青色 = 得点</span>、<span className="text-rose-500 font-bold">赤色 = 失点</span>
            </div>
            <div>
              ※ 10回以降は「10回〜」に集約して計上しています。
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
