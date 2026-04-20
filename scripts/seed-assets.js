require('dotenv').config({path: '.env.local'});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const url = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL)
  .replace('ep-bitter-band-annhl56z.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
  .replace('ep-bitter-band-annhl56z-pooler.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
  + (process.env.DATABASE_URL_UNPOOLED?.includes('?') ? '&' : '?') + 'options=endpoint%3Dep-bitter-band-annhl56z';

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
});

const INITIAL_DATA = [
  { type: "index", category: "INDEX", name: "NIFTY 50" },
  { type: "index", category: "GLOBAL", name: "GIFT NIFTY" },
  { type: "index", category: "FOREX", name: "RUPEE (USD/INR)" },
  { type: "index", category: "CMDTY", name: "OIL (BRENT)" },
  { type: "index", category: "GLOBAL", name: "ASIA (NIKKEI/HS)" },
  { type: "stock", category: "HIGH", name: "Shriram Finance" },
  { type: "stock", category: "HIGH", name: "Trent" },
  { type: "stock", category: "MID", name: "Nykaa" },
  { type: "stock", category: "MID", name: "Uno Minda" },
  { type: "stock", category: "HIGH", name: "Force Motors" },
  { type: "stock", category: "MID", name: "Navin Fluorine" },
  { type: "stock", category: "MID", name: "Maha Bank" },
  { type: "stock", category: "HIGH", name: "Coromandel" },
  { type: "stock", category: "MID", name: "Cartrade" },
  { type: "stock", category: "MID", name: "Awfis" },
  { type: "stock", category: "MID", name: "OneSource" },
  { type: "stock", category: "MID", name: "Ujiivan" },
  { type: "stock", category: "MID", name: "RBL" },
];

async function seed() {
  try {
    await client.connect();
    console.log("Connected to seed assets...");

    for (const asset of INITIAL_DATA) {
      await client.query(
        "INSERT INTO assets (type, category, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [asset.type, asset.category, asset.name]
      );
    }

    console.log("Assets seeded successfully!");
  } catch (err) {
    console.error("Error seeding assets:", err);
  } finally {
    await client.end();
  }
}

seed();
