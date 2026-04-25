// ============================================
// NutriLens AI – Recipes Module (helpers + facade)
// ============================================
// The actual data array lives in `recipes-data.ts` so Vite emits it as
// its own chunk. This file re-exports `recipes` plus all helpers, so
// every existing consumer keeps working without changes.

import { estimateRecipeCost } from './recipe-cost';
import { recipes } from './recipes-data';
import type { Recipe, EnrichedRecipe } from './recipes-types';

// Re-export types and data for backward compatibility
export type { Recipe, EnrichedRecipe } from './recipes-types';
export { recipes };

/** Compute enriched metadata for a recipe (cost + nutrition + satiety) */
export function getEnrichedRecipe(recipe: Recipe): EnrichedRecipe {
  const estimatedCost = recipe.estimatedCost ?? estimateRecipeCost(recipe);
  const proteinPerCal = recipe.calories > 0 ? (recipe.protein / recipe.calories) * 100 : 0;
  const fiberBonus = Math.min(recipe.fiber || 0, 10);
  const nutritionScore = recipe.nutritionScore ?? Math.min(10, Math.round(proteinPerCal * 1.5 + fiberBonus * 0.3));
  const vf = recipe.volumeFactor ?? 2;
  const satietyScore = (recipe.protein / 10) + ((recipe.fiber || 0) / 5) + (vf / 2);
  const proteinPerRupee = estimatedCost > 0 ? recipe.protein / estimatedCost : 0;
  // Auto-infer context tags
  const contextTags = inferContextTags(recipe);
  const mergedTags = [...new Set([...recipe.tags, ...contextTags])];
  return { ...recipe, tags: mergedTags, estimatedCost, nutritionScore, satietyScore, proteinPerRupee };
}

/** Auto-infer context-aware tags from recipe properties */
function inferContextTags(r: Recipe): string[] {
  const tags: string[] = [];
  const nameL = r.name.toLowerCase();
  const existingTags = r.tags.map(t => t.toLowerCase());

  // Portable: wraps, rolls, thepla, sandwiches, items that travel well
  const portableKw = ['wrap', 'roll', 'thepla', 'paratha', 'sandwich', 'chilla', 'roti', 'toast', 'makhana', 'chana', 'sprout'];
  if (portableKw.some(k => nameL.includes(k)) || existingTags.includes('portable')) {
    tags.push('portable');
  }

  // No-cook: cookTime === 0 or already tagged
  if (r.cookTime === 0 || existingTags.includes('no-cook') || existingTags.includes('no_cook')) {
    tags.push('no_cook');
  }

  // Quick: prepTime + cookTime <= 15
  if (r.prepTime + r.cookTime <= 15 && !existingTags.includes('quick')) {
    tags.push('quick');
  }

  // Cooling: raita, buttermilk, curd, watermelon, cucumber, lassi, coconut
  const coolingKw = ['raita', 'buttermilk', 'curd', 'watermelon', 'cucumber', 'lassi', 'coconut', 'smoothie', 'yogurt', 'fruit'];
  if (coolingKw.some(k => nameL.includes(k))) {
    tags.push('cooling');
  }

  // Warming: soup, dal, khichdi, chai, ginger, curry, stew
  const warmingKw = ['soup', 'dal', 'khichdi', 'chai', 'ginger', 'curry', 'stew', 'halwa', 'porridge'];
  if (warmingKw.some(k => nameL.includes(k))) {
    tags.push('warming');
  }

  // Needs reheat: biryani, curry, rice dishes, sabzi (not wraps/salads/smoothies)
  const reheatKw = ['biryani', 'curry', 'rice', 'sabzi', 'masala', 'bharta', 'kadhi', 'chawal'];
  const noReheatKw = ['salad', 'wrap', 'smoothie', 'shake', 'fruit', 'yogurt', 'curd', 'chaat', 'makhana', 'oats'];
  if (reheatKw.some(k => nameL.includes(k)) && !noReheatKw.some(k => nameL.includes(k))) {
    tags.push('needs_reheat');
  }

  // Batch-friendly: one-pot dishes, large servings
  if (existingTags.includes('one-pot') || existingTags.includes('comfort-food') || r.servings >= 2) {
    tags.push('batch_friendly');
  }

  // Air-fried: recipes mentioning air fryer or roasted snacks
  const airFriedKw = ['air fry', 'air-fry', 'air fried', 'air-fried', 'roasted makhana', 'roasted chana'];
  if (airFriedKw.some(k => nameL.includes(k)) || existingTags.includes('air-fried')) {
    tags.push('air-fried');
  }
  // Also infer for grilled/roasted items that work in air fryers
  const airFryerFriendly = ['tikka', 'grilled', 'roasted'];
  if (airFryerFriendly.some(k => nameL.includes(k)) && !tags.includes('air-fried')) {
    tags.push('air-fried');
  }

  return tags;
}

export function getRecipeById(id: string): Recipe | undefined {
  return recipes.find(r => r.id === id);
}

export function getRecipesByMealType(type: string): Recipe[] {
  return recipes.filter(r => r.mealType.includes(type as any));
}

export function filterRecipes(opts: {
  mealType?: string;
  tags?: string[];
  maxCalories?: number;
  maxPrepTime?: number;
  difficulty?: string;
  cuisines?: string[];
  excludeIds?: string[];
}): Recipe[] {
  return recipes.filter(r => {
    if (opts.mealType && !r.mealType.includes(opts.mealType as any)) return false;
    if (opts.tags?.length) {
      const hasConflict = opts.tags.some(tag => {
        if (tag === 'vegetarian') return r.tags.includes('non-veg');
        if (tag === 'vegan') return r.tags.includes('non-veg') || r.ingredients.some(i => ['Dairy', 'Meat', 'Seafood'].includes(i.category));
        return false;
      });
      if (hasConflict) return false;
    }
    if (opts.maxCalories && r.calories > opts.maxCalories) return false;
    if (opts.maxPrepTime && (r.prepTime + r.cookTime) > opts.maxPrepTime) return false;
    if (opts.difficulty && r.difficulty !== opts.difficulty) return false;
    if (opts.cuisines?.length && !opts.cuisines.includes(r.cuisine)) return false;
    if (opts.excludeIds?.length && opts.excludeIds.includes(r.id)) return false;
    return true;
  });
}
