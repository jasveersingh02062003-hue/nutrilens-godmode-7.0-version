import { scopedGet, scopedSet } from './scoped-storage';
// ─── Dynamic Market Pricing Engine ───
// Seeded with typical Indian market prices (national averages)

import { toLocalDateStr } from './date-utils';

export interface PriceEntry {
  id: string;
  itemName: string;
  aliases: string[];           // alternate names for fuzzy matching
  category: 'grain' | 'dairy' | 'protein' | 'vegetable' | 'fruit' | 'oil' | 'spice' | 'packaged' | 'beverage' | 'other';
  unit: string;                // base unit: 'kg', 'liter', 'piece', 'dozen'
  basePrice: number;           // average price per base unit in ₹
  region?: string;
  lastUpdated: string;
  source: 'seed' | 'user' | 'api';
}

const PRICE_DB_KEY = 'nutrilens_price_db';
const USER_OVERRIDES_KEY = 'nutrilens_price_overrides';
const LOCATION_KEY = 'nutrilens_user_location';

// ─── Seed data: ~100 common Indian food items ───
const SEED_PRICES: Omit<PriceEntry, 'id' | 'lastUpdated' | 'source'>[] = [
  // Grains & cereals
  { itemName: 'Rice', aliases: ['chawal', 'basmati', 'white rice', 'brown rice'], category: 'grain', unit: 'kg', basePrice: 55 },
  { itemName: 'Wheat Flour', aliases: ['atta', 'gehun', 'chapati flour'], category: 'grain', unit: 'kg', basePrice: 38 },
  { itemName: 'Maida', aliases: ['refined flour', 'all purpose flour'], category: 'grain', unit: 'kg', basePrice: 40 },
  { itemName: 'Poha', aliases: ['flattened rice', 'chivda'], category: 'grain', unit: 'kg', basePrice: 50 },
  { itemName: 'Oats', aliases: ['rolled oats', 'oatmeal'], category: 'grain', unit: 'kg', basePrice: 120 },
  { itemName: 'Bread', aliases: ['pav', 'bread loaf', 'white bread'], category: 'grain', unit: 'piece', basePrice: 40 },
  { itemName: 'Roti', aliases: ['chapati', 'phulka'], category: 'grain', unit: 'piece', basePrice: 5 },
  { itemName: 'Dosa', aliases: ['plain dosa', 'masala dosa'], category: 'grain', unit: 'piece', basePrice: 30 },
  { itemName: 'Idli', aliases: ['steamed idli'], category: 'grain', unit: 'piece', basePrice: 10 },
  { itemName: 'Semolina', aliases: ['suji', 'rava', 'sooji'], category: 'grain', unit: 'kg', basePrice: 45 },

  // Pulses & lentils
  { itemName: 'Toor Dal', aliases: ['arhar dal', 'pigeon pea'], category: 'protein', unit: 'kg', basePrice: 140 },
  { itemName: 'Moong Dal', aliases: ['green gram', 'mung dal'], category: 'protein', unit: 'kg', basePrice: 120 },
  { itemName: 'Chana Dal', aliases: ['bengal gram', 'split chickpea'], category: 'protein', unit: 'kg', basePrice: 90 },
  { itemName: 'Masoor Dal', aliases: ['red lentil'], category: 'protein', unit: 'kg', basePrice: 100 },
  { itemName: 'Urad Dal', aliases: ['black gram'], category: 'protein', unit: 'kg', basePrice: 130 },
  { itemName: 'Rajma', aliases: ['kidney beans'], category: 'protein', unit: 'kg', basePrice: 130 },
  { itemName: 'Chole', aliases: ['chickpeas', 'kabuli chana', 'chana'], category: 'protein', unit: 'kg', basePrice: 100 },
  { itemName: 'Soya Chunks', aliases: ['soya', 'meal maker', 'nutrela'], category: 'protein', unit: 'kg', basePrice: 120 },

  // Dairy
  { itemName: 'Milk', aliases: ['doodh', 'full cream milk', 'toned milk'], category: 'dairy', unit: 'liter', basePrice: 58 },
  { itemName: 'Curd', aliases: ['dahi', 'yogurt', 'yoghurt'], category: 'dairy', unit: 'kg', basePrice: 60 },
  { itemName: 'Paneer', aliases: ['cottage cheese', 'fresh paneer'], category: 'dairy', unit: 'kg', basePrice: 320 },
  { itemName: 'Butter', aliases: ['makhan', 'amul butter'], category: 'dairy', unit: 'kg', basePrice: 500 },
  { itemName: 'Ghee', aliases: ['clarified butter', 'desi ghee'], category: 'dairy', unit: 'kg', basePrice: 550 },
  { itemName: 'Cheese', aliases: ['processed cheese', 'cheese slice'], category: 'dairy', unit: 'kg', basePrice: 400 },
  { itemName: 'Cream', aliases: ['fresh cream', 'malai'], category: 'dairy', unit: 'liter', basePrice: 300 },

  // Eggs & meat
  { itemName: 'Eggs', aliases: ['egg', 'anda', 'hen egg'], category: 'protein', unit: 'piece', basePrice: 7 },
  { itemName: 'Chicken', aliases: ['chicken breast', 'murgh', 'broiler chicken'], category: 'protein', unit: 'kg', basePrice: 200 },
  { itemName: 'Mutton', aliases: ['goat meat', 'lamb'], category: 'protein', unit: 'kg', basePrice: 700 },
  { itemName: 'Fish', aliases: ['rohu', 'pomfret', 'surmai', 'machli'], category: 'protein', unit: 'kg', basePrice: 300 },
  { itemName: 'Prawns', aliases: ['shrimp', 'jhinga'], category: 'protein', unit: 'kg', basePrice: 500 },

  // Vegetables
  { itemName: 'Potato', aliases: ['aloo', 'batata'], category: 'vegetable', unit: 'kg', basePrice: 30 },
  { itemName: 'Onion', aliases: ['pyaaz', 'kanda'], category: 'vegetable', unit: 'kg', basePrice: 35 },
  { itemName: 'Tomato', aliases: ['tamatar'], category: 'vegetable', unit: 'kg', basePrice: 40 },
  { itemName: 'Cauliflower', aliases: ['gobi', 'phool gobi'], category: 'vegetable', unit: 'kg', basePrice: 40 },
  { itemName: 'Spinach', aliases: ['palak'], category: 'vegetable', unit: 'kg', basePrice: 30 },
  { itemName: 'Capsicum', aliases: ['shimla mirch', 'bell pepper'], category: 'vegetable', unit: 'kg', basePrice: 60 },
  { itemName: 'Brinjal', aliases: ['baingan', 'eggplant'], category: 'vegetable', unit: 'kg', basePrice: 40 },
  { itemName: 'Carrot', aliases: ['gajar'], category: 'vegetable', unit: 'kg', basePrice: 40 },
  { itemName: 'Cabbage', aliases: ['patta gobi', 'band gobi'], category: 'vegetable', unit: 'kg', basePrice: 30 },
  { itemName: 'Green Peas', aliases: ['matar', 'peas'], category: 'vegetable', unit: 'kg', basePrice: 80 },
  { itemName: 'Beans', aliases: ['french beans', 'green beans'], category: 'vegetable', unit: 'kg', basePrice: 60 },
  { itemName: 'Okra', aliases: ['bhindi', 'lady finger'], category: 'vegetable', unit: 'kg', basePrice: 50 },
  { itemName: 'Cucumber', aliases: ['kheera', 'kakdi'], category: 'vegetable', unit: 'kg', basePrice: 30 },
  { itemName: 'Mushroom', aliases: ['button mushroom'], category: 'vegetable', unit: 'kg', basePrice: 150 },
  { itemName: 'Sweet Potato', aliases: ['shakarkandi'], category: 'vegetable', unit: 'kg', basePrice: 40 },
  { itemName: 'Bitter Gourd', aliases: ['karela'], category: 'vegetable', unit: 'kg', basePrice: 50 },
  { itemName: 'Bottle Gourd', aliases: ['lauki', 'dudhi'], category: 'vegetable', unit: 'kg', basePrice: 30 },
  { itemName: 'Ginger', aliases: ['adrak'], category: 'spice', unit: 'kg', basePrice: 120 },
  { itemName: 'Garlic', aliases: ['lehsun', 'lahsun'], category: 'spice', unit: 'kg', basePrice: 150 },
  { itemName: 'Green Chilli', aliases: ['hari mirch'], category: 'vegetable', unit: 'kg', basePrice: 60 },
  { itemName: 'Coriander Leaves', aliases: ['dhania patta', 'cilantro'], category: 'vegetable', unit: 'kg', basePrice: 80 },
  { itemName: 'Lemon', aliases: ['nimbu', 'lime'], category: 'fruit', unit: 'piece', basePrice: 5 },

  // Fruits
  { itemName: 'Banana', aliases: ['kela'], category: 'fruit', unit: 'piece', basePrice: 5 },
  { itemName: 'Apple', aliases: ['seb'], category: 'fruit', unit: 'kg', basePrice: 150 },
  { itemName: 'Mango', aliases: ['aam'], category: 'fruit', unit: 'kg', basePrice: 100 },
  { itemName: 'Papaya', aliases: ['papita'], category: 'fruit', unit: 'kg', basePrice: 40 },
  { itemName: 'Watermelon', aliases: ['tarbooz'], category: 'fruit', unit: 'kg', basePrice: 25 },
  { itemName: 'Orange', aliases: ['santra', 'narangi'], category: 'fruit', unit: 'kg', basePrice: 80 },
  { itemName: 'Grapes', aliases: ['angoor'], category: 'fruit', unit: 'kg', basePrice: 80 },
  { itemName: 'Pomegranate', aliases: ['anar'], category: 'fruit', unit: 'kg', basePrice: 120 },
  { itemName: 'Guava', aliases: ['amrud'], category: 'fruit', unit: 'kg', basePrice: 50 },

  // Oils
  { itemName: 'Mustard Oil', aliases: ['sarson ka tel'], category: 'oil', unit: 'liter', basePrice: 170 },
  { itemName: 'Sunflower Oil', aliases: ['surajmukhi tel'], category: 'oil', unit: 'liter', basePrice: 140 },
  { itemName: 'Coconut Oil', aliases: ['nariyal tel'], category: 'oil', unit: 'liter', basePrice: 200 },
  { itemName: 'Olive Oil', aliases: ['jaitun tel'], category: 'oil', unit: 'liter', basePrice: 600 },
  { itemName: 'Groundnut Oil', aliases: ['mungfali tel', 'peanut oil'], category: 'oil', unit: 'liter', basePrice: 180 },

  // Spices
  { itemName: 'Turmeric', aliases: ['haldi'], category: 'spice', unit: 'kg', basePrice: 200 },
  { itemName: 'Red Chilli Powder', aliases: ['lal mirch'], category: 'spice', unit: 'kg', basePrice: 300 },
  { itemName: 'Cumin', aliases: ['jeera'], category: 'spice', unit: 'kg', basePrice: 350 },
  { itemName: 'Coriander Powder', aliases: ['dhania powder'], category: 'spice', unit: 'kg', basePrice: 200 },
  { itemName: 'Garam Masala', aliases: ['mixed spice'], category: 'spice', unit: 'kg', basePrice: 500 },
  { itemName: 'Salt', aliases: ['namak'], category: 'spice', unit: 'kg', basePrice: 20 },
  { itemName: 'Sugar', aliases: ['cheeni', 'shakkar'], category: 'other', unit: 'kg', basePrice: 42 },
  { itemName: 'Jaggery', aliases: ['gur', 'gud'], category: 'other', unit: 'kg', basePrice: 60 },
  { itemName: 'Honey', aliases: ['shahad', 'madhu'], category: 'other', unit: 'kg', basePrice: 350 },

  // Beverages
  { itemName: 'Tea', aliases: ['chai patti', 'tea leaves'], category: 'beverage', unit: 'kg', basePrice: 400 },
  { itemName: 'Coffee', aliases: ['coffee powder', 'instant coffee'], category: 'beverage', unit: 'kg', basePrice: 600 },

  // Packaged / common items
  { itemName: 'Maggi', aliases: ['noodles', 'instant noodles'], category: 'packaged', unit: 'piece', basePrice: 14 },
  { itemName: 'Biscuit', aliases: ['cookies', 'parle-g'], category: 'packaged', unit: 'piece', basePrice: 10 },
  { itemName: 'Chips', aliases: ['potato chips', 'lays', 'kurkure'], category: 'packaged', unit: 'piece', basePrice: 20 },

  // Prepared foods (street / restaurant common)
  { itemName: 'Samosa', aliases: ['veg samosa'], category: 'other', unit: 'piece', basePrice: 15 },
  { itemName: 'Vada Pav', aliases: ['batata vada'], category: 'other', unit: 'piece', basePrice: 20 },
  { itemName: 'Pav Bhaji', aliases: [], category: 'other', unit: 'piece', basePrice: 80 },
  { itemName: 'Biryani', aliases: ['chicken biryani', 'veg biryani', 'dum biryani'], category: 'other', unit: 'piece', basePrice: 150 },
  { itemName: 'Thali', aliases: ['meal', 'lunch thali', 'dinner thali'], category: 'other', unit: 'piece', basePrice: 120 },
  { itemName: 'Paratha', aliases: ['aloo paratha', 'stuffed paratha'], category: 'grain', unit: 'piece', basePrice: 30 },
  { itemName: 'Puri', aliases: ['poori'], category: 'grain', unit: 'piece', basePrice: 8 },
  { itemName: 'Naan', aliases: ['butter naan', 'garlic naan', 'tandoori naan'], category: 'grain', unit: 'piece', basePrice: 40 },
  { itemName: 'Dal', aliases: ['dal fry', 'yellow dal', 'dal tadka'], category: 'protein', unit: 'piece', basePrice: 60 },
  { itemName: 'Sabzi', aliases: ['vegetable curry', 'bhaji', 'subzi'], category: 'vegetable', unit: 'piece', basePrice: 50 },
  { itemName: 'Raita', aliases: ['boondi raita', 'cucumber raita'], category: 'dairy', unit: 'piece', basePrice: 30 },
];

