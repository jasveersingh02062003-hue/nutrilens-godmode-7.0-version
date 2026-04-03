import { scopedGet, scopedSet } from "./scoped-storage";
import { safeJsonParse } from "./safe-json";
// ============================================
// NutriLens AI – Smart Missed Meal Redistribution Service
// ============================================

import { UserProfile, DailyLog, getDailyLog, saveDailyLog } from '@/lib/store';
import { getMealTarget, getDailyAdjustments, saveDailyAdjustments, type MealTarget } from '@/lib/meal-targets';

const REDISTRIBUTION_HISTORY_KEY = 'nutrilens_redistribution_history';
const REDISTRIBUTION_PREFS_KEY = 'nutrilens_redistribution_prefs';
const CARRY_OVER_KEY = 'nutrilens_carry_over';
const SUMMARY_SHOWN_KEY = 'nutrilens_summary_shown_';
const REDISTRIBUTED_FLAG_KEY = 'nutrilens_redistributed_';

// ── Types ──

export interface RedistributionAllocation {
  mealType: string;
  label: string;
  addedCalories: number;
  addedProtein: number;
  addedCarbs: number;
  addedFat: number;
  originalTarget: MealTarget;
}

export interface RedistributionResult {
  missedMealType: string;
  missedTarget: MealTarget;
  allocations: RedistributionAllocation[];
}

export interface RedistributionPreferences {
  autoDistribute: boolean;
  carryOverToTomorrow: boolean;
}

export interface RedistributionHistoryEntry {
  date: string;
  missedMealType: string;
  missedLabel: string;
  allocations: RedistributionAllocation[];
  userConfirmed: boolean;
  timestamp: string;
}

export interface CarryOverData {
  fromDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  applied: boolean;
}

// ── Preferences ──

export function getRedistributionPrefs(): RedistributionPreferences {
  const data = scopedGet(REDISTRIBUTION_PREFS_KEY);
  return data ? JSON.parse(data) : { autoDistribute: false, carryOverToTomorrow: false };
}

export function saveRedistributionPrefs(prefs: RedistributionPreferences) {
  scopedSet(REDISTRIBUTION_PREFS_KEY, JSON.stringify(prefs));
}

// ── Proportional Calculation ──

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export function calculateProportionalDistribution(
  profile: UserProfile,
  missedMealType: string,
  date: string,
  customAllocations?: Record<string, number> // mealType -> percentage (0-100)
): RedistributionResult {
  const missedTarget = getMealTarget(profile, missedMealType);
  const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];
  const missedIndex = MEAL_ORDER.indexOf(missedMealType);
  const remainingMeals = MEAL_ORDER.filter((_, i) => i > missedIndex);

  // Get targets for remaining meals
  const remainingTargets = remainingMeals.map(m => ({
    type: m,
    target: getMealTarget(profile, m),
  }));

  const totalRemainingCal = remainingTargets.reduce((s, m) => s + m.target.calories, 0);

  const allocations: RedistributionAllocation[] = remainingTargets.map(m => {
    let proportion: number;
    if (customAllocations) {
      proportion = (customAllocations[m.type] || 0) / 100;
    } else {
      proportion = totalRemainingCal > 0 ? m.target.calories / totalRemainingCal : 1 / remainingTargets.length;
    }

    return {
      mealType: m.type,
      label: MEAL_LABELS[m.type] || m.type,
      addedCalories: Math.round(missedTarget.calories * proportion),
      addedProtein: Math.round(missedTarget.protein * proportion),
      addedCarbs: Math.round(missedTarget.carbs * proportion),
      addedFat: Math.round(missedTarget.fat * proportion),
      originalTarget: m.target,
    };
  });

  return { missedMealType, missedTarget, allocations };
}

// ── Apply Redistribution ──

