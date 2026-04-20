"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, TrendingUp, Globe, Zap, MessageSquare, Activity } from "lucide-react";

interface DayData {
  price: string;
  traded: boolean;
}

interface RowData {
  id: string;
  type: "index" | "stock";
  category: string;
  name: string;
  days: {
    mon: DayData;
    tue: DayData;
    wed: DayData;
    thu: DayData;
    fri: DayData;
  };
  event: string;
  comments: string;
}

const INITIAL_DATA: RowData[] = [
  // Master Indices
  { id: "idx-1", type: "index", category: "INDEX", name: "NIFTY 50", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "idx-2", type: "index", category: "GLOBAL", name: "GIFT NIFTY", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "idx-3", type: "index", category: "FOREX", name: "RUPEE (USD/INR)", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "idx-4", type: "index", category: "CMDTY", name: "OIL (BRENT)", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "idx-5", type: "index", category: "GLOBAL", name: "ASIA (NIKKEI/HS)", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },

  // Stocks Section
  { id: "stk-1", type: "stock", category: "HIGH", name: "Shriram Finance", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-2", type: "stock", category: "HIGH", name: "Trent", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-3", type: "stock", category: "MID", name: "Nykaa", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-4", type: "stock", category: "MID", name: "Uno Minda", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-5", type: "stock", category: "HIGH", name: "Force Motors", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-6", type: "stock", category: "MID", name: "Navin Fluorine", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-7", type: "stock", category: "MID", name: "Maha Bank", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-10", type: "stock", category: "HIGH", name: "Coromandel", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-12", type: "stock", category: "MID", name: "Cartrade", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-13", type: "stock", category: "MID", name: "Awfis", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-15", type: "stock", category: "MID", name: "OneSource", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-16", type: "stock", category: "MID", name: "Ujiivan", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
  { id: "stk-17", type: "stock", category: "MID", name: "RBL", days: { mon: { price: "", traded: false }, tue: { price: "", traded: false }, wed: { price: "", traded: false }, thu: { price: "", traded: false }, fri: { price: "", traded: false } }, event: "", comments: "" },
];

export default function WeeklyTracker() {
  const [data, setData] = useState<RowData[]>(INITIAL_DATA);
  const [mounted, setMounted] = useState(false);
  const [snapshot, setSnapshot] = useState({ giftNifty: "", oil: "", rupee: "", asia: "" });
  const [activeWeek, setActiveWeek] = useState(1); // 0: Previous, 1: Current, 2: Next, 3: Next+1, 4: Next+2

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const WEEKS = [
    { id: 0, label: "Previous Week" },
    { id: 1, label: "Current Week" },
    { id: 2, label: "Next Week" },
    { id: 3, label: "Week +2" },
    { id: 4, label: "Week +3" },
  ];

  const handlePriceChange = (id: string, day: keyof RowData["days"], value: string) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, days: { ...r.days, [day]: { ...r.days[day], price: value } } } : r));
  };

  const toggleTraded = (id: string, day: keyof RowData["days"]) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, days: { ...r.days, [day]: { ...r.days[day], traded: !r.days[day].traded } } } : r));
  };

  const handleUpdate = (id: string, field: keyof RowData, value: string) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  if (!mounted) return null;
  const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      
      {/* Minimalist Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-full mx-auto px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="text-slate-900">
              <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Intraday Flow</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { label: "GIFT", key: 'giftNifty' },
              { label: "OIL", key: 'oil' },
              { label: "INR", key: 'rupee' },
              { label: "ASIA", key: 'asia' }
            ].map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                <input
                  type="text"
                  value={snapshot[item.key as keyof typeof snapshot]}
                  onChange={(e) => setSnapshot({...snapshot, [item.key]: e.target.value})}
                  placeholder="0.00"
                  className="bg-transparent outline-none border-b border-slate-200 focus:border-slate-900 text-sm font-semibold w-16 text-slate-900 transition-colors py-0.5 text-center"
                />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Weekly Timeline Bar */}
      <nav className="bg-slate-50/50 border-b border-slate-200 backdrop-blur-sm">
        <div className="max-w-full mx-auto px-6">
          <div className="flex items-center gap-12 overflow-x-auto no-scrollbar">
            {WEEKS.map((week) => (
              <button
                key={week.id}
                onClick={() => setActiveWeek(week.id)}
                className={`py-4 text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap relative transition-colors ${
                  activeWeek === week.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {week.label}
                {activeWeek === week.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Readability-Focused Table */}
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
                <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-100 bg-white">Bias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, index) => {
                const isIndex = row.type === "index";
                const isNewSection = index > 0 && data[index-1].type !== row.type;

                return (
                  <React.Fragment key={row.id}>
                    {isNewSection && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={14} className="h-2 p-0"></td>
                      </tr>
                    )}
                    <tr className="group hover:bg-slate-50 transition-colors">
                      <td className="p-0">
                        <input
                          type="text"
                          value={row.category}
                          onChange={(e) => handleUpdate(row.id, "category", e.target.value.toUpperCase())}        
                          className={`w-full h-12 bg-transparent outline-none text-center font-bold text-[10px] tracking-tight ${  
                            row.category === 'HIGH' ? 'text-blue-600' :
                            row.category === 'MID' ? 'text-slate-400' :
                            'text-slate-300'
                          }`}
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleUpdate(row.id, "name", e.target.value)}
                          className={`bg-transparent outline-none w-full text-sm font-semibold ${isIndex ? 'text-slate-900' : 'text-slate-600'}`}
                        />
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
                          placeholder="Notes..."
                        />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Minimalist Footer Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: "Macro Bias", icon: <Globe size={16}/> },
            { title: "Psychology", icon: <Activity size={16}/> },
            { title: "Global Cues", icon: <Zap size={16}/> },
            { title: "Learnings", icon: <MessageSquare size={16}/> }
          ].map(card => (
            <div key={card.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-slate-400">
                {card.icon}
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{card.title}</span>
              </div>
              <textarea 
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
