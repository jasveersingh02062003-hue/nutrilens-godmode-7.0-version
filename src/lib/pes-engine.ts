// Protein Efficiency Score (PES) Intelligence Engine
// PES = protein_g / price_inr — evaluates food value for money

import { getDailyLog, getDailyTotals, type MealEntry } from './store';
import { getBudgetSettings } from './expense-store';

// ─── Types ───

export interface PESFood {
  id: string;
  name: string;
  price: number;
  protein: number;
  calories: number;
  fat: number;
  carbs: number;
  tags: string[];
  mealType: string[];
  proteinPerRupee: number;
}

export type PESColor = 'green' | 'yellow' | 'red';

export interface PESResult {
  pes: number;
  color: PESColor;
  insight: string;
  alternatives: PESAlternative[];
}

export interface PESAlternative {
  name: string;
  price: number;
  protein: number;
  pes: number;
  color: PESColor;
}

export interface PESComparison {
  winner: string;
  difference: string;
  details: Array<{ name: string; pes: number; color: PESColor }>;
}

export interface DailyEfficiencyResult {
  totalProtein: number;
  totalCost: number;
  pes: number;
  color: PESColor;
  suggestion: string | null;
}

// ─── 50-Food Raw Ingredient Database ───

export const foodDatabase: PESFood[] = [
  { id: "F01", name: "Egg (1)", price: 6, protein: 6, calories: 70, fat: 5, carbs: 1, tags: ["vegetarian", "high_protein", "budget"], mealType: ["breakfast", "snack"], proteinPerRupee: 1.00 },
  { id: "F02", name: "Soya Chunks (50g)", price: 6, protein: 26, calories: 130, fat: 1, carbs: 10, tags: ["vegetarian", "vegan", "high_protein", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 4.33 },
  { id: "F03", name: "Paneer (100g)", price: 40, protein: 18, calories: 300, fat: 20, carbs: 5, tags: ["vegetarian"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.45 },
  { id: "F04", name: "Chicken Breast (100g)", price: 48, protein: 31, calories: 165, fat: 3.6, carbs: 0, tags: ["non_veg", "high_protein"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.65 },
  { id: "F05", name: "Moong Dal (50g)", price: 10, protein: 12, calories: 180, fat: 1, carbs: 28, tags: ["vegetarian", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 1.20 },
  { id: "F06", name: "Masoor Dal (50g)", price: 9, protein: 12, calories: 170, fat: 1, carbs: 27, tags: ["vegetarian", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 1.33 },
  { id: "F07", name: "Chana Dal (50g)", price: 11, protein: 13, calories: 190, fat: 1.5, carbs: 30, tags: ["vegetarian", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 1.18 },
  { id: "F08", name: "Rajma (50g)", price: 12, protein: 12, calories: 170, fat: 1, carbs: 28, tags: ["vegetarian", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 1.00 },
  { id: "F09", name: "Chickpeas (50g)", price: 12, protein: 10, calories: 160, fat: 2, carbs: 27, tags: ["vegetarian", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.83 },
  { id: "F10", name: "Peanuts (50g)", price: 10, protein: 13, calories: 280, fat: 22, carbs: 8, tags: ["vegetarian", "budget"], mealType: ["snack"], proteinPerRupee: 1.30 },
  { id: "F11", name: "Milk (250ml)", price: 15, protein: 8, calories: 150, fat: 8, carbs: 12, tags: ["vegetarian"], mealType: ["breakfast", "snack"], proteinPerRupee: 0.53 },
  { id: "F12", name: "Curd (100g)", price: 10, protein: 3, calories: 60, fat: 3, carbs: 4, tags: ["vegetarian"], mealType: ["snack", "lunch"], proteinPerRupee: 0.30 },
  { id: "F13", name: "Whey Protein (30g)", price: 90, protein: 24, calories: 120, fat: 1, carbs: 3, tags: ["supplement"], mealType: ["snack"], proteinPerRupee: 0.27 },
  { id: "F14", name: "Poha (1 plate)", price: 20, protein: 6, calories: 250, fat: 5, carbs: 45, tags: ["vegetarian", "budget"], mealType: ["breakfast"], proteinPerRupee: 0.30 },
  { id: "F15", name: "Idli (2) + Sambar", price: 30, protein: 8, calories: 300, fat: 4, carbs: 55, tags: ["vegetarian"], mealType: ["breakfast"], proteinPerRupee: 0.27 },
  { id: "F16", name: "Dosa (plain)", price: 30, protein: 6, calories: 250, fat: 6, carbs: 45, tags: ["vegetarian"], mealType: ["breakfast"], proteinPerRupee: 0.20 },
  { id: "F17", name: "Upma (1 plate)", price: 20, protein: 5, calories: 220, fat: 4, carbs: 40, tags: ["vegetarian", "budget"], mealType: ["breakfast"], proteinPerRupee: 0.25 },
  { id: "F18", name: "Aloo Paratha (1)", price: 30, protein: 5, calories: 250, fat: 10, carbs: 35, tags: ["vegetarian"], mealType: ["breakfast", "lunch"], proteinPerRupee: 0.17 },
  { id: "F19", name: "Chole Bhature", price: 80, protein: 15, calories: 800, fat: 35, carbs: 100, tags: ["vegetarian"], mealType: ["lunch"], proteinPerRupee: 0.19 },
  { id: "F20", name: "Pav Bhaji", price: 70, protein: 12, calories: 550, fat: 20, carbs: 80, tags: ["vegetarian"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.17 },
  { id: "F21", name: "Dal Makhani", price: 50, protein: 10, calories: 400, fat: 18, carbs: 45, tags: ["vegetarian"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.20 },
  { id: "F22", name: "Palak Paneer", price: 80, protein: 14, calories: 450, fat: 25, carbs: 20, tags: ["vegetarian"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.18 },
  { id: "F23", name: "Egg Bhurji (2 eggs)", price: 20, protein: 12, calories: 150, fat: 10, carbs: 2, tags: ["non_veg", "budget", "high_protein"], mealType: ["breakfast", "snack"], proteinPerRupee: 0.60 },
  { id: "F24", name: "Chicken Curry (100g)", price: 50, protein: 18, calories: 200, fat: 12, carbs: 5, tags: ["non_veg"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.36 },
  { id: "F25", name: "Fish Curry (100g)", price: 70, protein: 20, calories: 180, fat: 8, carbs: 5, tags: ["non_veg"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.29 },
  { id: "F26", name: "Mutton Curry (100g)", price: 120, protein: 22, calories: 250, fat: 18, carbs: 3, tags: ["non_veg"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.18 },
  { id: "F27", name: "Banana", price: 10, protein: 1, calories: 100, fat: 0.3, carbs: 25, tags: ["vegetarian", "budget"], mealType: ["snack"], proteinPerRupee: 0.10 },
  { id: "F28", name: "Apple", price: 30, protein: 0.5, calories: 95, fat: 0.3, carbs: 25, tags: ["vegetarian"], mealType: ["snack"], proteinPerRupee: 0.02 },
  { id: "F29", name: "Orange", price: 20, protein: 1, calories: 60, fat: 0.2, carbs: 15, tags: ["vegetarian"], mealType: ["snack"], proteinPerRupee: 0.05 },
  { id: "F30", name: "Roasted Chana (50g)", price: 15, protein: 8, calories: 120, fat: 1, carbs: 18, tags: ["vegetarian", "budget", "high_protein"], mealType: ["snack"], proteinPerRupee: 0.53 },
  { id: "F31", name: "Sattu (50g)", price: 10, protein: 10, calories: 180, fat: 2, carbs: 30, tags: ["vegetarian", "budget", "high_protein"], mealType: ["breakfast", "snack"], proteinPerRupee: 1.00 },
  { id: "F32", name: "Oats (50g)", price: 15, protein: 7, calories: 190, fat: 3, carbs: 32, tags: ["vegetarian", "budget"], mealType: ["breakfast"], proteinPerRupee: 0.47 },
  { id: "F33", name: "Quinoa (50g)", price: 40, protein: 8, calories: 180, fat: 3, carbs: 30, tags: ["vegetarian"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.20 },
  { id: "F34", name: "Brown Rice (50g)", price: 10, protein: 4, calories: 180, fat: 1.5, carbs: 38, tags: ["vegetarian", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.40 },
  { id: "F35", name: "White Rice (50g)", price: 5, protein: 3, calories: 180, fat: 0.5, carbs: 40, tags: ["vegetarian", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.60 },
  { id: "F36", name: "Wheat Roti (1)", price: 5, protein: 2, calories: 70, fat: 1, carbs: 15, tags: ["vegetarian", "budget"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.40 },
  { id: "F37", name: "French Fries", price: 50, protein: 2, calories: 300, fat: 15, carbs: 40, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.04 },
  { id: "F38", name: "Pizza (1 slice)", price: 100, protein: 10, calories: 250, fat: 12, carbs: 30, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.10 },
  { id: "F39", name: "Burger (veg)", price: 80, protein: 8, calories: 350, fat: 18, carbs: 40, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.10 },
  { id: "F40", name: "Samosa (1)", price: 15, protein: 2, calories: 150, fat: 8, carbs: 18, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.13 },
  { id: "F41", name: "Veg Biryani", price: 100, protein: 12, calories: 600, fat: 20, carbs: 80, tags: ["vegetarian"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.12 },
  { id: "F42", name: "Chicken Biryani", price: 150, protein: 25, calories: 700, fat: 25, carbs: 85, tags: ["non_veg"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.17 },
  { id: "F43", name: "Butter Chicken", price: 200, protein: 25, calories: 600, fat: 40, carbs: 30, tags: ["non_veg"], mealType: ["lunch", "dinner"], proteinPerRupee: 0.13 },
  { id: "F44", name: "Noodles (veg)", price: 60, protein: 6, calories: 400, fat: 15, carbs: 60, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.10 },
  { id: "F45", name: "Maggi (1 pack)", price: 15, protein: 3, calories: 300, fat: 12, carbs: 40, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.20 },
  { id: "F46", name: "Vada Pav (1)", price: 15, protein: 3, calories: 180, fat: 8, carbs: 22, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.20 },
  { id: "F47", name: "Pani Puri (1 plate)", price: 20, protein: 2, calories: 150, fat: 5, carbs: 25, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.10 },
  { id: "F48", name: "Dabeli (1)", price: 20, protein: 2, calories: 180, fat: 6, carbs: 28, tags: ["junk"], mealType: ["snack"], proteinPerRupee: 0.10 },
  { id: "F49", name: "Misal Pav", price: 50, protein: 8, calories: 400, fat: 15, carbs: 55, tags: ["vegetarian"], mealType: ["breakfast"], proteinPerRupee: 0.16 },
  { id: "F50", name: "Besan Chilla (2)", price: 20, protein: 10, calories: 200, fat: 4, carbs: 18, tags: ["vegetarian", "budget", "high_protein"], mealType: ["breakfast", "snack"], proteinPerRupee: 0.50 },
];

// ─── Dynamic Thresholds ───

export function getDynamicThreshold(dailyBudget: number, isVeg: boolean = false): { green: number; yellow: number } {
  let green: number, yellow: number;

  if (dailyBudget < 100) {
    green = 1.2; yellow = 0.6;
  } else if (dailyBudget <= 200) {
    green = 0.8; yellow = 0.4;
  } else {
    green = 0.5; yellow = 0.3;
  }

  if (isVeg) {
    green *= 0.75;
    yellow *= 0.75;
  }

  return { green, yellow };
}

// ─── Get PES Color ───

export function getPESColor(pes: number, dailyBudget: number = 166, isVeg: boolean = false): PESColor {
  const t = getDynamicThreshold(dailyBudget, isVeg);
  if (pes >= t.green) return 'green';
  if (pes >= t.yellow) return 'yellow';
  return 'red';
}

// ─── Evaluate a Single Food ───

export function evaluateFood(
  food: { name: string; protein: number; price: number; mealType?: string[] },
  dailyBudget: number,
  isVeg: boolean = false,
): PESResult {
  const price = food.price || 1;
  const pes = food.protein / price;
  const color = getPESColor(pes, dailyBudget, isVeg);
  const insight = generateInsight(pes, color, food);
  const alternatives = findBetterAlternatives(food, isVeg ? 'veg' : 'all', 3);

  return { pes: Math.round(pes * 100) / 100, color, insight, alternatives };
}

function generateInsight(pes: number, color: PESColor, food: { name: string; protein: number; price: number }): string {
  if (color === 'green') {
    return `Great value! ${food.protein}g protein for ₹${food.price} — efficient choice.`;
  }
  if (color === 'yellow') {
    return `Average value. Consider swapping to a more efficient protein source.`;
  }
  return `₹${food.price} for only ${food.protein}g protein — look for cheaper alternatives.`;
}

// ─── Find Better Alternatives ───

export function findBetterAlternatives(
  food: { name: string; protein: number; price: number; mealType?: string[] },
  dietType: string = 'all',
  limit: number = 3,
): PESAlternative[] {
  const currentPES = food.price > 0 ? food.protein / food.price : 0;

  let candidates = foodDatabase.filter(f => {
    if (f.proteinPerRupee <= currentPES) return false;
    if (dietType === 'veg' && !f.tags.includes('vegetarian') && !f.tags.includes('vegan')) return false;
    // Match meal type if available
    if (food.mealType && food.mealType.length > 0) {
      if (!f.mealType.some(mt => food.mealType!.includes(mt))) return false;
    }
    return true;
  });

  candidates.sort((a, b) => b.proteinPerRupee - a.proteinPerRupee);

  return candidates.slice(0, limit).map(f => ({
    name: f.name,
    price: f.price,
    protein: f.protein,
    pes: Math.round(f.proteinPerRupee * 100) / 100,
    color: getPESColor(f.proteinPerRupee),
  }));
}

// ─── Compare Two Foods ───

export function compareFoods(
  foodA: { name: string; protein: number; price: number },
  foodB: { name: string; protein: number; price: number },
  dailyBudget: number = 166,
): PESComparison {
  const pesA = foodA.price > 0 ? foodA.protein / foodA.price : 0;
  const pesB = foodB.price > 0 ? foodB.protein / foodB.price : 0;
  const winner = pesA > pesB ? foodA : foodB;
  const ratio = Math.min(pesA, pesB) > 0
    ? (Math.max(pesA, pesB) / Math.min(pesA, pesB)).toFixed(1)
    : '∞';

  return {
    winner: winner.name,
    difference: `${ratio}x better value`,
    details: [
      { name: foodA.name, pes: Math.round(pesA * 100) / 100, color: getPESColor(pesA, dailyBudget) },
      { name: foodB.name, pes: Math.round(pesB * 100) / 100, color: getPESColor(pesB, dailyBudget) },
    ],
  };
}

// ─── Best Foods Under a Price ───

export function bestUnderPrice(maxPrice: number, dietType: string = 'all'): PESAlternative[] {
  let candidates = foodDatabase.filter(f => f.price <= maxPrice);
  if (dietType === 'veg') candidates = candidates.filter(f => f.tags.includes('vegetarian') || f.tags.includes('vegan'));

  candidates.sort((a, b) => b.proteinPerRupee - a.proteinPerRupee);

  return candidates.slice(0, 10).map(f => ({
    name: f.name,
    price: f.price,
    protein: f.protein,
    pes: Math.round(f.proteinPerRupee * 100) / 100,
    color: getPESColor(f.proteinPerRupee),
  }));
}

// ─── Find Food in Database by Name (fuzzy) ───

export function findFoodByName(name: string): PESFood | null {
  const lower = name.toLowerCase().trim();
  // Exact match first
  const exact = foodDatabase.find(f => f.name.toLowerCase() === lower);
  if (exact) return exact;
  // Partial match
  const partial = foodDatabase.find(f =>
    f.name.toLowerCase().includes(lower) || lower.includes(f.name.toLowerCase())
  );
  return partial || null;
}

// ─── Daily Efficiency from Logged Meals ───

export function dailyEfficiency(date?: string): DailyEfficiencyResult {
  const log = getDailyLog(date);
  const meals = log.meals || [];

  let totalProtein = 0;
  let totalCost = 0;

  for (const meal of meals) {
    totalProtein += meal.totalProtein || meal.items.reduce((s, i) => s + (i.protein || 0), 0);
    const mealCost = (meal.cost?.amount || 0) + meal.items.reduce((s, i) => s + (i.itemCost || 0), 0);
    totalCost += mealCost;
  }

  if (totalCost <= 0) {
    return { totalProtein, totalCost, pes: 0, color: 'yellow', suggestion: null };
  }

  const pes = totalProtein / totalCost;
  const budget = getBudgetSettings();
  const dailyBudget = Math.round((budget.weeklyBudget || 0) / 7);
  const color = getPESColor(pes, dailyBudget);

  let suggestion: string | null = null;
  if (color === 'red' || color === 'yellow') {
    const top = foodDatabase
      .filter(f => f.proteinPerRupee >= 0.8)
      .sort((a, b) => b.proteinPerRupee - a.proteinPerRupee)
      .slice(0, 2);
    if (top.length > 0) {
      suggestion = `Try ${top.map(f => f.name).join(' or ')} for better value`;
    }
  }

  return {
    totalProtein: Math.round(totalProtein),
    totalCost: Math.round(totalCost),
    pes: Math.round(pes * 100) / 100,
    color,
    suggestion,
  };
}

// ─── PES for a Recipe (by cost and protein) ───

export function getPESForMeal(cost: number, protein: number, dailyBudget: number = 166, isVeg: boolean = false): { pes: number; color: PESColor } {
  if (cost <= 0) return { pes: 0, color: 'yellow' };
  const pes = protein / cost;
  return { pes: Math.round(pes * 100) / 100, color: getPESColor(pes, dailyBudget, isVeg) };
}

// ─── Unified PES Engine (Single Source of Truth) ───

export const QUALITY_MAP: Record<string, number> = {
  egg: 1.0,
  chicken: 1.0,
  dairy: 0.95,
  soy: 0.9,
  dal: 0.75,
  pulses: 0.75,
  cereal: 0.6,
  junk: 0.4,
};

/**
 * Infer a protein quality category from recipe tags and name.
 */
export function inferCategory(recipe: { tags?: string[]; name?: string }): string {
  const tags = recipe.tags || [];
  const name = (recipe.name || '').toLowerCase();

  if (tags.includes('junk') || name.includes('samosa') || name.includes('pizza') || name.includes('burger')) return 'junk';
  if (name.includes('egg') || name.includes('anda') || name.includes('bhurji')) return 'egg';
  if (name.includes('chicken') || name.includes('murgh')) return 'chicken';
  if (name.includes('fish') || name.includes('mutton') || name.includes('keema')) return 'chicken';
  if (name.includes('soya') || name.includes('soy')) return 'soy';
  if (name.includes('dal') || name.includes('lentil') || name.includes('masoor') || name.includes('moong') || name.includes('chana') || name.includes('rajma')) return 'dal';
  if (name.includes('paneer') || name.includes('milk') || name.includes('curd') || name.includes('whey') || name.includes('dairy')) return 'dairy';
  if (name.includes('chickpea') || name.includes('sprout')) return 'pulses';
  if (tags.includes('non_veg')) return 'chicken';
  return 'cereal';
}

/**
 * Unified PES scoring function used across all food ranking modules.
 * Returns a score between 0 and 1.
 */
export function computePES(
  recipe: {
    protein: number;
    cost?: number;
    estimatedCost?: number;
    price?: number;
    calories: number;
    satietyScore?: number;
    tags?: string[];
    name?: string;
  },
  context: {
    targetCalories?: number;
    originalProtein?: number;
    budgetPerMeal?: number;
  } = {}
): number {
  const { targetCalories, originalProtein, budgetPerMeal } = context;
  const cost = recipe.cost ?? recipe.estimatedCost ?? recipe.price ?? 1;

  const category = inferCategory(recipe);
  const qualityFactor = QUALITY_MAP[category] ?? 0.7;
  const adjustedProtein = recipe.protein * qualityFactor;
  const proteinPerRupee = cost > 0 ? adjustedProtein / cost : 0;

  // Calorie fit (clamped 0–1)
  let calorieFit = 0.5;
  if (targetCalories && targetCalories > 0) {
    calorieFit = 1 - Math.abs(recipe.calories - targetCalories) / targetCalories;
    calorieFit = Math.max(0, Math.min(1, calorieFit));
  }

  const satiety = recipe.satietyScore ?? 3;

  // Weighted score
  let score =
    0.5 * Math.min(1, proteinPerRupee * 3) +
    0.3 * calorieFit +
    0.2 * Math.min(1, satiety / 5);

  // Penalties
  if (originalProtein && recipe.protein < originalProtein * 0.85) score -= 0.3;
  if (targetCalories && recipe.calories > targetCalories * 1.2) score -= 0.2;
  if (budgetPerMeal && cost > budgetPerMeal) score -= 0.2;

  return Math.max(0, Math.min(1, score));
}

/**
 * Get the target calories for a specific meal slot based on profile.
 */
export function getMealTargetCalories(mealType: string, profile: any): number {
  const dailyTarget = profile?.dailyCalories ?? profile?.goals?.targetCalories ?? 2000;
  const splits: Record<string, number> = { breakfast: 0.25, lunch: 0.35, snacks: 0.15, dinner: 0.25 };
  const key = mealType === 'snack' ? 'snacks' : mealType;
  return Math.round(dailyTarget * (splits[key] ?? 0.25));
}
