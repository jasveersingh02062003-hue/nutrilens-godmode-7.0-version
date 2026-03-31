// ─── Shared meal scaling helpers ───
// Computes scaled calories, macros, and cost for a planned meal

import { getRecipeById, Recipe } from './recipes';
import { getRecipeCost } from './recipe-cost';
import type { PlannedMeal } from './meal-planner-store';

export interface ScaledMealInfo {
  recipe: Recipe;
  scale: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number;
}

/**
 * Returns scaled nutrition and cost for a planned meal.
 * Uses portionScale if set, otherwise raw recipe values.
 */
export function getScaledMealInfo(meal: PlannedMeal): ScaledMealInfo | null {
  const recipe = getRecipeById(meal.recipeId);
  if (!recipe) return null;

  const scale = meal.portionScale ?? 1;
  const baseCost = getRecipeCost(recipe);

  return {
    recipe,
    scale,
    calories: Math.round(recipe.calories * scale),
    protein: Math.round(recipe.protein * scale),
    carbs: Math.round(recipe.carbs * scale),
    fat: Math.round(recipe.fat * scale),
    cost: Math.round(baseCost * scale),
  };
}

/**
 * Compute the portionScale needed to hit a target calorie amount.
 * Clamped between 0.5 and 2.5 for realism.
 */
export function computePortionScale(recipeCalories: number, targetCalories: number): number {
  if (!recipeCalories || recipeCalories <= 0) return 1;
  const raw = targetCalories / recipeCalories;
  return Math.round(Math.min(2.5, Math.max(0.5, raw)) * 100) / 100;
}
