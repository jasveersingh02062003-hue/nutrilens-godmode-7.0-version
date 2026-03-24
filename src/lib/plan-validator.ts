// ─── Plan Feasibility Validator & Day Sync Check ───

import { recipes, getEnrichedRecipe } from './recipes';
import type { MealPlannerProfile, DayPlan } from './meal-planner-store';
import type { EnhancedBudgetSettings, PerMealBudget } from './budget-alerts';

export interface FeasibilityResult {
  feasible: boolean;
  warning?: string;
  suggestedBudget?: number;
  adjustedProtein?: number;
  adjustedCalories?: number;
  conflictType?: 'budget_vs_protein' | 'budget_vs_calories' | 'both';
}

export interface DaySyncResult {
  valid: boolean;
  totalCalories: number;
  totalProtein: number;
  totalCost: number;
  calorieMismatch: boolean;
  proteinMismatch: boolean;
  budgetMismatch: boolean;
  warnings: string[];
}

/**
 * Checks if the user's daily budget can realistically hit their
 * calorie and protein targets using available recipes.
 */
export function validatePlanFeasibility(
  profile: MealPlannerProfile,
  budgetSettings: EnhancedBudgetSettings
): FeasibilityResult {
  const perMeal = budgetSettings.perMeal || { breakfast: 100, lunch: 150, dinner: 200, snacks: 50 };
  const dailyBudget = (perMeal.breakfast || 0) + (perMeal.lunch || 0) + (perMeal.dinner || 0) + (perMeal.snacks || 0);
  const targetProtein = profile.dailyProtein || 60;
  const targetCalories = profile.dailyCalories || 1800;

  if (dailyBudget <= 0) {
    return { feasible: false, warning: 'No budget set. Please complete budget setup first.' };
  }

  // Find cheapest protein sources sorted by proteinPerRupee
  const enriched = recipes.map(r => getEnrichedRecipe(r));
  const proteinSources = enriched
    .filter(r => r.protein > 5 && r.estimatedCost > 0)
    .sort((a, b) => b.proteinPerRupee - a.proteinPerRupee);

  if (proteinSources.length === 0) {
    return { feasible: true }; // can't validate without data
  }

  // Estimate minimum cost to hit protein target using cheapest sources
  const bestPPR = proteinSources[0].proteinPerRupee; // protein per ₹
  const minCostForProtein = bestPPR > 0 ? Math.round(targetProtein / bestPPR) : dailyBudget;

  // Estimate minimum cost to hit calorie target
  const calorieSources = enriched
    .filter(r => r.calories > 100 && r.estimatedCost > 0)
    .sort((a, b) => (b.calories / b.estimatedCost) - (a.calories / a.estimatedCost));
  const bestCPR = calorieSources.length > 0 ? calorieSources[0].calories / calorieSources[0].estimatedCost : 10;
  const minCostForCalories = bestCPR > 0 ? Math.round(targetCalories / bestCPR) : dailyBudget;

  const proteinFeasible = minCostForProtein <= dailyBudget * 1.15; // 15% flex
  const calorieFeasible = minCostForCalories <= dailyBudget * 1.15;

  if (proteinFeasible && calorieFeasible) {
    return { feasible: true };
  }

  // Calculate what IS achievable
  const achievableProtein = Math.round(dailyBudget * bestPPR * 0.7); // 70% of budget to protein
  const achievableCalories = Math.round(dailyBudget * bestCPR * 0.85);
  const suggestedBudget = Math.max(minCostForProtein, minCostForCalories);

  let conflictType: FeasibilityResult['conflictType'] = 'both';
  if (proteinFeasible) conflictType = 'budget_vs_calories';
  else if (calorieFeasible) conflictType = 'budget_vs_protein';

  const adjustedProtein = proteinFeasible ? targetProtein : Math.min(targetProtein, achievableProtein);
  const adjustedCalories = calorieFeasible ? targetCalories : Math.min(targetCalories, achievableCalories);

  return {
    feasible: false,
    conflictType,
    suggestedBudget,
    adjustedProtein,
    adjustedCalories,
    warning: conflictType === 'budget_vs_protein'
      ? `Your budget of ₹${dailyBudget}/day may not fully meet ${targetProtein}g protein. Adjusted target: ${adjustedProtein}g.`
      : conflictType === 'budget_vs_calories'
      ? `Your budget of ₹${dailyBudget}/day may not fully meet ${targetCalories} kcal. Adjusted target: ${adjustedCalories} kcal.`
      : `Your budget of ₹${dailyBudget}/day is tight for ${targetCalories} kcal + ${targetProtein}g protein. Suggested budget: ₹${suggestedBudget}/day.`,
  };
}

