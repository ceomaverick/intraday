'use server'

import { getMonday } from "@/lib/utils";
import { Client } from "pg";
import { revalidatePath } from "next/cache";

if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export type Asset = {
  id: number;
  type: 'index' | 'stock';
  category: string;
  name: string;
  ticker?: string;
};

// Internal helper to fetch live price from Google Finance
async function getLivePrice(ticker: string): Promise<string> {
  try {
    const url = `https://www.google.com/finance/quote/${ticker}`;
    const response = await fetch(url, { next: { revalidate: 0 } }); // No cache
    const text = await response.text();
    
    // Simple regex to extract price from the HTML structure Google Finance uses
    // Usually found in a div with data-last-price or near the ticker header
    const match = text.match(/data-last-price="([^"]+)"/) || text.match(/class="YMlKec fxKbKc">([^<]+)<\/div>/);
    
    if (match && match[1]) {
      // Remove commas and clean up
      return match[1].replace(/[^0-9.]/g, '');
    }
    return "";
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error);
    return "";
  }
}

export async function syncAllPrices(weekMonday: Date) {
  try {
    const client = await getClient();
    const mondayStr = weekMonday.toISOString().split('T')[0];
    
    // Determine which day column to update (mon, tue, wed, thu, fri)
    const today = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = days[today.getDay()] as 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
    
    // Only update if it's a weekday
    if (!['mon', 'tue', 'wed', 'thu', 'fri'].includes(dayName)) {
      console.log("Not a weekday, skipping sync.");
      return;
    }

    const field = `${dayName}_price`;

    try {
      const assetsResult = await client.query<Asset>(`SELECT id, ticker FROM assets WHERE ticker IS NOT NULL`);
      
      for (const asset of assetsResult.rows) {
        if (!asset.ticker) continue;
        
        const price = await getLivePrice(asset.ticker);
        if (price) {
          console.log(`Synced ${asset.ticker}: ${price}`);
          await client.query(
            `INSERT INTO weekly_data (asset_id, week_monday, ${field})
             VALUES ($1, $2, $3)
             ON CONFLICT (asset_id, week_monday) 
             DO UPDATE SET ${field} = $3, updated_at = CURRENT_TIMESTAMP`,
            [asset.id, mondayStr, price]
          );
        }
      }
    } finally {
      await client.end();
    }
    
    revalidatePath("/");
  } catch (error) {
    console.error("🚀 syncAllPrices error:", error);
    throw new Error("Failed to sync prices");
  }
}

export type WeeklyDataRow = {
  id: number;
  asset_id: number;
  week_monday: string;
  mon_price: string;
  mon_traded: boolean;
  tue_price: string;
  tue_traded: boolean;
  wed_price: string;
  wed_traded: boolean;
  thu_price: string;
  thu_traded: boolean;
  fri_price: string;
  fri_traded: boolean;
  event: string;
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
  
  // Local workaround for Reliance DNS issue
  if (process.env.NODE_ENV === "development") {
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

export async function getIntradayData(weekMonday: Date) {
  try {
    const client = await getClient();
    const mondayStr = weekMonday.toISOString().split('T')[0];

    try {
      // Fetch all assets
      const assetsResult = await client.query<Asset>(`SELECT * FROM assets ORDER BY id ASC`);
      const assets = assetsResult.rows;

      // Fetch weekly data for these assets for the specific week
      const dataResult = await client.query<WeeklyDataRow>(
        `SELECT * FROM weekly_data WHERE week_monday = $1`,
        [mondayStr]
      );
      const weeklyData = dataResult.rows;

      // Fetch snapshot for the week
      const snapshotResult = await client.query<WeeklySnapshot>(
        `SELECT * FROM weekly_snapshots WHERE week_monday = $1`,
        [mondayStr]
      );
      const snapshot = snapshotResult.rows[0] || {
        gift_nifty: "", oil: "", rupee: "", asia: "",
        macro_bias: "", psychology: "", global_cues: "", learnings: ""
      };

      console.log("✅ getIntradayData success for week:", mondayStr);
      return { assets, weeklyData, snapshot };
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error("🚀 getIntradayData error:", error);
    throw new Error("Failed to fetch intraday data");
  }
}

export async function updateWeeklyData(
  assetId: number, 
  weekMonday: Date, 
  field: string, 
  value: string | boolean
) {
  try {
    const client = await getClient();
    const mondayStr = weekMonday.toISOString().split('T')[0];

    // Whitelist fields to prevent SQL injection
    const allowedFields = [
      'mon_price', 'mon_traded', 'tue_price', 'tue_traded', 'wed_price', 'wed_traded',
      'thu_price', 'thu_traded', 'fri_price', 'fri_traded', 'event', 'comments'
    ];

    if (!allowedFields.includes(field)) {
      throw new Error("Invalid field name");
    }

    try {
      await client.query(
        `INSERT INTO weekly_data (asset_id, week_monday, ${field})
         VALUES ($1, $2, $3)
         ON CONFLICT (asset_id, week_monday) 
         DO UPDATE SET ${field} = $3, updated_at = CURRENT_TIMESTAMP`,
        [assetId, mondayStr, value]
      );
    } finally {
      await client.end();
    }
    
    revalidatePath("/");
  } catch (error) {
    console.error("🚀 updateWeeklyData error:", error);
    throw new Error("Failed to update weekly data");
  }
}

export async function updateSnapshot(
  weekMonday: Date, 
  field: string, 
  value: string
) {
  try {
    const client = await getClient();
    const mondayStr = weekMonday.toISOString().split('T')[0];

    const allowedFields = [
      'gift_nifty', 'oil', 'rupee', 'asia', 
      'macro_bias', 'psychology', 'global_cues', 'learnings'
    ];

    if (!allowedFields.includes(field)) {
      throw new Error("Invalid field name");
    }

    try {
      await client.query(
        `INSERT INTO weekly_snapshots (week_monday, ${field})
         VALUES ($1, $2)
         ON CONFLICT (week_monday) 
         DO UPDATE SET ${field} = $2, updated_at = CURRENT_TIMESTAMP`,
        [mondayStr, value]
      );
    } finally {
      await client.end();
    }

    revalidatePath("/");
  } catch (error) {
    console.error("🚀 updateSnapshot error:", error);
    throw new Error("Failed to update snapshot");
  }
}
