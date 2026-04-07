import { scopedGet, scopedSet } from "./scoped-storage";
// ─── Live Price Service ───
// Hybrid price resolution: crowdsource → firecrawl cache → static fallback → stale fallback

import { supabase } from '@/integrations/supabase/client';
import { findPrice } from './price-database';

export interface LivePrice {
  price: number;
  unit: string;
  source: 'community' | 'firecrawl' | 'static' | 'stale';
  reportCount?: number;
  city?: string;
  updatedAt?: string;
  isStale?: boolean;
}

const PRICE_CACHE = new Map<string, { data: LivePrice; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

/** Get the best available price for an item in a city */
export async function getLivePrice(itemName: string, city?: string): Promise<LivePrice | null> {
  const cacheKey = `${(city || 'default').toLowerCase()}_${itemName.toLowerCase()}`;
  const cached = PRICE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const userCity = city?.toLowerCase() || getUserCity();
  if (!userCity) return getStaticPrice(itemName);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Step 1: Check community reports (today, this city, 3+ reports from 3+ distinct users)
  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: reports } = await supabase
      .from('price_reports')
      .select('price_per_unit, user_id')
      .eq('city', userCity)
      .ilike('item_name', `%${itemName}%`)
      .gte('reported_at', sevenDaysAgo)
      .order('reported_at', { ascending: false })
      .limit(50);

    if (reports && reports.length >= 3) {
      // Require 3+ distinct users
      const distinctUsers = new Set(reports.map(r => r.user_id));
      if (distinctUsers.size >= 3) {
        const prices = reports.map(r => Number(r.price_per_unit)).sort((a, b) => a - b);
        const median = prices[Math.floor(prices.length / 2)];
        
        // Outlier rejection: exclude reports >50% away from median
        const validPrices = prices.filter(p => Math.abs(p - median) / median <= 0.5);
        const finalMedian = validPrices.length > 0
          ? validPrices[Math.floor(validPrices.length / 2)]
          : median;

        const result: LivePrice = {
          price: finalMedian,
          unit: 'kg',
          source: 'community',
          reportCount: validPrices.length,
          city: userCity,
          updatedAt: now.toISOString(),
        };
        PRICE_CACHE.set(cacheKey, { data: result, ts: Date.now() });
        return result;
      }
    }
  } catch (e) {
    console.warn('Community price check failed:', e);
  }

  // Step 2: Check Firecrawl scraped cache
  try {
    const { data: cityPrice } = await supabase
      .from('city_prices')
      .select('*')
      .eq('city', userCity)
      .ilike('item_name', `%${itemName}%`)
      .gte('price_date', today)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cityPrice) {
      const result: LivePrice = {
        price: Number(cityPrice.avg_price),
        unit: 'kg',
        source: 'firecrawl',
        reportCount: cityPrice.report_count || 0,
        city: userCity,
        updatedAt: cityPrice.updated_at,
      };
      PRICE_CACHE.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    }
  } catch (e) {
    console.warn('City price check failed:', e);
  }

  // Step 3: Static fallback
  const staticPrice = getStaticPrice(itemName);
  if (staticPrice) return staticPrice;

  // Step 4: Stale fallback — last known price regardless of date
  try {
    const { data: stalePrice } = await supabase
      .from('city_prices')
      .select('*')
      .eq('city', userCity)
      .ilike('item_name', `%${itemName}%`)
      .order('price_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stalePrice) {
      const result: LivePrice = {
        price: Number(stalePrice.avg_price),
        unit: 'kg',
        source: 'stale',
        reportCount: stalePrice.report_count || 0,
        city: userCity,
        updatedAt: stalePrice.updated_at,
        isStale: true,
      };
      PRICE_CACHE.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    }
  } catch (e) {
    console.warn('Stale price fallback failed:', e);
  }

  return null;
}

function getStaticPrice(itemName: string): LivePrice | null {
  const entry = findPrice(itemName);
  if (!entry) return null;
  return {
    price: entry.basePrice,
    unit: entry.unit,
    source: 'static',
  };
}

function getUserCity(): string | null {
  try {
    const profile = scopedGet('nutrilens_profile');
    if (profile) {
      const p = JSON.parse(profile);
      return p.city?.toLowerCase() || null;
    }
  } catch {}
  return null;
}

/** Report a user-entered price (crowdsource) */
export async function reportPrice(itemName: string, pricePerUnit: number, unit: string, city?: string) {
  const userCity = city?.toLowerCase() || getUserCity();
  if (!userCity) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('price_reports').insert({
    user_id: user.id,
    city: userCity,
    item_name: itemName,
    price_per_unit: pricePerUnit,
    unit,
  });

  // Invalidate cache for this item
  const cacheKey = `${userCity}_${itemName.toLowerCase()}`;
  PRICE_CACHE.delete(cacheKey);
}

/** Estimate cost using live prices */
export async function estimateLiveCost(
  items: { name: string; quantity?: number; unit?: string }[],
  city?: string
): Promise<{ total: number; itemPrices: { name: string; cost: number; source: string }[] } | null> {
  let total = 0;
  const itemPrices: { name: string; cost: number; source: string }[] = [];
  let anyMatched = false;

  for (const item of items) {
    const livePrice = await getLivePrice(item.name, city);
    if (!livePrice) continue;
    anyMatched = true;

    const qty = item.quantity || 1;
    const itemUnit = (item.unit || '').toLowerCase();

    let multiplier = qty;
    if (livePrice.unit === 'kg') {
      if (itemUnit === 'g' || itemUnit === 'grams') multiplier = qty / 1000;
      else if (itemUnit === '100g') multiplier = qty / 10;
    } else if (livePrice.unit === 'liter') {
      if (itemUnit === 'ml') multiplier = qty / 1000;
    }

    const cost = Math.round(livePrice.price * multiplier);
    total += cost;
    itemPrices.push({ name: item.name, cost, source: livePrice.source });
  }

  return anyMatched ? { total, itemPrices } : null;
}
