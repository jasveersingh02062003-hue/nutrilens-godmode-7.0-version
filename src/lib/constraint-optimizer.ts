// ─── Constraint-Based Meal Selection Engine ───
// Replaces PES-score-first approach with target-driven optimization.
// Algorithm: filter → score by deviation from targets → iterate to fix shortfalls.

import { Recipe, recipes, getEnrichedRecipe, filterRecipes } from './recipes';
import { computePortionScale } from './meal-scale';
import { shouldAvoidRecipe } from './plan-validator';
import { PlannedMeal } from './meal-planner-store';

export interface SlotTarget {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calorieTarget: number;
  proteinTarget: number;
  budgetLimit: number;
}

export interface OptimizedDay {
  meals: (PlannedMeal & { reason?: string })[];
  totalCalories: number;
  totalProtein: number;
  totalCost: number;
  warnings: string[];
}

interface ScoredCandidate {
  recipe: Recipe;
  scale: number;
  scaledCalories: number;
  scaledProtein: number;
  scaledCost: number;
  deviationScore: number;
}

/**
 * Score a recipe candidate for a given slot based on how close it gets
 * to the slot's calorie + protein targets within budget.
 * Lower score = better fit.
 */
function scoreCandidate(
  recipe: Recipe,
  slot: SlotTarget
): ScoredCandidate {
  const enriched = getEnrichedRecipe(recipe);
  const scale = computePortionScale(recipe.calories, slot.calorieTarget);
  const scaledCalories = Math.round(recipe.calories * scale);
  const scaledProtein = Math.round(recipe.protein * scale);
  const scaledCost = Math.round(enriched.estimatedCost * scale);

  // Deviation: how far from targets (normalized)
  const calDev = slot.calorieTarget > 0
    ? Math.abs(scaledCalories - slot.calorieTarget) / slot.calorieTarget
    : 0;
  const protDev = slot.proteinTarget > 0
    ? Math.max(0, (slot.proteinTarget - scaledProtein) / slot.proteinTarget) // penalize under more than over
    : 0;
  const costPenalty = scaledCost > slot.budgetLimit * 1.15
    ? (scaledCost - slot.budgetLimit) / slot.budgetLimit * 2
    : 0;

  // Protein shortfall is weighted 2x because it's the user's top concern
  const deviationScore = calDev + protDev * 2 + costPenalty;

  return { recipe, scale, scaledCalories, scaledProtein, scaledCost, deviationScore };
}

/**
 * Find the best recipe for a slot from available candidates.
 */
function findBestForSlot(
  slot: SlotTarget,
  candidates: Recipe[],
  excludeIds: string[]
): ScoredCandidate | null {
  const eligible = candidates.filter(r =>
    r.mealType.includes(slot.mealType) &&
    !excludeIds.includes(r.id)
  );

  if (eligible.length === 0) return null;

  const scored = eligible.map(r => scoreCandidate(r, slot));

  // Filter: must be able to hit at least 60% of protein target when scaled
  const proteinFiltered = scored.filter(
    s => s.scaledProtein >= slot.proteinTarget * 0.6 || slot.proteinTarget <= 5
  );

  const pool = proteinFiltered.length > 0 ? proteinFiltered : scored;

  // Sort by deviation (lower is better)
  pool.sort((a, b) => a.deviationScore - b.deviationScore);

  // Pick from top 3 with some randomness for variety
  const topN = pool.slice(0, Math.min(3, pool.length));
  return topN[Math.floor(Math.random() * topN.length)];
}

export interface OptimizeDayInput {
  slots: SlotTarget[];
  dailyBudget: number;
  targetCalories: number;
  targetProtein: number;
  availableRecipes: Recipe[];
  excludeIds: string[];
  healthConditions: string[];
}

/**
 * Constraint-based day optimizer.
 * 1. For each slot, find the best recipe matching calorie + protein + budget targets.
 * 2. Iteratively fix shortfalls (up to 3 passes).
 * 3. Utilize remaining budget by scaling up protein-heavy meals.
 */
