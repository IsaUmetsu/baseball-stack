import React from "react";
import { DomainHandStatsRow } from "../types";
import { formatDecimal, formatDiff } from "../utils";

interface DomainHandTableProps {
  teamLabel: string;
  teamInitial: string;
  stats: DomainHandStatsRow[];
}

export function DomainHandTable({
  teamLabel,
  teamInitial,
  stats,
}: DomainHandTableProps) {
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
              <th className="p-3 text-left sticky left-0 bg-slate-50 z-20 min-w-[100px]" rowSpan={2}>
                打者
              </th>
              <th className="p-2 border-b border-r border-slate-200 bg-slate-100/70" colSpan={4}>
                通算
              </th>
              <th className="p-2 border-b border-r border-slate-200 bg-amber-50/70 text-amber-900" colSpan={5}>
                対右投手
              </th>
              <th className="p-2 border-b border-slate-200 bg-emerald-50/70 text-emerald-900" colSpan={5}>
                対左投手
              </th>
            </tr>
            <tr className="border-b border-slate-100 font-bold text-slate-600 uppercase text-center text-[11px]">
              <th className="p-2 min-w-[50px] bg-slate-50">打席</th>
              <th className="p-2 min-w-[50px] bg-slate-50">打数</th>
              <th className="p-2 min-w-[50px] bg-slate-50">安打</th>
              <th className="p-2 min-w-[60px] bg-slate-50 border-r border-slate-200">打率</th>
              <th className="p-2 min-w-[50px] bg-amber-50/30">打席</th>
              <th className="p-2 min-w-[50px] bg-amber-50/30">打数</th>
              <th className="p-2 min-w-[50px] bg-amber-50/30">安打</th>
              <th className="p-2 min-w-[60px] bg-amber-50/30 font-bold text-amber-900">打率</th>
              <th className="p-2 min-w-[60px] bg-amber-50/30 border-r border-slate-200">差分</th>
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
                  <td
                    className={`p-2 font-mono text-xs border-r border-slate-200 bg-amber-50/10 ${
                      s.r_diff > 0
                        ? "text-red-600 font-bold"
                        : s.r_diff < 0
                        ? "text-blue-600"
                        : "text-slate-400"
                    }`}
                  >
                    {formatDiff(s.r_diff)}
                  </td>
                  {/* 対左 */}
                  <td className="p-2 font-mono text-slate-600 bg-emerald-50/10">{s.l_pa}</td>
                  <td className="p-2 font-mono text-slate-600 bg-emerald-50/10">{s.l_ab}</td>
                  <td className="p-2 font-mono text-slate-600 bg-emerald-50/10">{s.l_hit}</td>
                  <td className="p-2 font-mono font-bold text-emerald-900 bg-emerald-50/20">
                    {formatDecimal(s.l_ave)}
                  </td>
                  <td
                    className={`p-2 font-mono text-xs bg-emerald-50/10 ${
                      s.l_diff > 0
                        ? "text-red-600 font-bold"
                        : s.l_diff < 0
                        ? "text-blue-600"
                        : "text-slate-400"
                    }`}
                  >
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
