import { scopedGet, scopedSet } from "./scoped-storage";
import { safeJsonParse } from "./safe-json";
// ─── Adaptive Price Intelligence Engine ───
// Learns from user purchases, decays confidence over time, provides smart suggestions

import { findPrice, saveUserPriceOverride, type PriceEntry } from './price-database';
import { toLocalDateStr } from './date-utils';

// ─── Types ───

export interface PriceMemoryEntry {
  itemName: string;
  unit: string;
  price: number;           // weighted average price
  confidence: number;      // 0.0 to 1.0
  source: 'user_explicit' | 'user_accepted' | 'grocery_scan' | 'market';
  history: { price: number; date: string; source: string }[];
  lastUpdated: string;
  count: number;            // number of data points
}

export interface SuggestedPrice {
  value: number;            // total cost for this quantity
  perUnit: number;          // price per base unit
  range: { min: number; max: number } | null;
  confidence: 'high' | 'medium' | 'low';
  source: string;           // human-readable source description
  reasoning: string[];      // explanation lines for "Why this price?"
  marketTrend?: 'rising' | 'stable' | 'falling';
}

export interface CostEstimate {
  totalCost: number;
  breakdown: CostBreakdownItem[];
  confidence: 'high' | 'medium' | 'low';
  source: 'user_history' | 'market_db' | 'unknown';
}

export interface CostBreakdownItem {
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  subtotal: number;
  priceRange?: { min: number; max: number };
  source: 'user_history' | 'market_db';
  reasoning: string;
}

const MEMORY_KEY = 'nutrilens_price_memory';

// ─── Storage ───

function getMemoryStore(): Record<string, PriceMemoryEntry> {
  const data = scopedGet(MEMORY_KEY);
  return data ? JSON.parse(data) : {};
}

function saveMemoryStore(store: Record<string, PriceMemoryEntry>) {
  scopedSet(MEMORY_KEY, JSON.stringify(store));
}

// ─── Confidence Helpers ───

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / 86400000);
}

/** Weekly confidence decay — call periodically or on app load */
export function decayAllPrices() {
  const store = getMemoryStore();
  const DECAY_RATE = 0.92; // ~8% loss per week
  const MIN_CONFIDENCE = 0.2;
  let changed = false;

  for (const key of Object.keys(store)) {
    const entry = store[key];
    const weeks = daysSince(entry.lastUpdated) / 7;
    if (weeks >= 1) {
      const newConf = entry.confidence * Math.pow(DECAY_RATE, Math.floor(weeks));
      if (newConf < MIN_CONFIDENCE) {
        delete store[key]; // Too stale, remove
      } else {
        entry.confidence = Math.round(newConf * 100) / 100;
      }
      changed = true;
    }
  }

  if (changed) saveMemoryStore(store);
}

// ─── Price Learning ───

/** Called when user accepts an AI-suggested price */
export function onPriceAccepted(itemName: string, price: number, unit: string) {
  const store = getMemoryStore();
  const key = itemName.toLowerCase().trim();
  const today = toLocalDateStr();

  if (store[key]) {
    const entry = store[key];
    // Weighted average: give more weight to recent data
    entry.price = Math.round(((entry.price * entry.count) + price) / (entry.count + 1));
    entry.count++;
    entry.confidence = Math.min(1.0, entry.confidence + 0.05);
    entry.lastUpdated = today;
    entry.source = 'user_accepted';
    entry.history.push({ price, date: today, source: 'accepted' });
    if (entry.history.length > 30) entry.history = entry.history.slice(-30);
  } else {
    store[key] = {
      itemName,
      unit,
      price,
      confidence: 0.4,
      source: 'user_accepted',
      history: [{ price, date: today, source: 'accepted' }],
      lastUpdated: today,
      count: 1,
    };
  }

  saveMemoryStore(store);
}

