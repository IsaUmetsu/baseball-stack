import React from "react";
import { GameItem, Row } from "../types";
import { formatDate } from "../utils";

interface GameSummaryHeaderProps {
  gameInfo: GameItem;
  lastRow?: Row;
  totalScenes: number;
}

export function GameSummaryHeader({
  gameInfo,
  lastRow,
  totalScenes,
}: GameSummaryHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold font-mono">
            第 {gameInfo.game_no} 試合
          </span>
          <span className="text-sm text-slate-500 font-mono font-medium">
            {formatDate(gameInfo.date)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-wide mt-1">
          {gameInfo.away_team_initial}{" "}
          <span className="text-slate-400 text-lg mx-2">vs</span>{" "}
          {gameInfo.home_team_initial}
        </h2>
      </div>

      {/* スコア・状況ボード (簡易表示) */}
      {lastRow && (
        <div className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-4 flex items-center gap-4 text-center font-mono">
          <div>
            <div className="text-[10px] text-slate-400 font-sans">AWAY</div>
            <div className="text-xl font-bold text-slate-700">
              {lastRow.away_score ?? 0}
            </div>
          </div>
          <div className="text-slate-300 font-bold text-lg">-</div>
          <div>
            <div className="text-[10px] text-slate-400 font-sans">HOME</div>
            <div className="text-xl font-bold text-slate-700">
              {lastRow.home_score ?? 0}
            </div>
          </div>
          <div className="border-l border-slate-200 pl-3 text-left">
            <div className="text-[10px] text-slate-400 font-sans">SCENES</div>
            <div className="text-sm font-bold text-slate-600">
              {totalScenes} プレイ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
