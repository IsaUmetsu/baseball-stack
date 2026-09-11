"use client";

import React, { useState, useTransition } from "react";
import { BatterLeaderRow, TeamBattingRow, BattingPeriodType } from "./types";
import { BatterLeadersTable } from "./BatterLeadersTable";
import { TeamBattingTable } from "./TeamBattingTable";

interface Props {
  initialPlayers: BatterLeaderRow[];
  initialTeams: TeamBattingRow[];
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

export default function BattingClient({ initialPlayers, initialTeams }: Props) {
  const [tab, setTab] = useState<"player" | "team">("player");
  const [periodType, setPeriodType] = useState<BattingPeriodType>("season");
  const [month, setMonth] = useState<number>(3);
  const [dow, setDow] = useState<number>(3);
  const [league, setLeague] = useState<string>("ALL");

  const [players, setPlayers] = useState<BatterLeaderRow[]>(initialPlayers);
  const [teams, setTeams] = useState<TeamBattingRow[]>(initialTeams);
  const [isPending, startTransition] = useTransition();

  const reload = (p: BattingPeriodType, m: number, d: number, l: string, currentTab: "player" | "team") => {
    startTransition(async () => {
      const q = new URLSearchParams({ type: currentTab, period: p, month: String(m), dow: String(d), league: l });
      const res = await fetch(`/api/batting?${q}`);
      if (res.ok) {
        const data = await res.json();
        if (currentTab === "player") setPlayers(data);
        else setTeams(data);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setTab("player"); reload(periodType, month, dow, league, "player"); }}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${tab === "player" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            個人打撃リーダー (bat:champ)
          </button>
          <button
            onClick={() => { setTab("team"); reload(periodType, month, dow, league, "team"); }}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${tab === "team" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            チーム打撃成績 (bat:team)
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-500">リーグ:</span>
          {["ALL", "C", "P"].map((l) => (
            <button
              key={l}
              onClick={() => { setLeague(l); reload(periodType, month, dow, l, tab); }}
              className={`px-2 py-0.5 rounded transition-colors ${league === l ? "bg-slate-800 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {l === "ALL" ? "両方" : l === "C" ? "セ" : "パ"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex flex-wrap gap-2 items-center">
        <span className="font-bold text-slate-500 mr-1">集計期間:</span>
        {(["season", "month", "dow"] as const).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriodType(p); reload(p, month, dow, league, tab); }}
            className={`px-2.5 py-1 rounded transition-colors ${periodType === p ? "bg-blue-600 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {p === "season" ? "通算" : p === "month" ? "月別 (month:bat)" : "曜日別 (dow:bat)"}
          </button>
        ))}
      </div>

      {periodType === "month" && (
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex gap-1.5 items-center overflow-x-auto">
          <span className="font-bold text-slate-500 mr-2 whitespace-nowrap">月を選択:</span>
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => { setMonth(m); reload("month", m, dow, league, tab); }}
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
              onClick={() => { setDow(val); reload("dow", month, val, league, tab); }}
              className={`px-2.5 py-1 rounded transition-colors ${dow === val ? "bg-blue-600 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {label}曜日
            </button>
          ))}
        </div>
      )}

      <div className={`transition-opacity duration-200 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {tab === "player" ? <BatterLeadersTable rows={players} /> : <TeamBattingTable rows={teams} />}
      </div>
    </div>
  );
}
