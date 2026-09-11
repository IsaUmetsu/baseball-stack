import React from "react";
import { BatterRbiRank } from "./types";

interface Props {
  ranking: BatterRbiRank[];
}

export function RbiRankingTable({ ranking }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-xs text-left">
        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
          <tr>
            <th className="p-2.5 text-center w-10">順位</th>
            <th className="p-2.5">打者名</th>
            <th className="p-2.5">球団</th>
            <th className="p-2.5 text-right font-bold">適時打計</th>
            <th className="p-2.5 text-right">先制</th>
            <th className="p-2.5 text-right">同点</th>
            <th className="p-2.5 text-right font-semibold text-blue-600">勝ち越し</th>
            <th className="p-2.5 text-right font-semibold text-rose-600">逆転</th>
            <th className="p-2.5 text-right">サヨナラ</th>
            <th className="p-2.5 text-right">本塁打</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {ranking.map((r, i) => (
            <tr key={`${r.batter}-${r.team}`} className={`hover:bg-slate-50 ${i < 3 ? "bg-amber-50/20" : ""}`}>
              <td className="p-2.5 text-center text-slate-400 font-bold">{i + 1}</td>
              <td className="p-2.5 font-sans font-bold text-slate-900">{r.batter}</td>
              <td className="p-2.5 font-sans text-slate-600">{r.team}</td>
              <td className="p-2.5 text-right font-bold text-slate-900 bg-slate-50/50">{r.rbi_hits}</td>
              <td className="p-2.5 text-right text-slate-600">{r.first_count}</td>
              <td className="p-2.5 text-right text-slate-600">{r.tie_count}</td>
              <td className="p-2.5 text-right text-blue-600 font-bold">{r.win_count}</td>
              <td className="p-2.5 text-right text-rose-600 font-bold">{r.reversal_count}</td>
              <td className="p-2.5 text-right text-purple-600 font-bold">{r.walkoff_count}</td>
              <td className="p-2.5 text-right text-slate-600">{r.hr_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
