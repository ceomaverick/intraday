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
  name: string;
  ticker?: string;
};

async function getLivePrice(ticker: string): Promise<string> {
  try {
    // We'll try the quote page with specific headers to avoid being blocked
    const url = `https://www.google.com/finance/quote/${ticker}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 0 }
    });
    const text = await response.text();
    
    // Pattern 1: Large price display class
    const priceRegex = /class="YMlKec fxKbKc">([^<]+)<\/div>/;
    const match = text.match(priceRegex);
    if (match && match[1]) {
      const price = match[1].replace(/[^0-9.]/g, '');
      console.log(`🔍 [Scraper] Found ${ticker} via Pattern 1: ${price}`);
      return price;
    }

    // Pattern 2: Rupee symbol pattern
    const rupeeRegex = /₹([0-9,.]+\.[0-9]{2}|[0-9,.]+)/;
    const rupeeMatch = text.match(rupeeRegex);
    if (rupeeMatch && rupeeMatch[1]) {
      const price = rupeeMatch[1].replace(/,/g, '');
      console.log(`🔍 [Scraper] Found ${ticker} via Rupee Pattern: ${price}`);
      return price;
    }

    // Pattern 3: Any currency symbol pattern (generic)
    const currencyRegex = /[\\$₹¥€£]([0-9,.]+\.[0-9]{2}|[0-9,.]+)/;
    const currencyMatch = text.match(currencyRegex);
    if (currencyMatch && currencyMatch[1]) {
      const price = currencyMatch[1].replace(/,/g, '');
      console.log(`🔍 [Scraper] Found ${ticker} via Currency Pattern: ${price}`);
      return price;
    }

    // Pattern 4: Fallback in case class changed
    const fallbackRegex = /data-last-price="([^"]+)"/;
    const fallbackMatch = text.match(fallbackRegex);
    if (fallbackMatch && fallbackMatch[1]) {
      const price = fallbackMatch[1].replace(/[^0-9.]/g, '');
      console.log(`🔍 [Scraper] Found ${ticker} via Pattern 2: ${price}`);
      return price;
    }

    // Pattern 3: Search result snippet fallback
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(ticker + ' price')}`;
    const searchResponse = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const searchText = await searchResponse.text();
    const searchRegex = /class="[\w\s]*r0Vp4c[\w\s]*">([^<]+)<\/span>/; // Common Google search price class
    const searchMatch = searchText.match(searchRegex);
    if (searchMatch && searchMatch[1]) {
      const price = searchMatch[1].replace(/[^0-9.]/g, '');
      console.log(`🔍 [Scraper] Found ${ticker} via Search Fallback: ${price}`);
      return price;
    }
    
    console.warn(`⚠️ [Scraper] Could not find price for ${ticker}`);
    return "";
  } catch (error) {
    console.error(`❌ [Scraper] Error for ${ticker}:`, error);
    return "";
  }
}

export async function syncAllPrices(weekMonday: Date, targetDay?: string) {
  try {
    const client = await getClient();
    const mondayStr = weekMonday.toISOString().split('T')[0];
    
    let dayName = targetDay;
    if (!dayName) {
      const today = new Date();
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      dayName = days[today.getDay()];
    }

    console.log(`🚀 Starting sync for week starting ${mondayStr}, targeting day: ${dayName}`);

    if (!['mon', 'tue', 'wed', 'thu', 'fri'].includes(dayName)) {
      console.log(`⏸️ ${dayName} is not a trading day, skipping sync.`);
      return;
    }

    const field = `${dayName}_price`;

    try {
      const assetsResult = await client.query<Asset>(`SELECT id, ticker FROM assets WHERE ticker IS NOT NULL`);
      console.log(`📦 Found ${assetsResult.rowCount} assets to sync.`);
      
      for (const asset of assetsResult.rows) {
        if (!asset.ticker) continue;
        
        const price = await getLivePrice(asset.ticker);
        if (price) {
          console.log(`✅ Saving ${asset.ticker}: ${price} into ${field}`);
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
  tue_price: string;
  wed_price: string;
  thu_price: string;
  fri_price: string;
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

export async function saveBatchData(
  weekMonday: Date,
  weeklyData: { asset_id: number, [key: string]: any }[],
  snapshot: WeeklySnapshot
) {
  try {
    const client = await getClient();
    const mondayStr = weekMonday.toISOString().split('T')[0];

    try {
      await client.query('BEGIN');

      // Update Weekly Data
      const allowedDataFields = ['mon_price', 'tue_price', 'wed_price', 'thu_price', 'fri_price', 'comments'];
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


      // Update Snapshot
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
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      await client.end();
    }

    revalidatePath("/");
  } catch (error) {
    console.error("🚀 saveBatchData error:", error);
    throw new Error("Failed to save changes");
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
      'mon_price', 'tue_price', 'wed_price', 'thu_price', 'fri_price', 'event', 'comments'
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
