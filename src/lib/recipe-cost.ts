import { Recipe } from './recipes';
import { findPrice } from './price-database';

/**
 * Estimate the cost of a recipe based on ingredient prices from the price database.
 * Returns estimated cost in ₹ for one serving.
 */
export function estimateRecipeCost(recipe: Recipe): number {
  let total = 0;
  let matchedAny = false;

  for (const ing of recipe.ingredients) {
    const price = findPrice(ing.name);
    if (!price) continue;
    matchedAny = true;

    // Parse quantity string to get a numeric value
    const qty = parseIngredientQuantity(ing.quantity, price.unit);
    total += price.basePrice * qty;
  }

  if (!matchedAny) {
    // Fallback: estimate based on calories (rough ₹3-5 per 100 kcal for Indian food)
    return Math.round(recipe.calories * 0.04);
  }

  // Cost per serving
  const perServing = recipe.servings > 0 ? total / recipe.servings : total;
  return Math.max(5, Math.round(perServing));
}

function parseIngredientQuantity(qtyStr: string, priceUnit: string): number {
  const lower = qtyStr.toLowerCase().trim();
  
  // Extract numeric value
  const numMatch = lower.match(/^([\d./]+)/);
  let num = 1;
  if (numMatch) {
    const raw = numMatch[1];
    if (raw.includes('/')) {
      const [a, b] = raw.split('/').map(Number);
      num = b ? a / b : 1;
    } else {
      num = parseFloat(raw) || 1;
    }
  }

  // Detect unit in quantity string
  if (priceUnit === 'kg') {
    if (lower.includes('g') && !lower.includes('kg')) return num / 1000;
    if (lower.includes('cup')) return num * 0.15; // ~150g per cup
    if (lower.includes('tbsp')) return num * 0.015;
    if (lower.includes('tsp')) return num * 0.005;
    return num; // assume kg or rough whole amount
  }
  if (priceUnit === 'liter') {
    if (lower.includes('ml')) return num / 1000;
    if (lower.includes('cup')) return num * 0.24;
    if (lower.includes('tbsp')) return num * 0.015;
    if (lower.includes('tsp')) return num * 0.005;
    return num;
  }
  // piece, dozen, etc.
  return num;
}

/** Cache for recipe costs to avoid recalculating */
const costCache = new Map<string, number>();

export function getRecipeCost(recipe: Recipe): number {
  if (costCache.has(recipe.id)) return costCache.get(recipe.id)!;
  const cost = estimateRecipeCost(recipe);
  costCache.set(recipe.id, cost);
  return cost;
}

export function clearCostCache() {
  costCache.clear();
}
