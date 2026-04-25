// AUTH: PUBLIC cron — daily 06:00 IST via pg_cron. No user auth; service role writes to city_prices.
// GOVT_API_HOOK: Placeholder for Government Mandi API (data.gov.in / agmarknet)
// This edge function will fetch wholesale prices from government open data APIs
// and apply retail markup to store in city_prices table.
//
// Integration plan:
// 1. Register at data.gov.in for API key
// 2. Use agmarknet commodity prices endpoint
// 3. Map mandi names to SUPPORTED_CITIES
// 4. Apply retail markup constants below
// 5. Upsert into city_prices with source='govt_mandi'
//
// Schedule: Daily at 6 AM IST via pg_cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";


// ─── Retail Markup Constants ───
// Wholesale → retail conversion factors (based on Indian market research)
const RETAIL_MARKUP: Record<string, number> = {
  chicken: 1.3,      // 30% markup
  mutton: 1.25,      // 25% markup
  fish: 1.4,         // 40% markup (cold chain costs)
  eggs: 1.2,         // 20% markup
  tomato: 1.5,       // 50% markup (perishable)
  onion: 1.4,        // 40% markup
  potato: 1.3,       // 30% markup
  rice: 1.2,         // 20% markup
  wheat: 1.2,        // 20% markup
  dal: 1.25,         // 25% markup
  milk: 1.0,         // MRP-based, no markup needed
  paneer: 1.3,       // 30% markup
  vegetables: 1.5,   // 50% markup (general vegetables)
  fruits: 1.4,       // 40% markup
};

// ─── Mandi → City Mapping ───
// GOVT_API_HOOK: Replace with actual mandi-to-city mapping from agmarknet
const MANDI_CITY_MAP: Record<string, string> = {
  'Bowenpally': 'hyderabad',
  'Malakpet': 'hyderabad',
  'Yeshwanthpur': 'bangalore',
  'Vashi': 'mumbai',
  'Azadpur': 'delhi',
  'Koyambedu': 'chennai',
  'Market Yard': 'pune',
  'Koley Market': 'kolkata',
  'Jamalpur': 'ahmedabad',
  'Muhana': 'jaipur',
  'Aliganj': 'lucknow',
};

// ─── Supported Items ───
const TRACKED_ITEMS = [
  'chicken', 'eggs', 'mutton', 'fish', 'tomato', 'onion',
  'potato', 'paneer', 'rice', 'dal',
];

interface WholesalePrice {
  item: string;
  city: string;
  wholesalePrice: number;
  unit: string;
  date: string;
}

// GOVT_API_HOOK: Replace this mock with actual API call to data.gov.in
async function fetchMandiPrices(): Promise<WholesalePrice[]> {
  // Placeholder: returns empty array
  // When implementing, use:
  //   const GOVT_API_KEY = Deno.env.get('GOVT_MANDI_API_KEY');
  //   const url = `https://api.data.gov.in/resource/...?api-key=${GOVT_API_KEY}`;
  //   const response = await fetch(url);
  //   const data = await response.json();
  //   return data.records.map(r => ({
  //     item: normalizeItemName(r.commodity),
  //     city: MANDI_CITY_MAP[r.market] || r.market.toLowerCase(),
  //     wholesalePrice: parseFloat(r.modal_price),
  //     unit: 'kg',
  //     date: r.arrival_date,
  //   }));

  console.log('[fetch-govt-prices] GOVT_API_HOOK: No API key configured, returning empty');
  return [];
}

function applyRetailMarkup(item: string, wholesalePrice: number): number {
  const category = Object.keys(RETAIL_MARKUP).find(k => item.toLowerCase().includes(k));
  const markup = category ? RETAIL_MARKUP[category] : 1.3; // default 30%
  return Math.round(wholesalePrice * markup * 100) / 100;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // GOVT_API_HOOK: Fetch wholesale prices from government API
    const wholesalePrices = await fetchMandiPrices();

    if (wholesalePrices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No government data available. GOVT_API_HOOK: Configure data.gov.in API key to enable.',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let upserted = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const wp of wholesalePrices) {
      const retailPrice = applyRetailMarkup(wp.item, wp.wholesalePrice);

      // Upsert into city_prices
      const { error } = await supabase
        .from('city_prices')
        .upsert({
          city: wp.city,
          item_name: wp.item,
          avg_price: retailPrice,
          min_price: wp.wholesalePrice,
          max_price: retailPrice,
          source: 'govt_mandi',
          price_date: today,
          report_count: 1,
        }, {
          onConflict: 'city,item_name,price_date',
          ignoreDuplicates: false,
        });

      if (!error) {
        upserted++;

        // Also insert into price_history for trend tracking
        await supabase.from('price_history').insert({
          city: wp.city,
          item_name: wp.item,
          avg_price: retailPrice,
          price_date: today,
          source: 'govt_mandi',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: upserted,
        total: wholesalePrices.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[fetch-govt-prices] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch government prices', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
