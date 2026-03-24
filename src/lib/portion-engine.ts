import { Recipe } from './recipes';

// ─── Quantity Parsing ───

const UNIT_TO_GRAMS: Record<string, number> = {
  cup: 200, cups: 200,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  medium: 100, small: 60, large: 150,
  piece: 80, pieces: 80, pc: 80, pcs: 80,
  handful: 25, handfuls: 25,
  slice: 30, slices: 30,
  clove: 5, cloves: 5,
  bunch: 40, leaf: 2, leaves: 2,
  pinch: 1,
  ml: 1, l: 1000, litre: 1000, liter: 1000,
  kg: 1000, g: 1,
};

/**
 * Parse a recipe quantity string like "200g", "1 cup", "2 medium", "1/2 tbsp"
 * into grams. Returns NaN if unparseable.
 */
export function parseQuantityToGrams(qtyStr: string): number {
  if (!qtyStr) return NaN;
  const s = qtyStr.trim().toLowerCase();

  // Direct gram pattern: "200g", "1.5kg"
  const gramMatch = s.match(/^([\d.\/]+)\s*(?:g|gm|gms|gram|grams)$/);
  if (gramMatch) return parseFraction(gramMatch[1]);

  const kgMatch = s.match(/^([\d.\/]+)\s*kg$/);
  if (kgMatch) return parseFraction(kgMatch[1]) * 1000;

  const mlMatch = s.match(/^([\d.\/]+)\s*ml$/);
  if (mlMatch) return parseFraction(mlMatch[1]); // ~1:1 for water-based

  // Pattern: "2 cups", "1/2 tbsp", "3 medium"
  const unitMatch = s.match(/^([\d.\/]+)\s+(\w+)$/);
  if (unitMatch) {
    const num = parseFraction(unitMatch[1]);
    const unit = unitMatch[2];
    const gPerUnit = UNIT_TO_GRAMS[unit];
    if (gPerUnit) return num * gPerUnit;
  }

  // Pattern: "1 medium onion" (number + unit + item)
  const extMatch = s.match(/^([\d.\/]+)\s+(\w+)\s+/);
  if (extMatch) {
    const num = parseFraction(extMatch[1]);
    const unit = extMatch[2];
    const gPerUnit = UNIT_TO_GRAMS[unit];
    if (gPerUnit) return num * gPerUnit;
  }

  // Just a number (assume grams)
  const numOnly = s.match(/^([\d.\/]+)$/);
  if (numOnly) return parseFraction(numOnly[1]);

  // "to taste", "as needed" etc → 5g nominal
  if (s.includes('taste') || s.includes('needed') || s.includes('pinch')) return 5;

  return NaN;
}

function parseFraction(s: string): number {
  if (s.includes('/')) {
    const [num, den] = s.split('/');
    return parseFloat(num) / parseFloat(den);
  }
  return parseFloat(s);
}

// ─── Portion Scaling ───

export interface ScaledIngredient {
  name: string;
  originalQuantity: string;
  scaledGrams: number;
  displayQuantity: string;
  category: string;
}

export interface PortionResult {
  ingredients: ScaledIngredient[];
  scaleFactor: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

/**
 * Scale a recipe's ingredients to hit target macros.
 * Uses calorie ratio as primary scale, clamped 0.5–2.0.
 */
export function calculatePortions(
  recipe: Recipe,
  targetCalories: number,
  _targetProtein?: number
): PortionResult {
  if (!recipe.calories || recipe.calories === 0) {
    return {
      ingredients: recipe.ingredients.map(i => ({
        name: i.name, originalQuantity: i.quantity,
        scaledGrams: parseQuantityToGrams(i.quantity) || 0,
        displayQuantity: i.quantity, category: i.category,
      })),
      scaleFactor: 1, totalCalories: recipe.calories,
      totalProtein: recipe.protein, totalCarbs: recipe.carbs, totalFat: recipe.fat,
    };
  }

  const rawScale = targetCalories / recipe.calories;
  const scaleFactor = Math.min(2.0, Math.max(0.5, rawScale));

  const ingredients: ScaledIngredient[] = recipe.ingredients.map(ing => {
    const baseGrams = parseQuantityToGrams(ing.quantity);
    const scaledGrams = isNaN(baseGrams) ? 0 : Math.round(baseGrams * scaleFactor);
    return {
      name: ing.name,
      originalQuantity: ing.quantity,
      scaledGrams,
      displayQuantity: scaledGrams > 0 ? formatGrams(scaledGrams) : ing.quantity,
      category: ing.category,
    };
  });

  return {
    ingredients,
    scaleFactor,
    totalCalories: Math.round(recipe.calories * scaleFactor),
    totalProtein: Math.round(recipe.protein * scaleFactor),
    totalCarbs: Math.round(recipe.carbs * scaleFactor),
    totalFat: Math.round(recipe.fat * scaleFactor),
  };
}

// ─── Formatting ───

export function formatGrams(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
  return `${Math.round(grams)}g`;
}

// ─── Grocery Aggregation ───

export interface AggregatedItem {
  name: string;
  totalGrams: number;
  displayQuantity: string;
  category: string;
  occurrences: number;
}

/**
 * Aggregate ingredients across multiple recipes, summing grams.
 */
export function aggregateIngredients(
  allIngredients: { name: string; quantity: string; category: string }[]
): AggregatedItem[] {
  const map: Record<string, { totalGrams: number; category: string; count: number; hasUnparsed: boolean; rawQuantities: string[] }> = {};

  for (const ing of allIngredients) {
    const key = ing.name.toLowerCase().trim();
    if (!map[key]) {
      map[key] = { totalGrams: 0, category: ing.category, count: 0, hasUnparsed: false, rawQuantities: [] };
    }
    const grams = parseQuantityToGrams(ing.quantity);
    if (!isNaN(grams)) {
      map[key].totalGrams += grams;
    } else {
      map[key].hasUnparsed = true;
      map[key].rawQuantities.push(ing.quantity);
    }
    map[key].count++;
  }

  return Object.entries(map).map(([key, val]) => {
    let displayQuantity: string;
    if (val.hasUnparsed && val.totalGrams === 0) {
      // All unparsed — show count
      displayQuantity = val.count > 1 ? `${val.count}x (${val.rawQuantities[0]})` : val.rawQuantities[0];
    } else {
      displayQuantity = formatGrams(Math.round(val.totalGrams));
    }

    // Capitalize first letter
    const name = key.charAt(0).toUpperCase() + key.slice(1);

    return {
      name,
      totalGrams: Math.round(val.totalGrams),
      displayQuantity,
      category: val.category,
      occurrences: val.count,
    };
  });
}
