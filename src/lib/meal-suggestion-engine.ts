// ─── Budget + Health-Aware Meal Suggestion Engine ───

import { recipes, getEnrichedRecipe, type Recipe, type EnrichedRecipe } from './recipes';
import { getEffectiveRestrictions } from './logic-engine';
import { getDailyLog, getTodayKey, type UserProfile } from './store';
import { computePES } from './pes-engine';
import { getUnifiedBudget, getUnifiedRemainingMealBudget } from './budget-engine';

export interface SuggestedRecipe extends EnrichedRecipe {
  matchReason?: string;
  rankScore: number;
}

/**
 * Get the remaining budget for a specific meal slot today.
 */
export function getRemainingMealBudget(mealType: string): number {
  return getUnifiedRemainingMealBudget(mealType);
}

/**
 * Get recipe suggestions for a meal slot, ranked by satiety + budget + health.
 */
export function getRecipesForMeal(
  mealType: string,
  maxCost: number,
  profile: UserProfile | null,
  remainingCalories?: number,
  remainingProtein?: number,
): SuggestedRecipe[] {
  const restrictions = getEffectiveRestrictions(profile);
  const dietPrefs = profile?.dietaryPrefs || [];

  const enriched = recipes
    .filter(r => r.mealType.includes(mealType as any))
    .map(r => getEnrichedRecipe(r));

  let filtered = enriched.filter(r => {
    if (maxCost > 0 && r.estimatedCost > maxCost) return false;

    const allText = [r.name.toLowerCase(), ...r.tags.map(t => t.toLowerCase()), ...r.ingredients.map(i => i.name.toLowerCase())].join(' ');
    if (restrictions.avoid.some(kw => allText.includes(kw.toLowerCase()))) return false;

    if (dietPrefs.includes('vegetarian') || dietPrefs.includes('veg')) {
      if (!r.tags.some(t => ['vegetarian', 'veg'].includes(t.toLowerCase()))) return false;
    }
    if (dietPrefs.includes('vegan')) {
      if (!r.tags.some(t => t.toLowerCase() === 'vegan')) return false;
    }
    if (dietPrefs.includes('keto')) {
      if (r.carbs > 20) return false;
    }

    if (profile?.cookingHabits === 'none' || profile?.cookingHabits === 'minimal') {
      if (r.difficulty === 'advanced') return false;
    }

    return true;
  });

  // Compute rank score using unified PES engine
  const scored: SuggestedRecipe[] = filtered.map(r => {
    const allText = [r.name.toLowerCase(), ...r.tags, ...r.ingredients.map(i => i.name.toLowerCase())].join(' ');
    const prefMatches = restrictions.prefer.filter(kw => allText.includes(kw.toLowerCase()));

    const baseScore = computePES(r, {
      targetCalories: remainingCalories,
      budgetPerMeal: maxCost > 0 ? maxCost : undefined,
    });
    const rankScore = baseScore + (prefMatches.length * 0.05);

    return {
      ...r,
      nutritionScore: Math.min(10, r.nutritionScore + prefMatches.length),
      matchReason: prefMatches.length > 0 ? `Has ${prefMatches.slice(0, 2).join(', ')}` : undefined,
      rankScore,
    };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore);
  return scored.slice(0, 5);
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
