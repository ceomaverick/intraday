'use server'

import { Client } from "pg";
import { revalidatePath } from "next/cache";

// Force recompile: 2026-04-23 18:25

if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export type Asset = {
  id: number;
  type: 'index' | 'stock';
  name: string;
  ticker?: string;
};

export type WeeklyDataRow = {
  id: number;
  asset_id: number;
  week_monday: string;
  mon_price: string;
  tue_price: string;
  wed_price: string;
  thu_price: string;
  fri_price: string;
  mon_notes: string;
  tue_notes: string;
  wed_notes: string;
  thu_notes: string;
  fri_notes: string;
  comments: string;
};

export type WeeklySnapshot = {
  gift_nifty: string;
  oil: string;
  rupee: string;
  asia: string;
  macro_bias: string;
  psychology: string;
  global_cues: string;
  learnings: string;
};

async function getClient() {
  let url = process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
  
  if (process.env.NODE_ENV === "development" && url.includes('neon.tech')) {
    url = url.replace('ep-bitter-band-annhl56z.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
             .replace('ep-bitter-band-annhl56z-pooler.c-6.us-east-1.aws.neon.tech', '35.173.20.131');
    if (url && !url.includes('options=endpoint')) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}options=endpoint%3Dep-bitter-band-annhl56z`;
    }
  }

  const client = new Client({
    connectionString: url,
    ssl: process.env.NODE_ENV === "development" ? {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    } : { rejectUnauthorized: false }
  });
  
  await client.connect();
  return client;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getIntradayData(weekMonday: Date | string) {
  let client: Client | null = null;
  try {
    const dateObj = new Date(weekMonday);
    const mondayStr = formatDate(dateObj);
    
    const prevDate = new Date(dateObj);
    prevDate.setDate(dateObj.getDate() - 7);
    const prevMondayStr = formatDate(prevDate);

    client = await getClient();

    // 1. Assets
    const assetsRes = await client.query<Asset>(`SELECT * FROM assets ORDER BY id ASC`);
    const assets = assetsRes.rows;

    // 2. Weekly Data
    const dataRes = await client.query<WeeklyDataRow>(
      `SELECT * FROM weekly_data WHERE week_monday = $1`,
      [mondayStr]
    );
    const weeklyData = dataRes.rows;

    // 3. Prev Friday
    const prevRes = await client.query(
      `SELECT asset_id, fri_price FROM weekly_data WHERE week_monday = $1`,
      [prevMondayStr]
    );
    const prevWeeklyData = prevRes.rows;

    // 4. Snapshot
    const snapRes = await client.query<WeeklySnapshot>(
      `SELECT * FROM weekly_snapshots WHERE week_monday = $1`,
      [mondayStr]
    );
    const snapshot = snapRes.rows[0] || {
      gift_nifty: "", oil: "", rupee: "", asia: "",
      macro_bias: "", psychology: "", global_cues: "", learnings: ""
    };

    console.log(`✅ getIntradayData success: ${mondayStr}`);
    return { assets, weeklyData, snapshot, prevWeeklyData };

  } catch (error: any) {
    console.error("❌ getIntradayData error:", error.message || error);
    throw new Error(`Server Error: ${error.message || 'Unknown'}`);
  } finally {
    if (client) await client.end();
  }
}

export async function saveBatchData(
  weekMonday: Date | string,
  weeklyData: { asset_id: number, [key: string]: string | number }[],
  snapshot: WeeklySnapshot
) {
  let client: Client | null = null;
  try {
    const dateObj = new Date(weekMonday);
    const mondayStr = formatDate(dateObj);

    client = await getClient();
    await client.query('BEGIN');

    const allowedDataFields = [
      'mon_price', 'tue_price', 'wed_price', 'thu_price', 'fri_price', 
      'mon_notes', 'tue_notes', 'wed_notes', 'thu_notes', 'fri_notes', 
      'comments'
    ];

    for (const row of weeklyData) {
      const updateFields = Object.keys(row).filter(f => allowedDataFields.includes(f));
      if (updateFields.length === 0) continue;

      const setClause = updateFields.map((f, i) => `${f} = $${i + 3}`).join(', ');
      const values = updateFields.map(f => row[f]);

      await client.query(
        `INSERT INTO weekly_data (asset_id, week_monday, ${updateFields.join(', ')})
         VALUES ($1, $2, ${updateFields.map((_, i) => `$${i + 3}`).join(', ')})
         ON CONFLICT (asset_id, week_monday) 
         DO UPDATE SET ${setClause}, updated_at = CURRENT_TIMESTAMP`,
        [row.asset_id, mondayStr, ...values]
      );
    }

    const allowedSnapshotFields = ['gift_nifty', 'oil', 'rupee', 'asia', 'macro_bias', 'psychology', 'global_cues', 'learnings'];
    const snapshotUpdateFields = Object.keys(snapshot).filter(f => allowedSnapshotFields.includes(f));
    
    if (snapshotUpdateFields.length > 0) {
      const snapshotSetClause = snapshotUpdateFields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const snapshotValues = snapshotUpdateFields.map(f => (snapshot as any)[f]);

      await client.query(
        `INSERT INTO weekly_snapshots (week_monday, ${snapshotUpdateFields.join(', ')})
         VALUES ($1, ${snapshotUpdateFields.map((_, i) => `$${i + 2}`).join(', ')})
         ON CONFLICT (week_monday) 
         DO UPDATE SET ${snapshotSetClause}, updated_at = CURRENT_TIMESTAMP`,
        [mondayStr, ...snapshotValues]
      );
    }

    await client.query('COMMIT');
    revalidatePath("/");
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ saveBatchData error:", error.message || error);
    throw new Error(`Save failed: ${error.message || 'Unknown'}`);
  } finally {
    if (client) await client.end();
  }
}

export async function updateWeeklyData(
  assetId: number, 
  weekMonday: Date | string, 
  field: string, 
  value: string | boolean
) {
  let client: Client | null = null;
  try {
    const dateObj = new Date(weekMonday);
    const mondayStr = formatDate(dateObj);

    const allowedFields = ['mon_price', 'tue_price', 'wed_price', 'thu_price', 'fri_price', 'event', 'comments'];
    if (!allowedFields.includes(field)) throw new Error("Invalid field");

    client = await getClient();
    await client.query(
      `INSERT INTO weekly_data (asset_id, week_monday, ${field})
       VALUES ($1, $2, $3)
       ON CONFLICT (asset_id, week_monday) 
       DO UPDATE SET ${field} = $3, updated_at = CURRENT_TIMESTAMP`,
      [assetId, mondayStr, value]
    );
    
    revalidatePath("/");
  } catch (error: any) {
    console.error("❌ updateWeeklyData error:", error.message || error);
    throw new Error("Update failed");
  } finally {
    if (client) await client.end();
  }
}

export async function updateSnapshot(
  weekMonday: Date | string, 
  field: string, 
  value: string
) {
  let client: Client | null = null;
  try {
    const dateObj = new Date(weekMonday);
    const mondayStr = formatDate(dateObj);

    const allowedFields = ['gift_nifty', 'oil', 'rupee', 'asia', 'macro_bias', 'psychology', 'global_cues', 'learnings'];
    if (!allowedFields.includes(field)) throw new Error("Invalid field");

    client = await getClient();
    await client.query(
      `INSERT INTO weekly_snapshots (week_monday, ${field})
       VALUES ($1, $2)
       ON CONFLICT (week_monday) 
       DO UPDATE SET ${field} = $2, updated_at = CURRENT_TIMESTAMP`,
      [mondayStr, value]
    );

    revalidatePath("/");
  } catch (error: any) {
    console.error("❌ updateSnapshot error:", error.message || error);
    throw new Error("Update failed");
  } finally {
    if (client) await client.end();
  }
}
