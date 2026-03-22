// ============================================
// NutriLens AI – Context Learning Service
// ============================================
// Learns user patterns to suggest smart defaults for meal context.

import { getRecentLogs, type MealSourceCategory, type CookingMethod } from './store';

const CONTEXT_DEFAULTS_KEY = 'nutrilens_context_defaults';
const COOKING_PREFS_KEY = 'nutrilens_cooking_prefs';

interface ContextPattern {
  mealType: string;
  dayOfWeek: number; // 0-6
  hourBucket: 'morning' | 'afternoon' | 'evening' | 'night';
  category: MealSourceCategory;
  count: number;
}

function getHourBucket(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function getDefaultCategory(
  mealType: string,
  now: Date = new Date()
): MealSourceCategory | null {
  const logs = getRecentLogs(30);
  const hourBucket = getHourBucket(now.getHours());
  const dayOfWeek = now.getDay();

  // Count categories for this meal type + time pattern
  const counts: Record<string, number> = {};
  let total = 0;

  for (const log of logs) {
    for (const meal of log.meals) {
      if (meal.type !== mealType || !meal.source?.category) continue;
      const mealDate = new Date(log.date);
      const mealDay = mealDate.getDay();
      const cat = meal.source.category;

      // Weight by relevance: same day of week = 3x, same hour bucket = 2x
      let weight = 1;
      if (mealDay === dayOfWeek) weight += 2;
      
      counts[cat] = (counts[cat] || 0) + weight;
      total += weight;
    }
  }

  if (total < 3) {
    // Fallback: breakfast/lunch/dinner at home by default
    if (hourBucket === 'morning' || hourBucket === 'afternoon') return 'home';
    return null;
  }

  // Return most common category if it accounts for >50% of weighted entries
  let best: MealSourceCategory | null = null;
  let bestCount = 0;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = cat as MealSourceCategory;
    }
  }

  return bestCount / total > 0.4 ? best : null;
}

export function getSourceEmoji(category: MealSourceCategory): string {
  const map: Record<MealSourceCategory, string> = {
    home: '🏠',
    restaurant: '🍽️',
    street_food: '🛺',
    packaged: '📦',
    fast_food: '🍔',
    office: '💼',
    friends: '👥',
    other: '📌',
  };
  return map[category] || '📌';
}

export function getSourceLabel(category: MealSourceCategory): string {
  const map: Record<MealSourceCategory, string> = {
    home: 'Home',
    restaurant: 'Restaurant',
    street_food: 'Street Food',
    packaged: 'Packaged',
    fast_food: 'Fast Food',
    office: 'Office',
    friends: 'Friends',
    other: 'Other',
  };
  return map[category] || 'Other';
}

// ============================================
// Cooking Method Learning
// ============================================

export const COOKING_METHODS: { value: CookingMethod; emoji: string; label: string }[] = [
  { value: 'fried', emoji: '🍟', label: 'Fried' },
  { value: 'air_fried', emoji: '🔥', label: 'Air Fried' },
  { value: 'grilled', emoji: '🍖', label: 'Grilled' },
  { value: 'baked', emoji: '🍪', label: 'Baked' },
  { value: 'boiled_steamed', emoji: '💧', label: 'Boiled / Steamed' },
  { value: 'sauteed', emoji: '🍳', label: 'Sautéed' },
  { value: 'raw', emoji: '🥕', label: 'Raw' },
];

export function getCookingMethodEmoji(method: CookingMethod): string {
  return COOKING_METHODS.find(m => m.value === method)?.emoji || '🍳';
}

export function getCookingMethodLabel(method: CookingMethod): string {
  return COOKING_METHODS.find(m => m.value === method)?.label || method;
}

interface CookingPrefs {
  [foodName: string]: Record<string, number>; // method -> count
}

function getCookingPrefs(): CookingPrefs {
  try {
    return JSON.parse(localStorage.getItem(COOKING_PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function learnCookingMethod(foodNames: string[], method: CookingMethod): void {
  const prefs = getCookingPrefs();
  for (const name of foodNames) {
    const key = name.toLowerCase().trim();
    if (!prefs[key]) prefs[key] = {};
    prefs[key][method] = (prefs[key][method] || 0) + 1;
  }
  localStorage.setItem(COOKING_PREFS_KEY, JSON.stringify(prefs));
}

export function getDefaultCookingMethod(foodNames: string[]): CookingMethod | null {
  const prefs = getCookingPrefs();
  const counts: Record<string, number> = {};

  for (const name of foodNames) {
    const key = name.toLowerCase().trim();
    const foodPrefs = prefs[key];
    if (foodPrefs) {
      for (const [method, count] of Object.entries(foodPrefs)) {
        counts[method] = (counts[method] || 0) + count;
      }
    }
  }

  let best: CookingMethod | null = null;
  let bestCount = 0;
  for (const [method, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = method as CookingMethod;
    }
  }

  return bestCount >= 2 ? best : null;
}
