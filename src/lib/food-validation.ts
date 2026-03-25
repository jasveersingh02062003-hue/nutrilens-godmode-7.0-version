// Food logging validation layer
// Catches impossible nutrition values before they reach the user

export interface ValidationWarning {
  type: 'calorie_density' | 'carb_exceeds_weight' | 'portion_outlier' | 'meal_outlier';
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Validate a single food item's nutrition values.
 * All values should be for the TOTAL quantity (calories * servings).
 */
export function validateFoodItem(
  name: string,
  totalCalories: number,
  totalCarbs: number,
  totalProtein: number,
  totalFat: number,
  estimatedWeightGrams?: number,
  quantity?: number,
  unit?: string,
): ValidationWarning[] {
  // RULE 0: Macro-calorie cross-check — (P*4)+(C*4)+(F*9) should ≈ calories
  const calculatedCal = (totalProtein * 4) + (totalCarbs * 4) + (totalFat * 9);
  if (totalCalories > 50 && Math.abs(calculatedCal - totalCalories) > Math.max(50, totalCalories * 0.15)) {
    console.warn(`⚠️ Nutrition mismatch for ${name}: macros suggest ${Math.round(calculatedCal)} kcal but reported ${totalCalories} kcal`);
  }
  const warnings: ValidationWarning[] = [];
  const grams = estimatedWeightGrams || 100;
  const totalGrams = grams * (quantity || 1);

  // RULE 1: Calorie density check — max possible is ~9 kcal/g (pure fat)
  if (totalCalories > totalGrams * 9) {
    warnings.push({
      type: 'calorie_density',
      message: `${totalCalories} kcal for ${totalGrams}g seems too high. Please check portion.`,
      severity: 'error',
    });
  }

  // RULE 2: Carbs cannot exceed total weight
  if (totalCarbs > totalGrams) {
    warnings.push({
      type: 'carb_exceeds_weight',
      message: `${Math.round(totalCarbs)}g carbs can't exceed ${totalGrams}g food weight.`,
      severity: 'error',
    });
  }

  // RULE 3: Single item > 1500 kcal is suspicious
  if (totalCalories > 1500) {
    warnings.push({
      type: 'meal_outlier',
      message: `${totalCalories} kcal for ${name} is very high. Double-check quantity.`,
      severity: 'warning',
    });
  }

  // RULE 4: Portion sanity for common units
  if (unit === 'piece' || unit === 'roti' || unit === 'paratha' || unit === 'naan') {
    if ((quantity || 1) > 10) {
      warnings.push({
        type: 'portion_outlier',
        message: `${quantity} ${unit}s of ${name} — are you sure?`,
        severity: 'warning',
      });
    }
  }

  return warnings;
}

/**
 * Validate entire meal totals
 */
export function validateMealTotals(
  totalCalories: number,
  totalProtein: number,
  totalCarbs: number,
  totalFat: number,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (totalCalories > 3000) {
    warnings.push({
      type: 'meal_outlier',
      message: `${Math.round(totalCalories)} kcal in one meal is unusually high. Please verify items.`,
      severity: 'warning',
    });
  }

  // Macros should roughly sum to calories (4*P + 4*C + 9*F ≈ calories, ±30%)
  const expectedCal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
  if (totalCalories > 50 && Math.abs(expectedCal - totalCalories) / totalCalories > 0.4) {
    warnings.push({
      type: 'calorie_density',
      message: `Macros don't add up to total calories. Data may be inaccurate.`,
      severity: 'warning',
    });
  }

  return warnings;
}
