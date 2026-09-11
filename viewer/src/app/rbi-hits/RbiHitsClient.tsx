"use client";

import React, { useState, useTransition } from "react";
import { RbiHitRow, BatterRbiRank } from "./types";
import { RbiRankingTable } from "./RbiRankingTable";
import { RbiHitCard } from "./RbiHitCard";

interface Props {
  initialDate: string;
  availableDates: string[];
  initialHits: RbiHitRow[];
  initialRanking: BatterRbiRank[];
}

export default function RbiHitsClient({
  initialDate,
  availableDates,
  initialHits,
  initialRanking,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [hits, setHits] = useState<RbiHitRow[]>(initialHits);
  const [tab, setTab] = useState<"daily" | "ranking">("daily");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    startTransition(async () => {
      const res = await fetch(`/api/rbi-hits?date=${date}`);
      if (res.ok) setHits(await res.json());
    });
  };

  const filteredHits = hits.filter((h) => {
    if (filterType === "FIRST") return h.is_first === 1;
    if (filterType === "TIE") return h.is_tie === 1;
    if (filterType === "WIN") return h.is_win === 1;
    if (filterType === "REVERSAL") return h.is_reversal === 1;
    if (filterType === "WALKOFF") return h.is_walkoff === 1;
    if (filterType === "HR") return h.is_hr === 1;
    return true;
  });

  const formatDateStr = (d: string) => {
    if (d.length === 8) return `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6, 8)}`;
    return d;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab("daily")}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${tab === "daily" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            日別タイムリーヒット (day:rbi:hit)
          </button>
          <button
            onClick={() => setTab("ranking")}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${tab === "ranking" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            適時打ランキング
          </button>
        </div>

        {tab === "daily" && (
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">日付:</span>
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-800 font-mono"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>{formatDateStr(d)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tab === "daily" ? (
        <div className="space-y-3">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-500 mr-1.5">場面別:</span>
            {[
              { key: "ALL", label: "すべて" },
              { key: "FIRST", label: "先制" },
              { key: "TIE", label: "同点" },
              { key: "WIN", label: "勝ち越し" },
              { key: "REVERSAL", label: "逆転" },
              { key: "WALKOFF", label: "サヨナラ" },
              { key: "HR", label: "本塁打" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-2.5 py-1 rounded transition-colors ${filterType === key ? "bg-slate-800 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={`space-y-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
            {filteredHits.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-400 text-xs">
                該当する適時打データはありません。
              </div>
            ) : (
              filteredHits.map((hit) => <RbiHitCard key={hit.id} hit={hit} />)
            )}
          </div>
        </div>
      ) : (
        <RbiRankingTable ranking={initialRanking} />
      )}
    </div>
  );
}
