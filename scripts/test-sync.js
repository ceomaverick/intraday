require('dotenv').config({path: '.env.local'});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
const fetch = require('node-fetch'); // Standard fetch in scripts

const url = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL)
  .replace('ep-bitter-band-annhl56z.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
  .replace('ep-bitter-band-annhl56z-pooler.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
  + '&options=endpoint%3Dep-bitter-band-annhl56z';

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
});

async function getLivePrice(ticker) {
  try {
    const url = `https://www.google.com/finance/quote/${ticker}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const text = await response.text();
    const priceRegex = /class="YMlKec fxKbKc">([^<]+)<\/div>/;
    const match = text.match(priceRegex);
    if (match && match[1]) {
      return match[1].replace(/[^0-9.]/g, '');
    }
    return null;
  } catch (e) { return null; }
}

async function run() {
  await client.connect();
  const monday = '2026-04-20'; // Hardcoded for this week
  const res = await client.query("SELECT id, ticker, name FROM assets WHERE ticker IS NOT NULL");
  
  for (const asset of res.rows) {
    const price = await getLivePrice(asset.ticker);
    if (price) {
      console.log(`✅ ${asset.name}: ${price}`);
      await client.query(
        `INSERT INTO weekly_data (asset_id, week_monday, mon_price)
         VALUES ($1, $2, $3)
         ON CONFLICT (asset_id, week_monday) DO UPDATE SET mon_price = $3`,
        [asset.id, monday, price]
      );
    } else {
      console.log(`❌ ${asset.name} failed`);
    }
  }
  await client.end();
}

run();
