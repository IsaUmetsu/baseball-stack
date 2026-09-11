import React from "react";
import Link from "next/link";
import { DateItem, GameItem } from "../types";
import { formatDate } from "../utils";

interface GameNavigatorProps {
  dates: DateItem[];
  games: GameItem[];
  selectedDate: string;
  selectedGameId: number | null;
  getUrl: (updates: Record<string, string | null>) => string;
}

export function GameNavigator({
  dates,
  games,
  selectedDate,
  selectedGameId,
  getUrl,
}: GameNavigatorProps) {
  return (
    <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-sm font-bold text-slate-700">試合選択ナビゲーター</h2>
        <p className="text-xs text-slate-400 mt-0.5">日付と試合を選択してください</p>
      </div>

      <div className="divide-y divide-slate-100">
        {dates.map((d) => {
          const isDateSelected = selectedDate === d.date;
          const formattedD = formatDate(d.date);
          return (
            <div key={d.date} className="flex flex-col">
              {/* 日付項目 */}
              <Link
                href={getUrl({ date: d.date, game_id: null })}
                className={`flex justify-between items-center px-4 py-3 text-sm transition-colors ${
                  isDateSelected
                    ? "bg-blue-50/70 text-blue-800 font-semibold border-l-4 border-blue-600"
                    : "text-slate-700 hover:bg-slate-50 border-l-4 border-transparent"
                }`}
              >
                <span className="font-mono">{formattedD}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {d.count}試合
                </span>
              </Link>

              {/* 選択された日付に紐づく試合一覧 (第2階層) */}
              {isDateSelected && (
                <div className="bg-slate-50/40 pl-4 py-1.5 border-t border-slate-100 flex flex-col gap-1">
                  {games.length === 0 ? (
                    <div className="text-xs text-slate-400 p-2.5 italic">試合データがありません</div>
                  ) : (
                    games.map((g) => {
                      const isGameSelected = selectedGameId === g.id;
                      return (
                        <Link
                          key={g.id}
                          href={getUrl({ game_id: String(g.id) })}
                          className={`mr-2 px-3 py-2 rounded text-xs transition-all flex items-center justify-between ${
                            isGameSelected
                              ? "bg-blue-600 text-white font-medium shadow-sm"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          }`}
                        >
                          <span>第 {g.game_no} 試合</span>
                          <span className="font-semibold">
                            {g.away_team_initial} vs {g.home_team_initial}
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
        {dates.length === 0 && (
          <div className="text-center p-8 text-slate-400 text-sm">日付データがありません</div>
        )}
      </div>
    </aside>
  );
}
