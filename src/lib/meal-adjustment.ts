// ============================================
// Meal Adjustment Engine
// Adjusts existing meal plan portions based on corrected targets
// Supports meal locking: only modifies flexible (unlogged) items
// ============================================

import { type FoodItem } from '@/lib/store';

export interface MealAdjustmentResult {
  adjustedItems: FoodItem[];
  changes: string[];
}

/**
 * Adjust meal items to fit within the adjusted calorie target while
 * preserving protein. Scales portions proportionally.
 * 
 * @param items - All food items for the meal slot
 * @param currentCalories - Total calories of all items
 * @param adjustedTarget - The corrected calorie target
 * @param proteinTarget - Fixed protein target (never reduced)
 * @param lockedCalories - Calories from already-logged (locked) meals to subtract from target
 */
export function adjustMealPlan(
  items: FoodItem[],
  currentCalories: number,
  adjustedTarget: number,
  proteinTarget: number,
  lockedCalories: number = 0
): MealAdjustmentResult {
  if (items.length === 0 || currentCalories <= 0) {
    return { adjustedItems: items, changes: [] };
  }

  // Separate locked vs flexible items
  const lockedItems: FoodItem[] = [];
  const flexibleItems: FoodItem[] = [];

  for (const item of items) {
    if ((item as any).status === 'locked') {
      lockedItems.push({ ...item });
    } else {
      flexibleItems.push({ ...item });
    }
  }

  // If no flexible items, nothing to adjust
  if (flexibleItems.length === 0) {
    return { adjustedItems: items.map(i => ({ ...i })), changes: [] };
  }

  // Effective target for flexible items only
  const lockedCal = lockedCalories || lockedItems.reduce((s, i) => s + i.calories * i.quantity, 0);
  const flexTarget = adjustedTarget - lockedCal;
  const flexCurrentCal = flexibleItems.reduce((s, i) => s + i.calories * i.quantity, 0);
  const calorieDiff = flexCurrentCal - flexTarget;
  const changes: string[] = [];

  // If within 5% tolerance, no changes needed
  if (Math.abs(calorieDiff) < flexTarget * 0.05) {
    return { adjustedItems: [...lockedItems, ...flexibleItems], changes: [] };
  }

  if (calorieDiff > 0) {
    // REDUCE calories: scale down portions, prioritize keeping high-protein items
    // Sort by PES (if available) or proteinDensity ascending — remove lowest-value items first
    const sortedIndices = flexibleItems
      .map((item, idx) => ({
        idx,
        sortKey: (item as any).pes != null ? (item as any).pes : item.protein / Math.max(1, item.calories),
      }))
      .sort((a, b) => a.sortKey - b.sortKey);

    let remaining = calorieDiff;

    for (const { idx } of sortedIndices) {
      if (remaining <= 0) break;
      const item = flexibleItems[idx];
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
    // Sort by PES (if available) or proteinDensity descending — boost highest-value items first
    const sortedIndices = flexibleItems
      .map((item, idx) => ({
        idx,
        sortKey: (item as any).pes != null ? (item as any).pes : item.protein / Math.max(1, item.calories),
      }))
      .sort((a, b) => b.sortKey - a.sortKey);

    let remaining = Math.abs(calorieDiff);

    for (const { idx } of sortedIndices) {
      if (remaining <= 0) break;
      const item = flexibleItems[idx];
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
  const allItems = [...lockedItems, ...flexibleItems];
  const totalProtein = allItems.reduce((s, i) => s + i.protein * i.quantity, 0);
  if (totalProtein < proteinTarget * 0.9) {
    const proteinGap = proteinTarget - totalProtein;
    const highProteinFlex = flexibleItems
      .filter(i => i.protein > 5)
      .sort((a, b) => b.protein - a.protein);

    let gap = proteinGap;
    for (const item of highProteinFlex) {
      if (gap <= 0) break;
      const maxQty = item.quantity * 1.3;
      const boost = Math.min((maxQty - item.quantity), gap / item.protein);
      if (boost > 0.1) {
        const oldQty = item.quantity;
        item.quantity = Math.round((item.quantity + boost) * 10) / 10;
        gap -= (item.quantity - oldQty) * item.protein;
        changes.push(`Boosted ${item.name} for protein (${oldQty} → ${item.quantity})`);
      }
    }
  }

  if (changes.length > 0) {
    changes.unshift("Today's plan is slightly adjusted for balance.");
  }

  return { adjustedItems: allItems, changes };
}
