import { sql } from "@vercel/postgres";

export async function initDatabase() {
  try {
    console.log("Creating tables in Neon...");

    // Create Assets Table
    await sql`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL, -- 'index' or 'stock'
        category TEXT NOT NULL, -- 'GLOBAL', 'INDEX', 'HIGH', 'MID', etc.
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create Weekly Data Table
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_data (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
        week_monday DATE NOT NULL,
        
        mon_price TEXT DEFAULT '',
        mon_traded BOOLEAN DEFAULT FALSE,
        
        tue_price TEXT DEFAULT '',
        tue_traded BOOLEAN DEFAULT FALSE,
        
        wed_price TEXT DEFAULT '',
        wed_traded BOOLEAN DEFAULT FALSE,
        
        thu_price TEXT DEFAULT '',
        thu_traded BOOLEAN DEFAULT FALSE,
        
        fri_price TEXT DEFAULT '',
        fri_traded BOOLEAN DEFAULT FALSE,
        
        event TEXT DEFAULT '',
        comments TEXT DEFAULT '',
        
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(asset_id, week_monday)
      );
    `;

    // Create Weekly Snapshots Table (for header values and footer notes)
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_snapshots (
        id SERIAL PRIMARY KEY,
        week_monday DATE UNIQUE NOT NULL,
        
        gift_nifty TEXT DEFAULT '',
        oil TEXT DEFAULT '',
        rupee TEXT DEFAULT '',
        asia TEXT DEFAULT '',
        
        macro_bias TEXT DEFAULT '',
        psychology TEXT DEFAULT '',
        global_cues TEXT DEFAULT '',
        learnings TEXT DEFAULT '',
        
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}
