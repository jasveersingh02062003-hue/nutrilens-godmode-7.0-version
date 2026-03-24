import { MealPlannerProfile, WeekPlan, DayPlan, PlannedMeal } from './meal-planner-store';
import { filterRecipes, getEnrichedRecipe, Recipe, recipes } from './recipes';
import { getBudgetCurveMultiplier, getAdjustedDailyBudget } from './budget-service';
import { getEnhancedBudgetSettings } from './budget-alerts';
import { getMealMacroTargets, getRecipeComposition } from './plan-validator';
import { getFeedbackScoreModifier } from './meal-plan-feedback';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Score a recipe for meal plan ranking (higher = better) */
function scoreRecipe(recipe: Recipe, maxCost?: number, targetProtein?: number): number {
  const enriched = getEnrichedRecipe(recipe);
  const ppr = Math.min(1, enriched.proteinPerRupee * 3);
  const sat = Math.min(1, enriched.satietyScore / 5);
  const nut = (enriched.nutritionScore || 5) / 10;
  const costFit = maxCost && maxCost > 0 ? Math.max(0, 1 - (enriched.estimatedCost / maxCost)) : 0.5;
  const protFit = targetProtein && targetProtein > 0 ? Math.min(1, enriched.protein / targetProtein) : 0.5;
  const feedbackMod = getFeedbackScoreModifier(recipe.id);
  return (ppr * 0.25) + (sat * 0.25) + (nut * 0.15) + (costFit * 0.1) + (protFit * 0.15) + feedbackMod + 0.1;
}

/** Pick the best-scored recipe from an array */
function pickBest(arr: Recipe[], maxCost?: number, targetProtein?: number): Recipe {
  if (arr.length <= 1) return arr[0];
  return arr.reduce((best, cur) =>
    scoreRecipe(cur, maxCost, targetProtein) > scoreRecipe(best, maxCost, targetProtein) ? cur : best
  );
}

function getMaxTime(cookingTime: string): number {
  switch (cookingTime) {
    case '15min': return 20;
    case '30min': return 35;
    case '45min': return 50;
    default: return 999;
  }
}

/** Breakfast always gets quick prep time */
function getMaxTimeForMeal(mealType: string, userCookingTime: string): number {
  if (mealType === 'breakfast') return Math.min(20, getMaxTime(userCookingTime));
  if (mealType === 'snack') return 15;
  return getMaxTime(userCookingTime);
}

function getDifficultyFilter(skill: string): string | undefined {
  if (skill === 'beginner') return 'beginner';
  return undefined;
}

function getCuisineMap(prefs: string[]): string[] {
  const map: Record<string, string> = {
    indian: 'Indian', north_indian: 'Indian', south_indian: 'Indian',
    chinese: 'Asian', italian: 'Italian', mexican: 'Mexican',
    thai: 'Asian', japanese: 'Asian', mediterranean: 'Mediterranean',
    american: 'Global', middle_eastern: 'Mediterranean',
    continental: 'Global', quick_meals: 'Global', street_food: 'Indian',
  };
  if (!prefs.length) return [];
  return [...new Set(prefs.map(p => map[p] || 'Global'))];
}

/**
 * Generate a reason string for a meal choice.
 */
function generateMealReason(recipe: Recipe, maxCost?: number, targetProtein?: number): string {
  const enriched = getEnrichedRecipe(recipe);
  const reasons: string[] = [];

  if (targetProtein && recipe.protein >= targetProtein * 0.8) {
    reasons.push(`High protein (${recipe.protein}g) to meet your goal`);
  }
  if (maxCost && enriched.estimatedCost <= maxCost * 0.7) {
    reasons.push(`Budget-friendly at ₹${enriched.estimatedCost}`);
  }
  if (recipe.prepTime + recipe.cookTime <= 20) {
    reasons.push('Quick prep for busy mornings');
  }
  if (recipe.fiber >= 6) {
    reasons.push('High fiber for sustained energy');
  }

  return reasons.length > 0 ? reasons[0] : `Balanced ${recipe.calories} kcal meal`;
}

/**
 * Progressive filter relaxation: try strict filters first, then relax
 * constraints step by step until we find at least one recipe.
 */
