import React from "react";
import { StandingRow } from "./types";

interface Props {
  rows: StandingRow[];
  leagueCode: string;
  leagueTitle: string;
}

export function StandingsTable({ rows, leagueCode, leagueTitle }: Props) {
  const list = rows.filter((r) => r.league === leagueCode);
  if (!list.length) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${leagueCode === "C" ? "bg-emerald-500" : "bg-blue-500"}`} />
        {leagueTitle}
      </h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-2 text-center w-8">順</th>
              <th className="p-2">球団</th>
              <th className="p-2 text-right">試</th>
              <th className="p-2 text-right">勝</th>
              <th className="p-2 text-right">敗</th>
              <th className="p-2 text-right">分</th>
              <th className="p-2 text-right font-bold">勝率</th>
              <th className="p-2 text-right">差</th>
              <th className="p-2 text-right">得</th>
              <th className="p-2 text-right">失</th>
              <th className="p-2 text-right">得失差</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {list.map((r, i) => (
              <tr key={r.team_initial_kana} className={`hover:bg-slate-50 ${i === 0 ? "bg-amber-50/30" : ""}`}>
                <td className="p-2 text-center text-slate-400 font-bold">{i + 1}</td>
                <td className="p-2 font-sans font-medium text-slate-900">{r.team_name}</td>
                <td className="p-2 text-right text-slate-600">{r.games}</td>
                <td className="p-2 text-right text-blue-600 font-bold">{r.wins}</td>
                <td className="p-2 text-right text-rose-600 font-bold">{r.losses}</td>
                <td className="p-2 text-right text-slate-400">{r.draws}</td>
                <td className="p-2 text-right font-bold text-slate-900">{r.win_rate.toFixed(3).replace(/^0/, "")}</td>
                <td className="p-2 text-right text-slate-500">{i === 0 ? "-" : r.games_behind?.toFixed(1) ?? "-"}</td>
                <td className="p-2 text-right text-slate-700">{r.runs_scored}</td>
                <td className="p-2 text-right text-slate-700">{r.runs_allowed}</td>
                <td className={`p-2 text-right font-bold ${r.run_diff > 0 ? "text-blue-600" : r.run_diff < 0 ? "text-rose-600" : "text-slate-400"}`}>
                  {r.run_diff > 0 ? `+${r.run_diff}` : r.run_diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
