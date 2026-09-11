"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LeftOnBaseRow } from "./types";

interface Props {
  initialData: LeftOnBaseRow[];
  startDate: string;
  endDate: string;
  league: string;
  errorMsg: string | null;
}

export default function LeftOnBaseClient({
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
  const [sortField, setSortField] = useState<keyof LeftOnBaseRow>("lob");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/left-on-base?startDate=${start}&endDate=${end}&league=${lg}`);
  };

  const sortedData = [...initialData].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const toggleSort = (field: keyof LeftOnBaseRow) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 shadow-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            ⚾️ チーム別 残塁数・得点サマリー (LOB)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            攻撃イニング終了時の走者残塁数（Left On Base）と総得点・1試合平均
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
            href="/runs-allowed"
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-2 rounded-md transition duration-150 flex items-center gap-1"
          >
            ⏱️ イニング別得失点
          </Link>
          <Link
            href="/team-stats"
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-md transition duration-150 flex items-center gap-1"
          >
            📊 チーム成績サマリー
          </Link>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
        {/* フィルタフォーム */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
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
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg text-xs">
            {errorMsg}
          </div>
        )}

        {/* テーブル */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="py-3 px-3 text-center border-r border-slate-200 w-16">順位</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200 w-20">リーグ</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[140px]">チーム</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200">試合数</th>
                  <th
                    onClick={() => toggleSort("lob")}
                    className="py-3 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition"
                  >
                    総残塁数 (LOB) {sortField === "lob" && (sortOrder === "desc" ? "▼" : "▲")}
                  </th>
                  <th
                    onClick={() => toggleSort("lob_per_game")}
                    className="py-3 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition"
                  >
                    1試合平均残塁 {sortField === "lob_per_game" && (sortOrder === "desc" ? "▼" : "▲")}
                  </th>
                  <th
                    onClick={() => toggleSort("runs")}
                    className="py-3 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition"
                  >
                    総得点 {sortField === "runs" && (sortOrder === "desc" ? "▼" : "▲")}
                  </th>
                  <th
                    onClick={() => toggleSort("runs_per_game")}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-slate-200 transition"
                  >
                    1試合平均得点 {sortField === "runs_per_game" && (sortOrder === "desc" ? "▼" : "▲")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                      該当するデータがありません。
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, idx) => (
                    <tr
                      key={row.b_team}
                      className={idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-100/60"}
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold border-r border-slate-200 text-slate-500">
                        {row.league === "C" ? "セ" : "パ"}
                      </td>
                      <td className="py-2.5 px-4 font-bold border-r border-slate-200 text-slate-900">
                        <span className="font-mono text-[10px] text-slate-400 mr-1.5">
                          [{row.team_initial}]
                        </span>
                        {row.team_name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono border-r border-slate-200">
                        {row.game_count}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 border-r border-slate-200">
                        {row.lob}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700 border-r border-slate-200">
                        {row.lob_per_game}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600 border-r border-slate-200">
                        {row.runs}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                        {row.runs_per_game}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
            ※ 残塁（LOB: Left On Base）はイニング3アウト時点で塁上に残った走者数（併殺打・盗塁死・牽制死等のアウトを除く）を集計しています。
          </div>
        </div>
      </main>
    </div>
  );
}
