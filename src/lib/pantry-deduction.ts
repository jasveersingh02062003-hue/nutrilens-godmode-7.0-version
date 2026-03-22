/**
 * Pantry auto-deduction service.
 * When a home-cooked meal (from the meal plan) is logged, this deducts
 * the recipe's ingredients from pantry using FIFO.
 */

import { getRecipeById } from './recipes';
import { getPantryItems, deductFromPantry } from './pantry-store';

export interface DeductionResult {
  success: boolean;
  deductions: Array<{ ingredient: string; quantity: number; unit: string; cost: number }>;
  missingItems: string[];
}

/** Parse ingredient quantity string into numeric + unit */
function parseQuantity(qtyStr: string): { amount: number; unit: string } {
  const lower = qtyStr.toLowerCase().trim();
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

  // Detect unit
  if (lower.includes('kg')) return { amount: num * 1000, unit: 'g' };
  if (lower.includes('g') && !lower.includes('kg')) return { amount: num, unit: 'g' };
  if (lower.includes('liter') || lower.includes('litre')) return { amount: num * 1000, unit: 'ml' };
  if (lower.includes('ml')) return { amount: num, unit: 'ml' };
  if (lower.includes('cup')) return { amount: num * 150, unit: 'g' }; // rough
  if (lower.includes('tbsp')) return { amount: num * 15, unit: 'g' };
  if (lower.includes('tsp')) return { amount: num * 5, unit: 'g' };
  if (lower.includes('pcs') || lower.includes('pieces') || lower.includes('nos')) return { amount: num, unit: 'pcs' };

  return { amount: num, unit: 'pcs' };
}

/** Fuzzy match pantry item name to ingredient name */
function fuzzyMatch(ingredientName: string, pantryName: string): boolean {
  const a = ingredientName.toLowerCase().replace(/[^a-z]/g, '');
  const b = pantryName.toLowerCase().replace(/[^a-z]/g, '');
  return a.includes(b) || b.includes(a);
}

/**
 * Deduct ingredients for a recipe from pantry.
 * Returns what was deducted and what's missing.
 */
export function deductRecipeFromPantry(recipeId: string): DeductionResult {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return { success: false, deductions: [], missingItems: ['Recipe not found'] };

  const pantryItems = getPantryItems();
  const deductions: DeductionResult['deductions'] = [];
  const missingItems: string[] = [];

  for (const ing of recipe.ingredients) {
    const { amount, unit } = parseQuantity(ing.quantity);

    // Find matching pantry item
    const match = pantryItems.find(p => fuzzyMatch(ing.name, p.name) && p.quantity > 0);

    if (match) {
      // Deduct using FIFO
      const cost = deductFromPantry(ing.name, amount, match.unit);
      deductions.push({
        ingredient: ing.name,
        quantity: amount,
        unit,
        cost,
      });
    } else {
      // No match in pantry – not critical, just track
      missingItems.push(ing.name);
    }
  }

  return {
    success: true,
    deductions,
    missingItems,
  };
}

/**
 * Check which ingredients from a recipe are available in pantry.
 */
export function checkPantryAvailability(recipeId: string): { available: string[]; missing: string[] } {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return { available: [], missing: [] };

  const pantryItems = getPantryItems();
  const available: string[] = [];
  const missing: string[] = [];

  for (const ing of recipe.ingredients) {
    const match = pantryItems.find(p => fuzzyMatch(ing.name, p.name) && p.quantity > 0);
    if (match) {
      available.push(ing.name);
    } else {
      missing.push(ing.name);
    }
  }

  return { available, missing };
}