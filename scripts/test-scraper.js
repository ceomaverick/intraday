const fetch = require('node-fetch');

async function test(ticker) {
  try {
    console.log(`Testing ${ticker}...`);
    const url = `https://www.google.com/finance/quote/${ticker}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const text = await response.text();
    
    const priceRegex = /class="YMlKec fxKbKc">([^<]+)<\/div>/;
    const match = text.match(priceRegex);
    if (match) {
      console.log(`✅ Found: ${match[1]}`);
    } else {
      console.log(`❌ Failed. Class YMlKec fxKbKc not found.`);
      // Check for common error signatures
      if (text.includes("automated queries")) console.log("Blocked by CAPTCHA");
    }
  } catch (e) {
    console.error(e);
  }
}

test('INDEXNSE:NIFTY_50');
test('NSE:TRENT');