/** Called when user explicitly edits a price */
export function onPriceEdited(
  itemName: string,
  newPrice: number,
  unit: string,
  saveAsDefault: boolean
) {
  if (!saveAsDefault) return; // One-time override, don't persist

  const store = getMemoryStore();
  const key = itemName.toLowerCase().trim();
  const today = toLocalDateStr();

  store[key] = {
    itemName,
    unit,
    price: newPrice,
    confidence: 1.0, // User explicitly set it
    source: 'user_explicit',
    history: [
      ...(store[key]?.history || []),
      { price: newPrice, date: today, source: 'explicit_edit' },
    ].slice(-30),
    lastUpdated: today,
    count: (store[key]?.count || 0) + 1,
  };

  saveMemoryStore(store);
  saveUserPriceOverride(itemName, newPrice, unit);
}

/** Called when grocery items are scanned/entered */
export function learnPrice(itemName: string, pricePerUnit: number, unit: string) {
  const store = getMemoryStore();
  const key = itemName.toLowerCase().trim();
  const today = toLocalDateStr();

  if (store[key]) {
    const entry = store[key];
    entry.price = Math.round(((entry.price * entry.count) + pricePerUnit) / (entry.count + 1));
    entry.count++;
    entry.confidence = Math.min(1.0, entry.confidence + 0.15); // Higher boost from actual purchase
    entry.lastUpdated = today;
    entry.source = 'grocery_scan';
    entry.history.push({ price: pricePerUnit, date: today, source: 'grocery' });
    if (entry.history.length > 30) entry.history = entry.history.slice(-30);
  } else {
    store[key] = {
      itemName,
      unit,
      price: pricePerUnit,
      confidence: 0.8, // Grocery data is reliable
      source: 'grocery_scan',
      history: [{ price: pricePerUnit, date: today, source: 'grocery' }],
      lastUpdated: today,
      count: 1,
    };
  }

  saveMemoryStore(store);
  saveUserPriceOverride(itemName, pricePerUnit, unit);
}

/** Get user's learned price for an item */
export function getLearnedPrice(itemName: string): PriceMemoryEntry | null {
  const store = getMemoryStore();
  const key = itemName.toLowerCase().trim();
  return store[key] || null;
}

/** Get all learned prices */
export function getAllLearnedPrices(): PriceMemoryEntry[] {
  return Object.values(getMemoryStore());
}

// ─── Unit Conversion Engine ───

const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  'kg': { base: 'g', factor: 1000 },
  'g': { base: 'g', factor: 1 },
  'gram': { base: 'g', factor: 1 },
  'grams': { base: 'g', factor: 1 },
  '100g': { base: 'g', factor: 100 },
  'mg': { base: 'g', factor: 0.001 },
  'liter': { base: 'ml', factor: 1000 },
  'litre': { base: 'ml', factor: 1000 },
  'ml': { base: 'ml', factor: 1 },
  'milliliter': { base: 'ml', factor: 1 },
  'cl': { base: 'ml', factor: 10 },
  'dozen': { base: 'unit', factor: 12 },
  'piece': { base: 'unit', factor: 1 },
  'unit': { base: 'unit', factor: 1 },
  'serving': { base: 'unit', factor: 1 },
  'half dozen': { base: 'unit', factor: 6 },
};

export function convertToBaseUnit(quantity: number, fromUnit: string, toBaseUnit: string): number {
  const from = fromUnit.toLowerCase().trim();
  const to = toBaseUnit.toLowerCase().trim();

  if (from === to) return quantity;

  const fromConv = UNIT_CONVERSIONS[from];
  const toConv = UNIT_CONVERSIONS[to];

  if (fromConv && toConv && fromConv.base === toConv.base) {
    return (quantity * fromConv.factor) / toConv.factor;
  }

  // Fallback heuristics
  if (from === 'g' && to === 'kg') return quantity / 1000;
  if (from === 'ml' && to === 'liter') return quantity / 1000;
  if (from === 'dozen' && to === 'piece') return quantity * 12;
  if (from === 'piece' && to === 'dozen') return quantity / 12;

  return quantity;
}

// ─── Smart Price Suggestion ───