// ─── Initialization ───

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function initPriceDB(): PriceEntry[] {
  const existing = scopedGet(PRICE_DB_KEY);
  if (existing) return JSON.parse(existing);

  const today = toLocalDateStr();
  const entries: PriceEntry[] = SEED_PRICES.map(p => ({
    ...p,
    id: generateId(),
    lastUpdated: today,
    source: 'seed' as const,
  }));
  scopedSet(PRICE_DB_KEY, JSON.stringify(entries));
  return entries;
}

// ─── Public API ───

export function getAllPrices(): PriceEntry[] {
  return initPriceDB();
}

export function findPrice(itemName: string): PriceEntry | null {
  const db = getAllPrices();
  const overrides = getUserOverrides();
  const q = itemName.toLowerCase().trim();

  // Check user overrides first
  const override = overrides.find(p =>
    p.itemName.toLowerCase() === q ||
    p.aliases.some(a => a.toLowerCase() === q)
  );
  if (override) return override;

  // Then check seed DB – exact match
  let match = db.find(p =>
    p.itemName.toLowerCase() === q ||
    p.aliases.some(a => a.toLowerCase() === q)
  );
  if (match) return match;

  // Partial match
  match = db.find(p =>
    p.itemName.toLowerCase().includes(q) ||
    q.includes(p.itemName.toLowerCase()) ||
    p.aliases.some(a => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))
  );
  return match || null;
}

