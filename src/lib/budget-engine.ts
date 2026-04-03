// ─── Unified Budget Engine — Single Source of Truth ───
// All budget computations derive from the monthly budget stored in BudgetSettings.
// Per-meal budgets are computed from split percentages, never stored as absolutes.

import { getBudgetSettings } from './expense-store';
import { getEnhancedBudgetSettings, saveEnhancedBudgetSettings } from './budget-alerts';
import { getDailyLog, getTodayKey } from './store';

// ─── Default meal split percentages (must sum to 100) ───
export const DEFAULT_MEAL_SPLIT = {
  breakfast: 20,
  lunch: 30,
  dinner: 35,
  snacks: 15,
};

export type MealSplitPcts = typeof DEFAULT_MEAL_SPLIT;

// ─── Cost estimates for budget validation (Indian market) ───
export const COST_ESTIMATES = {
  PROTEIN_COST_PER_GRAM: 0.23,   // soya chunks ≈ ₹0.23/g protein
  CALORIE_COST_PER_KCAL: 0.04,   // rice ≈ ₹0.04/kcal
};

export interface UnifiedBudget {
  monthly: number;
  daily: number;
  perMeal: { breakfast: number; lunch: number; dinner: number; snacks: number };
  splitPcts: MealSplitPcts;
  currency: string;
}

export interface BudgetValidation {
  feasible: boolean;
  minMonthly: number;
  minDaily: number;
  warning: string | null;
  severity: 'ok' | 'tight' | 'insufficient';
}

/**
 * Returns the number of days in the current month.
 */
function getDaysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/**
 * Compute daily budget from monthly.
 */
export function computeDailyBudget(monthlyBudget: number): number {
  const days = getDaysInCurrentMonth();
  return Math.round((monthlyBudget / days) * 100) / 100;
}

/**
 * Compute per-meal budgets from daily budget and split percentages.
 */
export function computePerMealBudgets(
  dailyBudget: number,
  splitPcts: MealSplitPcts = DEFAULT_MEAL_SPLIT
): UnifiedBudget['perMeal'] {
  return {
    breakfast: Math.round(dailyBudget * (splitPcts.breakfast / 100)),
    lunch: Math.round(dailyBudget * (splitPcts.lunch / 100)),
    dinner: Math.round(dailyBudget * (splitPcts.dinner / 100)),
    snacks: Math.round(dailyBudget * (splitPcts.snacks / 100)),
  };
}

/**
 * Migrate old absolute perMeal values to percentages.
 * If the sum of perMeal exceeds the daily budget, they are raw absolutes — convert to percentages.
 */
function migrateOldPerMealIfNeeded(): MealSplitPcts {
  const enhanced = getEnhancedBudgetSettings();
  const budgetSettings = getBudgetSettings();
  const monthly = budgetSettings.period === 'month'
    ? budgetSettings.monthlyBudget
    : budgetSettings.weeklyBudget * 4.33;
  const daily = computeDailyBudget(monthly);

  // Check if perMeal exists and looks like absolute values (sum > daily budget)
  if (enhanced.perMeal) {
    const sum = enhanced.perMeal.breakfast + enhanced.perMeal.lunch +
      enhanced.perMeal.dinner + enhanced.perMeal.snacks;

    if (sum > daily * 1.5 || sum > 200) {
      // These are absolute values, not percentages — convert
      if (sum > 0) {
        const pcts: MealSplitPcts = {
          breakfast: Math.round((enhanced.perMeal.breakfast / sum) * 100),
          lunch: Math.round((enhanced.perMeal.lunch / sum) * 100),
          dinner: Math.round((enhanced.perMeal.dinner / sum) * 100),
          snacks: Math.round((enhanced.perMeal.snacks / sum) * 100),
        };
        // Ensure they sum to 100
        const pctSum = pcts.breakfast + pcts.lunch + pcts.dinner + pcts.snacks;
        if (pctSum !== 100) {
          pcts.dinner += (100 - pctSum);
        }
        // Save migrated percentages
        saveEnhancedBudgetSettings({
          ...enhanced,
          perMeal: pcts,
          mealSplitPcts: pcts,
        });
        return pcts;
      }
    }

    // If sum is <= 100 and looks like percentages already, use them
    if (sum > 0 && sum <= 105) {
      return {
        breakfast: enhanced.perMeal.breakfast,
        lunch: enhanced.perMeal.lunch,
        dinner: enhanced.perMeal.dinner,
        snacks: enhanced.perMeal.snacks,
      };
    }
  }

  if (enhanced.mealSplitPcts) {
    return enhanced.mealSplitPcts;
  }

  return DEFAULT_MEAL_SPLIT;
}

