// ─── Plan Feasibility Validator & Day Sync Check ───

import { recipes, getEnrichedRecipe } from './recipes';
import type { MealPlannerProfile, DayPlan, WeekPlan } from './meal-planner-store';
import type { EnhancedBudgetSettings, PerMealBudget } from './budget-alerts';
import { getUnifiedBudget } from './budget-engine';

// ─── Constraint Priority Hierarchy ───
// 1 = highest priority (non-negotiable), 5 = lowest (can relax)
export const CONSTRAINT_PRIORITY = {
  health: 1,    // Non-negotiable: health conditions filtering
  calories: 2,  // Must hit within 20%
  protein: 3,   // Optimize, can flex 20%
  budget: 4,    // Constraint, allow 15% flex
  preferences: 5, // Nice-to-have
} as const;

export type ConstraintLevel = keyof typeof CONSTRAINT_PRIORITY;

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

export interface WeeklyNutritionResult {
  balanced: boolean;
  dayFlags: { date: string; proteinDelta: number; calorieDelta: number }[];
  suggestions: string[];
  avgProtein: number;
  avgCalories: number;
  proteinVariance: number;
  calorieVariance: number;
}

export interface ConflictResolution {
  relaxed: ConstraintLevel[];
  adjustedTargets: {
    calories: number;
    protein: number;
    budget: number;
  };
  explanation: string;
}

// ─── Health Constraint Mappings ───
export const HEALTH_AVOID_TAGS: Record<string, string[]> = {
  diabetes: ['high-sugar', 'sugary', 'sweet', 'refined-carbs'],
  hypertension: ['high-sodium', 'pickled', 'salty'],
  cholesterol: ['fried', 'high-fat', 'deep-fried'],
  acne: ['oily', 'fried', 'high-dairy', 'deep-fried'],
  gerd: ['spicy', 'acidic', 'fried', 'high-acid'],
  pcos: ['high-sugar', 'refined-carbs', 'sugary'],
  thyroid: ['soy', 'raw-cruciferous'],
};

export const HEALTH_PREFER_TAGS: Record<string, string[]> = {
  diabetes: ['low-gi', 'high-fiber', 'diabetic-friendly'],
  hypertension: ['low-sodium'],
  cholesterol: ['low-fat', 'high-fiber'],
  acne: ['low-oil', 'high-fiber', 'antioxidant'],
  gerd: ['low-acid', 'mild'],
  pcos: ['low-gi', 'high-protein'],
  thyroid: ['iodine-rich'],
};

/**
 * Checks if the user's daily budget can realistically hit their
 * calorie and protein targets using available recipes.
 */
