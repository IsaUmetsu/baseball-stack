import React from "react";
import { BattingStatsRow } from "../types";
import { formatDecimal } from "../utils";

interface RecentStatsTableProps {
  teamLabel: string;
  teamInitial: string;
  stats: BattingStatsRow[];
  count: number;
}

export function RecentStatsTable({
  teamLabel,
  teamInitial,
  stats,
  count,
}: RecentStatsTableProps) {
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
