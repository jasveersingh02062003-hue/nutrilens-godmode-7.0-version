// Smart Market Service Layer
// Fetches and ranks food items by PES score, price, and protein value
// Architecture: hooks ready for Firecrawl/API integration (source param)

import { supabase } from '@/integrations/supabase/client';
import { foodDatabase, type PESFood } from './pes-engine';
import { findPrice } from './price-database';

// ─── Types ───

export type MarketCategory = 'all' | 'protein' | 'vegetable' | 'dairy' | 'grain' | 'packed' | 'supplement' | 'dals' | 'fruits' | 'frozen' | 'drinks' | 'spreads';
export type MarketSort = 'pes' | 'price' | 'protein';
export type PackedCategory = 'protein_drink' | 'protein_bar' | 'ready_to_eat' | 'frozen' | 'spread' | 'supplement' | 'beverage' | 'snack';

export interface MarketItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
  protein: number;
  calories: number;
  pes: number;
  pesColor: 'green' | 'yellow' | 'red';
  costPerGramProtein: number;
  category: string;
  unit?: string;
  servingSize?: string;
  source: 'fresh' | 'packed';
  platforms?: Array<{ name: string; url: string; price: number }>;
  allergens?: string[];
  isVerified?: boolean;
  imageUrl?: string;
  lastUpdated?: string;
  priceChange?: number; // percentage change vs yesterday
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
}

export interface MarketItemDetail extends MarketItem {
  priceHistory: Array<{ date: string; price: number }>;
}

// ─── Constants ───

export const SUPPORTED_CITIES = [
  'Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

// City alias mapping for nearest supported city
const CITY_ALIASES: Record<string, string> = {
  secunderabad: 'hyderabad',
  noida: 'delhi',
  gurgaon: 'delhi',
  gurugram: 'delhi',
  faridabad: 'delhi',
  ghaziabad: 'delhi',
  thane: 'mumbai',
  'navi mumbai': 'mumbai',
  whitefield: 'bangalore',
  bengaluru: 'bangalore',
  mysore: 'bangalore',
  mysuru: 'bangalore',
};

/** Resolve city to nearest supported city. Returns { resolved, isAlias } */
export function resolveCity(city: string): { resolved: string; isAlias: boolean; original?: string } {
  const lower = city.toLowerCase().trim();
  const exact = SUPPORTED_CITIES.find(c => c.toLowerCase() === lower);
  if (exact) return { resolved: exact, isAlias: false };
  const alias = CITY_ALIASES[lower];
  if (alias) {
    const match = SUPPORTED_CITIES.find(c => c.toLowerCase() === alias);
    if (match) return { resolved: match, isAlias: true, original: city };
  }
  return { resolved: city, isAlias: false };
}

/** Get swap suggestions: cheaper items with similar/better protein */
export function getSwapSuggestions(
  currentName: string,
  currentCostPerGram: number,
  currentProtein: number,
  allItems: MarketItem[]
): MarketItem[] {
  return allItems
    .filter(item =>
      item.name.toLowerCase() !== currentName.toLowerCase() &&
      item.costPerGramProtein < currentCostPerGram * 0.8 &&
      item.protein >= currentProtein * 0.8
    )
    .sort((a, b) => a.costPerGramProtein - b.costPerGramProtein)
    .slice(0, 3);
}

const FRESH_FOOD_IMAGES: Record<string, string> = {
  'chicken': '🍗',
  'egg': '🥚',
  'fish': '🐟',
  'paneer': '🧀',
  'milk': '🥛',
  'curd': '🥛',
  'rice': '🍚',
  'dal': '🫘',
  'soya': '🫘',
  'sprouts': '🌱',
  'spinach': '🥬',
  'broccoli': '🥦',
  'tomato': '🍅',
  'onion': '🧅',
  'potato': '🥔',
  'banana': '🍌',
  'apple': '🍎',
  'mutton': '🥩',
  'prawn': '🦐',
  'tofu': '🧈',
  'oats': '🌾',
  'bread': '🍞',
  'ghee': '🧈',
  'wheat': '🌾',
  'rajma': '🫘',
  'chole': '🫘',
  'sweet potato': '🍠',
};

function getFreshFoodEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(FRESH_FOOD_IMAGES)) {
    if (lower.includes(key)) return emoji;
  }
  return '🥗';
}

