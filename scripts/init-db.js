require('dotenv').config({path: '.env.local'});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

// Resolved IP for ep-bitter-band-annhl56z.c-6.us-east-1.aws.neon.tech via 8.8.8.8
let url = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL)
  .replace('ep-bitter-band-annhl56z.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
  .replace('ep-bitter-band-annhl56z-pooler.c-6.us-east-1.aws.neon.tech', '35.173.20.131');

// Add endpoint option for SNI since we're using an IP
const endpointId = 'ep-bitter-band-annhl56z';
if (!url.includes('options=endpoint')) {
  const separator = url.includes('?') ? '&' : '?';
  url += `${separator}options=endpoint%3D${endpointId}`;
}

const client = new Client({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  }
});

async function run() {
  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected successfully!");

    const sql = `
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

    await client.query(sql);
    console.log("Tables created successfully!");
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    await client.end();
  }
}

run();
