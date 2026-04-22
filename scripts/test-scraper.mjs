import fetch from 'node-fetch';

async function testScraper(ticker) {
  const url = `https://www.google.com/finance/quote/${ticker}`;
  console.log(`Testing URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const text = await response.text();
    console.log(`Response length: ${text.length}`);
    
    // Check for Pattern 1
    const priceRegex = /class="YMlKec fxKbKc">([^<]+)<\/div>/;
    const match = text.match(priceRegex);
    if (match) {
        console.log(`Pattern 1 Match: ${match[1]}`);
    } else {
        console.log("Pattern 1 failed.");
    }

    // Check for Pattern 2
    const fallbackRegex = /data-last-price="([^"]+)"/;
    const fallbackMatch = text.match(fallbackRegex);
    if (fallbackMatch) {
        console.log(`Pattern 2 Match: ${fallbackMatch[1]}`);
    } else {
        console.log("Pattern 2 failed.");
    }

    // Search for the currency then look backwards or forwards
    const inrSearch = text.indexOf('INR');
    if (inrSearch !== -1) {
        console.log(`INR found at index ${inrSearch}`);
        console.log(`Context near INR: ${text.substring(inrSearch - 100, inrSearch + 100)}`);
    }

    // Common pattern for price in div with some class
    const divRegex = /<div [^>]*class="[^"]*"[^>]*>₹([0-9,.]+)<\/div>/;
    const divMatch = text.match(divRegex);
    if (divMatch) {
        console.log(`Rupee Div Match: ${divMatch[1]}`);
    }

    // Another potential pattern: jsname="vW797" is often used for the price
    const jsnameRegex = /jsname="vW797"[^>]*>([^<]+)<\/div>/;
    const jsnameMatch = text.match(jsnameRegex);
    if (jsnameMatch) {
        console.log(`jsname vW797 Match: ${jsnameMatch[1]}`);
    }

    // Save a snippet for inspection
    console.log("HTML Snippet (first 1000 chars):", text.substring(0, 1000));

  } catch (error) {
    console.error("Error:", error);
  }
}

testScraper('NSE:SHRIRAMFIN');
