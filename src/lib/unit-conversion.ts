// Unit Conversion Service
// Maps food units to grams and recalculates nutrition in real time

export interface UnitOption {
  unit: string;
  gramsPerUnit: number;
  description?: string;
}

// Default unit options available for all foods
const UNIVERSAL_UNITS: UnitOption[] = [
  { unit: 'gram', gramsPerUnit: 1, description: '1 gram' },
  { unit: 'kg', gramsPerUnit: 1000, description: '1 kilogram' },
];

// Category-based default unit options
const CATEGORY_UNITS: Record<string, UnitOption[]> = {
  Cereals: [
    { unit: 'piece', gramsPerUnit: 50, description: '1 medium piece' },
    { unit: 'plate', gramsPerUnit: 200, description: '1 plate' },
    { unit: 'bowl', gramsPerUnit: 200, description: '1 medium bowl' },
    { unit: 'serving', gramsPerUnit: 150, description: '1 serving' },
    { unit: 'tbsp', gramsPerUnit: 15, description: '1 tablespoon' },
  ],
  Dals: [
    { unit: 'bowl', gramsPerUnit: 150, description: '1 medium bowl' },
    { unit: 'katori', gramsPerUnit: 120, description: '1 katori' },
    { unit: 'cup', gramsPerUnit: 200, description: '1 cup' },
    { unit: 'serving', gramsPerUnit: 150, description: '1 serving' },
  ],
  Vegetables: [
    { unit: 'bowl', gramsPerUnit: 150, description: '1 medium bowl' },
    { unit: 'katori', gramsPerUnit: 120, description: '1 katori' },
    { unit: 'cup', gramsPerUnit: 150, description: '1 cup' },
    { unit: 'serving', gramsPerUnit: 100, description: '1 serving' },
    { unit: 'piece', gramsPerUnit: 80, description: '1 piece' },
  ],
  'Non-Veg': [
    { unit: 'piece', gramsPerUnit: 80, description: '1 piece' },
    { unit: 'serving', gramsPerUnit: 150, description: '1 serving' },
    { unit: 'plate', gramsPerUnit: 200, description: '1 plate' },
    { unit: 'bowl', gramsPerUnit: 150, description: '1 bowl' },
  ],
  Dairy: [
    { unit: 'glass', gramsPerUnit: 200, description: '1 glass' },
    { unit: 'cup', gramsPerUnit: 200, description: '1 cup' },
    { unit: 'bowl', gramsPerUnit: 150, description: '1 bowl' },
    { unit: 'piece', gramsPerUnit: 30, description: '1 piece' },
    { unit: 'tbsp', gramsPerUnit: 15, description: '1 tablespoon' },
    { unit: 'serving', gramsPerUnit: 100, description: '1 serving' },
  ],
  Snacks: [
    { unit: 'piece', gramsPerUnit: 30, description: '1 piece' },
    { unit: 'serving', gramsPerUnit: 50, description: '1 serving' },
    { unit: 'plate', gramsPerUnit: 100, description: '1 plate' },
    { unit: 'bowl', gramsPerUnit: 100, description: '1 bowl' },
    { unit: 'cup', gramsPerUnit: 80, description: '1 cup' },
  ],
  Sweets: [
    { unit: 'piece', gramsPerUnit: 40, description: '1 piece' },
    { unit: 'serving', gramsPerUnit: 50, description: '1 serving' },
    { unit: 'bowl', gramsPerUnit: 100, description: '1 bowl' },
  ],
  Beverages: [
    { unit: 'glass', gramsPerUnit: 200, description: '1 glass' },
    { unit: 'cup', gramsPerUnit: 150, description: '1 cup' },
    { unit: 'bottle', gramsPerUnit: 500, description: '1 bottle' },
    { unit: 'serving', gramsPerUnit: 200, description: '1 serving' },
  ],
  Fruits: [
    { unit: 'piece', gramsPerUnit: 120, description: '1 medium piece' },
    { unit: 'bowl', gramsPerUnit: 150, description: '1 bowl' },
    { unit: 'cup', gramsPerUnit: 150, description: '1 cup' },
    { unit: 'slice', gramsPerUnit: 30, description: '1 slice' },
    { unit: 'serving', gramsPerUnit: 100, description: '1 serving' },
  ],
  'Nuts & Seeds': [
    { unit: 'handful', gramsPerUnit: 25, description: '1 handful' },
    { unit: 'tbsp', gramsPerUnit: 10, description: '1 tablespoon' },
    { unit: 'piece', gramsPerUnit: 3, description: '1 piece' },
    { unit: 'serving', gramsPerUnit: 30, description: '1 serving' },
  ],
  Oils: [
    { unit: 'tsp', gramsPerUnit: 5, description: '1 teaspoon' },
    { unit: 'tbsp', gramsPerUnit: 15, description: '1 tablespoon' },
    { unit: 'serving', gramsPerUnit: 10, description: '1 serving' },
  ],
  Spices: [
    { unit: 'tsp', gramsPerUnit: 3, description: '1 teaspoon' },
    { unit: 'tbsp', gramsPerUnit: 8, description: '1 tablespoon' },
    { unit: 'pinch', gramsPerUnit: 0.5, description: '1 pinch' },
  ],
};

