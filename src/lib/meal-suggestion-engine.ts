// ─── Budget + Health-Aware Meal Suggestion Engine ───

import { recipes, getEnrichedRecipe, type Recipe } from './recipes';
import { getEffectiveRestrictions } from './logic-engine';
import { getEnhancedBudgetSettings, type PerMealBudget } from './budget-alerts';
import { getBudgetSettings, getExpensesForDate } from './expense-store';
import { getDailyLog, getTodayKey, type UserProfile } from './store';

export interface SuggestedRecipe extends Recipe {
  estimatedCost: number;
  nutritionScore: number;
  matchReason?: string;
}

/**
 * Get the remaining budget for a specific meal slot today.
 */
export function getRemainingMealBudget(mealType: string): number {
  const enhanced = getEnhancedBudgetSettings();
  const budgetSettings = getBudgetSettings();

  // Per-meal budget from enhanced settings
  const perMeal: PerMealBudget = enhanced.perMeal || {
    breakfast: 100, lunch: 150, dinner: 200, snacks: 50,
  };
  const slotKey = mealType === 'snack' ? 'snacks' : mealType;
  const mealBudget = (perMeal as any)[slotKey] || 0;
  if (mealBudget <= 0) {
    // Fallback: derive from daily budget
    const daily = budgetSettings.period === 'week'
      ? Math.round(budgetSettings.weeklyBudget / 7)
      : Math.round(budgetSettings.monthlyBudget / 30);
    const splits: Record<string, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.25, snacks: 0.15 };
    return Math.round(daily * (splits[slotKey] || 0.25));
  }

  // Subtract what's already spent on that meal today
  const today = getTodayKey();
  const log = getDailyLog(today);
  const spentOnSlot = log.meals
    .filter(m => m.type === mealType)
    .reduce((s, m) => s + (m.cost?.amount || 0), 0);

  return Math.max(0, mealBudget - spentOnSlot);
}

/**
 * Get recipe suggestions for a meal slot, filtered by budget + health + diet.
 */
export function getRecipesForMeal(
  mealType: string,
  maxCost: number,
  profile: UserProfile | null,
): SuggestedRecipe[] {
  const restrictions = getEffectiveRestrictions(profile);
  const dietPrefs = profile?.dietaryPrefs || [];

  const enriched = recipes
    .filter(r => r.mealType.includes(mealType as any))
    .map(r => getEnrichedRecipe(r));

  let filtered = enriched.filter(r => {
    // Budget filter
    if (maxCost > 0 && r.estimatedCost > maxCost) return false;

    // Health condition avoid filter (check recipe name + tags against avoid keywords)
    const nameLower = r.name.toLowerCase();
    const allText = [nameLower, ...r.tags.map(t => t.toLowerCase()), ...r.ingredients.map(i => i.name.toLowerCase())].join(' ');
    if (restrictions.avoid.some(kw => allText.includes(kw.toLowerCase()))) return false;

    // Diet filter
    if (dietPrefs.includes('vegetarian') || dietPrefs.includes('veg')) {
      if (!r.tags.some(t => ['vegetarian', 'veg'].includes(t.toLowerCase()))) return false;
    }
    if (dietPrefs.includes('vegan')) {
      if (!r.tags.some(t => t.toLowerCase() === 'vegan')) return false;
    }
    if (dietPrefs.includes('keto')) {
      if (r.carbs > 20) return false;
    }

    // Cooking difficulty filter
    if (profile?.cookingHabits === 'none' || profile?.cookingHabits === 'minimal') {
      if (r.difficulty === 'advanced') return false;
    }

    return true;
  });

  // Boost recipes that match preferred keywords
  filtered = filtered.map(r => {
    const allText = [r.name.toLowerCase(), ...r.tags, ...r.ingredients.map(i => i.name.toLowerCase())].join(' ');
    const prefMatches = restrictions.prefer.filter(kw => allText.includes(kw.toLowerCase()));
    const boostedScore = r.nutritionScore + prefMatches.length;
    return { ...r, nutritionScore: Math.min(10, boostedScore), matchReason: prefMatches.length > 0 ? `Has ${prefMatches.slice(0, 2).join(', ')}` : undefined };
  });

  // Sort by nutrition score desc
  filtered.sort((a, b) => b.nutritionScore - a.nutritionScore);

  return filtered.slice(0, 5) as SuggestedRecipe[];
}

/**
 * Get the current meal slot based on time of day.
 */
export function getCurrentMealSlot(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}

/**
 * Get upcoming meal slots that haven't been logged yet.
 */
export function getUpcomingMealSlots(): string[] {
  const current = getCurrentMealSlot();
  const order = ['breakfast', 'lunch', 'snack', 'dinner'];
  const idx = order.indexOf(current);
  const upcoming = order.slice(idx);

  const today = getTodayKey();
  const log = getDailyLog(today);

  return upcoming.filter(slot => {
    const logged = log.meals.filter(m => m.type === slot);
    return logged.length === 0;
  });
}