function findRecipeWithFallback(
  mealType: string,
  opts: {
    tags?: string[];
    maxCalories?: number;
    maxPrepTime?: number;
    difficulty?: string;
    cuisines?: string[];
    excludeIds?: string[];
    maxCost?: number;
    targetProtein?: number;
  }
): { recipe: Recipe; reason: string } | null {
  const levels = [
    { ...opts, mealType },
    { ...opts, mealType, excludeIds: undefined },
    { ...opts, mealType, excludeIds: undefined, difficulty: undefined },
    { ...opts, mealType, excludeIds: undefined, difficulty: undefined, maxCalories: undefined },
    { ...opts, mealType, excludeIds: undefined, difficulty: undefined, maxCalories: undefined, cuisines: undefined },
    { ...opts, mealType, excludeIds: undefined, difficulty: undefined, maxCalories: undefined, cuisines: undefined, maxPrepTime: undefined },
    { mealType },
  ];

  for (const filter of levels) {
    const results = filterRecipes(filter);
    const costed = opts.maxCost ? results.filter(r => getEnrichedRecipe(r).estimatedCost <= opts.maxCost! * 1.15) : results;
    if (costed.length) {
      const recipe = pickBest(costed, opts.maxCost, opts.targetProtein);
      return { recipe, reason: generateMealReason(recipe, opts.maxCost, opts.targetProtein) };
    }
    if (results.length) {
      const recipe = pickBest(results, opts.maxCost, opts.targetProtein);
      return { recipe, reason: generateMealReason(recipe, opts.maxCost, opts.targetProtein) };
    }
  }

  const fallback = recipes.filter(r => r.mealType.includes(mealType as any));
  if (fallback.length) {
    const recipe = pickBest(fallback, opts.maxCost, opts.targetProtein);
    return { recipe, reason: generateMealReason(recipe, opts.maxCost, opts.targetProtein) };
  }

  if (recipes.length) {
    const recipe = pickRandom(recipes);
    return { recipe, reason: 'Best available option' };
  }

  return null;
}

function getHealthTags(healthConditions?: string[], womenHealth?: string[]): string[] {
  const tags: string[] = [];
  if (healthConditions?.includes('diabetes')) tags.push('low-gi', 'diabetic-friendly');
  if (healthConditions?.includes('hypertension')) tags.push('low-sodium');
  if (healthConditions?.includes('cholesterol')) tags.push('low-fat');
  if (healthConditions?.includes('gerd')) tags.push('low-acid');
  if (healthConditions?.includes('lactose_intolerance') || healthConditions?.includes('celiac')) tags.push('dairy-free');
  if (healthConditions?.includes('celiac')) tags.push('gluten-free');
  if (womenHealth?.includes('pcos')) tags.push('low-gi', 'high-protein');
  if (womenHealth?.includes('pregnancy')) tags.push('pregnancy-safe');
  return tags;
}

export interface PlannedMealWithReason extends PlannedMeal {
  reason?: string;
}

export function generateWeekPlan(profile: MealPlannerProfile, healthConditions?: string[], womenHealth?: string[]): WeekPlan {
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const healthTags = getHealthTags(healthConditions, womenHealth);
  const tags = [...(profile.dietaryPrefs || []), ...healthTags];
  const cuisines = getCuisineMap(profile.cuisinePrefs || []);
  const difficulty = getDifficultyFilter(profile.cookingSkill);
  const mealsPerDay = profile.mealsPerDay || 3;
  const targetCal = profile.dailyCalories;
  const targetProtein = profile.dailyProtein || Math.round(profile.dailyCalories * 0.15 / 4);

  // Get macro distribution targets
  const macroTargets = getMealMacroTargets(targetProtein, targetCal, mealsPerDay);

  // Get per-meal budget from budget settings
  const enhanced = getEnhancedBudgetSettings();
  const perMealBudget = enhanced.perMeal || { breakfast: 100, lunch: 150, dinner: 200, snacks: 50 };

  const mealTypes: { type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; budgetKey: string; macroKey: string }[] = [
    { type: 'breakfast', budgetKey: 'breakfast', macroKey: 'breakfast' },
    { type: 'lunch', budgetKey: 'lunch', macroKey: 'lunch' },
    { type: 'dinner', budgetKey: 'dinner', macroKey: 'dinner' },
  ];

  if (mealsPerDay > 3) {
    mealTypes.push({ type: 'snack', budgetKey: 'snacks', macroKey: 'snack' });
  }

  const days: DayPlan[] = [];
  // Track used recipes per meal type separately for better variety
  const usedByType: Record<string, string[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfMonth = date.getDate();

    const curveMultiplier = getBudgetCurveMultiplier(dayOfMonth);

    const meals: PlannedMealWithReason[] = [];
    let dayProtein = 0;
    let dayCost = 0;
    const dailyBudget = Object.values(perMealBudget).reduce((s, v) => s + (v || 0), 0) * curveMultiplier;

    for (const { type, budgetKey, macroKey } of mealTypes) {
      const mealBudgetRaw = (perMealBudget as any)[budgetKey] || 100;
      const mealBudget = Math.round(mealBudgetRaw * curveMultiplier);
      const macroTarget = (macroTargets as any)[macroKey] || { proteinPct: 0.33, caloriePct: 0.33 };
      const mealProteinTarget = Math.round(targetProtein * macroTarget.proteinPct);
      const mealCalTarget = Math.round(targetCal * macroTarget.caloriePct);
      const maxTime = getMaxTimeForMeal(type, profile.cookingTime);

      // Variety window: exclude last 3 breakfasts, last 2 lunch/dinner
      const varietyWindow = type === 'breakfast' ? 3 : 2;
      const excludeIds = (usedByType[type] || []).slice(-varietyWindow);

      const result = findRecipeWithFallback(type, {
        tags,
        maxCalories: mealCalTarget + 150,
        maxPrepTime: maxTime,
        difficulty,
        cuisines: cuisines.length ? cuisines : undefined,
        maxCost: mealBudget,
        targetProtein: mealProteinTarget,
        excludeIds,
      });

      if (result) {
        const enriched = getEnrichedRecipe(result.recipe);
        meals.push({
          recipeId: result.recipe.id,
          mealType: type,
          cooked: false,
          logged: false,
          reason: result.reason,
        });
        usedByType[type] = [...(usedByType[type] || []), result.recipe.id];
        dayProtein += result.recipe.protein;
        dayCost += enriched.estimatedCost;
      }
    }

    // Protein post-optimization: if daily protein < 90% target, swap weakest meal
    if (dayProtein < targetProtein * 0.9 && meals.length > 0) {
      let lowestIdx = 0;
      let lowestProtein = Infinity;
      for (let m = 0; m < meals.length; m++) {
        const r = recipes.find(rx => rx.id === meals[m].recipeId);
        if (r && r.protein < lowestProtein) {
          lowestProtein = r.protein;
          lowestIdx = m;
        }
      }
      const slotType = meals[lowestIdx].mealType;
      const slotBudgetKey = slotType === 'snack' ? 'snacks' : slotType;
      const slotBudget = Math.round(((perMealBudget as any)[slotBudgetKey] || 100) * curveMultiplier);

      // Budget flex: allow 15% overspend on this meal if needed for protein
      const flexBudget = Math.round(slotBudget * 1.15);
      const betterCandidates = filterRecipes({ mealType: slotType, tags })
        .filter(r => r.protein > lowestProtein && getEnrichedRecipe(r).estimatedCost <= flexBudget);
      if (betterCandidates.length) {
        const best = betterCandidates.reduce((a, b) =>
          getEnrichedRecipe(a).proteinPerRupee > getEnrichedRecipe(b).proteinPerRupee ? a : b
        );
        const enriched = getEnrichedRecipe(best);
        meals[lowestIdx] = {
          recipeId: best.id,
          mealType: slotType,
          cooked: false,
          logged: false,
          reason: `Swapped for protein: ${best.protein}g at ₹${enriched.estimatedCost}`,
        };
      }
    }

    days.push({ date: dateStr, meals });
  }

  return {
    weekStart: weekStartStr,
    days,
    generatedAt: new Date().toISOString(),
  };
}

