"use client";

import React, { useState, useTransition } from "react";
import { StandingRow, StandingsPeriodType } from "./types";
import { StandingsTable } from "./StandingsTable";

interface Props {
  initialRows: StandingRow[];
  currentPeriodType: StandingsPeriodType;
  currentMonth?: number;
  currentDow?: number;
}

const MONTHS = [3, 4, 5, 6, 7, 8, 9, 10];
const DOWS = [
  { val: 1, label: "日" },
  { val: 2, label: "月" },
  { val: 3, label: "火" },
  { val: 4, label: "水" },
  { val: 5, label: "木" },
  { val: 6, label: "金" },
  { val: 7, label: "土" },
];

export default function StandingsClient({
  initialRows,
  currentPeriodType,
  currentMonth = 3,
  currentDow = 3,
}: Props) {
  const [periodType, setPeriodType] = useState<StandingsPeriodType>(currentPeriodType);
  const [month, setMonth] = useState<number>(currentMonth);
  const [dow, setDow] = useState<number>(currentDow);
  const [league, setLeague] = useState<string>("ALL");
  const [rows, setRows] = useState<StandingRow[]>(initialRows);
  const [isPending, startTransition] = useTransition();

  const reload = (p: StandingsPeriodType, m: number, d: number) => {
    startTransition(async () => {
      const q = new URLSearchParams({ period: p, month: String(m), dow: String(d) });
      const res = await fetch(`/api/standings?${q}`);
      if (res.ok) setRows(await res.json());
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500">集計期間:</span>
          {(["season", "month", "dow"] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriodType(p); reload(p, month, dow); }}
              className={`px-2.5 py-1 rounded transition-colors ${periodType === p ? "bg-blue-600 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {p === "season" ? "通算" : p === "month" ? "月別 (month:stand)" : "曜日別 (dow:stand)"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-500">リーグ:</span>
          {["ALL", "C", "P"].map((l) => (
            <button
              key={l}
              onClick={() => setLeague(l)}
              className={`px-2 py-0.5 rounded transition-colors ${league === l ? "bg-slate-800 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {l === "ALL" ? "両方" : l === "C" ? "セ" : "パ"}
            </button>
          ))}
        </div>
      </div>

      {periodType === "month" && (
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex gap-1.5 items-center overflow-x-auto">
          <span className="font-bold text-slate-500 mr-2 whitespace-nowrap">月を選択:</span>
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => { setMonth(m); reload("month", m, dow); }}
              className={`px-2.5 py-1 rounded transition-colors ${month === m ? "bg-blue-600 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {m}月
            </button>
          ))}
        </div>
      )}

      {periodType === "dow" && (
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex gap-1.5 items-center overflow-x-auto">
          <span className="font-bold text-slate-500 mr-2 whitespace-nowrap">曜日を選択:</span>
          {DOWS.map(({ val, label }) => (
            <button
              key={val}
              onClick={() => { setDow(val); reload("dow", month, val); }}
              className={`px-2.5 py-1 rounded transition-colors ${dow === val ? "bg-blue-600 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {label}曜日
            </button>
          ))}
        </div>
      )}

      <div className={`transition-opacity duration-200 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {(league === "ALL" || league === "C") && (
          <StandingsTable rows={rows} leagueCode="C" leagueTitle="セントラル・リーグ" />
        )}
        {(league === "ALL" || league === "P") && (
          <StandingsTable rows={rows} leagueCode="P" leagueTitle="パシフィック・リーグ" />
        )}
      </div>
    </div>
  );
}