/**
 * THE main function — returns unified, consistent budget values.
 * Call this everywhere instead of reading raw settings.
 */
export function getUnifiedBudget(): UnifiedBudget {
  const budgetSettings = getBudgetSettings();
  const monthly = budgetSettings.period === 'month'
    ? budgetSettings.monthlyBudget
    : Math.round(budgetSettings.weeklyBudget * 4.33);

  const daily = computeDailyBudget(monthly);
  const splitPcts = migrateOldPerMealIfNeeded();
  const perMeal = computePerMealBudgets(daily, splitPcts);

  return {
    monthly,
    daily,
    perMeal,
    splitPcts,
    currency: budgetSettings.currency || '₹',
  };
}

/**
 * Get the remaining budget for a specific meal slot today.
 * Subtracts what has already been spent on that slot.
 */
export function getUnifiedRemainingMealBudget(mealType: string): number {
  const budget = getUnifiedBudget();
  const slotKey = (mealType === 'snack' ? 'snacks' : mealType) as keyof typeof budget.perMeal;
  const mealBudget = budget.perMeal[slotKey] || 0;

  const today = getTodayKey();
  const log = getDailyLog(today);
  const spentOnSlot = log.meals
    .filter(m => m.type === mealType)
    .reduce((s, m) => s + (m.cost?.amount || 0), 0);

  return Math.max(0, mealBudget - spentOnSlot);
}

/**
 * Validate whether the user's monthly budget can realistically
 * support their calorie and protein goals.
 */
export function validateBudgetVsGoals(
  monthlyBudget: number,
  dailyCalories: number,
  dailyProtein: number
): BudgetValidation {
  const daily = computeDailyBudget(monthlyBudget);

  // Minimum cost: protein from cheapest source + remaining calories from cheapest source
  const proteinCalories = dailyProtein * 4; // 4 kcal per gram protein
  const proteinCost = dailyProtein * COST_ESTIMATES.PROTEIN_COST_PER_GRAM;
  const remainingCalories = Math.max(0, dailyCalories - proteinCalories);
  const calorieCost = remainingCalories * COST_ESTIMATES.CALORIE_COST_PER_KCAL;
  const minDailyCost = proteinCost + calorieCost;

  // Add 40% buffer for variety and micronutrients
  const practicalMinDaily = Math.round(minDailyCost * 1.4);
  const practicalMinMonthly = Math.round(practicalMinDaily * getDaysInCurrentMonth());

  if (daily >= practicalMinDaily * 1.5) {
    return {
      feasible: true,
      minMonthly: practicalMinMonthly,
      minDaily: practicalMinDaily,
      warning: null,
      severity: 'ok',
    };
  }

  if (daily >= practicalMinDaily) {
    return {
      feasible: true,
      minMonthly: practicalMinMonthly,
      minDaily: practicalMinDaily,
      warning: `Your budget is tight for your goals. Meals will prioritize high-PES (protein-efficient) foods.`,
      severity: 'tight',
    };
  }

  return {
    feasible: false,
    minMonthly: practicalMinMonthly,
    minDaily: practicalMinDaily,
    warning: `Your budget of ₹${monthlyBudget}/month (₹${Math.round(daily)}/day) is too low for ${dailyCalories} kcal + ${dailyProtein}g protein. Minimum recommended: ₹${practicalMinMonthly}/month.`,
    severity: 'insufficient',
  };
}

/**
 * Save meal split percentages (must sum to 100).
 */
export function saveMealSplitPcts(pcts: MealSplitPcts): void {
  const enhanced = getEnhancedBudgetSettings();
  saveEnhancedBudgetSettings({
    ...enhanced,
    mealSplitPcts: pcts,
    // Also update perMeal to match percentages for backward compat during transition
    perMeal: pcts as any,
  } as any);
}
