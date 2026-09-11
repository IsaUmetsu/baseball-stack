import React from "react";
import { fetchPitcherLeaders, fetchTeamPitching } from "./query";
import { PitcherLeaderRow, TeamPitchingRow } from "./types";
import PitchingClient from "./PitchingClient";
import { HeaderNav } from "@/components/HeaderNav";

export const dynamic = "force-dynamic";

export default async function PitchingPage() {
  let initialStarters: PitcherLeaderRow[] = [];
  let initialTeams: TeamPitchingRow[] = [];
  let errorMsg: string | null = null;

  try {
    [initialStarters, initialTeams] = await Promise.all([
      fetchPitcherLeaders({ periodType: "season", role: "starter" }, 30),
      fetchTeamPitching({ periodType: "season" }),
    ]);
  } catch (err: any) {
    console.error("Failed to load pitching stats:", err);
    errorMsg = err.message || "投手データの取得に失敗しました。";
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <HeaderNav
        title="投手成績・防御率リーダー"
        subtitle="先発(era:s)・救援(era:m)・チーム防御率(team:era)・WHIP"
        icon="🎯"
        currentPath="/pitching"
      />

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {errorMsg ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {errorMsg}
          </div>
        ) : (
          <PitchingClient initialStarters={initialStarters} initialTeams={initialTeams} />
        )}
      </main>
    </div>
  );
}

