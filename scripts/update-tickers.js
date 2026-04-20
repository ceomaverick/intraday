require('dotenv').config({path: '.env.local'});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const url = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL)
  .replace('ep-bitter-band-annhl56z.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
  .replace('ep-bitter-band-annhl56z-pooler.c-6.us-east-1.aws.neon.tech', '35.173.20.131')
  + '&options=endpoint%3Dep-bitter-band-annhl56z';

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
});

const TICKERS = {
  'NIFTY 50': 'INDEXNSE:NIFTY_50',
  'GIFT NIFTY': 'SGX:NIFTY',
  'RUPEE (USD/INR)': 'CURRENCY:USDINR',
  'OIL (BRENT)': 'BZ:NMX',
  'ASIA (NIKKEI/HS)': 'INDEXNIKKEI:NI225',
  'Shriram Finance': 'NSE:SHRIRAMFIN',
  'Trent': 'NSE:TRENT',
  'Nykaa': 'NSE:NYKAA',
  'Uno Minda': 'NSE:UNOMINDA',
  'Force Motors': 'NSE:FORCEMOT',
  'Navin Fluorine': 'NSE:NAVINFLUOR',
  'Maha Bank': 'NSE:MAHABANK',
  'Coromandel': 'NSE:COROMANDEL',
  'Cartrade': 'NSE:CARTRADE',
  'Awfis': 'NSE:AWFIS',
  'OneSource': 'NSE:ONESOURCE',
  'Ujiivan': 'NSE:UJJIVANSFB',
  'RBL': 'NSE:RBLBANK'
};

async function run() {
  try {
    await client.connect();
    console.log("Adding ticker column...");
    await client.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS ticker TEXT;");

    for (const [name, ticker] of Object.entries(TICKERS)) {
      console.log(`Updating ${name} -> ${ticker}`);
      await client.query("UPDATE assets SET ticker = $1 WHERE name = $2", [ticker, name]);
    }
    console.log("Success!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
