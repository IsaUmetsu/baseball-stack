"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Constants for UI
const TEAM_NAMES = {
  H: "ソフトバンク",M: "ロッテ",E: "楽天",F: "日本ハム",L: "西武",B: "オリックス",
  G: "巨人",T: "阪神",De: "DeNA",D: "中日",C: "広島",S: "ヤクルト",
};

const LEAGUE_TEAMS = {
  P: { H: "ソ", M: "ロ", E: "楽", F: "日", L: "西", B: "オ" },
  C: { G: "巨", T: "神", De: "デ", D: "中", C: "広", S: "ヤ" },
};

interface BatRc5ClientProps {
  initialData: any[];
  targetDate: string;
  targetLeague: string;
  targetTeam: string;
  errorMsg: string | null;
}

// Helper to format stats
function formatPct(val: any): string {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  if (num === 1) return "1.000";
  if (num === 0) return ".000";
  const str = num.toFixed(3);
  return str.startsWith("0.") ? str.slice(1) : str;
}

export default function BatRc5Client({
  initialData,
  targetDate,
  targetLeague,
  targetTeam,
  errorMsg,
}: BatRc5ClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [localDate, setLocalDate] = useState(targetDate);
  const [localLeague, setLocalLeague] = useState(targetLeague);
  const [localTeam, setLocalTeam] = useState(targetTeam);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: string } | null>({ key: 'average', direction: 'desc' });

  const sortedData = [...initialData].sort((a, b) => {
    if (sortConfig === null) {
      return 0;
    }
    const { key, direction } = sortConfig;
    const valA = a[key];
    const valB = b[key];

    if (valA == null && valB == null) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;
    
    const numA = Number(valA);
    const numB = Number(valB);

    if (numA < numB) {
      return direction === 'asc' ? -1 : 1;
    }
    if (numA > numB) {
      return direction === 'asc' ? 1 : -1;
    }

    return 0;
  });

  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = () => {
    const params = new URLSearchParams();
    params.set("date", localDate);
    params.set("league", localLeague);
    if (localTeam !== "%") {
      params.set("team", localTeam);
    }
    startTransition(() => {
      router.push(`/bat-rc5?${params.toString()}`);
    });
  };

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Recent 5 Games Batter Stats (bat:rc5)</h1>
      </header>

      <div className="flex space-x-2 mb-4 p-2 bg-slate-100 rounded">
        <input
          type="date"
          value={localDate}
          onChange={(e) => setLocalDate(e.target.value)}
          className="border p-1 rounded"
        />
        <select
          value={localLeague}
          onChange={(e) => {
            setLocalLeague(e.target.value);
            setLocalTeam("%"); // Reset team on league change
          }}
          className="border p-1 rounded"
        >
          <option value="P">パ・リーグ</option>
          <option value="C">セ・リーグ</option>
        </select>
        <select
          value={localTeam}
          onChange={(e) => setLocalTeam(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="%">リーグ全体</option>
          {Object.keys(LEAGUE_TEAMS[localLeague]).map((team) => (
            <option key={team} value={team}>
              {TEAM_NAMES[team]}
            </option>
          ))}
        </select>
        <button
          onClick={handleFilterChange}
          disabled={isPending}
          className="bg-blue-500 text-white px-4 py-1 rounded disabled:bg-gray-400"
        >
          {isPending ? "更新中..." : "更新"}
        </button>
      </div>

      {errorMsg && <p className="text-red-500">Error: {errorMsg}</p>}

      <table className="min-w-full bg-white border">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border-b text-center cursor-pointer" onClick={() => requestSort('average')}>
              打率 {sortConfig?.key === 'average' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="p-2 border-b text-center cursor-pointer" onClick={() => requestSort('bat')}>
              打数 {sortConfig?.key === 'bat' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="p-2 border-b text-center cursor-pointer" onClick={() => requestSort('hit')}>
              安打 {sortConfig?.key === 'hit' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="p-2 border-b text-center">
              選手名
            </th>
            <th className="p-2 border-b text-center cursor-pointer" onClick={() => requestSort('hr')}>
              本塁打 {sortConfig?.key === 'hr' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="p-2 border-b text-center cursor-pointer" onClick={() => requestSort('rbi')}>
              打点 {sortConfig?.key === 'rbi' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-100">
              <td className="p-2 border-b font-mono font-semibold text-center">{formatPct(row.average)}</td>
              <td className="p-2 border-b font-mono text-center">{row.bat}</td>
              <td className="p-2 border-b font-mono text-center">{row.hit}</td>
              <td className="p-2 border-b text-center">{row.batter}</td>
              <td className="p-2 border-b font-mono text-center">{row.hr}</td>
              <td className="p-2 border-b font-mono text-center">{row.rbi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
