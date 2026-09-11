"use client";

import React, { useState, useTransition } from "react";
import { PitcherLeaderRow, TeamPitchingRow, PitchingPeriodType } from "./types";
import { PitcherLeadersTable } from "./PitcherLeadersTable";
import { TeamPitchingTable } from "./TeamPitchingTable";

interface Props {
  initialStarters: PitcherLeaderRow[];
  initialTeams: TeamPitchingRow[];
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

export default function PitchingClient({ initialStarters, initialTeams }: Props) {
  const [tab, setTab] = useState<"starter" | "reliever" | "team">("starter");
  const [periodType, setPeriodType] = useState<PitchingPeriodType>("season");
  const [month, setMonth] = useState<number>(3);
  const [dow, setDow] = useState<number>(3);
  const [league, setLeague] = useState<string>("ALL");

  const [pitchers, setPitchers] = useState<PitcherLeaderRow[]>(initialStarters);
  const [teams, setTeams] = useState<TeamPitchingRow[]>(initialTeams);
  const [isPending, startTransition] = useTransition();

  const reload = (p: PitchingPeriodType, m: number, d: number, l: string, currentTab: "starter" | "reliever" | "team") => {
    startTransition(async () => {
      const isTeam = currentTab === "team";
      const role = currentTab === "reliever" ? "reliever" : "starter";
      const q = new URLSearchParams({
        type: isTeam ? "team" : "player",
        role,
        period: p,
        month: String(m),
        dow: String(d),
        league: l,
      });
      const res = await fetch(`/api/pitching?${q}`);
      if (res.ok) {
        const data = await res.json();
        if (isTeam) setTeams(data);
        else setPitchers(data);
      }
    });
  };

  const tabs: { key: "starter" | "reliever" | "team"; label: string }[] = [
    { key: "starter", label: "先発防御率 (era:s)" },
    { key: "reliever", label: "救援防御率 (era:m)" },
    { key: "team", label: "チーム防御率 (team:era)" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); reload(periodType, month, dow, league, t.key); }}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {t.label}
            </button>
          ))}
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
        <span className="font-bold text-slate-500 mr-1">集計:</span>
        {(["season", "month", "dow"] as const).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriodType(p); reload(p, month, dow, league, tab); }}
            className={`px-2.5 py-1 rounded transition-colors ${periodType === p ? "bg-blue-600 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {p === "season" ? "通算" : p === "month" ? "月別" : "曜日別"}
          </button>
        ))}
      </div>

      {periodType === "month" && (
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex gap-1.5 items-center overflow-x-auto">
          <span className="font-bold text-slate-500 mr-2 whitespace-nowrap">月:</span>
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
          <span className="font-bold text-slate-500 mr-2 whitespace-nowrap">曜日:</span>
          {DOWS.map(({ val, label }) => (
            <button
              key={val}
              onClick={() => { setDow(val); reload("dow", month, val, league, tab); }}
              className={`px-2.5 py-1 rounded transition-colors ${dow === val ? "bg-blue-600 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className={`transition-opacity duration-200 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {tab === "team" ? <TeamPitchingTable rows={teams} /> : <PitcherLeadersTable rows={pitchers} />}
      </div>
    </div>
  );
}
