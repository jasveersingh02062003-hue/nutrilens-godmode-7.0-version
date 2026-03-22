import { MealPlannerProfile, WeekPlan, DayPlan, PlannedMeal } from './meal-planner-store';
import { filterRecipes, getEnrichedRecipe, Recipe, recipes } from './recipes';
import { getBudgetCurveMultiplier, getAdjustedDailyBudget } from './budget-service';
import { getEnhancedBudgetSettings } from './budget-alerts';

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
  return (ppr * 0.3) + (sat * 0.3) + (nut * 0.2) + (costFit * 0.1) + (protFit * 0.1);
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

function getDifficultyFilter(skill: string): string | undefined {
  if (skill === 'beginner') return 'beginner';
  return undefined;
}

function getCuisineMap(prefs: string[]): string[] {
  const map: Record<string, string> = {
    indian: 'Indian',
    chinese: 'Asian',
    italian: 'Italian',
    mexican: 'Mexican',
    thai: 'Asian',
    japanese: 'Asian',
    mediterranean: 'Mediterranean',
    american: 'Global',
    middle_eastern: 'Mediterranean',
  };
  if (!prefs.length) return [];
  return [...new Set(prefs.map(p => map[p] || 'Global'))];
}

/**
 * Progressive filter relaxation: try strict filters first, then relax
 * constraints step by step until we find at least one recipe.
 * Guarantees a result as long as any recipe exists for the meal type.
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
  }
): Recipe | null {
  const levels = [
    // Level 1: All filters
    { ...opts, mealType },
    // Level 2: Remove excludeIds
    { ...opts, mealType, excludeIds: undefined },
    // Level 3: Remove difficulty
    { ...opts, mealType, excludeIds: undefined, difficulty: undefined },
    // Level 4: Remove calorie cap
    { ...opts, mealType, excludeIds: undefined, difficulty: undefined, maxCalories: undefined },
    // Level 5: Remove cuisine
    { ...opts, mealType, excludeIds: undefined, difficulty: undefined, maxCalories: undefined, cuisines: undefined },
    // Level 6: Remove prep time
    { ...opts, mealType, excludeIds: undefined, difficulty: undefined, maxCalories: undefined, cuisines: undefined, maxPrepTime: undefined },
    // Level 7: Only meal type, no dietary
    { mealType },
  ];

  for (const filter of levels) {
    const results = filterRecipes(filter);
    if (results.length) return pickRandom(results);
  }

  // Level 8: Any recipe that includes this meal type (bypass filterRecipes)
  const fallback = recipes.filter(r => r.mealType.includes(mealType as any));
  if (fallback.length) return pickRandom(fallback);

  // Level 9: Absolute fallback - pick ANY recipe
  if (recipes.length) return pickRandom(recipes);

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

export function generateWeekPlan(profile: MealPlannerProfile, healthConditions?: string[], womenHealth?: string[]): WeekPlan {
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const healthTags = getHealthTags(healthConditions, womenHealth);
  const tags = [...(profile.dietaryPrefs || []), ...healthTags];
  const cuisines = getCuisineMap(profile.cuisinePrefs || []);
  const maxTime = getMaxTime(profile.cookingTime);
  const difficulty = getDifficultyFilter(profile.cookingSkill);
  const mealsPerDay = profile.mealsPerDay || 3;
  const targetCal = profile.dailyCalories;

  const calPerBreakfast = Math.round(targetCal * 0.25);
  const calPerLunch = Math.round(targetCal * 0.35);
  const calPerDinner = Math.round(targetCal * 0.30);
  const calPerSnack = Math.round(targetCal * 0.10);

  const days: DayPlan[] = [];
  const usedRecipeIds: string[] = [];

  const mealTypes: { type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; cal: number }[] = [
    { type: 'breakfast', cal: calPerBreakfast },
    { type: 'lunch', cal: calPerLunch },
    { type: 'dinner', cal: calPerDinner },
  ];

  // Add snack if needed
  if (mealsPerDay > 3) {
    mealTypes.push({ type: 'snack', cal: calPerSnack });
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const meals: PlannedMeal[] = [];
    const baseOpts = { tags, maxPrepTime: maxTime, difficulty, cuisines: cuisines.length ? cuisines : undefined };

    for (const { type, cal } of mealTypes) {
      const recipe = findRecipeWithFallback(type, {
        ...baseOpts,
        maxCalories: cal + 150,
        excludeIds: usedRecipeIds.slice(-(type === 'breakfast' ? 7 : 5)),
      });
      if (recipe) {
        meals.push({ recipeId: recipe.id, mealType: type, cooked: false, logged: false });
        usedRecipeIds.push(recipe.id);
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
  
  const newRecipe = findRecipeWithFallback(meal.mealType, {
    tags,
    excludeIds: usedIds,
  });
  if (newRecipe) {
    day.meals[mealIdx] = { ...meal, recipeId: newRecipe.id, cooked: false, logged: false };
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