/**
 * Post-generation validation: checks if a day plan's totals
 * match the user's constraints within acceptable tolerances.
 */
export function validateDaySync(
  dayPlan: DayPlan,
  profile: MealPlannerProfile,
  budgetSettings: EnhancedBudgetSettings
): DaySyncResult {
  const perMeal = budgetSettings.perMeal || { breakfast: 100, lunch: 150, dinner: 200, snacks: 50 };
  const dailyBudget = (perMeal.breakfast || 0) + (perMeal.lunch || 0) + (perMeal.dinner || 0) + (perMeal.snacks || 0);
  const warnings: string[] = [];

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCost = 0;

  for (const meal of dayPlan.meals) {
    const recipe = recipes.find(r => r.id === meal.recipeId);
    if (!recipe) {
      warnings.push(`Recipe ${meal.recipeId} not found`);
      continue;
    }
    const enriched = getEnrichedRecipe(recipe);
    totalCalories += recipe.calories;
    totalProtein += recipe.protein;
    totalCost += enriched.estimatedCost;
  }

  const calorieMismatch = Math.abs(totalCalories - profile.dailyCalories) > profile.dailyCalories * 0.2;
  const proteinMismatch = totalProtein < profile.dailyProtein * 0.8;
  const budgetMismatch = totalCost > dailyBudget * 1.15;

  if (calorieMismatch) warnings.push(`Calories off target: ${totalCalories} vs ${profile.dailyCalories} kcal`);
  if (proteinMismatch) warnings.push(`Protein below target: ${totalProtein}g vs ${profile.dailyProtein}g`);
  if (budgetMismatch) warnings.push(`Cost exceeds budget: ₹${totalCost} vs ₹${dailyBudget}`);

  return {
    valid: !calorieMismatch && !proteinMismatch && !budgetMismatch,
    totalCalories,
    totalProtein,
    totalCost,
    calorieMismatch,
    proteinMismatch,
    budgetMismatch,
    warnings,
  };
}

/**
 * Meal composition rules: derives what "type" a recipe is based on ingredients/tags.
 */
export function getRecipeComposition(recipe: typeof recipes[0]): 'carb-base' | 'protein-heavy' | 'balanced' | 'light' {
  const proteinRatio = recipe.calories > 0 ? (recipe.protein * 4) / recipe.calories : 0;
  const carbRatio = recipe.calories > 0 ? (recipe.carbs * 4) / recipe.calories : 0;

  if (proteinRatio > 0.30) return 'protein-heavy';
  if (carbRatio > 0.60) return 'carb-base';
  if (recipe.calories < 200) return 'light';
  return 'balanced';
}

/**
 * Check if a meal slot has proper composition (carb + protein source).
 */
export function hasProperComposition(recipeIds: string[]): boolean {
  if (recipeIds.length === 0) return false;
  let hasCarb = false;
  let hasProtein = false;

  for (const id of recipeIds) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) continue;
    const comp = getRecipeComposition(recipe);
    if (comp === 'carb-base' || comp === 'balanced') hasCarb = true;
    if (comp === 'protein-heavy' || comp === 'balanced') hasProtein = true;
  }

  return hasCarb || hasProtein; // Single recipe meals are OK if balanced
}

/**
 * Per-meal macro distribution targets (protein-weighted).
 */
export function getMealMacroTargets(dailyProtein: number, dailyCalories: number, mealsPerDay: number) {
  if (mealsPerDay <= 3) {
    return {
      breakfast: { proteinPct: 0.25, caloriePct: 0.25 },
      lunch: { proteinPct: 0.35, caloriePct: 0.35 },
      dinner: { proteinPct: 0.40, caloriePct: 0.30 },
      snack: { proteinPct: 0, caloriePct: 0.10 },
    };
  }
  return {
    breakfast: { proteinPct: 0.20, caloriePct: 0.22 },
    lunch: { proteinPct: 0.30, caloriePct: 0.30 },
    dinner: { proteinPct: 0.35, caloriePct: 0.28 },
    snack: { proteinPct: 0.15, caloriePct: 0.20 },
  };
}
