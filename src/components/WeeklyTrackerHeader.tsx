"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Save, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useWeeklyTracker, WEEKS_OFFSETS } from "./WeeklyTrackerProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WeeklyTrackerHeader() {
  const { 
    activeWeekIdx, 
    setActiveWeekIdx, 
    hasChanges, 
    handleSave, 
    saving, 
    activeWeekMonday 
  } = useWeeklyTracker();
  
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'short'
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-full mx-auto px-4 py-4 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="text-slate-900">
              <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Intraday Flow</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Week starting {activeWeekMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
            <div className="text-sm font-bold text-slate-900">
              Welcome, Avinash, happy trading
            </div>
            <div className="flex items-center gap-3 text-slate-500 mt-1 min-h-[1.5rem]">
              {mounted ? (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{formattedDate}</span>
                  <span className="w-px h-3 bg-slate-200" />
                  <span className="text-xs font-bold text-slate-900 tabular-nums">{formattedTime}</span>
                </>
              ) : (
                <div className="h-4 w-32 bg-slate-100 animate-pulse rounded" />
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-slate-50/50 border-b border-slate-200 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-8 overflow-x-auto no-scrollbar border-r border-slate-200 pr-8">
              {WEEKS_OFFSETS.map((week) => (
                <button
                  key={week.id}
                  onClick={() => {
                    if (hasChanges && !confirm("Unsaved changes will be lost. Continue?")) return;
                    setActiveWeekIdx(week.id);
                  }}
                  className={`py-4 text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap relative transition-colors ${
                    activeWeekIdx === week.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {week.label}
                  {activeWeekIdx === week.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
              <Link 
                href="/"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  pathname === '/' || pathname === '/table'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <TableIcon size={14} />
                Table
              </Link>
              <Link 
                href="/cards"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  pathname === '/cards'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid size={14} />
                Cards
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 animate-in fade-in zoom-in duration-300"
              >
                <Save size={12} className={saving ? "animate-pulse" : ""} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
