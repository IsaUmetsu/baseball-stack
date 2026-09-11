import React from "react";
import { fetchStandings } from "./query";
import { StandingRow } from "./types";
import StandingsClient from "./StandingsClient";
import { HeaderNav } from "@/components/HeaderNav";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  let initialRows: StandingRow[] = [];
  let errorMsg: string | null = null;

  try {
    initialRows = await fetchStandings({ periodType: "season" });
  } catch (err: any) {
    console.error("Failed to fetch initial standings:", err);
    errorMsg = err.message || "データ取得に失敗しました。";
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <HeaderNav
        title="順位表・勝敗サマリー"
        subtitle="通算・月別(month:stand)・曜日別(dow:stand) 勝敗・勝率・得失点差"
        icon="🏆"
        currentPath="/standings"
      />

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {errorMsg ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {errorMsg}
          </div>
        ) : (
          <StandingsClient
            initialRows={initialRows}
            currentPeriodType="season"
            currentMonth={3}
            currentDow={3}
          />
        )}
      </main>
    </div>
  );
}