// ─── Utilities ───

export function calculateCostPerGramProtein(price: number, proteinGrams: number): number {
  if (proteinGrams <= 0) return 999;
  return Math.round((price / proteinGrams) * 100) / 100;
}

export function getPESColor(pes: number): 'green' | 'yellow' | 'red' {
  if (pes >= 0.6) return 'green';
  if (pes >= 0.3) return 'yellow';
  return 'red';
}

// ─── Price Change from History ───

async function getPriceChanges(city: string): Promise<Map<string, number>> {
  const changes = new Map<string, number>();
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data } = await supabase
      .from('price_history')
      .select('item_name, avg_price, price_date')
      .eq('city', city.toLowerCase())
      .in('price_date', [todayStr, yesterdayStr]);

    if (data && data.length > 0) {
      const byItem: Record<string, Record<string, number>> = {};
      for (const row of data) {
        if (!byItem[row.item_name]) byItem[row.item_name] = {};
        byItem[row.item_name][row.price_date] = Number(row.avg_price);
      }
      for (const [item, dates] of Object.entries(byItem)) {
        const todayPrice = dates[todayStr];
        const yesterdayPrice = dates[yesterdayStr];
        if (todayPrice && yesterdayPrice && yesterdayPrice > 0) {
          const pctChange = Math.round(((todayPrice - yesterdayPrice) / yesterdayPrice) * 100);
          changes.set(item.toLowerCase(), pctChange);
        }
      }
    }
  } catch (e) {
    console.warn('Price change fetch failed:', e);
  }
  return changes;
}

// ─── Fresh Foods from Static DB + Geo-aware pricing ───

async function getFreshMarketItems(city: string, category: MarketCategory): Promise<MarketItem[]> {
  let foods = foodDatabase;

  if (category === 'protein') {
    foods = foods.filter(f => f.tags.includes('high_protein') || f.protein >= 10);
  } else if (category === 'dairy') {
    foods = foods.filter(f => f.name.toLowerCase().includes('milk') || f.name.toLowerCase().includes('curd') || f.name.toLowerCase().includes('paneer') || f.name.toLowerCase().includes('lassi'));
  } else if (category === 'grain') {
    foods = foods.filter(f => f.tags.includes('vegetarian') && f.carbs > 20);
  } else if (category === 'vegetable') {
    foods = foods.filter(f => f.calories < 100 && f.carbs < 15);
  } else if (category === 'dals') {
    foods = foods.filter(f => {
      const n = f.name.toLowerCase();
      return n.includes('dal') || n.includes('rajma') || n.includes('chole') || n.includes('chana') || n.includes('lentil') || n.includes('sprout');
    });
  } else if (category === 'fruits') {
    foods = foods.filter(f => {
      const n = f.name.toLowerCase();
      return n.includes('banana') || n.includes('apple') || n.includes('papaya') || n.includes('guava') || n.includes('orange') || n.includes('mango');
    });
  }

  // FIRECRAWL_HOOK: Replace static prices with live scraped prices when enabled
  // const livePrices = await fetchFirecrawlPrices(city, foods.map(f => f.name));

  // Try to get city-specific prices from DB
  let cityPrices: Record<string, number> = {};
  try {
    const { data } = await supabase
      .from('city_prices')
      .select('item_name, avg_price')
      .eq('city', city.toLowerCase());
    if (data) {
      for (const row of data) {
        cityPrices[row.item_name.toLowerCase()] = Number(row.avg_price);
      }
    }
  } catch (e) {
    console.warn('City price fetch failed:', e);
  }

  const priceChanges = await getPriceChanges(city);
  const now = new Date().toISOString();

  return foods.map(f => {
    // Priority: city_prices DB → static fallback
    const cityPrice = cityPrices[f.name.toLowerCase()];
    const priceEntry = findPrice(f.name);
    const price = cityPrice ?? priceEntry?.basePrice ?? f.price;
    const pes = f.protein > 0 && price > 0 ? f.protein / price : 0;

    return {
      id: f.id,
      name: f.name,
      price,
      protein: f.protein,
      calories: f.calories,
      pes: Math.round(pes * 100) / 100,
      pesColor: getPESColor(pes),
      costPerGramProtein: calculateCostPerGramProtein(price, f.protein),
      category: f.tags.includes('non_veg') ? 'Non-Veg' : 'Veg',
      unit: priceEntry?.unit,
      source: 'fresh' as const,
      imageUrl: getFreshFoodEmoji(f.name),
      lastUpdated: cityPrice ? now : priceEntry?.lastUpdated || 'static',
      priceChange: priceChanges.get(f.name.toLowerCase()) || 0,
      carbs: f.carbs,
      fat: f.fat,
    };
  });
}

