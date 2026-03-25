// ============================================
// Meal Adjustment Engine
// Adjusts existing meal plan portions based on corrected targets
// ============================================

import { type FoodItem } from '@/lib/store';

export interface MealAdjustmentResult {
  adjustedItems: FoodItem[];
  changes: string[];
}

/**
 * Adjust meal items to fit within the adjusted calorie target while
 * preserving protein. Scales portions proportionally.
 */
export function adjustMealPlan(
  items: FoodItem[],
  currentCalories: number,
  adjustedTarget: number,
  proteinTarget: number
): MealAdjustmentResult {
  if (items.length === 0 || currentCalories <= 0) {
    return { adjustedItems: items, changes: [] };
  }

  const calorieDiff = currentCalories - adjustedTarget;
  const changes: string[] = [];

  // If within 5% tolerance, no changes needed
  if (Math.abs(calorieDiff) < adjustedTarget * 0.05) {
    return { adjustedItems: items, changes: [] };
  }

  const adjustedItems = items.map(item => ({ ...item }));

  if (calorieDiff > 0) {
    // REDUCE calories: scale down portions, prioritize keeping high-protein items
    const scaleFactor = Math.max(0.5, adjustedTarget / currentCalories);

    // Sort by protein density (protein per calorie) — keep high-protein items larger
    const sortedIndices = adjustedItems
      .map((item, idx) => ({ idx, proteinDensity: item.protein / Math.max(1, item.calories) }))
      .sort((a, b) => a.proteinDensity - b.proteinDensity);

    let remaining = calorieDiff;

    for (const { idx } of sortedIndices) {
      if (remaining <= 0) break;
      const item = adjustedItems[idx];
      const currentItemCal = item.calories * item.quantity;
      const minQty = Math.max(0.5, item.quantity * 0.5);
      const maxReduction = currentItemCal - (item.calories * minQty);

      if (maxReduction > 0) {
        const reduction = Math.min(remaining, maxReduction);
        const newQty = Math.max(minQty, item.quantity - (reduction / item.calories));
        const oldQty = item.quantity;
        item.quantity = Math.round(newQty * 10) / 10;
        remaining -= (oldQty - item.quantity) * item.calories;

        if (Math.abs(oldQty - item.quantity) >= 0.1) {
          changes.push(`Reduced ${item.name} from ${oldQty} to ${item.quantity}`);
        }
      }
    }
  } else {
    // INCREASE calories: scale up high-protein items first
    const scaleFactor = Math.min(1.5, adjustedTarget / currentCalories);

    const sortedIndices = adjustedItems
      .map((item, idx) => ({ idx, proteinDensity: item.protein / Math.max(1, item.calories) }))
      .sort((a, b) => b.proteinDensity - a.proteinDensity);

    let remaining = Math.abs(calorieDiff);

    for (const { idx } of sortedIndices) {
      if (remaining <= 0) break;
      const item = adjustedItems[idx];
      const maxQty = item.quantity * 1.5;
      const maxIncrease = (maxQty - item.quantity) * item.calories;

      if (maxIncrease > 0) {
        const increase = Math.min(remaining, maxIncrease);
        const newQty = item.quantity + (increase / item.calories);
        const oldQty = item.quantity;
        item.quantity = Math.round(Math.min(maxQty, newQty) * 10) / 10;
        remaining -= (item.quantity - oldQty) * item.calories;

        if (Math.abs(item.quantity - oldQty) >= 0.1) {
          changes.push(`Increased ${item.name} from ${oldQty} to ${item.quantity}`);
        }
      }
    }
  }

  // Protein check: if total protein dropped below target, boost high-protein items
  const totalProtein = adjustedItems.reduce((s, i) => s + i.protein * i.quantity, 0);
  if (totalProtein < proteinTarget * 0.9) {
    const proteinGap = proteinTarget - totalProtein;
    const highProteinItems = adjustedItems
      .filter(i => i.protein > 5)
      .sort((a, b) => b.protein - a.protein);

    for (const item of highProteinItems) {
      if (proteinGap <= 0) break;
      const maxQty = item.quantity * 1.3;
      const boost = Math.min((maxQty - item.quantity), proteinGap / item.protein);
      if (boost > 0.1) {
        const oldQty = item.quantity;
        item.quantity = Math.round((item.quantity + boost) * 10) / 10;
        changes.push(`Boosted ${item.name} for protein (${oldQty} → ${item.quantity})`);
      }
    }
  }

  if (changes.length > 0) {
    changes.unshift("Today's plan is slightly adjusted for balance.");
  }

  return { adjustedItems, changes };
}
