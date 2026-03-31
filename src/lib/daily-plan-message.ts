// ─── Daily Plan Message Generator ───
// Composes data from existing engines into a single daily overview

import { getProfile, type UserProfile } from './store';
import { getAdjustedDailyTarget, getProteinTarget } from './calorie-correction';
import { getMealTarget } from './meal-targets';
import { getRecipesForMeal } from './meal-suggestion-engine';
import { getUnifiedBudget, getUnifiedRemainingMealBudget } from './budget-engine';

export interface DailyMealPlan {
  type: string;
  label: string;
  targetCal: number;
  targetProtein: number;
  budget: number;
  suggestion?: string;
}

export interface DailyPlanData {
  adjustedCalories: number;
  proteinTarget: number;
  remainingBudget: number;
  currency: string;
  meals: DailyMealPlan[];
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snacks',
  dinner: 'Dinner',
};

export function getDailyPlanData(profile: UserProfile | null): DailyPlanData | null {
  const p = profile || getProfile();
  if (!p) return null;

  const adjustedCalories = getAdjustedDailyTarget(p);
  const proteinTarget = getProteinTarget(p);
  const budgetSummary = getBudgetSummary();

  const slots = ['breakfast', 'lunch', 'snack', 'dinner'];

  const meals: DailyMealPlan[] = slots.map(slot => {
    const target = getMealTarget(p, slot);
    const mealBudget = getUnifiedRemainingMealBudget(slot);

    // Get top suggestion
    let suggestion: string | undefined;
    try {
      const recipes = getRecipesForMeal(slot, mealBudget, p, target.calories, target.protein);
      if (recipes.length > 0) {
        suggestion = recipes[0].name;
      }
    } catch {
      // suggestion engine may fail gracefully
    }

    return {
      type: slot,
      label: MEAL_LABELS[slot] || slot,
      targetCal: target.calories,
      targetProtein: target.protein,
      budget: mealBudget,
      suggestion,
    };
  });

  return {
    adjustedCalories,
    proteinTarget,
    remainingBudget: budgetSummary.remaining,
    currency: budgetSummary.currency,
    meals,
  };
}