// ─── Packed Products from Supabase ───

export async function getPackedProducts(category?: PackedCategory): Promise<MarketItem[]> {
  let query = supabase.from('packed_products').select('*');
  
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('pes_score', { ascending: false });

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: p.id,
    name: p.product_name,
    brand: p.brand,
    price: p.selling_price ?? p.mrp,
    protein: p.protein,
    calories: p.calories,
    pes: p.pes_score,
    pesColor: getPESColor(p.pes_score),
    costPerGramProtein: p.cost_per_gram_protein,
    category: p.category,
    servingSize: p.serving_size,
    source: 'packed' as const,
    platforms: p.platforms as any[] ?? [],
    allergens: p.allergens as string[] ?? [],
    isVerified: p.is_verified,
    imageUrl: p.image_url || undefined,
    lastUpdated: p.updated_at,
    priceChange: 0, // Packed products have MRP, no daily change
    carbs: p.carbs,
    fat: p.fat,
    fiber: p.fiber,
    sugar: p.sugar,
  }));
}

// ─── Combined Market Items ───

export async function getMarketItems(
  city: string,
  category: MarketCategory = 'all',
  sort: MarketSort = 'pes',
  _source?: 'static' | 'live' // FIRECRAWL_HOOK: Switch to 'live' when Firecrawl is enabled
): Promise<MarketItem[]> {
  let items: MarketItem[] = [];

  if (category === 'packed' || category === 'supplement' || category === 'frozen' || category === 'drinks' || category === 'spreads') {
    const catMap: Record<string, PackedCategory | undefined> = {
      packed: undefined, supplement: 'supplement', frozen: 'frozen', drinks: 'beverage', spreads: 'spread',
    };
    items = await getPackedProducts(catMap[category]);
  } else if (category === 'all') {
    const fresh = await getFreshMarketItems(city, 'all');
    const packed = await getPackedProducts();
    items = [...fresh, ...packed];
  } else {
    items = await getFreshMarketItems(city, category);
  }

  // Sort
  switch (sort) {
    case 'pes':
      items.sort((a, b) => b.pes - a.pes);
      break;
    case 'price':
      items.sort((a, b) => a.price - b.price);
      break;
    case 'protein':
      items.sort((a, b) => b.protein - a.protein);
      break;
  }

  return items;
}

// ─── Top Items (for compact views in planner) ───

export async function getTopMarketItems(city: string, limit = 10): Promise<MarketItem[]> {
  const items = await getMarketItems(city, 'all', 'pes');
  return items.slice(0, limit);
}

// ─── Item Detail (for detail sheet) ───

export async function getMarketItemDetail(item: MarketItem, city: string): Promise<MarketItemDetail> {
  // Get price history
  let priceHistory: Array<{ date: string; price: number }> = [];
  try {
    const { data } = await supabase
      .from('price_history')
      .select('price_date, avg_price')
      .eq('city', city.toLowerCase())
      .ilike('item_name', `%${item.name}%`)
      .order('price_date', { ascending: true })
      .limit(30);

    if (data && data.length > 0) {
      priceHistory = data.map(d => ({
        date: d.price_date,
        price: Number(d.avg_price),
      }));
    }
  } catch (e) {
    console.warn('Price history fetch failed:', e);
  }

  return { ...item, priceHistory };
}

// ─── Price History (for trend charts) ───

export async function getPriceHistory(city: string, itemName: string, days = 7) {
  const { data } = await supabase
    .from('price_history')
    .select('*')
    .eq('city', city.toLowerCase())
    .ilike('item_name', `%${itemName}%`)
    .order('price_date', { ascending: true })
    .limit(days);

  return data ?? [];
}

// ─── Get last update time for a city ───

export async function getLastPriceUpdate(city: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('price_history')
      .select('created_at')
      .eq('city', city.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.created_at || null;
  } catch {
    return null;
  }
}