export function getSuggestedPrice(
  itemName: string,
  quantity: number,
  unit: string
): SuggestedPrice {
  const reasoning: string[] = [];
  
  // 1. Check user's price memory (highest priority)
  const learned = getLearnedPrice(itemName);
  if (learned && learned.confidence > 0.5) {
    const convertedQty = convertToBaseUnit(quantity, unit, learned.unit);
    const total = Math.round(convertedQty * learned.price);
    
    const days = daysSince(learned.lastUpdated);
    reasoning.push(`Based on your ${learned.source === 'user_explicit' ? 'saved default' : learned.source === 'grocery_scan' ? 'last purchase' : 'usage history'}: ₹${learned.price}/${learned.unit}`);
    if (days > 0) reasoning.push(`Last updated ${days} day${days > 1 ? 's' : ''} ago`);
    reasoning.push(`Confidence: ${Math.round(learned.confidence * 100)}% (${learned.count} data points)`);

    // Calculate range from history
    let range: { min: number; max: number } | null = null;
    if (learned.history.length > 1) {
      const prices = learned.history.map(h => h.price);
      range = { min: Math.min(...prices), max: Math.max(...prices) };
      reasoning.push(`Your price range: ₹${range.min}–₹${range.max}/${learned.unit}`);
    }

    return {
      value: total,
      perUnit: learned.price,
      range,
      confidence: learned.confidence > 0.7 ? 'high' : 'medium',
      source: 'your history',
      reasoning,
    };
  }

  // 2. Fallback to market database
  const priceEntry = findPrice(itemName);
  if (priceEntry) {
    const convertedQty = convertToBaseUnit(quantity, unit, priceEntry.unit);
    const total = Math.round(convertedQty * priceEntry.basePrice);
    
    // Create a range ±15% around base price
    const range = {
      min: Math.round(priceEntry.basePrice * 0.85),
      max: Math.round(priceEntry.basePrice * 1.15),
    };

    reasoning.push(`Market average: ₹${priceEntry.basePrice}/${priceEntry.unit}`);
    reasoning.push(`Price range: ₹${range.min}–₹${range.max}/${priceEntry.unit}`);
    reasoning.push('Source: National average market rates');
    if (learned) {
      reasoning.push(`(Your older data: ₹${learned.price}, but confidence is low at ${Math.round(learned.confidence * 100)}%)`);
    }

    return {
      value: total,
      perUnit: priceEntry.basePrice,
      range,
      confidence: 'medium',
      source: 'market average',
      reasoning,
    };
  }

  // 3. No data at all
  return {
    value: 0,
    perUnit: 0,
    range: null,
    confidence: 'low',
    source: 'unknown',
    reasoning: ['No price data available for this item', 'Please enter a price manually'],
  };
}

// ─── Batch Cost Estimation ───

export function estimateCostWithBreakdown(
  items: { name: string; quantity?: number; unit?: string }[]
): CostEstimate {
  const breakdown: CostBreakdownItem[] = [];
  let totalCost = 0;
  let matchCount = 0;
  let userHistoryCount = 0;

  for (const item of items) {
    const qty = item.quantity || 1;
    const unit = item.unit || 'serving';
    const suggested = getSuggestedPrice(item.name, qty, unit);

    if (suggested.value > 0) {
      breakdown.push({
        name: item.name,
        quantity: qty,
        unit,
        pricePerUnit: suggested.perUnit,
        subtotal: suggested.value,
        priceRange: suggested.range || undefined,
        source: suggested.source === 'your history' ? 'user_history' : 'market_db',
        reasoning: suggested.reasoning.join(' · '),
      });
      totalCost += suggested.value;
      matchCount++;
      if (suggested.source === 'your history') userHistoryCount++;
    }
  }

  return {
    totalCost,
    breakdown,
    confidence: matchCount === items.length ? 'high' : matchCount > 0 ? 'medium' : 'low',
    source: userHistoryCount > 0 ? 'user_history' : matchCount > 0 ? 'market_db' : 'unknown',
  };
}

// ─── Run decay on app load ───
decayAllPrices();
