import React from "react";
import { PitcherLeaderRow } from "./types";

interface Props {
  rows: PitcherLeaderRow[];
}

export function PitcherLeadersTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-xs text-left">
        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
          <tr>
            <th className="p-2.5 text-center w-10">順位</th>
            <th className="p-2.5">投手名</th>
            <th className="p-2.5">球団</th>
            <th className="p-2.5 text-center">リーグ</th>
            <th className="p-2.5 text-right">試合</th>
            <th className="p-2.5 text-right font-semibold">投球回</th>
            <th className="p-2.5 text-right">被安打</th>
            <th className="p-2.5 text-right font-semibold text-blue-600">奪三振</th>
            <th className="p-2.5 text-right">四球</th>
            <th className="p-2.5 text-right">自責点</th>
            <th className="p-2.5 text-right font-bold text-slate-900 bg-slate-50/50">防御率</th>
            <th className="p-2.5 text-right font-semibold text-slate-700">WHIP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {rows.map((r, i) => (
            <tr key={`${r.name}-${r.team}`} className={`hover:bg-slate-50 ${i < 3 ? "bg-amber-50/20" : ""}`}>
              <td className="p-2.5 text-center text-slate-400 font-bold">{i + 1}</td>
              <td className="p-2.5 font-sans font-bold text-slate-900">{r.name}</td>
              <td className="p-2.5 font-sans text-slate-600 flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-600 border border-slate-200">
                  {r.team_initial_kana}
                </span>
                <span>{r.team}</span>
              </td>
              <td className="p-2.5 text-center font-sans">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.league === "C" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                  {r.league === "C" ? "セ" : "パ"}
                </span>
              </td>
              <td className="p-2.5 text-right text-slate-600">{r.games}</td>
              <td className="p-2.5 text-right text-slate-800 font-semibold">{r.ip_display}</td>
              <td className="p-2.5 text-right text-slate-600">{r.ha}</td>
              <td className="p-2.5 text-right text-blue-600 font-bold">{r.so}</td>
              <td className="p-2.5 text-right text-slate-500">{r.bb}</td>
              <td className="p-2.5 text-right text-rose-600">{r.er}</td>
              <td className="p-2.5 text-right font-bold text-slate-900 bg-slate-50/50">
                {r.era.toFixed(2)}
              </td>
              <td className="p-2.5 text-right font-semibold text-slate-700">
                {r.whip.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
