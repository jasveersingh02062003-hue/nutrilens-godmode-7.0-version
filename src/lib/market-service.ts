// Smart Market Service Layer
// Fetches and ranks food items by PES score, price, and protein value
// Architecture: hooks ready for Firecrawl/API integration (source param)

import { supabase } from '@/integrations/supabase/client';
import { foodDatabase, type PESFood } from './pes-engine';
import { getPrice, type PriceEntry } from './price-database';

// ─── Types ───

export type MarketCategory = 'all' | 'protein' | 'vegetable' | 'dairy' | 'grain' | 'packed' | 'supplement';
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

// ─── Fresh Foods from Static DB ───

function getFreshMarketItems(city: string, category: MarketCategory): MarketItem[] {
  let foods = foodDatabase;

  if (category === 'protein') {
    foods = foods.filter(f => f.tags.includes('high_protein') || f.protein >= 10);
  } else if (category === 'dairy') {
    foods = foods.filter(f => f.name.toLowerCase().includes('milk') || f.name.toLowerCase().includes('curd') || f.name.toLowerCase().includes('paneer') || f.name.toLowerCase().includes('lassi'));
  } else if (category === 'grain') {
    foods = foods.filter(f => f.tags.includes('vegetarian') && f.carbs > 20);
  } else if (category === 'vegetable') {
    foods = foods.filter(f => f.calories < 100 && f.carbs < 15);
  }

  return foods.map(f => {
    // Try to get city-specific price, fallback to static
    const priceEntry = getPrice(f.name);
    const price = priceEntry?.basePrice ?? f.price;
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
  }));
}

// ─── Combined Market Items ───

export async function getMarketItems(
  city: string,
  category: MarketCategory = 'all',
  sort: MarketSort = 'pes',
  _source?: 'static' | 'live' // Hook for future API integration
): Promise<MarketItem[]> {
  let items: MarketItem[] = [];

  if (category === 'packed' || category === 'supplement') {
    const packedCat = category === 'supplement' ? 'supplement' : undefined;
    items = await getPackedProducts(packedCat);
  } else if (category === 'all') {
    const fresh = getFreshMarketItems(city, 'all');
    const packed = await getPackedProducts();
    items = [...fresh, ...packed];
  } else {
    items = getFreshMarketItems(city, category);
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

// ─── Price History (placeholder for Phase 2) ───

export async function getPriceHistory(city: string, itemName: string, days = 7) {
  const { data } = await supabase
    .from('price_history')
    .select('*')
    .eq('city', city)
    .eq('item_name', itemName)
    .order('price_date', { ascending: true })
    .limit(days);

  return data ?? [];
}
