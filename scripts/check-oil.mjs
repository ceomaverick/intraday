import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pkg from 'pg';
const { Client } = pkg;

async function run() {
  let url = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
  if (url.includes('neon.tech')) {
    url = url.replace('ep-bitter-band-annhl56z.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
             .replace('ep-bitter-band-annhl56z-pooler.c-6.us-east-1.aws.neon.tech', '35.173.20.131');
    if (!url.includes('options=endpoint')) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}options=endpoint%3Dep-bitter-band-annhl56z`;
    }
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
  });

  try {
    await client.connect();
    
    console.log("--- BRENT & ASIA DATA ---");
    const res = await client.query(`
      SELECT a.name, d.mon_price, d.tue_price, d.wed_price, d.thu_price, d.fri_price, d.week_monday
      FROM weekly_data d 
      JOIN assets a ON a.id = d.asset_id 
      WHERE a.id IN (4, 5) AND d.week_monday = '2026-04-20'
    `);
    console.table(res.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