/** Estimate cost for food items. Returns ₹ amount or null if unknown. */
export function estimateCost(items: { name: string; quantity?: number; unit?: string }[]): number | null {
  let total = 0;
  let matched = false;

  for (const item of items) {
    const price = findPrice(item.name);
    if (!price) continue;
    matched = true;

    const qty = item.quantity || 1;
    const itemUnit = (item.unit || '').toLowerCase();

    // Unit conversion
    let multiplier = qty;
    if (price.unit === 'kg') {
      if (itemUnit === 'g' || itemUnit === 'grams' || itemUnit === 'gram') multiplier = qty / 1000;
      else if (itemUnit === '100g') multiplier = qty / 10;
      else multiplier = qty; // assume kg
    } else if (price.unit === 'liter') {
      if (itemUnit === 'ml' || itemUnit === 'milliliter') multiplier = qty / 1000;
      else multiplier = qty;
    } else {
      multiplier = qty; // piece, dozen, etc.
    }

    total += price.basePrice * multiplier;
  }

  return matched ? Math.round(total) : null;
}

// ─── User Overrides ───

function getUserOverrides(): PriceEntry[] {
  const data = scopedGet(USER_OVERRIDES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveUserPriceOverride(itemName: string, price: number, unit: string) {
  const overrides = getUserOverrides();
  const existing = overrides.find(p => p.itemName.toLowerCase() === itemName.toLowerCase());
  const today = toLocalDateStr();

  if (existing) {
    existing.basePrice = price;
    existing.lastUpdated = today;
  } else {
    overrides.push({
      id: generateId(),
      itemName,
      aliases: [],
      category: 'other',
      unit,
      basePrice: price,
      lastUpdated: today,
      source: 'user',
    });
  }
  scopedSet(USER_OVERRIDES_KEY, JSON.stringify(overrides));
}

// ─── Location ───

export interface UserLocation {
  city: string;
  pincode: string;
}

export function getUserLocation(): UserLocation | null {
  const data = scopedGet(LOCATION_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveUserLocation(location: UserLocation) {
  scopedSet(LOCATION_KEY, JSON.stringify(location));
}

// ─── Price stats for UI ───

export function getPriceTrends(): { item: string; direction: 'up' | 'down' | 'stable'; percentage: number }[] {
  // Placeholder – in production, compare current vs previous week's prices
  return [
    { item: 'Eggs', direction: 'up', percentage: 8 },
    { item: 'Tomato', direction: 'down', percentage: 15 },
    { item: 'Onion', direction: 'stable', percentage: 0 },
  ];
}
