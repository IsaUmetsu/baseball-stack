import React from "react";
import Link from "next/link";
import { TEAMS } from "../types";

interface GameFilterPanelProps {
  selectedDate: string;
  selectedGameId: number;
  search: string;
  team: string;
  result: string;
}

export function GameFilterPanel({
  selectedDate,
  selectedGameId,
  search,
  team,
  result,
}: GameFilterPanelProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
      <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* 選択中の日付・試合IDを隠しフィールドで保持 */}
        <input type="hidden" name="date" value={selectedDate} />
        <input type="hidden" name="game_id" value={String(selectedGameId)} />

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            選手名 (打者/投手)
          </label>
          <input
            name="search"
            defaultValue={search}
            placeholder="例: 周東"
            className="w-full border border-slate-200 rounded px-3 py-1.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            球団
          </label>
          <select
            name="team"
            defaultValue={team}
            className="w-full border border-slate-200 rounded px-3 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
          >
            <option value="">すべて</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            結果 (打撃/投球)
          </label>
          <input
            name="result"
            defaultValue={result}
            placeholder="例: 本塁打"
            className="w-full border border-slate-200 rounded px-3 py-1.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white text-xs py-1.5 px-3 rounded hover:bg-blue-700 transition font-bold shadow-sm"
          >
            絞り込み
          </button>
          <Link
            href={`/?date=${selectedDate}&game_id=${selectedGameId}`}
            className="border border-slate-200 text-slate-600 text-xs py-1.5 px-3 rounded hover:bg-slate-50 transition text-center font-medium bg-white"
          >
            クリア
          </Link>
        </div>
      </form>
    </div>
  );
}
