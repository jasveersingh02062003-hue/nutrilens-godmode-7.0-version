// ============================================
// NutriLens AI – PCOS Health Score Service
// ============================================
// Scores meals against PCOS-friendly dietary guidelines.
// Used by home dashboard, camera flow, meal planner, and progress.

import type { FoodItem, UserProfile } from './store';

export interface PCOSCondition {
  has: boolean;
  type?: 'insulin-resistant' | 'inflammatory' | 'mixed' | 'unknown';
  severity?: 1 | 2 | 3 | 4 | 5;
  diagnosed?: boolean;
}

export interface PCOSMealScore {
  score: number;          // 0–100
  color: 'green' | 'yellow' | 'red';
  reasons: string[];
  tips: string[];
}

// ── Food classification keywords ──

const HIGH_GI_FOODS = [
  'white rice', 'rice', 'potato', 'cornflakes', 'sugar', 'white bread',
  'bread', 'maida', 'naan', 'instant noodles', 'puri', 'jalebi',
  'gulab jamun', 'rasmalai', 'halwa', 'kheer', 'cake', 'biscuit',
  'mango', 'watermelon', 'pineapple', 'bhatura', 'kachori',
  'paratha', 'biryani', 'pulao',
];

const LOW_GI_FOODS = [
  'dal', 'lentil', 'chana', 'rajma', 'moong', 'oats', 'brown rice',
  'quinoa', 'barley', 'sweet potato', 'apple', 'pear', 'orange',
  'sabzi', 'salad', 'sprouts', 'millet', 'ragi', 'jowar',
  'khichdi', 'idli', 'dhokla',
];

const ANTI_INFLAMMATORY_FOODS = [
  'turmeric', 'haldi', 'ginger', 'adrak', 'garlic', 'lehsun',
  'spinach', 'palak', 'berries', 'blueberry', 'nuts', 'almond',
  'walnut', 'flaxseed', 'green tea', 'avocado', 'olive oil',
  'salmon', 'sardine', 'broccoli', 'methi', 'cinnamon',
  'coconut oil', 'amla', 'guava',
];

const INFLAMMATORY_FOODS = [
  'fried', 'deep fried', 'pakora', 'samosa', 'bhajia', 'chips',
  'processed', 'sausage', 'instant noodle', 'maggi', 'cola', 'soda',
  'candy', 'chocolate', 'pastry', 'margarine', 'refined oil',
];

const HIGH_PROTEIN_FOODS = [
  'egg', 'chicken', 'fish', 'paneer', 'tofu', 'yogurt', 'curd',
  'dal', 'lentil', 'chana', 'rajma', 'soya', 'whey', 'cottage cheese',
  'sprouts', 'quinoa', 'nuts', 'almond',
];

const DAIRY_FOODS = [
  'milk', 'paneer', 'cheese', 'cream', 'ice cream', 'kheer',
  'rasmalai', 'rabri', 'lassi', 'butter',
];

const SUGAR_FOODS = [
  'sugar', 'jaggery', 'honey', 'syrup', 'jalebi', 'gulab jamun',
  'ladoo', 'barfi', 'halwa', 'mithai', 'cake', 'pastry',
  'cola', 'soda', 'sweet', 'candy', 'chocolate',
];

// ── Helpers ──

function itemMatches(item: FoodItem, keywords: string[]): boolean {
  const name = item.name.toLowerCase();
  return keywords.some(kw => name.includes(kw));
}

function matchCount(items: FoodItem[], keywords: string[]): number {
  return items.filter(i => itemMatches(i, keywords)).length;
}

function matchedNames(items: FoodItem[], keywords: string[]): string[] {
  return items.filter(i => itemMatches(i, keywords)).map(i => i.name);
}

// ── Main Scoring Function ──