export function applyRedistribution(
  result: RedistributionResult,
  date: string,
  carryOverCalories?: number
) {
  const adjustments = getDailyAdjustments(date);

  for (const alloc of result.allocations) {
    const existing = adjustments[alloc.mealType] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // If carry-over is set, reduce proportionally
    let calRatio = 1;
    if (carryOverCalories && carryOverCalories > 0 && result.missedTarget.calories > 0) {
      const distributed = result.missedTarget.calories - carryOverCalories;
      calRatio = distributed / result.missedTarget.calories;
    }

    adjustments[alloc.mealType] = {
      calories: existing.calories + Math.round(alloc.addedCalories * calRatio),
      protein: existing.protein + Math.round(alloc.addedProtein * calRatio),
      carbs: existing.carbs + Math.round(alloc.addedCarbs * calRatio),
      fat: existing.fat + Math.round(alloc.addedFat * calRatio),
    };
  }

  saveDailyAdjustments(date, adjustments);

  // Handle carry-over
  if (carryOverCalories && carryOverCalories > 0) {
    const ratio = carryOverCalories / result.missedTarget.calories;
    const carryOver: CarryOverData = {
      fromDate: date,
      calories: carryOverCalories,
      protein: Math.round(result.missedTarget.protein * ratio),
      carbs: Math.round(result.missedTarget.carbs * ratio),
      fat: Math.round(result.missedTarget.fat * ratio),
      applied: false,
    };
    scopedSet(CARRY_OVER_KEY, JSON.stringify(carryOver));
  }

  // Save history
  saveRedistributionHistory(date, result);
}

// ── History ──

function saveRedistributionHistory(date: string, result: RedistributionResult) {
  const history = getRedistributionHistory();
  history.push({
    date,
    missedMealType: result.missedMealType,
    missedLabel: MEAL_LABELS[result.missedMealType] || result.missedMealType,
    allocations: result.allocations,
    userConfirmed: true,
    timestamp: new Date().toISOString(),
  });
  // Keep last 30 entries
  const trimmed = history.slice(-30);
  scopedSet(REDISTRIBUTION_HISTORY_KEY, JSON.stringify(trimmed));
}

