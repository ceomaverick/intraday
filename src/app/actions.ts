'use server'

import { Client } from "pg";
import { revalidatePath } from "next/cache";

// Force recompile: 2026-04-23 20:45

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

async function getConnectedClient() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
  
  if (!url) {
    throw new Error("Missing database connection string");
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  
  const host = url.split('@')[1]?.split('/')[0] || 'unknown host';
  if (process.env.NODE_ENV === "development") {
    console.log(`[LOCAL DB] Connecting to: ${host}`);
  } else {
    console.log(`[PROD DB] Connecting to: ${host}`);
  }
  
  await client.connect();
  return client;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  
  // If the time is late (e.g., 18:30 UTC), it's likely a local midnight from 
  // an Eastern timezone (like IST) that shifted back to the previous day in UTC.
  // We bump it forward to ensure we format the intended calendar day.
  if (d.getUTCHours() >= 18) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  
  const formatted = `${year}-${month}-${day}`;
  return formatted;
}

export async function getIntradayData(weekMonday: Date | string) {
  let client: any = null;
  try {
    const mondayStr = formatDate(weekMonday);
    const dateObj = new Date(weekMonday);
    dateObj.setDate(dateObj.getDate() - 7);
    const prevMondayStr = formatDate(dateObj);

    console.log(`[DB] Querying Data for: ${mondayStr}`);

    client = await getConnectedClient();

    // Run sequentially to avoid "client is already executing" error
    const assetsRes = await client.query(`SELECT * FROM assets ORDER BY id ASC`);
    const dataRes = await client.query(`SELECT * FROM weekly_data WHERE week_monday = $1`, [mondayStr]);
    const prevRes = await client.query(`SELECT asset_id, fri_price FROM weekly_data WHERE week_monday = $1`, [prevMondayStr]);

    return { 
      assets: assetsRes.rows as Asset[], 
      weeklyData: dataRes.rows as WeeklyDataRow[], 
      prevWeeklyData: prevRes.rows 
    };

  } catch (error: any) {
    console.error("❌ getIntradayData error:", error.message);
    throw new Error(`Database Error: ${error.message}`);
  } finally {
    if (client) await client.end();
  }
}

export async function saveBatchData(
  weekMonday: Date | string,
  weeklyData: { asset_id: number, [key: string]: string | number }[]
) {
  let client: any = null;
  try {
    const mondayStr = formatDate(weekMonday);
    client = await getConnectedClient();
    
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

    await client.query('COMMIT');
    revalidatePath("/");
    revalidatePath("/cards");
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ saveBatchData error:", error.message);
    throw new Error(`Save failed: ${error.message}`);
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
  let client: any = null;
  try {
    const mondayStr = formatDate(weekMonday);
    const allowedFields = ['mon_price', 'tue_price', 'wed_price', 'thu_price', 'fri_price', 'event', 'comments'];
    if (!allowedFields.includes(field)) throw new Error("Invalid field");

    client = await getConnectedClient();

    await client.query(
      `INSERT INTO weekly_data (asset_id, week_monday, ${field})
       VALUES ($1, $2, $3)
       ON CONFLICT (asset_id, week_monday) 
       DO UPDATE SET ${field} = $3, updated_at = CURRENT_TIMESTAMP`,
      [assetId, mondayStr, value]
    );
    
    revalidatePath("/");
    revalidatePath("/cards");
  } catch (error: any) {
    console.error("❌ updateWeeklyData error:", error.message);
    throw new Error("Update failed");
  } finally {
    if (client) await client.end();
  }
}
