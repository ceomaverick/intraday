"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckSquare, TrendingUp, Globe, Zap, MessageSquare, Activity } from "lucide-react";
import { getIntradayData, updateWeeklyData, updateSnapshot, type Asset, type WeeklyDataRow, type WeeklySnapshot } from "@/app/actions";
import { getMonday } from "@/lib/utils";

interface ClientRowData extends Asset {
  days: {
    mon: { price: string; traded: boolean };
    tue: { price: string; traded: boolean };
    wed: { price: string; traded: boolean };
    thu: { price: string; traded: boolean };
    fri: { price: string; traded: boolean };
  };
  event: string;
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

  const currentMonday = getMonday(new Date());
  const activeWeekMonday = new Date(currentMonday);
  activeWeekMonday.setDate(currentMonday.getDate() + (WEEKS_OFFSETS[activeWeekIdx].offset * 7));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getIntradayData(activeWeekMonday);
      
      const clientData: ClientRowData[] = result.assets.map(asset => {
        const weekly = result.weeklyData.find(d => d.asset_id === asset.id) || {} as WeeklyDataRow;
        return {
          ...asset,
          days: {
            mon: { price: weekly.mon_price || "", traded: weekly.mon_traded || false },
            tue: { price: weekly.tue_price || "", traded: weekly.tue_traded || false },
            wed: { price: weekly.wed_price || "", traded: weekly.wed_traded || false },
            thu: { price: weekly.thu_price || "", traded: weekly.thu_traded || false },
            fri: { price: weekly.fri_price || "", traded: weekly.fri_traded || false },
          },
          event: weekly.event || "",
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

  const handlePriceChange = async (assetId: number, day: string, value: string) => {
    // Optimistic Update
    setData(prev => prev.map(r => r.id === assetId ? { ...r, days: { ...r.days, [day]: { ...r.days[day as keyof typeof r.days], price: value } } } : r));
    await updateWeeklyData(assetId, activeWeekMonday, `${day}_price`, value);
  };

  const toggleTraded = async (assetId: number, day: string) => {
    const row = data.find(r => r.id === assetId);
    if (!row) return;
    const newValue = !row.days[day as keyof typeof row.days].traded;
    
    // Optimistic Update
    setData(prev => prev.map(r => r.id === assetId ? { ...r, days: { ...r.days, [day]: { ...r.days[day as keyof typeof r.days], traded: newValue } } } : r));
    await updateWeeklyData(assetId, activeWeekMonday, `${day}_traded`, newValue);
  };

  const handleUpdate = async (assetId: number, field: string, value: string) => {
    // Optimistic Update
    setData(prev => prev.map(r => r.id === assetId ? { ...r, [field]: value } : r));
    await updateWeeklyData(assetId, activeWeekMonday, field, value);
  };

  const handleSnapshotUpdate = async (field: keyof WeeklySnapshot, value: string) => {
    setSnapshot(prev => ({ ...prev, [field]: value }));
    await updateSnapshot(activeWeekMonday, field, value);
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
        <div className="max-w-full mx-auto px-6">
          <div className="flex items-center gap-12 overflow-x-auto no-scrollbar">
            {WEEKS_OFFSETS.map((week) => (
              <button
                key={week.id}
                onClick={() => setActiveWeekIdx(week.id)}
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
        </div>
      </nav>

      <main className="px-6 py-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-white">
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-left w-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">Category</th>
                <th className="py-3 px-4 text-left w-64 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">Asset Name</th>
                {DAYS.map(day => (
                  <th key={day} className="py-3 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-100 bg-white" colSpan={2}>
                    {day}
                  </th>
                ))}
                <th className="py-3 px-4 text-left w-48 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-100 bg-white">Events</th>
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
                        <td colSpan={14} className="h-2 p-0"></td>
                      </tr>
                    )}
                    <tr className="group hover:bg-slate-50 transition-colors">
                      <td className="p-0 text-center font-bold text-[10px] tracking-tight">
                        <span className={  
                          row.category === 'HIGH' ? 'text-blue-600' :
                          row.category === 'MID' ? 'text-slate-400' :
                          'text-slate-300'
                        }>{row.category}</span>
                      </td>
                      <td className="p-4">
                        <span className={`w-full text-sm font-semibold ${row.type === 'index' ? 'text-slate-900' : 'text-slate-600'}`}>
                          {row.name}
                        </span>
                      </td>
                      {DAYS.map(day => (
                        <React.Fragment key={day}>
                          <td className="p-0 border-l border-slate-100">
                            <input
                              type="text"
                              value={row.days[day].price}
                              onChange={(e) => handlePriceChange(row.id, day, e.target.value)}
                              placeholder="—"
                              className="w-full h-12 px-4 text-right bg-transparent outline-none focus:bg-white font-mono font-medium text-xs text-slate-800 placeholder:text-slate-200"
                            />
                          </td>
                          <td className="p-0 w-12 border-r border-slate-100 last:border-r-0">
                            <button
                              onClick={() => toggleTraded(row.id, day)}
                              className={`w-full h-12 flex items-center justify-center transition-all ${   
                                row.days[day].traded ? 'text-emerald-600' : 'text-slate-200 hover:text-slate-400'
                              }`}
                            >
                              <CheckSquare size={16} strokeWidth={row.days[day].traded ? 3 : 2} className={row.days[day].traded ? "opacity-100" : "opacity-30"} />
                            </button>
                          </td>
                        </React.Fragment>
                      ))}
                      <td className="p-0 border-l border-slate-100">
                        <input
                          type="text"
                          value={row.event}
                          onChange={(e) => handleUpdate(row.id, "event", e.target.value)}
                          className="w-full h-12 px-4 bg-transparent outline-none text-slate-400 font-medium text-xs"
                          placeholder="—"
                        />
                      </td>
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
