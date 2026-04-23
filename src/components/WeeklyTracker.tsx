"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TrendingUp, Save, Eye, Pencil, X } from "lucide-react";
import { getIntradayData, saveBatchData, type Asset, type WeeklyDataRow, type WeeklySnapshot } from "@/app/actions";
import { getMonday } from "@/lib/utils";

interface ClientRowData extends Asset {
  days: {
    mon: { price: string; notes: string };
    tue: { price: string; notes: string };
    wed: { price: string; notes: string };
    thu: { price: string; notes: string };
    fri: { price: string; notes: string };
  };
  comments: string;
  prevFriPrice: string;
}

const WEEKS_OFFSETS = [
  { id: 0, label: "Previous Week", offset: -1 },
  { id: 1, label: "Current Week", offset: 0 },
  { id: 2, label: "Next Week", offset: 1 },
  { id: 3, label: "Week +2", offset: 2 },
  { id: 4, label: "Week +3", offset: 3 },
];

export default function WeeklyTracker() {
  const [data, setData] = useState<ClientRowData[]>([]);
  const [snapshot, setSnapshot] = useState<WeeklySnapshot>({
    gift_nifty: "", oil: "", rupee: "", asia: "",
    macro_bias: "", psychology: "", global_cues: "", learnings: ""
  });
  const [activeWeekIdx, setActiveWeekIdx] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [noteModal, setNoteModal] = useState<{ assetId: number; day?: string; mode: 'view' | 'edit' } | null>(null);
  
  const lastFetchedRef = useRef<string>("");

  const activeWeekMonday = useMemo(() => {
    const currentMonday = getMonday(new Date());
    const date = new Date(currentMonday);
    date.setDate(currentMonday.getDate() + (WEEKS_OFFSETS[activeWeekIdx].offset * 7));
    return date;
  }, [activeWeekIdx]);

  const fetchData = useCallback(async () => {
    const year = activeWeekMonday.getFullYear();
    const month = activeWeekMonday.getMonth();
    const day = activeWeekMonday.getDate();
    const weekKey = `${year}-${month}-${day}`;

    if (lastFetchedRef.current === weekKey && data.length > 0) return;
    
    setLoading(true);
    setError(null);
    setHasChanges(false);
    lastFetchedRef.current = weekKey;

    try {
      const result = await getIntradayData(activeWeekMonday);
      
      const clientData: ClientRowData[] = result.assets.map(asset => {
        const weekly = result.weeklyData.find(d => d.asset_id === asset.id) || {} as WeeklyDataRow;
        const prev = (result as any).prevWeeklyData?.find((d: any) => d.asset_id === asset.id);

        return {
          ...asset,
          days: {
            mon: { price: weekly.mon_price || "", notes: weekly.mon_notes || "" },
            tue: { price: weekly.tue_price || "", notes: weekly.tue_notes || "" },
            wed: { price: weekly.wed_price || "", notes: weekly.wed_notes || "" },
            thu: { price: weekly.thu_price || "", notes: weekly.thu_notes || "" },
            fri: { price: weekly.fri_price || "", notes: weekly.fri_notes || "" },
          },
          comments: weekly.comments || "",
          prevFriPrice: prev?.fri_price || "",
        };
      });

      setData(clientData);
      setSnapshot(result.snapshot);
    } catch (err: any) {
      console.error("Failed to fetch:", err);
      setError(err.message || "Failed to load data from server");
      lastFetchedRef.current = "";
    } finally {
      setLoading(false);
    }
  }, [activeWeekMonday, data.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePriceChange = (assetId: number, day: string, value: string) => {
    setData(prev => prev.map(r => r.id === assetId ? { ...r, days: { ...r.days, [day]: { ...r.days[day as keyof typeof r.days], price: value } } } : r));
    setHasChanges(true);
  };

  const handleNoteUpdate = (assetId: number, day: string, value: string) => {
    setData(prev => prev.map(r => r.id === assetId ? { ...r, days: { ...r.days, [day]: { ...r.days[day as keyof typeof r.days], notes: value } } } : r));
    setHasChanges(true);
  };

  const handleUpdate = (assetId: number, field: string, value: string) => {
    setData(prev => prev.map(r => r.id === assetId ? { ...r, [field]: value } : r));
    setHasChanges(true);
  };

  const handleSnapshotUpdate = (field: keyof WeeklySnapshot, value: string) => {
    setSnapshot(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const weeklyBatch = data.map(row => ({
        asset_id: row.id,
        mon_price: row.days.mon.price,
        tue_price: row.days.tue.price,
        wed_price: row.days.wed.price,
        thu_price: row.days.thu.price,
        fri_price: row.days.fri.price,
        mon_notes: row.days.mon.notes,
        tue_notes: row.days.tue.notes,
        wed_notes: row.days.wed.notes,
        thu_notes: row.days.thu.notes,
        fri_notes: row.days.fri.notes,
        comments: row.comments
      }));

      await saveBatchData(activeWeekMonday, weeklyBatch, snapshot);
      setHasChanges(false);
      console.log("✅ Batch save successful");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
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
      <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        ({isPositive ? '+' : ''}{change.toFixed(2)}%)
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

  const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
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

  if (!loading && data.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
        <div className="text-slate-900 font-bold text-lg mb-2">No Assets Found</div>
        <p className="text-slate-500 text-sm max-w-md">
          The database appears to be empty. Please ensure you have run the seed scripts to populate the assets table.
        </p>
      </div>
    );
  }

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Flow...</div>
      </div>
    );
  }

  const activeNoteAsset = noteModal ? data.find(r => r.id === noteModal.assetId) : null;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      
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

          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { label: "GIFT", key: 'gift_nifty' },
              { label: "OIL", key: 'oil' },
              { label: "INR", key: 'rupee' },
              { label: "ASIA", key: 'asia' }
            ].map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                <input
                  type="text"
                  value={snapshot[item.key as keyof WeeklySnapshot] || ""}
                  onChange={(e) => handleSnapshotUpdate(item.key as keyof WeeklySnapshot, e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent outline-none border-b border-slate-200 focus:border-slate-900 text-sm font-semibold w-16 text-slate-900 transition-colors py-0.5 text-center"
                />
              </div>
            ))}
          </div>
        </div>
      </header>

      <nav className="bg-slate-50/50 border-b border-slate-200 backdrop-blur-sm">
        <div className="max-w-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-12 overflow-x-auto no-scrollbar">
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

      <main className="px-6 py-4">
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
                            <div className="flex items-center px-3 h-12 gap-2">
                              <input
                                type="text"
                                value={row.days[day].price}
                                onChange={(e) => handlePriceChange(row.id, day, e.target.value)}
                                placeholder="—"
                                className="w-16 text-right bg-transparent outline-none focus:bg-white font-mono font-bold text-xs text-slate-900 placeholder:text-slate-200"
                              />
                              
                              {row.days[day].price && prevDayPrice && (
                                <div className="text-[10px] font-mono leading-none flex-shrink-0">
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
        </div>

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
      </main>
    </div>
  );
}
