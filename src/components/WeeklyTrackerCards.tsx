"use client";

import React, { useState } from "react";
import { Eye, Pencil, X, Calendar } from "lucide-react";
import { useWeeklyTracker, type ClientRowData } from "./WeeklyTrackerProvider";

const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;

export default function WeeklyTrackerCards() {
  const { 
    data, 
    loading, 
    error, 
    fetchData,
    activeWeekMonday,
    handlePriceChange,
    handleNoteUpdate,
    handleUpdate
  } = useWeeklyTracker();

  const [noteModal, setNoteModal] = useState<{ assetId: number; day?: string; mode: 'view' | 'edit' } | null>(null);

  const getWeeklyAverageChange = (row: ClientRowData) => {
    const clean = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));
    const prices = [
      row.days.mon.price,
      row.days.tue.price,
      row.days.wed.price,
      row.days.thu.price,
      row.days.fri.price
    ].map(p => clean(p)).filter(p => !isNaN(p) && p !== 0);

    if (prices.length < 1) return null;
    
    const basePrice = row.prevFriPrice ? clean(row.prevFriPrice) : clean(row.days.mon.price);
    if (isNaN(basePrice) || basePrice === 0) return null;

    const lastPrice = prices[prices.length - 1];
    const totalChange = ((lastPrice - basePrice) / basePrice) * 100;
    
    const isPositive = totalChange > 0;
    return (
      <span className={`text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '+' : ''}{totalChange.toFixed(2)}%
      </span>
    );
  };

  const getPercentageChange = (current: string, previous: string) => {
    if (!current || !previous) return null;
    const clean = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));
    const cur = clean(current);
    const prev = clean(previous);
    if (isNaN(cur) || isNaN(prev) || prev === 0) return null;
    const change = ((cur - prev) / prev) * 100;
    const isPositive = change > 0;
    return (
      <span className={`font-mono font-bold text-sm ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
  };

  const getDayLabel = (dayIdx: number) => {
    const date = new Date(activeWeekMonday);
    date.setDate(activeWeekMonday.getDate() + dayIdx);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric',
      month: 'short'
    });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-rose-600 font-bold text-lg mb-2">Server Error</div>
        <p className="text-slate-500 text-sm max-w-md mb-6">{error}</p>
        <button 
          onClick={() => fetchData()}
          className="px-6 py-2 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Flow...</div>
      </div>
    );
  }

  const activeNoteAsset = noteModal ? data.find(r => r.id === noteModal.assetId) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
      {data.map((row) => (
        <div key={row.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${row.type === 'index' ? 'bg-slate-900' : 'bg-slate-400'}`} />
              <h3 className="font-bold text-slate-900 text-sm truncate max-w-[150px]">{row.name}</h3>
              {getWeeklyAverageChange(row)}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setNoteModal({ assetId: row.id, mode: 'view' })}
                className={`p-1.5 rounded-md hover:bg-white transition-colors ${row.comments ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <Eye size={14} />
              </button>
              <button 
                onClick={() => setNoteModal({ assetId: row.id, mode: 'edit' })}
                className="p-1.5 rounded-md hover:bg-white text-slate-300 hover:text-slate-500 transition-colors"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-1">
            {DAYS.map((day, idx) => {
              const prevDayPrice = idx === 0 
                ? row.prevFriPrice 
                : row.days[DAYS[idx - 1]].price;

              return (
                <div key={day} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 group">
                  <div className="flex items-center gap-2">
                    <div className="w-8 text-xs font-bold text-slate-900 uppercase">{day}</div>
                    <div className="text-xs text-slate-400 tabular-nums font-medium">
                      {getDayLabel(idx).split(',')[1]}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={row.days[day].price}
                      onChange={(e) => handlePriceChange(row.id, day, e.target.value)}
                      placeholder="—"
                      className="w-24 text-right bg-slate-50 border border-transparent focus:border-slate-200 focus:bg-white rounded px-2 py-1 font-mono font-bold text-xs text-slate-900 placeholder:text-slate-200 transition-all"
                    />

                    <div className="text-xs min-w-[50px] text-right">
                      {row.days[day].price && prevDayPrice ? (
                        getPercentageChange(row.days[day].price, prevDayPrice)
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setNoteModal({ assetId: row.id, day, mode: 'view' })}
                        className={`p-1 rounded-md transition-colors ${row.days[day].notes ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => setNoteModal({ assetId: row.id, day, mode: 'edit' })}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {row.comments && (
            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weekly Notes</div>
              <p className="text-xs text-slate-600 line-clamp-2 italic">"{row.comments}"</p>
            </div>
          )}
        </div>
      ))}

      {/* Note Modal */}
      {noteModal && activeNoteAsset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                {noteModal.mode === 'edit' ? 'Edit' : ''} {noteModal.day ? `${noteModal.day.toUpperCase()} Notes` : 'Weekly Notes'}: {activeNoteAsset.name}
              </h3>
              <button 
                onClick={() => setNoteModal(null)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {noteModal.mode === 'edit' ? (
                <textarea
                  autoFocus
                  value={noteModal.day ? (activeNoteAsset.days[noteModal.day as keyof typeof activeNoteAsset.days] as any).notes : activeNoteAsset.comments}
                  onChange={(e) => {
                    if (noteModal.day) {
                      handleNoteUpdate(activeNoteAsset.id, noteModal.day, e.target.value);
                    } else {
                      handleUpdate(activeNoteAsset.id, "comments", e.target.value);
                    }
                  }}
                  className="w-full h-48 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm font-normal text-slate-600 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all resize-none"
                  placeholder="Add notes..."
                />
              ) : (
                <div className="min-h-32 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {(noteModal.day ? (activeNoteAsset.days[noteModal.day as keyof typeof activeNoteAsset.days] as any).notes : activeNoteAsset.comments) || 
                    <span className="text-slate-300 italic">No notes added yet.</span>}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setNoteModal(null)}
                className="px-6 py-2 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                {noteModal.mode === 'edit' ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
