// ============================================
// NutriLens AI – Meal Target & Missed Meal Logic
// ============================================

import { UserProfile, DailyLog, MealEntry } from '@/lib/store';

export interface MealSplitConfig {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
}

const DEFAULT_SPLITS: MealSplitConfig = {
  breakfast: 25,
  lunch: 35,
  dinner: 30,
  snacks: 10,
};

export interface MealTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function getMealSplits(profile: UserProfile): MealSplitConfig {
  // Could be extended to read from profile if saved
  return DEFAULT_SPLITS;
}

export function getMealTarget(profile: UserProfile, mealType: string): MealTarget {
  const splits = getMealSplits(profile);
  const key = mealType === 'snack' ? 'snacks' : mealType;
  const pct = (splits as any)[key] || 10;
  return {
    calories: Math.round(profile.dailyCalories * pct / 100),
    protein: Math.round(profile.dailyProtein * pct / 100),
    carbs: Math.round(profile.dailyCarbs * pct / 100),
    fat: Math.round(profile.dailyFat * pct / 100),
  };
}

export function getMealLogged(log: DailyLog, mealType: string): MealTarget {
  const meals = log.meals.filter(m => m.type === mealType);
  return {
    calories: meals.reduce((s, m) => s + m.totalCalories, 0),
    protein: meals.reduce((s, m) => s + m.totalProtein, 0),
    carbs: meals.reduce((s, m) => s + m.totalCarbs, 0),
    fat: meals.reduce((s, m) => s + m.totalFat, 0),
  };
}

export function getMealProgressColor(pct: number): 'green' | 'yellow' | 'red' | 'gray' {
  if (pct <= 0) return 'gray';
  if (pct >= 90) return 'green';
  if (pct >= 50) return 'yellow';
  return 'red';
}

// ── Missed Meal Detection ──

export interface MissedMealThreshold {
  type: string;
  label: string;
  thresholdHour: number; // hour after which meal is considered missed
}

const MISSED_MEAL_THRESHOLDS: MissedMealThreshold[] = [
  { type: 'breakfast', label: 'Breakfast', thresholdHour: 10 },
  { type: 'lunch', label: 'Lunch', thresholdHour: 15 },
  { type: 'snack', label: 'Snacks', thresholdHour: 17 },
  { type: 'dinner', label: 'Dinner', thresholdHour: 21 },
];

export function getMissedMeals(log: DailyLog): string[] {
  const now = new Date();
  const currentHour = now.getHours();
  const missed: string[] = [];

  for (const threshold of MISSED_MEAL_THRESHOLDS) {
    if (currentHour >= threshold.thresholdHour) {
      const meals = log.meals.filter(m => m.type === threshold.type);
      if (meals.length === 0) {
        missed.push(threshold.type);
      }
    }
  }
  return missed;
}

export function getNextMealType(missedType: string): string | null {
  const order = ['breakfast', 'lunch', 'snack', 'dinner'];
  const idx = order.indexOf(missedType);
  if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
  return null;
}

// ── Daily Adjustments (redistribution) ──

const ADJUSTMENTS_KEY_PREFIX = 'nutrilens_adjustments_';

export interface DailyAdjustments {
  [mealType: string]: MealTarget;
}

export function getDailyAdjustments(date: string): DailyAdjustments {
  const data = localStorage.getItem(ADJUSTMENTS_KEY_PREFIX + date);
  return data ? JSON.parse(data) : {};
}

export function saveDailyAdjustments(date: string, adjustments: DailyAdjustments) {
  localStorage.setItem(ADJUSTMENTS_KEY_PREFIX + date, JSON.stringify(adjustments));
}

export function getAdjustedMealTarget(profile: UserProfile, mealType: string, date: string): MealTarget {
  const base = getMealTarget(profile, mealType);
  const adjustments = getDailyAdjustments(date);
  const adj = adjustments[mealType];
  if (!adj) return base;
  return {
    calories: base.calories + adj.calories,
    protein: base.protein + adj.protein,
    carbs: base.carbs + adj.carbs,
    fat: base.fat + adj.fat,
  };
}

export function redistributeMissedMeal(
  profile: UserProfile,
  missedType: string,
  targetType: string,
  date: string
) {
  const missedTarget = getMealTarget(profile, missedType);
  const adjustments = getDailyAdjustments(date);
  const existing = adjustments[targetType] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  adjustments[targetType] = {
    calories: existing.calories + missedTarget.calories,
    protein: existing.protein + missedTarget.protein,
    carbs: existing.carbs + missedTarget.carbs,
    fat: existing.fat + missedTarget.fat,
  };
  saveDailyAdjustments(date, adjustments);
}

// ── AI Suggestions for gap filling ──

export interface FoodSuggestion {
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  portion: string;
}

export function getGapSuggestions(gap: MealTarget): FoodSuggestion[] {
  const suggestions: FoodSuggestion[] = [];
  const allSuggestions: FoodSuggestion[] = [
    // High protein
    { name: 'Boiled Eggs (2)', emoji: '🥚', calories: 140, protein: 12, portion: '2 eggs' },
    { name: 'Paneer Tikka', emoji: '🧀', calories: 200, protein: 18, portion: '100g' },
    { name: 'Chicken Breast', emoji: '🍗', calories: 165, protein: 31, portion: '100g' },
    { name: 'Greek Yogurt', emoji: '🥛', calories: 100, protein: 17, portion: '1 cup' },
    { name: 'Moong Dal', emoji: '🫘', calories: 105, protein: 7, portion: '1 bowl' },
    { name: 'Soya Chunks', emoji: '🫘', calories: 170, protein: 26, portion: '50g' },
    // Balanced
    { name: 'Banana', emoji: '🍌', calories: 105, protein: 1, portion: '1 medium' },
    { name: 'Mixed Nuts', emoji: '🥜', calories: 170, protein: 5, portion: '30g' },
    { name: 'Curd Rice', emoji: '🍚', calories: 150, protein: 4, portion: '1 bowl' },
    { name: 'Peanut Butter Toast', emoji: '🍞', calories: 190, protein: 7, portion: '1 slice' },
    { name: 'Sprouts Salad', emoji: '🥗', calories: 120, protein: 8, portion: '1 bowl' },
    { name: 'Khichdi', emoji: '🍲', calories: 180, protein: 6, portion: '1 bowl' },
  ];

  // Prioritize by gap type
  const needProtein = gap.protein > 10;
  const needCalories = gap.calories > 100;

  if (needProtein) {
    const proteinFoods = allSuggestions.filter(f => f.protein >= 10);
    suggestions.push(...proteinFoods.slice(0, 2));
  }
  if (needCalories) {
    const calorieFoods = allSuggestions.filter(f => f.calories >= 100 && !suggestions.find(s => s.name === f.name));
    suggestions.push(...calorieFoods.slice(0, 2));
  }

  // Fill to 3
  for (const s of allSuggestions) {
    if (suggestions.length >= 3) break;
    if (!suggestions.find(x => x.name === s.name)) suggestions.push(s);
  }

  return suggestions.slice(0, 3);
}
