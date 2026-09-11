import React from "react";
import Link from "next/link";

interface GameTabsProps {
  currentTab: string;
  getUrl: (updates: Record<string, string | null>) => string;
}

export function GameTabs({ currentTab, getUrl }: GameTabsProps) {
  const tabs = [
    { key: "details", label: "📋 試合詳細データ" },
    { key: "rc5", label: "📈 直近5試合成績 (RC5)" },
    { key: "hand", label: "⚾️ 対左右投手成績" },
    { key: "pos", label: "🛡️ 主要守備位置別成績" },
  ];

  return (
    <div className="flex border-b border-slate-200">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.key;
        return (
          <Link
            key={tab.key}
            href={getUrl({ tab: tab.key })}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
