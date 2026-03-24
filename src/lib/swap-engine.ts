// ─── What-If Simulator: Swap Engine ───

import { recipes, getEnrichedRecipe, getRecipeById, type Recipe, type EnrichedRecipe } from './recipes';
import { shouldAvoidRecipe } from './plan-validator';
import { getRecipeCost } from './recipe-cost';
import { getExpensesForDate } from './expense-store';
import { getAdjustedDailyBudget } from './budget-service';
import { getProfile } from './store';
import { getTodayKey } from './store';

export interface SwapAlternative {
  recipe: EnrichedRecipe;
  cost: number;
  decisionScore: number;
  proteinDrop: boolean;
  bestChoice: boolean;
  highlight: 'Cheapest' | 'Best Choice' | 'High Protein';
}

export interface SwapImpact {
  costDiff: number;
  proteinDiff: number;
  calorieDiff: number;
  timelineDays: number; // positive = faster, negative = slower
  budgetWarning: boolean;
  proteinDropWarning: boolean;
}

/**
 * Get top 3 swap alternatives for a recipe, ranked by decision score.
 */
export function getSwapAlternatives(
  recipeId: string,
  mealType: string,
  profileOverride?: { dietaryPrefs?: string[]; healthConditions?: string[]; allergies?: string[] }
): SwapAlternative[] {
  const original = getRecipeById(recipeId);
  if (!original) return [];

  const userProfile = getProfile();
  const dietaryPrefs = profileOverride?.dietaryPrefs || userProfile?.dietaryPrefs || [];
  const healthConditions = profileOverride?.healthConditions || userProfile?.healthConditions || [];

  // Filter candidates
  const candidates = recipes.filter(r => {
    if (r.id === recipeId) return false;
    if (!r.mealType.includes(mealType as any)) return false;
    // Calories within ±20%
    if (Math.abs(r.calories - original.calories) > original.calories * 0.2) return false;
    // Health conditions
    if (shouldAvoidRecipe(r, healthConditions)) return false;
    // Dietary prefs
    if (dietaryPrefs.includes('vegetarian') && !r.tags.some(t => ['vegetarian', 'vegan'].includes(t))) return false;
    if (dietaryPrefs.includes('vegan') && !r.tags.includes('vegan')) return false;
    if (dietaryPrefs.includes('eggetarian') && r.tags.includes('non-veg') && !r.tags.includes('egg')) return false;
    return true;
  });

  // Enrich and score
  const originalCost = getRecipeCost(original);
  const enriched = candidates.map(r => {
    const e = getEnrichedRecipe(r);
    const cost = getRecipeCost(r);
    const calorieFit = 1 - Math.abs(e.calories - original.calories) / Math.max(1, original.calories);
    const decisionScore = (e.proteinPerRupee * 0.6) + (calorieFit * 0.4);
    const proteinDrop = e.protein < original.protein * 0.8;
    return { recipe: e, cost, decisionScore, proteinDrop, bestChoice: false, highlight: 'Best Choice' as 'Cheapest' | 'Best Choice' | 'High Protein' };
  });

  // Sort: non-protein-drop first, then by score
  enriched.sort((a, b) => {
    if (a.proteinDrop !== b.proteinDrop) return a.proteinDrop ? 1 : -1;
    return b.decisionScore - a.decisionScore;
  });

  const top3 = enriched.slice(0, 3);
  if (top3.length === 0) return [];

  // Assign highlights
  top3[0].bestChoice = true;
  top3[0].highlight = 'Best Choice';

  // Find cheapest and highest protein among top 3
  const cheapestIdx = top3.reduce((minIdx, item, idx) => item.cost < top3[minIdx].cost ? idx : minIdx, 0);
  const highProtIdx = top3.reduce((maxIdx, item, idx) => item.recipe.protein > top3[maxIdx].recipe.protein ? idx : maxIdx, 0);

  if (cheapestIdx !== 0) top3[cheapestIdx].highlight = 'Cheapest';
  if (highProtIdx !== 0 && highProtIdx !== cheapestIdx) top3[highProtIdx].highlight = 'High Protein';

  return top3;
}

/**
 * Calculate the impact of swapping one recipe for another.
 */
export function calculateSwapImpact(
  originalRecipeId: string,
  alternativeRecipe: EnrichedRecipe
): SwapImpact {
  const original = getRecipeById(originalRecipeId);
  if (!original) return { costDiff: 0, proteinDiff: 0, calorieDiff: 0, timelineDays: 0, budgetWarning: false, proteinDropWarning: false };

  const originalCost = getRecipeCost(original);
  const altCost = getRecipeCost(alternativeRecipe);

  const costDiff = altCost - originalCost;
  const proteinDiff = alternativeRecipe.protein - original.protein;
  const calorieDiff = alternativeRecipe.calories - original.calories;

  // Timeline impact
  const userProfile = getProfile();
  let timelineDays = 0;
  if (userProfile && userProfile.tdee > 0 && userProfile.targetWeight && userProfile.weightKg) {
    const weightDiff = Math.abs(userProfile.weightKg - userProfile.targetWeight);
    if (weightDiff > 0) {
      // Negative calorieDiff = fewer calories = faster weight loss
      const weeklyWeightDelta = (calorieDiff * 7) / 7700;
      const originalWeeklyLoss = (userProfile.tdee - original.calories) * 7 / 7700;
      if (Math.abs(originalWeeklyLoss) > 0.01) {
        timelineDays = Math.round((-weeklyWeightDelta / Math.abs(originalWeeklyLoss)) * weightDiff * 7);
        timelineDays = Math.max(-30, Math.min(30, timelineDays)); // clamp
      }
    }
  }

  // Budget warning
  const today = getTodayKey();
  const todayExpenses = getExpensesForDate(today);
  const spentToday = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const { adjustedDailyBudget } = getAdjustedDailyBudget();
  const budgetWarning = adjustedDailyBudget > 0 && (spentToday + altCost) > adjustedDailyBudget;

  const proteinDropWarning = proteinDiff < -(original.protein * 0.2);

  return { costDiff, proteinDiff, calorieDiff, timelineDays, budgetWarning, proteinDropWarning };
}
