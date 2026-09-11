import React from "react";
import { MajorPosStatsRow } from "../types";
import { formatDecimal } from "../utils";

interface MajorPosTableProps {
  teamLabel: string;
  teamInitial: string;
  stats: MajorPosStatsRow[];
}

export function MajorPosTable({
  teamLabel,
  teamInitial,
  stats,
}: MajorPosTableProps) {
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