export function getRedistributionHistory(): RedistributionHistoryEntry[] {
  const data = scopedGet(REDISTRIBUTION_HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export function getYesterdayAdjustments(): RedistributionHistoryEntry[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  return getRedistributionHistory().filter(h => h.date === yKey);
}

// ── Carry Over ──

export function getPendingCarryOver(): CarryOverData | null {
  const data = scopedGet(CARRY_OVER_KEY);
  if (!data) return null;
  const co: CarryOverData = JSON.parse(data);
  if (co.applied) return null;
  return co;
}

export function applyCarryOver(date: string) {
  const co = getPendingCarryOver();
  if (!co) return;
  const adjustments = getDailyAdjustments(date);
  // Add carry-over to all meals proportionally (spread evenly)
  const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
  const perMeal = {
    calories: Math.round(co.calories / meals.length),
    protein: Math.round(co.protein / meals.length),
    carbs: Math.round(co.carbs / meals.length),
    fat: Math.round(co.fat / meals.length),
  };
  for (const m of meals) {
    const existing = adjustments[m] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    adjustments[m] = {
      calories: existing.calories + perMeal.calories,
      protein: existing.protein + perMeal.protein,
      carbs: existing.carbs + perMeal.carbs,
      fat: existing.fat + perMeal.fat,
    };
  }
  saveDailyAdjustments(date, adjustments);
  co.applied = true;
  scopedSet(CARRY_OVER_KEY, JSON.stringify(co));
}

// ── Summary Shown Flag ──

export function wasSummaryShown(date: string): boolean {
  return scopedGet(SUMMARY_SHOWN_KEY + date) === 'true';
}

export function markSummaryShown(date: string) {
  scopedSet(SUMMARY_SHOWN_KEY + date, 'true');
}

// ── Redistributed Flag (per meal per day) ──

export interface RedistributedMealInfo {
  mealType: string;
  allocations: RedistributionAllocation[];
  timestamp: string;
}

export function isRedistributed(date: string, mealType: string): boolean {
  const data = scopedGet(REDISTRIBUTED_FLAG_KEY + date);
  if (!data) return false;
  const flags: Record<string, boolean> = JSON.parse(data);
  return !!flags[mealType];
}

export function markRedistributed(date: string, mealType: string, allocations: RedistributionAllocation[]) {
  // Set flag
  const flagData = scopedGet(REDISTRIBUTED_FLAG_KEY + date);
  const flags: Record<string, boolean> = flagData ? JSON.parse(flagData) : {};
  flags[mealType] = true;
  scopedSet(REDISTRIBUTED_FLAG_KEY + date, JSON.stringify(flags));

  // Store details for display
  const detailKey = REDISTRIBUTED_FLAG_KEY + date + '_details';
  const detailData = scopedGet(detailKey);
  const details: Record<string, RedistributedMealInfo> = detailData ? JSON.parse(detailData) : {};
  details[mealType] = { mealType, allocations, timestamp: new Date().toISOString() };
  scopedSet(detailKey, JSON.stringify(details));
}

export function getRedistributionDetails(date: string, mealType: string): RedistributedMealInfo | null {
  const detailKey = REDISTRIBUTED_FLAG_KEY + date + '_details';
  const data = scopedGet(detailKey);
  if (!data) return null;
  const details: Record<string, RedistributedMealInfo> = JSON.parse(data);
  return details[mealType] || null;
}

export function getAllRedistributionDetailsForDate(date: string): Record<string, RedistributedMealInfo> {
  const detailKey = REDISTRIBUTED_FLAG_KEY + date + '_details';
  const data = scopedGet(detailKey);
  return data ? JSON.parse(data) : {};
}

// ── Undo Redistribution ──

export function undoRedistribution(date: string, mealType: string): boolean {
  // Check if actually redistributed
  if (!isRedistributed(date, mealType)) return false;

  // Get the allocation details so we know what to subtract
  const details = getRedistributionDetails(date, mealType);
  if (!details) {
    // No details stored, just clear the flag
    clearRedistributedFlag(date, mealType);
    return true;
  }

  // Subtract the added amounts from each target meal's daily adjustments
  const adjustments = getDailyAdjustments(date);
  for (const alloc of details.allocations) {
    const existing = adjustments[alloc.mealType];
    if (existing) {
      adjustments[alloc.mealType] = {
        calories: existing.calories - alloc.addedCalories,
        protein: existing.protein - alloc.addedProtein,
        carbs: existing.carbs - alloc.addedCarbs,
        fat: existing.fat - alloc.addedFat,
      };
    }
  }
  saveDailyAdjustments(date, adjustments);

  // Clear the redistributed flag and details
  clearRedistributedFlag(date, mealType);

  // Remove from history
  const history = getRedistributionHistory();
  const filtered = history.filter(h => !(h.date === date && h.missedMealType === mealType));
  scopedSet(REDISTRIBUTION_HISTORY_KEY, JSON.stringify(filtered));

  return true;
}

function clearRedistributedFlag(date: string, mealType: string) {
  // Clear flag
  const flagData = scopedGet(REDISTRIBUTED_FLAG_KEY + date);
  if (flagData) {
    const flags: Record<string, boolean> = JSON.parse(flagData);
    delete flags[mealType];
    scopedSet(REDISTRIBUTED_FLAG_KEY + date, JSON.stringify(flags));
  }
  // Clear details
  const detailKey = REDISTRIBUTED_FLAG_KEY + date + '_details';
  const detailData = scopedGet(detailKey);
  if (detailData) {
    const details: Record<string, RedistributedMealInfo> = JSON.parse(detailData);
    delete details[mealType];
    scopedSet(detailKey, JSON.stringify(details));
  }
}
