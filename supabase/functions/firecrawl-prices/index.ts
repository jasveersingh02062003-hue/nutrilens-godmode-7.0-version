
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Circuit Breaker ───
let consecutiveFailures = 0;
let circuitOpenedAt = 0;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30 * 60 * 1000; // 30 minutes

function isCircuitOpen(): boolean {
  if (consecutiveFailures < CIRCUIT_THRESHOLD) return false;
  if (Date.now() - circuitOpenedAt > CIRCUIT_RESET_MS) {
    consecutiveFailures = 0;
    return false;
  }
  return true;
}

function recordSuccess() { consecutiveFailures = 0; }
function recordFailure() {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_THRESHOLD) circuitOpenedAt = Date.now();
}

// ─── Retry with exponential backoff ───
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) { recordSuccess(); return res; }
      if (res.status === 429 || res.status >= 500) {
        console.warn(`Firecrawl returned ${res.status}, retry ${i + 1}/${retries}`);
        if (i === retries - 1) { recordFailure(); return res; }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error);
      if (i === retries - 1) { recordFailure(); throw error; }
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Exhausted retries');
}

// Volatile items that need live price tracking — with sanity bounds (INR per kg/piece)
// Bounds reject obvious garbage matches from cluttered search results
const VOLATILE_ITEMS = [
  { name: 'Chicken', searchTerms: ['chicken breast', 'chicken', 'broiler'], unit: 'kg', min: 100, max: 800 },
  { name: 'Eggs', searchTerms: ['eggs', 'egg tray', 'hen eggs'], unit: 'piece', min: 4, max: 20 },
  { name: 'Mutton', searchTerms: ['mutton', 'goat meat'], unit: 'kg', min: 400, max: 1500 },
  { name: 'Fish', searchTerms: ['fish', 'rohu', 'pomfret'], unit: 'kg', min: 100, max: 1500 },
  { name: 'Prawns', searchTerms: ['prawns', 'shrimp'], unit: 'kg', min: 200, max: 2000 },
  { name: 'Tomato', searchTerms: ['tomato', 'tamatar'], unit: 'kg', min: 10, max: 200 },
  { name: 'Onion', searchTerms: ['onion', 'pyaaz'], unit: 'kg', min: 10, max: 200 },
  { name: 'Green Chilli', searchTerms: ['green chilli'], unit: 'kg', min: 20, max: 300 },
  { name: 'Coriander Leaves', searchTerms: ['coriander', 'dhania'], unit: 'kg', min: 20, max: 400 },
  { name: 'Potato', searchTerms: ['potato', 'aloo'], unit: 'kg', min: 10, max: 150 },
];

const CITIES = [
  'hyderabad', 'bangalore', 'mumbai', 'delhi', 'chennai',
  'pune', 'kolkata', 'ahmedabad', 'jaipur', 'lucknow',
];

interface ScrapedPrice {
  item: string;
  price: number;
  unit: string;
  source: string;
}

async function scrapeGroceryPrices(city: string, firecrawlKey: string): Promise<ScrapedPrice[]> {
  if (isCircuitOpen()) {
    console.warn(`Circuit breaker OPEN for scraping — skipping ${city}`);
    return [];
  }

  // Phase 2 Step D — extended to Zepto, Swiggy Instamart, JioMart (still 1 search credit)
  const searchQuery = `${city} today chicken egg vegetable price per kg site:bigbasket.com OR site:blinkit.com OR site:freshtohome.com OR site:zeptonow.com OR site:swiggy.com/instamart OR site:jiomart.com`;

  const response = await fetchWithRetry('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: searchQuery,
      limit: 8, // bumped from 5 — more results to regex against, same credit cost
      scrapeOptions: { formats: ['markdown'] },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Firecrawl search failed for ${city}:`, err);
    return [];
  }

  const data = await response.json();
  const prices: ScrapedPrice[] = [];

  const allContent = (data.data || [])
    .map((r: any) => r.markdown || '')
    .join('\n');

  for (const item of VOLATILE_ITEMS) {
    for (const term of item.searchTerms) {
      const regex = new RegExp(
        `${term}[\\s\\S]{0,80}?(?:₹|Rs\\.?|INR)\\s*(\\d{1,5}(?:\\.\\d{1,2})?)(?:\\s*(?:\\/|per)\\s*(?:kg|piece|dozen))?`,
        'gi'
      );
      const match = regex.exec(allContent);
      if (match) {
        const price = parseFloat(match[1]);
        // Per-item sanity bounds — reject garbage matches
        if (price >= item.min && price <= item.max) {
          prices.push({
            item: item.name,
            price,
            unit: item.unit,
            source: 'firecrawl',
          });
          break;
        } else {
          console.warn(`Rejected ${item.name}=${price} (out of bounds ${item.min}-${item.max}) in ${city}`);
        }
      }
    }
  }

  return prices;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { city, scrapeAll } = await req.json().catch(() => ({ city: null, scrapeAll: false }));
    const targetCities = scrapeAll ? CITIES : (city ? [city.toLowerCase()] : ['hyderabad']);

    const allResults: Record<string, ScrapedPrice[]> = {};
    const today = new Date().toISOString().split('T')[0];
    let totalScraped = 0;
    let totalFailed = 0;

    for (const c of targetCities) {
      console.log(`Scraping prices for ${c}...`);
      try {
        const prices = await scrapeGroceryPrices(c, firecrawlKey);
        allResults[c] = prices;
        totalScraped += prices.length;

        for (const p of prices) {
          const upsertRes = await fetch(`${supabaseUrl}/rest/v1/city_prices`, {
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              city: c,
              item_name: p.item,
              avg_price: p.price,
              min_price: p.price,
              max_price: p.price,
              report_count: 1,
              source: 'firecrawl',
              price_date: today,
              updated_at: new Date().toISOString(),
            }),
          });

          if (!upsertRes.ok) {
            console.error(`Failed to upsert price for ${p.item} in ${c}:`, await upsertRes.text());
          }
        }
      } catch (cityError) {
        totalFailed++;
        console.error(`Failed to scrape ${c}:`, cityError instanceof Error ? cityError.message : cityError);
        allResults[c] = [];
      }
    }

    // Structured monitoring log
    console.log(JSON.stringify({
      event: 'scrape_complete',
      cities: targetCities.length,
      totalScraped,
      totalFailed,
      circuitOpen: isCircuitOpen(),
      consecutiveFailures,
      timestamp: new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({ success: true, data: allResults, stats: { totalScraped, totalFailed } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Price scraping error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