export function swapMeal(plan: WeekPlan, date: string, recipeId: string, profile: MealPlannerProfile): WeekPlan {
  const day = plan.days.find(d => d.date === date);
  if (!day) return plan;
  const mealIdx = day.meals.findIndex(m => m.recipeId === recipeId);
  if (mealIdx === -1) return plan;
  const meal = day.meals[mealIdx];
  const usedIds = plan.days.flatMap(d => d.meals.map(m => m.recipeId));
  const tags = profile.dietaryPrefs || [];

  // Get the current recipe to match constraints
  const currentRecipe = recipes.find(r => r.id === recipeId);
  const currentEnriched = currentRecipe ? getEnrichedRecipe(currentRecipe) : null;

  const enhanced = getEnhancedBudgetSettings();
  const perMealBudget = enhanced.perMeal || { breakfast: 100, lunch: 150, dinner: 200, snacks: 50 };
  const budgetKey = meal.mealType === 'snack' ? 'snacks' : meal.mealType;
  const mealBudget = (perMealBudget as any)[budgetKey] || 100;

  const result = findRecipeWithFallback(meal.mealType, {
    tags,
    excludeIds: usedIds,
    maxCost: mealBudget,
    // Match within ±15% calories of current recipe
    maxCalories: currentRecipe ? Math.round(currentRecipe.calories * 1.15) : undefined,
    targetProtein: currentRecipe ? currentRecipe.protein : undefined,
    maxPrepTime: getMaxTimeForMeal(meal.mealType, profile.cookingTime),
  });

  if (result) {
    day.meals[mealIdx] = {
      ...meal,
      recipeId: result.recipe.id,
      cooked: false,
      logged: false,
      reason: result.reason,
    } as PlannedMealWithReason;
  }
  return { ...plan };
}

export function generateShoppingList(plan: WeekPlan): { category: string; items: { name: string; quantity: string; checked: boolean }[] }[] {
  const itemMap: Record<string, { name: string; quantities: string[]; category: string }> = {};

  for (const day of plan.days) {
    for (const meal of day.meals) {
      const recipe = filterRecipes({}).find(r => r.id === meal.recipeId);
      if (!recipe) continue;
      for (const ing of recipe.ingredients) {
        const key = ing.name.toLowerCase();
        if (!itemMap[key]) {
          itemMap[key] = { name: ing.name, quantities: [], category: ing.category };
        }
        itemMap[key].quantities.push(ing.quantity);
      }
    }
  }

  const catMap: Record<string, { name: string; quantity: string; checked: boolean }[]> = {};
  for (const item of Object.values(itemMap)) {
    if (!catMap[item.category]) catMap[item.category] = [];
    catMap[item.category].push({
      name: item.name,
      quantity: item.quantities.length > 1 ? `${item.quantities.length}x (${item.quantities[0]})` : item.quantities[0],
      checked: false,
    });
  }

  return Object.entries(catMap).map(([category, items]) => ({ category, items }));
}
