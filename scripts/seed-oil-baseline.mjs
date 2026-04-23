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
    
    const prevWeekMonday = '2026-04-13';
    console.log(`Seeding baseline for week starting ${prevWeekMonday}...`);

    const baselines = [
      { name: 'OIL (BRENT)', fri: '94.88' },      // Calculated from $95.48 (+0.63% approx)
      { name: 'ASIA (NIKKEI/HS)', fri: '58942.77' } // Calculated from 58824.89 (-0.20%)
    ];

    for (const item of baselines) {
      const assetRes = await client.query("SELECT id FROM assets WHERE name = $1", [item.name]);
      if (assetRes.rowCount === 0) continue;
      const assetId = assetRes.rows[0].id;

      await client.query(`
        INSERT INTO weekly_data (asset_id, week_monday, fri_price)
        VALUES ($1, $2, $3)
        ON CONFLICT (asset_id, week_monday) 
        DO UPDATE SET fri_price = EXCLUDED.fri_price, updated_at = CURRENT_TIMESTAMP
      `, [assetId, prevWeekMonday, item.fri]);
      
      console.log(`✅ Set Friday baseline for ${item.name}: ${item.fri}`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
