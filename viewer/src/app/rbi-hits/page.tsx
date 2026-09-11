import React from "react";
import { fetchAvailableDates, fetchRbiHitsByDate, fetchBatterRbiRanking } from "./query";
import { RbiHitRow, BatterRbiRank } from "./types";
import RbiHitsClient from "./RbiHitsClient";
import { HeaderNav } from "@/components/HeaderNav";

export const dynamic = "force-dynamic";

export default async function RbiHitsPage() {
  let availableDates: string[] = [];
  let initialHits: RbiHitRow[] = [];
  let initialRanking: BatterRbiRank[] = [];
  let errorMsg: string | null = null;

  try {
    availableDates = await fetchAvailableDates();
    const targetDate = availableDates[0] || "20260327";
    [initialHits, initialRanking] = await Promise.all([
      fetchRbiHitsByDate(targetDate),
      fetchBatterRbiRanking(30),
    ]);
  } catch (err: any) {
    console.error("Failed to load rbi hits data:", err);
    errorMsg = err.message || "適時打データの読み込みに失敗しました。";
  }

  const initialDate = availableDates[0] || "20260327";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <HeaderNav
        title="適時打・打点付き安打 (RBI Hits)"
        subtitle="本日のタイムリー (day:rbi:hit)・先制・同点・勝ち越し・逆転・サヨナラ"
        icon="⚡️"
        currentPath="/rbi-hits"
      />

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {errorMsg ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {errorMsg}
          </div>
        ) : (
          <RbiHitsClient
            initialDate={initialDate}
            availableDates={availableDates}
            initialHits={initialHits}
            initialRanking={initialRanking}
          />
        )}
      </main>
    </div>
  );
}

