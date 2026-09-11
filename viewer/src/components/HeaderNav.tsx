import React from "react";
import Link from "next/link";

interface Props {
  title: string;
  subtitle: string;
  icon: string;
  currentPath: string;
}

const NAV_ITEMS = [
  { href: "/", label: "トップ", icon: "🏠" },
  { href: "/standings", label: "順位表", icon: "🏆" },
  { href: "/batting", label: "打撃成績", icon: "⚾️" },
  { href: "/pitching", label: "投手成績", icon: "🎯" },
  { href: "/rbi-hits", label: "適時打", icon: "⚡️" },
  { href: "/team-stats", label: "チーム成績", icon: "📊" },
  { href: "/runs-allowed", label: "イニング得失点", icon: "⏱️" },
  { href: "/left-on-base", label: "残塁数", icon: "⚾️" },
];

export function HeaderNav({ title, subtitle, icon, currentPath }: Props) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1.5 text-xs">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 font-bold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
