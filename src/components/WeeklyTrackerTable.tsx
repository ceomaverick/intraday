"use client";

import React, { useState } from "react";
import { Eye, Pencil, X } from "lucide-react";
import { useWeeklyTracker, type ClientRowData } from "./WeeklyTrackerProvider";

const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;

export default function WeeklyTrackerTable() {
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

  const getPercentageChange = (current: string, previous: string) => {
    if (!current || !previous) return null;
    const clean = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));
    const cur = clean(current);
    const prev = clean(previous);
    if (isNaN(cur) || isNaN(prev) || prev === 0) return null;
    const change = ((cur - prev) / prev) * 100;
    const isPositive = change > 0;
    return (
      <span className={`font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
  };

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
      <span className={`ml-2 text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '+' : ''}{totalChange.toFixed(2)}%
      </span>
    );
  };

  const getDayFullDate = (dayIdx: number) => {
    const date = new Date(activeWeekMonday);
    date.setDate(activeWeekMonday.getDate() + dayIdx);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
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

  if (!loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-slate-900 font-bold text-lg mb-2">No Assets Found</div>
        <p className="text-slate-500 text-sm max-w-md">
          The database appears to be empty.
        </p>
      </div>
    );
  }

  const activeNoteAsset = noteModal ? data.find(r => r.id === noteModal.assetId) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-white">
          <tr className="border-b border-slate-200">
            <th className="py-3 px-4 text-left w-64 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">Asset Name</th>
            {DAYS.map((day, idx) => (
              <th key={day} className="py-3 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-100 bg-white">
                {getDayFullDate(idx)}
              </th>
            ))}
            <th className="py-3 px-4 text-center w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-100 bg-white">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, index) => {
            const isNewSection = index > 0 && data[index-1].type !== row.type;

            return (
              <React.Fragment key={row.id}>
                {isNewSection && (
                  <tr className="bg-slate-50/80">
                    <td colSpan={10} className="h-2 p-0"></td>
                  </tr>
                )}
                <tr className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-1">
                    <div className="flex items-center">
                      <span className={`text-sm font-semibold truncate ${row.type === 'index' ? 'text-slate-900' : 'text-slate-600'}`}>
                        {row.name}
                      </span>
                      {getWeeklyAverageChange(row)}
                    </div>
                  </td>
                  {DAYS.map((day, idx) => {
                    const prevDayPrice = idx === 0 
                      ? row.prevFriPrice 
                      : row.days[DAYS[idx - 1]].price;

                    return (
                      <td key={day} className="p-0 border-l border-slate-100 min-w-[200px]">
                        <div className="flex items-center px-3 h-12 gap-4">
                          <input
                            type="text"
                            value={row.days[day].price}
                            onChange={(e) => handlePriceChange(row.id, day, e.target.value)}
                            placeholder="—"
                            className="w-20 text-right bg-transparent outline-none focus:bg-white font-mono font-bold text-sm text-slate-900 placeholder:text-slate-200"
                          />
                          
                          {row.days[day].price && prevDayPrice && (
                            <div className="text-sm font-mono leading-none flex-shrink-0">
                              {getPercentageChange(row.days[day].price, prevDayPrice)}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button 
                              onClick={() => setNoteModal({ assetId: row.id, day, mode: 'view' })}
                              className={`transition-colors ${row.days[day].notes ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => setNoteModal({ assetId: row.id, day, mode: 'edit' })}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-0 border-l border-slate-100">
                    <div className="flex items-center justify-center h-12 gap-3">
                      <button 
                        onClick={() => setNoteModal({ assetId: row.id, mode: 'view' })}
                        className={`transition-colors ${row.comments ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900'}`}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => setNoteModal({ assetId: row.id, mode: 'edit' })}
                        className="text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

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
