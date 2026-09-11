import React from "react";
import { Row } from "../types";

interface SceneTableProps {
  rows: Row[];
}

export function SceneTable({ rows }: SceneTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 flex justify-between text-xs text-slate-500 font-mono font-medium">
        <div>該当プレイ: {rows.length} 件</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 font-bold text-slate-600 uppercase">
              <th className="p-3 w-16 text-center">Scene</th>
              <th className="p-3 text-center">回</th>
              <th className="p-3">打者</th>
              <th className="p-3">投手</th>
              <th className="p-3">打撃結果</th>
              <th className="p-3">投球結果</th>
              <th className="p-3 text-center">カウント</th>
              <th className="p-3 text-center">スコア</th>
              <th className="p-3">走者</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-12 text-slate-400">
                  条件に一致するデータがありません
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const count = `${r.prev_count_ball ?? 0}-${r.prev_count_strike ?? 0} ${r.prev_count_out ?? 0}死`;
                const runners = [
                  r.base1_player && `①${r.base1_player}`,
                  r.base2_player && `②${r.base2_player}`,
                  r.base3_player && `③${r.base3_player}`,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                    <td className="p-3 font-mono text-center font-semibold text-slate-700 bg-slate-50/20">
                      {r.scene}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {r.inning}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {r.current_batter_name}
                    </td>
                    <td className="p-3 text-slate-700">
                      {r.current_pitcher_name}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
                          r.is_hit
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {r.batting_result || "-"}
                      </span>
                    </td>
                    <td
                      className="p-3 text-slate-500 whitespace-nowrap overflow-hidden max-w-[150px] truncate"
                      title={r.pitching_result || ""}
                    >
                      {r.pitching_result || "-"}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                      {count}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600 bg-slate-50/10 font-bold">
                      {r.away_score ?? 0}-{r.home_score ?? 0}
                    </td>
                    <td className="p-3 text-blue-600 font-medium">
                      {runners || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
