import React from "react";
import { fetchBatterLeaders, fetchTeamBatting } from "./query";
import { BatterLeaderRow, TeamBattingRow } from "./types";
import BattingClient from "./BattingClient";
import { HeaderNav } from "@/components/HeaderNav";

export const dynamic = "force-dynamic";

export default async function BattingPage() {
  let initialPlayers: BatterLeaderRow[] = [];
  let initialTeams: TeamBattingRow[] = [];
  let errorMsg: string | null = null;

  try {
    [initialPlayers, initialTeams] = await Promise.all([
      fetchBatterLeaders({ periodType: "season" }, 30),
      fetchTeamBatting({ periodType: "season" }),
    ]);
  } catch (err: any) {
    console.error("Failed to load batting stats:", err);
    errorMsg = err.message || "打撃データの取得に失敗しました。";
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <HeaderNav
        title="打撃成績・首位打者分析"
        subtitle="通算・月別(month:bat)・曜日別(dow:bat) 首位打者・チーム打率・出塁率"
        icon="⚾️"
        currentPath="/batting"
      />

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {errorMsg ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {errorMsg}
          </div>
        ) : (
          <BattingClient initialPlayers={initialPlayers} initialTeams={initialTeams} />
        )}
      </main>
    </div>
  );
}

