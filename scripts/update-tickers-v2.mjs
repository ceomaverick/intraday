import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Client } from 'pg';

const UPDATES = {
  'NIFTY 50': 'NIFTY_50:INDEXNSE',
  'OIL (BRENT)': 'BZW00:NYMEX'
};

async function updateTickers() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to update tickers...");

    for (const [name, ticker] of Object.entries(UPDATES)) {
      console.log(`Updating ${name} -> ${ticker}...`);
      await client.query("UPDATE assets SET ticker = $1 WHERE name = $2", [ticker, name]);
    }

    console.log("Tickers updated successfully!");
  } catch (err) {
    console.error("Error updating tickers:", err);
  } finally {
    await client.end();
  }
}

updateTickers();
