"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckSquare, TrendingUp, Globe, Zap, MessageSquare, Activity, RefreshCw, Save } from "lucide-react";
import { getIntradayData, saveBatchData, syncAllPrices, type Asset, type WeeklyDataRow, type WeeklySnapshot } from "@/app/actions";
import { getMonday } from "@/lib/utils";

interface ClientRowData extends Asset {
  days: {
    mon: { price: string };
    tue: { price: string };
    wed: { price: string };
    thu: { price: string };
    fri: { price: string };
  };
  comments: string;
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
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const currentMonday = getMonday(new Date());
  const activeWeekMonday = new Date(currentMonday);
  activeWeekMonday.setDate(currentMonday.getDate() + (WEEKS_OFFSETS[activeWeekIdx].offset * 7));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setHasChanges(false);
    try {
      const result = await getIntradayData(activeWeekMonday);
      
      const clientData: ClientRowData[] = result.assets.map(asset => {
        const weekly = result.weeklyData.find(d => d.asset_id === asset.id) || {} as WeeklyDataRow;
        return {
          ...asset,
          days: {
            mon: { price: weekly.mon_price || "" },
            tue: { price: weekly.tue_price || "" },
            wed: { price: weekly.wed_price || "" },
            thu: { price: weekly.thu_price || "" },
            fri: { price: weekly.fri_price || "" },
          },
          comments: weekly.comments || "",
        };
      });

      setData(clientData);
      setSnapshot(result.snapshot);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [activeWeekIdx]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePriceChange = (assetId: number, day: string, value: string) => {
    setData(prev => prev.map(r => r.id === assetId ? { ...r, days: { ...r.days, [day]: { price: value } } } : r));
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

  const handleSync = async () => {
    if (hasChanges && !confirm("You have unsaved changes. Syncing will overwrite local changes. Continue?")) {
      return;
    }
    setLoading(true);
    try {
      await syncAllPrices(activeWeekMonday);
      await fetchData();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPercentageChange = (current: string, previous: string) => {
    const cur = parseFloat(current.replace(/,/g, ''));
    const prev = parseFloat(previous.replace(/,/g, ''));
    if (isNaN(cur) || isNaN(prev) || prev === 0) return null;
    const change = ((cur - prev) / prev) * 100;
    const isPositive = change > 0;
    return (
      <span className={`ml-1 text-[9px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        ({isPositive ? '+' : ''}{change.toFixed(2)}%)
      </span>
    );
  };

  const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Flow...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-full mx-auto px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="text-slate-900">
              <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Intraday Flow</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {activeWeekMonday.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
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
        <div className="max-w-full mx-auto px-6 flex items-center justify-between">
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
            
            <button
              onClick={handleSync}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing..." : "Sync Prices"}
            </button>
          </div>
        </div>
      </nav>

      <main className="px-6 py-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white">
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-left w-64 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">Asset Name</th>
                {DAYS.map(day => (
                  <th key={day} className="py-3 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-100 bg-white">
                    {day}
                  </th>
                ))}
                <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-100 bg-white">Notes</th>
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
                      <td className="p-4">
                        <span className={`w-full text-sm font-semibold ${row.type === 'index' ? 'text-slate-900' : 'text-slate-600'}`}>
                          {row.name}
                        </span>
                      </td>
                      {DAYS.map(day => (
                        <td key={day} className="p-0 border-l border-slate-100 relative">
                          <div className="flex flex-col items-center justify-center h-12">
                            <input
                              type="text"
                              value={row.days[day].price}
                              onChange={(e) => handlePriceChange(row.id, day, e.target.value)}
                              placeholder="—"
                              className="w-full text-center bg-transparent outline-none focus:bg-white font-mono font-medium text-xs text-slate-800 placeholder:text-slate-200"
                            />
                            {day !== 'mon' && day !== 'tue' && row.days[day].price && row.days.tue.price && (
                              <div className="absolute bottom-1">
                                {getPercentageChange(row.days[day].price, row.days.tue.price)}
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="p-0 border-l border-slate-100">
                        <input
                          type="text"
                          value={row.comments}
                          onChange={(e) => handleUpdate(row.id, "comments", e.target.value)}
                          className="w-full h-12 px-4 bg-transparent outline-none text-slate-500 font-normal text-sm"
                          placeholder="..."
                        />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: "Macro Bias", icon: <Globe size={16}/>, key: 'macro_bias' },
            { title: "Psychology", icon: <Activity size={16}/>, key: 'psychology' },
            { title: "Global Cues", icon: <Zap size={16}/>, key: 'global_cues' },
            { title: "Learnings", icon: <MessageSquare size={16}/>, key: 'learnings' }
          ].map(card => (
            <div key={card.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-slate-400">
                {card.icon}
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{card.title}</span>
              </div>
              <textarea 
                value={snapshot[card.key as keyof WeeklySnapshot] || ""}
                onChange={(e) => handleSnapshotUpdate(card.key as keyof WeeklySnapshot, e.target.value)}
                className="w-full h-32 bg-white border border-slate-200 rounded-lg p-4 text-sm font-normal text-slate-600 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all resize-none"
                placeholder={`Detailed ${card.title.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
