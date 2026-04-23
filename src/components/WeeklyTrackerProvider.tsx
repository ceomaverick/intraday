"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getIntradayData, saveBatchData, type Asset, type WeeklyDataRow } from "@/app/actions";
import { getMonday } from "@/lib/utils";

export interface ClientRowData extends Asset {
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

export const WEEKS_OFFSETS = [
  { id: 0, label: "Previous Week", offset: -1 },
  { id: 1, label: "Current Week", offset: 0 },
  { id: 2, label: "Next Week", offset: 1 },
  { id: 3, label: "Week +2", offset: 2 },
  { id: 4, label: "Week +3", offset: 3 },
];

interface WeeklyTrackerContextType {
  data: ClientRowData[];
  activeWeekIdx: number;
  setActiveWeekIdx: (idx: number) => void;
  loading: boolean;
  error: string | null;
  saving: boolean;
  hasChanges: boolean;
  activeWeekMonday: Date;
  handlePriceChange: (assetId: number, day: string, value: string) => void;
  handleNoteUpdate: (assetId: number, day: string, value: string) => void;
  handleUpdate: (assetId: number, field: string, value: string) => void;
  handleSave: () => Promise<void>;
  fetchData: () => Promise<void>;
}

const WeeklyTrackerContext = createContext<WeeklyTrackerContextType | undefined>(undefined);

export function WeeklyTrackerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ClientRowData[]>([]);
  const [activeWeekIdx, setActiveWeekIdx] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
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
    } catch (err: any) {
      console.error("Failed to fetch:", err);
      setError(err.message || "Failed to load data from server");
      lastFetchedRef.current = "";
    } finally {
      setLoading(false);
    }
  }, [activeWeekMonday]);

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

      await saveBatchData(activeWeekMonday, weeklyBatch);
      setHasChanges(false);
      console.log("✅ Batch save successful");
    } catch (err) {
      console.error("Save failed:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <WeeklyTrackerContext.Provider value={{
      data, activeWeekIdx, setActiveWeekIdx, loading, error, saving, hasChanges, activeWeekMonday,
      handlePriceChange, handleNoteUpdate, handleUpdate, handleSave, fetchData
    }}>
      {children}
    </WeeklyTrackerContext.Provider>
  );
}

export function useWeeklyTracker() {
  const context = useContext(WeeklyTrackerContext);
  if (context === undefined) {
    throw new Error("useWeeklyTracker must be used within a WeeklyTrackerProvider");
  }
  return context;
}