// Food-specific overrides (gramsPerUnit matching the food's defaultServing)
const FOOD_UNIT_OVERRIDES: Record<string, UnitOption[]> = {};

/**
 * Get all available unit options for a food item.
 * Priority: food-specific overrides > food's own serving info > category defaults > universal
 */
export function getUnitOptionsForFood(
  foodId: string,
  category: string,
  defaultServing: number,
  servingUnit: string,
): UnitOption[] {
  const overrides = FOOD_UNIT_OVERRIDES[foodId];
  if (overrides) {
    return deduplicateUnits([...overrides, ...UNIVERSAL_UNITS]);
  }

  // Build from food's own data + category
  const foodUnit: UnitOption = {
    unit: servingUnit,
    gramsPerUnit: defaultServing,
    description: `1 ${servingUnit} (${defaultServing}g)`,
  };

  const categoryUnits = CATEGORY_UNITS[category] || CATEGORY_UNITS['Snacks'] || [];

  return deduplicateUnits([foodUnit, ...categoryUnits, ...UNIVERSAL_UNITS]);
}

function deduplicateUnits(units: UnitOption[]): UnitOption[] {
  const seen = new Set<string>();
  return units.filter(u => {
    const key = u.unit.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Convert quantity + unit to total grams.
 */
export function convertToGrams(
  quantity: number,
  unit: string,
  unitOptions: UnitOption[],
): number {
  const opt = unitOptions.find(u => u.unit === unit);
  if (!opt) return quantity * 100; // fallback: assume 100g per unit
  return quantity * opt.gramsPerUnit;
}

/**
 * Calculate nutrition from per-100g values for a given quantity and unit.
 */
export function calculateNutrition(
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber?: number },
  quantity: number,
  unit: string,
  unitOptions: UnitOption[],
): { calories: number; protein: number; carbs: number; fat: number; fiber: number; totalGrams: number } {
  const totalGrams = convertToGrams(quantity, unit, unitOptions);
  const factor = totalGrams / 100;

  return {
    calories: Math.round(per100g.calories * factor),
    protein: +(per100g.protein * factor).toFixed(1),
    carbs: +(per100g.carbs * factor).toFixed(1),
    fat: +(per100g.fat * factor).toFixed(1),
    fiber: +((per100g.fiber || 0) * factor).toFixed(1),
    totalGrams: Math.round(totalGrams),
  };
}

/**
 * Find the gramsPerUnit for a given unit string from options.
 */
export function getGramsPerUnit(unit: string, unitOptions: UnitOption[]): number {
  return unitOptions.find(u => u.unit === unit)?.gramsPerUnit || 100;
}