export function scoreMealForPCOS(
  items: FoodItem[],
  totalCarbs: number,
  totalProtein: number,
  totalFat: number,
  totalCalories: number,
  pcosCondition?: PCOSCondition
): PCOSMealScore {
  if (!pcosCondition?.has || items.length === 0) {
    return { score: 100, color: 'green', reasons: [], tips: [] };
  }

  let score = 100;
  const reasons: string[] = [];
  const tips: string[] = [];
  const severity = pcosCondition.severity || 3;
  const severityMultiplier = 0.8 + (severity * 0.1); // 0.9–1.3

  // 1. High-GI penalty
  const highGI = matchedNames(items, HIGH_GI_FOODS);
  if (highGI.length > 0) {
    const penalty = Math.round(12 * highGI.length * severityMultiplier);
    score -= penalty;
    reasons.push(`High-GI foods (${highGI.slice(0, 2).join(', ')}) may spike insulin`);
    tips.push('Swap white rice for brown rice or millets to lower GI');
  }

  // 2. Low-GI bonus
  const lowGI = matchCount(items, LOW_GI_FOODS);
  if (lowGI > 0) {
    score += Math.min(15, lowGI * 5);
    reasons.push('Includes low-GI foods (great for insulin balance)');
  }

  // 3. Anti-inflammatory bonus
  const antiInflam = matchCount(items, ANTI_INFLAMMATORY_FOODS);
  if (antiInflam > 0) {
    score += Math.min(15, antiInflam * 5);
    reasons.push('Anti-inflammatory ingredients help manage PCOS');
  }

  // 4. Inflammatory penalty
  const inflam = matchedNames(items, INFLAMMATORY_FOODS);
  if (inflam.length > 0) {
    const penalty = Math.round(10 * inflam.length * severityMultiplier);
    score -= penalty;
    reasons.push(`Inflammatory foods (${inflam.slice(0, 2).join(', ')}) may worsen symptoms`);
    tips.push('Try baked or air-fried alternatives');
  }

  // 5. Protein check (PCOS needs higher protein)
  if (totalProtein < 15) {
    score -= Math.round(12 * severityMultiplier);
    reasons.push(`Low protein (${Math.round(totalProtein)}g) — aim for 20g+ per meal`);
    tips.push('Add eggs, paneer, or dal for more protein');
  } else if (totalProtein >= 25) {
    score += 8;
    reasons.push('Great protein content for hormone balance');
  }

  // 6. Sugar/sweet penalty
  const sugarItems = matchedNames(items, SUGAR_FOODS);
  if (sugarItems.length > 0) {
    score -= Math.round(15 * severityMultiplier);
    reasons.push('Sugar can worsen insulin resistance with PCOS');
    tips.push('Satisfy cravings with berries, dark chocolate, or dates');
  }

  // 7. High carb penalty (>60g for PCOS)
  if (totalCarbs > 60) {
    score -= Math.round(10 * severityMultiplier);
    reasons.push(`High carbs (${Math.round(totalCarbs)}g) — keep under 50g per meal`);
  }

  // 8. Dairy caution (type-dependent)
  if (pcosCondition.type === 'inflammatory' || pcosCondition.type === 'mixed') {
    const dairyItems = matchedNames(items, DAIRY_FOODS);
    if (dairyItems.length > 0) {
      score -= 5;
      reasons.push('Dairy may aggravate inflammatory PCOS');
      tips.push('Try almond milk, coconut curd, or tofu instead');
    }
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  const color: PCOSMealScore['color'] =
    score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red';

  return { score, color, reasons, tips };
}

// ── Get user's PCOS condition from profile ──

export function getPCOSCondition(profile: UserProfile | null): PCOSCondition | undefined {
  if (!profile) return undefined;
  // Check conditions object first
  const conditions = (profile as any).conditions;
  if (conditions?.pcos?.has) return conditions.pcos;
  // Check womenHealth array (fallback)
  if (profile.womenHealth?.includes('pcos')) {
    return { has: true, type: 'unknown', severity: 3, diagnosed: false };
  }
  return undefined;
}

// ── Check if user has PCOS ──

export function userHasPCOS(profile: UserProfile | null): boolean {
  return !!getPCOSCondition(profile)?.has;
}

// ── Score a day's meals for PCOS ──

export function scoreDayForPCOS(
  meals: Array<{ items: FoodItem[]; totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number }>,
  profile: UserProfile | null
): { avgScore: number; color: 'green' | 'yellow' | 'red'; mealScores: PCOSMealScore[] } {
  const pcos = getPCOSCondition(profile);
  if (!pcos?.has || meals.length === 0) {
    return { avgScore: 100, color: 'green', mealScores: [] };
  }

  const mealScores = meals.map(m =>
    scoreMealForPCOS(m.items, m.totalCarbs, m.totalProtein, m.totalFat, m.totalCalories, pcos)
  );

  const avgScore = Math.round(mealScores.reduce((s, m) => s + m.score, 0) / mealScores.length);
  const color: 'green' | 'yellow' | 'red' =
    avgScore >= 75 ? 'green' : avgScore >= 50 ? 'yellow' : 'red';

  return { avgScore, color, mealScores };
}

// ── PCOS food recommendations ──

export function getPCOSFoodRecommendations(): Array<{ name: string; emoji: string; reason: string }> {
  return [
    { name: 'Methi (Fenugreek)', emoji: '🌿', reason: 'Helps regulate insulin' },
    { name: 'Flaxseeds', emoji: '🫘', reason: 'Reduces androgen levels' },
    { name: 'Turmeric Milk', emoji: '🥛', reason: 'Anti-inflammatory' },
    { name: 'Cinnamon Tea', emoji: '🍵', reason: 'Improves insulin sensitivity' },
    { name: 'Sprouts', emoji: '🌱', reason: 'Low-GI, high protein' },
    { name: 'Walnuts', emoji: '🥜', reason: 'Healthy fats, anti-inflammatory' },
    { name: 'Berries', emoji: '🫐', reason: 'Antioxidant, low sugar fruit' },
    { name: 'Green leafy veggies', emoji: '🥬', reason: 'Iron, fiber, anti-inflammatory' },
  ];
}
