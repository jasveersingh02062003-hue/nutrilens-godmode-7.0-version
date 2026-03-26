
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Volatile items that need live price tracking
const VOLATILE_ITEMS = [
  { name: 'Chicken', searchTerms: ['chicken breast', 'chicken', 'broiler'] },
  { name: 'Eggs', searchTerms: ['eggs', 'egg tray', 'hen eggs'] },
  { name: 'Mutton', searchTerms: ['mutton', 'goat meat'] },
  { name: 'Fish', searchTerms: ['fish', 'rohu', 'pomfret'] },
  { name: 'Prawns', searchTerms: ['prawns', 'shrimp'] },
  { name: 'Tomato', searchTerms: ['tomato', 'tamatar'] },
  { name: 'Onion', searchTerms: ['onion', 'pyaaz'] },
  { name: 'Green Chilli', searchTerms: ['green chilli'] },
  { name: 'Coriander Leaves', searchTerms: ['coriander', 'dhania'] },
  { name: 'Potato', searchTerms: ['potato', 'aloo'] },
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
  const searchQuery = `${city} today chicken egg vegetable price per kg site:bigbasket.com OR site:blinkit.com OR site:freshtohome.com`;

  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: searchQuery,
      limit: 5,
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

  // Extract prices from scraped markdown content
  const allContent = (data.data || [])
    .map((r: any) => r.markdown || '')
    .join('\n');

  for (const item of VOLATILE_ITEMS) {
    for (const term of item.searchTerms) {
      // Match patterns like "₹300", "Rs 300", "Rs.300", "INR 300"
      const regex = new RegExp(
        `${term}[\\s\\S]{0,80}?(?:₹|Rs\\.?|INR)\\s*(\\d{1,5}(?:\\.\\d{1,2})?)(?:\\s*(?:\\/|per)\\s*(?:kg|piece|dozen))?`,
        'gi'
      );
      const match = regex.exec(allContent);
      if (match) {
        const price = parseFloat(match[1]);
        if (price > 0 && price < 5000) {
          prices.push({
            item: item.name,
            price,
            unit: item.name === 'Eggs' ? 'piece' : 'kg',
            source: 'firecrawl',
          });
          break; // first match is enough per item
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

    for (const c of targetCities) {
      console.log(`Scraping prices for ${c}...`);
      const prices = await scrapeGroceryPrices(c, firecrawlKey);
      allResults[c] = prices;

      // Upsert into city_prices table
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
    }

    return new Response(
      JSON.stringify({ success: true, data: allResults }),
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