export function validatePlanFeasibility(
  profile: MealPlannerProfile,
  budgetSettings: EnhancedBudgetSettings
): FeasibilityResult {
  const unified = getUnifiedBudget();
  const dailyBudget = Math.round(unified.daily);
  const targetProtein = profile.dailyProtein || 60;
  const targetCalories = profile.dailyCalories || 1800;

  if (dailyBudget <= 0) {
    return { feasible: false, warning: 'No budget set. Please complete budget setup first.' };
  }

  const enriched = recipes.map(r => getEnrichedRecipe(r));
  const proteinSources = enriched
    .filter(r => r.protein > 5 && r.estimatedCost > 0)
    .sort((a, b) => b.proteinPerRupee - a.proteinPerRupee);

  if (proteinSources.length === 0) {
    return { feasible: true };
  }

  const bestPPR = proteinSources[0].proteinPerRupee;
  const minCostForProtein = bestPPR > 0 ? Math.round(targetProtein / bestPPR) : dailyBudget;

  const calorieSources = enriched
    .filter(r => r.calories > 100 && r.estimatedCost > 0)
    .sort((a, b) => (b.calories / b.estimatedCost) - (a.calories / a.estimatedCost));
  const bestCPR = calorieSources.length > 0 ? calorieSources[0].calories / calorieSources[0].estimatedCost : 10;
  const minCostForCalories = bestCPR > 0 ? Math.round(targetCalories / bestCPR) : dailyBudget;

  const proteinFeasible = minCostForProtein <= dailyBudget * 1.15;
  const calorieFeasible = minCostForCalories <= dailyBudget * 1.15;

  if (proteinFeasible && calorieFeasible) {
    return { feasible: true };
  }

  const achievableProtein = Math.round(dailyBudget * bestPPR * 0.7);
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
  const unified = getUnifiedBudget();
  const dailyBudget = Math.round(unified.daily);
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
    const scale = meal.portionScale ?? 1;
    totalCalories += Math.round(recipe.calories * scale);
    totalProtein += Math.round(recipe.protein * scale);
    totalCost += Math.round(enriched.estimatedCost * scale);
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
 * Validates weekly nutrition consistency across all 7 days.
 * Flags any day where protein or calories deviate >20% from target.
 */
export function validateWeeklyNutrition(
  plan: WeekPlan,
  profile: MealPlannerProfile
): WeeklyNutritionResult {
  const dayFlags: WeeklyNutritionResult['dayFlags'] = [];
  const suggestions: string[] = [];
  let totalProtein = 0;
  let totalCalories = 0;
  const dailyProteins: number[] = [];
  const dailyCaloriesArr: number[] = [];

  for (const day of plan.days) {
    let dayP = 0;
    let dayC = 0;
    for (const meal of day.meals) {
      const recipe = recipes.find(r => r.id === meal.recipeId);
      if (recipe) {
        dayP += recipe.protein;
        dayC += recipe.calories;
      }
    }
    dailyProteins.push(dayP);
    dailyCaloriesArr.push(dayC);
    totalProtein += dayP;
    totalCalories += dayC;

    const proteinDelta = dayP - profile.dailyProtein;
    const calorieDelta = dayC - profile.dailyCalories;
    const proteinOff = Math.abs(proteinDelta) > profile.dailyProtein * 0.2;
    const calorieOff = Math.abs(calorieDelta) > profile.dailyCalories * 0.2;

    if (proteinOff || calorieOff) {
      dayFlags.push({ date: day.date, proteinDelta, calorieDelta });
    }
  }

  const n = plan.days.length || 1;
  const avgProtein = Math.round(totalProtein / n);
  const avgCalories = Math.round(totalCalories / n);

  // Variance as coefficient of variation (stdev / mean)
  const proteinMean = totalProtein / n;
  const calorieMean = totalCalories / n;
  const proteinVariance = proteinMean > 0
    ? Math.sqrt(dailyProteins.reduce((s, v) => s + Math.pow(v - proteinMean, 2), 0) / n) / proteinMean
    : 0;
  const calorieVariance = calorieMean > 0
    ? Math.sqrt(dailyCaloriesArr.reduce((s, v) => s + Math.pow(v - calorieMean, 2), 0) / n) / calorieMean
    : 0;

  const balanced = proteinVariance < 0.20 && calorieVariance < 0.20 && dayFlags.length === 0;

  if (proteinVariance >= 0.20) {
    suggestions.push(`Protein varies too much across the week (${Math.round(proteinVariance * 100)}% variance). Consider redistributing high-protein meals.`);
  }
  if (calorieVariance >= 0.20) {
    suggestions.push(`Calorie intake is inconsistent (${Math.round(calorieVariance * 100)}% variance). Aim for steadier daily totals.`);
  }
  for (const flag of dayFlags) {
    const dayName = new Date(flag.date).toLocaleDateString('en-IN', { weekday: 'long' });
    if (flag.proteinDelta < -profile.dailyProtein * 0.2) {
      suggestions.push(`${dayName}: protein is ${Math.abs(Math.round(flag.proteinDelta))}g below target — swap in a higher-protein option.`);
    }
    if (flag.calorieDelta < -profile.dailyCalories * 0.2) {
      suggestions.push(`${dayName}: calories are ${Math.abs(Math.round(flag.calorieDelta))} kcal below target.`);
    }
  }

  return { balanced, dayFlags, suggestions, avgProtein, avgCalories, proteinVariance, calorieVariance };
}

/**
 * Resolves conflicts between health, calories, protein, budget, and preferences.
 * Uses CONSTRAINT_PRIORITY to decide which targets to relax.
 */
export function resolveConflicts(
  profile: MealPlannerProfile,
  budgetSettings: EnhancedBudgetSettings,
  healthConditions: string[]
): ConflictResolution {
  const unified = getUnifiedBudget();
  const dailyBudget = Math.round(unified.daily);
  const relaxed: ConstraintLevel[] = [];
  let adjustedCalories = profile.dailyCalories;
  let adjustedProtein = profile.dailyProtein;
  let adjustedBudget = dailyBudget;

  // Check feasibility
  const feasibility = validatePlanFeasibility(profile, budgetSettings);

  if (feasibility.feasible) {
    return {
      relaxed: [],
      adjustedTargets: { calories: adjustedCalories, protein: adjustedProtein, budget: adjustedBudget },
      explanation: 'All targets achievable within budget.',
    };
  }

  // Relax in reverse priority order: preferences → budget → protein → calories
  // Health is never relaxed
  const explanations: string[] = [];

  // Try relaxing budget first (allow 15% flex)
  adjustedBudget = Math.round(dailyBudget * 1.15);
  const flexPerMeal = unified.perMeal;
  const withFlexBudget = { ...budgetSettings, perMeal: {
    breakfast: Math.round((flexPerMeal.breakfast || 0) * 1.15),
    lunch: Math.round((flexPerMeal.lunch || 0) * 1.15),
    dinner: Math.round((flexPerMeal.dinner || 0) * 1.15),
    snacks: Math.round((flexPerMeal.snacks || 0) * 1.15),
  }};
  const afterBudgetFlex = validatePlanFeasibility(profile, withFlexBudget);

  if (afterBudgetFlex.feasible) {
    relaxed.push('budget');
    explanations.push('Budget flexed by 15% to meet nutrition targets.');
    return {
      relaxed,
      adjustedTargets: { calories: adjustedCalories, protein: adjustedProtein, budget: adjustedBudget },
      explanation: explanations.join(' '),
    };
  }

  // If still infeasible, reduce protein (priority 3 yields to calories priority 2)
  if (feasibility.adjustedProtein && feasibility.adjustedProtein < adjustedProtein) {
    adjustedProtein = feasibility.adjustedProtein;
    relaxed.push('protein');
    explanations.push(`Protein target lowered to ${adjustedProtein}g to stay within budget.`);
  }

  // If calories also infeasible
  if (feasibility.adjustedCalories && feasibility.adjustedCalories < adjustedCalories) {
    adjustedCalories = feasibility.adjustedCalories;
    relaxed.push('calories');
    explanations.push(`Calorie target adjusted to ${adjustedCalories} kcal.`);
  }

  if (explanations.length === 0) {
    explanations.push('Some targets adjusted to balance budget and nutrition.');
  }

  return {
    relaxed,
    adjustedTargets: { calories: adjustedCalories, protein: adjustedProtein, budget: adjustedBudget },
    explanation: explanations.join(' '),
  };
}

/**
 * Meal composition rules: derives what "type" a recipe is based on macros.
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

  return hasCarb || hasProtein;
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

/**
 * Filter recipes that should be avoided based on user's health conditions.
 */
export function getHealthAvoidTags(healthConditions: string[]): string[] {
  const avoid: Set<string> = new Set();
  for (const cond of healthConditions) {
    const tags = HEALTH_AVOID_TAGS[cond.toLowerCase()];
    if (tags) tags.forEach(t => avoid.add(t));
  }
  return [...avoid];
}

/**
 * Check if a recipe should be avoided for given health conditions.
 */
export function shouldAvoidRecipe(recipe: typeof recipes[0], healthConditions: string[]): boolean {
  if (!healthConditions.length) return false;
  const avoidTags = getHealthAvoidTags(healthConditions);
  // Check recipe's avoidFor field
  if (recipe.avoidFor) {
    for (const cond of healthConditions) {
      if (recipe.avoidFor.includes(cond)) return true;
    }
  }
  // Check recipe tags against avoid tags
  for (const tag of recipe.tags) {
    if (avoidTags.includes(tag.toLowerCase())) return true;
  }
  return false;
}
