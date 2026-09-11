import React from "react";
import { RbiHitRow } from "./types";

interface Props {
  hit: RbiHitRow;
}

export function RbiHitCard({ hit }: Props) {
  return (
    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
          {hit.inning}
        </span>
        <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-600 border border-slate-200">
          {hit.team_initial_kana}
        </span>
        <span className="font-bold text-slate-900 text-sm">
          {hit.batter}
        </span>
        <div className="flex gap-1 ml-1">
          {hit.is_first === 1 && <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">先制</span>}
          {hit.is_tie === 1 && <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px]">同点</span>}
          {hit.is_win === 1 && <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[10px]">勝ち越し</span>}
          {hit.is_reversal === 1 && <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded text-[10px]">逆転</span>}
          {hit.is_walkoff === 1 && <span className="bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded text-[10px]">サヨナラ</span>}
          {hit.is_hr === 1 && <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded text-[10px]">HR</span>}
        </div>
      </div>
      <div className="text-slate-600 flex-1 md:text-right text-xs">
        {hit.detail}
      </div>
    </div>
  );
}
