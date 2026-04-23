'use server'

import { sql, createPool } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

// Force recompile: 2026-04-23 18:45

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

/**
 * Returns a pooled client. 
 * In development, applies a workaround for Neon connectivity if needed.
 */
async function getClient() {
  let url = process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
  
  if (!url) {
    throw new Error("Missing database connection string (POSTGRES_URL/DATABASE_URL)");
  }

  // Workaround for local development with Neon if necessary
  if (process.env.NODE_ENV === "development" && url.includes('neon.tech')) {
    url = url.replace('ep-bitter-band-annhl56z.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
             .replace('ep-bitter-band-annhl56z-pooler.c-6.us-east-1.aws.neon.tech', '35.173.20.131');
    if (url && !url.includes('options=endpoint')) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}options=endpoint%3Dep-bitter-band-annhl56z`;
    }
  }

  const pool = createPool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  
  return await pool.connect();
}

/**
 * Ensures consistent date string formatting (YYYY-MM-DD) regardless of timezone.
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  // Using UTC methods to avoid local timezone shifts when passing dates from client to server
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  
  // If UTC leads to wrong day, fallback to local (Next.js server-side usually UTC)
  // But since WeeklyTracker sends midnight local, we just want the date part.
  const locY = d.getFullYear();
  const locM = String(d.getMonth() + 1).padStart(2, '0');
  const locD = String(d.getDate()).padStart(2, '0');
  
  return `${locY}-${locM}-${locD}`;
}

export async function getIntradayData(weekMonday: Date | string) {
  let client: any = null;
  try {
    const mondayStr = formatDate(weekMonday);
    
    // Calculate previous week's Monday
    const dateObj = new Date(weekMonday);
    dateObj.setDate(dateObj.getDate() - 7);
    const prevMondayStr = formatDate(dateObj);

    console.log(`[DB] Fetching data for ${mondayStr} (Prev: ${prevMondayStr})`);

    client = await getClient();

    // 1. Assets (Critical: if this is empty, nothing renders)
    const { rows: assets } = await client.query(`SELECT * FROM assets ORDER BY id ASC`);
    console.log(`[DB] Assets found: ${assets.length}`);

    // 2. Weekly Data
    const { rows: weeklyData } = await client.query(
      `SELECT * FROM weekly_data WHERE week_monday = $1`,
      [mondayStr]
    );

    // 3. Prev Friday Price
    const { rows: prevWeeklyData } = await client.query(
      `SELECT asset_id, fri_price FROM weekly_data WHERE week_monday = $1`,
      [prevMondayStr]
    );

    // 4. Snapshot
    const { rows: snapshots } = await client.query(
      `SELECT * FROM weekly_snapshots WHERE week_monday = $1`,
      [mondayStr]
    );
    
    const snapshot = snapshots[0] || {
      gift_nifty: "", oil: "", rupee: "", asia: "",
      macro_bias: "", psychology: "", global_cues: "", learnings: ""
    };

    return { assets, weeklyData, snapshot, prevWeeklyData };

  } catch (error: any) {
    console.error("❌ getIntradayData error:", error.message || error);
    throw new Error(`Database Error: ${error.message || 'Unknown'}`);
  } finally {
    if (client) client.release();
  }
}

export async function saveBatchData(
  weekMonday: Date | string,
  weeklyData: { asset_id: number, [key: string]: string | number }[],
  snapshot: WeeklySnapshot
) {
  let client: any = null;
  try {
    const mondayStr = formatDate(weekMonday);
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
    if (client) client.release();
  }
}

export async function updateWeeklyData(
  assetId: number, 
  weekMonday: Date | string, 
  field: string, 
  value: string | boolean
) {
  let client: any = null;
  try {
    const mondayStr = formatDate(weekMonday);

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
    if (client) client.release();
  }
}

export async function updateSnapshot(
  weekMonday: Date | string, 
  field: string, 
  value: string
) {
  let client: any = null;
  try {
    const mondayStr = formatDate(weekMonday);

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
    if (client) client.release();
  }
}