export function optimizeDayMeals(input: OptimizeDayInput): OptimizedDay {
  const { slots, dailyBudget, targetCalories, targetProtein, availableRecipes, excludeIds, healthConditions } = input;
  const warnings: string[] = [];

  // Health-filter recipes once
  let candidates = healthConditions.length > 0
    ? availableRecipes.filter(r => !shouldAvoidRecipe(r, healthConditions))
    : [...availableRecipes];

  if (candidates.length === 0) {
    candidates = [...availableRecipes]; // fallback if health filter removes everything
  }

  const meals: (PlannedMeal & { reason?: string })[] = [];
  const usedIds = [...excludeIds];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCost = 0;

  // ─── Pass 1: Fill each slot with best candidate ───
  for (const slot of slots) {
    const best = findBestForSlot(slot, candidates, usedIds);
    if (!best) {
      warnings.push(`No recipe found for ${slot.mealType}`);
      continue;
    }

    meals.push({
      recipeId: best.recipe.id,
      mealType: slot.mealType,
      cooked: false,
      logged: false,
      portionScale: best.scale,
      reason: `${best.recipe.protein}g protein, ₹${best.scaledCost} (${Math.round(best.deviationScore * 100)}% dev)`,
    });

    usedIds.push(best.recipe.id);
    totalCalories += best.scaledCalories;
    totalProtein += best.scaledProtein;
    totalCost += best.scaledCost;
  }

  // ─── Pass 2: Iterative protein fix (up to 3 iterations) ───
  for (let iter = 0; iter < 3; iter++) {
    if (totalProtein >= targetProtein * 0.85 || meals.length === 0) break;

    // Find the weakest meal (lowest protein contribution)
    let weakIdx = 0;
    let weakProtein = Infinity;
    let weakCost = 0;
    for (let m = 0; m < meals.length; m++) {
      const r = recipes.find(rx => rx.id === meals[m].recipeId);
      if (!r) continue;
      const sp = Math.round(r.protein * (meals[m].portionScale || 1));
      if (sp < weakProtein) {
        weakProtein = sp;
        weakCost = Math.round(getEnrichedRecipe(r).estimatedCost * (meals[m].portionScale || 1));
        weakIdx = m;
      }
    }

    const weakSlot = slots.find(s => s.mealType === meals[weakIdx].mealType);
    if (!weakSlot) break;

    // Find a higher-protein replacement
    const proteinGap = targetProtein - totalProtein;
    const budgetRoom = Math.max(0, dailyBudget - totalCost + weakCost);
    const upgradedSlot: SlotTarget = {
      ...weakSlot,
      proteinTarget: Math.round(weakProtein + proteinGap * 0.6), // try to close 60% of the gap
      budgetLimit: budgetRoom,
    };

    const swapExclude = usedIds.filter(id => id !== meals[weakIdx].recipeId);
    const replacement = findBestForSlot(upgradedSlot, candidates, swapExclude);

    if (replacement && replacement.scaledProtein > weakProtein * 1.2) {
      // Swap it
      totalCalories = totalCalories - Math.round((recipes.find(r => r.id === meals[weakIdx].recipeId)?.calories || 0) * (meals[weakIdx].portionScale || 1)) + replacement.scaledCalories;
      totalProtein = totalProtein - weakProtein + replacement.scaledProtein;
      totalCost = totalCost - weakCost + replacement.scaledCost;

      meals[weakIdx] = {
        recipeId: replacement.recipe.id,
        mealType: weakSlot.mealType,
        cooked: false,
        logged: false,
        portionScale: replacement.scale,
        reason: `Protein upgrade: ${replacement.recipe.protein}g → ${replacement.scaledProtein}g scaled`,
      };
    } else {
      break; // No better option available
    }
  }

  // ─── Pass 3: Budget utilization ───
  // If budget is significantly underused and protein is still below target,
  // scale up the protein-heaviest meal
  const remainingBudget = dailyBudget - totalCost;
  if (remainingBudget > 20 && totalProtein < targetProtein * 0.9 && meals.length > 0) {
    // Find the meal with highest protein per rupee
    let bestProtIdx = 0;
    let bestPPR = 0;
    for (let m = 0; m < meals.length; m++) {
      const r = recipes.find(rx => rx.id === meals[m].recipeId);
      if (!r) continue;
      const enriched = getEnrichedRecipe(r);
      if (enriched.proteinPerRupee > bestPPR) {
        bestPPR = enriched.proteinPerRupee;
        bestProtIdx = m;
      }
    }

    const r = recipes.find(rx => rx.id === meals[bestProtIdx].recipeId);
    if (r) {
      const currentScale = meals[bestProtIdx].portionScale || 1;
      const enriched = getEnrichedRecipe(r);
      const currentCost = Math.round(enriched.estimatedCost * currentScale);
      const maxNewCost = currentCost + remainingBudget;
      const maxScale = enriched.estimatedCost > 0 ? maxNewCost / enriched.estimatedCost : currentScale;
      const newScale = Math.round(Math.min(2.5, Math.max(currentScale, maxScale)) * 100) / 100;

      if (newScale > currentScale) {
        const calDiff = Math.round(r.calories * (newScale - currentScale));
        const protDiff = Math.round(r.protein * (newScale - currentScale));
        const costDiff = Math.round(enriched.estimatedCost * (newScale - currentScale));

        totalCalories += calDiff;
        totalProtein += protDiff;
        totalCost += costDiff;
        meals[bestProtIdx].portionScale = newScale;
        meals[bestProtIdx].reason = `Scaled ${currentScale}x→${newScale}x to utilize budget (+${protDiff}g protein)`;
      }
    }
  }

  // ─── Pass 4: Budget cap ───
  if (totalCost > dailyBudget * 1.15 && meals.length > 0) {
    // Find the most expensive meal and try to downscale or swap
    let expIdx = 0;
    let expCost = 0;
    for (let m = 0; m < meals.length; m++) {
      const r = recipes.find(rx => rx.id === meals[m].recipeId);
      if (!r) continue;
      const c = Math.round(getEnrichedRecipe(r).estimatedCost * (meals[m].portionScale || 1));
      if (c > expCost) { expCost = c; expIdx = m; }
    }

    const overage = totalCost - dailyBudget;
    const r = recipes.find(rx => rx.id === meals[expIdx].recipeId);
    if (r) {
      const enriched = getEnrichedRecipe(r);
      const currentScale = meals[expIdx].portionScale || 1;
      // Try reducing scale first
      const neededReduction = enriched.estimatedCost > 0 ? overage / enriched.estimatedCost : 0;
      const newScale = Math.max(0.5, Math.round((currentScale - neededReduction) * 100) / 100);
      if (newScale < currentScale) {
        const calDiff = Math.round(r.calories * (currentScale - newScale));
        const protDiff = Math.round(r.protein * (currentScale - newScale));
        const costDiff = Math.round(enriched.estimatedCost * (currentScale - newScale));
        totalCalories -= calDiff;
        totalProtein -= protDiff;
        totalCost -= costDiff;
        meals[expIdx].portionScale = newScale;
      }
    }
  }

  // Final warnings
  if (totalProtein < targetProtein * 0.8) {
    warnings.push(`Protein ${totalProtein}g is ${Math.round(targetProtein - totalProtein)}g below target — budget may be too low for ${targetProtein}g`);
  }
  if (totalCalories < targetCalories * 0.8) {
    warnings.push(`Calories ${totalCalories} kcal are ${Math.round(targetCalories - totalCalories)} below target`);
  }
  if (totalCost > dailyBudget * 1.15) {
    warnings.push(`Day cost ₹${totalCost} exceeds budget ₹${dailyBudget}`);
  }

  return { meals, totalCalories, totalProtein, totalCost, warnings };
}
