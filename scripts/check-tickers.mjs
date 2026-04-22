import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Client } from 'pg';

async function checkTickers() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT name, ticker FROM assets ORDER BY id ASC");
    console.log("Current Tickers in Database:");
    console.table(res.rows);
  } catch (err) {
    console.error("Error checking tickers:", err);
  } finally {
    await client.end();
  }
}

checkTickers();
