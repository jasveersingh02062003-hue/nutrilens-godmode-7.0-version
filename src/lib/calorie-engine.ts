// ============================================
// NutriLens AI – Master Calorie Engine
// Single source of truth for daily calorie state
// ============================================

import { DailyLog, UserProfile } from '@/lib/store';
import { calculateBurnBreakdown } from '@/lib/burn-service';
import { getDailyAdjustments } from '@/lib/meal-targets';
import { getAdjustedDailyTarget } from '@/lib/calorie-correction';

// ── Types ──

export type MealSlotStatus = 'pending' | 'completed' | 'missed';

export interface MealSlot {
  name: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  status: MealSlotStatus;
  consumedKcal: number;
  targetKcal: number;
}

export interface DayState {
  /** The user's original profile target (immutable truth) */
  originalTarget: number;
  /** Target after correction engine adjustments */
  adjustedTarget: number;
  totalBurned: number;
  totalAllowed: number;
  totalConsumed: number;
  remaining: number;
  slots: MealSlot[];
}

// ── Constants ──

const MEAL_NAMES: MealSlot['name'][] = ['breakfast', 'lunch', 'snacks', 'dinner'];

const SKIPPED_KEY_PREFIX = 'nutrilens_skipped_';

// Meal type mapping: store uses 'snack', engine uses 'snacks'
function toStoreMealType(name: MealSlot['name']): string {
  return name === 'snacks' ? 'snack' : name;
}

// ── Weight tables (fixed, by count of pending meals) ──

type WeightTable = Partial<Record<MealSlot['name'], number>>;

const WEIGHT_TABLES: Record<number, WeightTable> = {
  4: { breakfast: 0.25, lunch: 0.30, snacks: 0.15, dinner: 0.30 },
  3: { breakfast: 0.25, lunch: 0.40, snacks: 0.20, dinner: 0.40 },
  // When 3 meals remain, we pick whichever 3 are actually pending
  2: { breakfast: 0.40, lunch: 0.40, snacks: 0.30, dinner: 0.70 },
  1: { breakfast: 1.0, lunch: 1.0, snacks: 1.0, dinner: 1.0 },
};

function getWeightForMeal(name: MealSlot['name'], pendingCount: number, pendingNames: MealSlot['name'][]): number {
  if (pendingCount <= 0) return 0;
  if (pendingCount >= 4) return WEIGHT_TABLES[4][name] || 0.25;
  if (pendingCount === 1) return 1.0;

  // For 2 and 3 pending meals, use specific weight maps
  if (pendingCount === 2) {
    // If it's the classic snacks+dinner combo
    if (pendingNames.includes('snacks') && pendingNames.includes('dinner')) {
      return name === 'snacks' ? 0.30 : 0.70;
    }
    // If it's lunch+dinner
    if (pendingNames.includes('lunch') && pendingNames.includes('dinner')) {
      return name === 'lunch' ? 0.40 : 0.60;
    }
    // Generic fallback: split evenly
    return 0.50;
  }

  if (pendingCount === 3) {
    // lunch+snacks+dinner (most common: breakfast done)
    if (!pendingNames.includes('breakfast')) {
      return name === 'lunch' ? 0.40 : name === 'snacks' ? 0.20 : 0.40;
    }
    // breakfast+snacks+dinner (lunch done)
    if (!pendingNames.includes('lunch')) {
      return name === 'breakfast' ? 0.30 : name === 'snacks' ? 0.20 : 0.50;
    }
    // breakfast+lunch+dinner (snacks done)
    if (!pendingNames.includes('snacks')) {
      return name === 'breakfast' ? 0.25 : name === 'lunch' ? 0.35 : 0.40;
    }
    // breakfast+lunch+snacks (dinner done — unusual)
    return name === 'breakfast' ? 0.30 : name === 'lunch' ? 0.40 : 0.30;
  }

  return 1.0 / pendingCount;
}

// ── Skip persistence ──

export function getSkippedMeals(date: string): string[] {
  const data = localStorage.getItem(SKIPPED_KEY_PREFIX + date);
  return data ? JSON.parse(data) : [];
}

export function skipMeal(date: string, mealType: string): void {
  const skipped = getSkippedMeals(date);
  const normalized = mealType === 'snack' ? 'snacks' : mealType;
  if (!skipped.includes(normalized)) {
    skipped.push(normalized);
    localStorage.setItem(SKIPPED_KEY_PREFIX + date, JSON.stringify(skipped));
  }
}

export function unskipMeal(date: string, mealType: string): void {
  const normalized = mealType === 'snack' ? 'snacks' : mealType;
  const skipped = getSkippedMeals(date).filter(s => s !== normalized);
  localStorage.setItem(SKIPPED_KEY_PREFIX + date, JSON.stringify(skipped));
}

// ── Auto-missed detection by time ──

const MISSED_THRESHOLDS: Record<MealSlot['name'], number> = {
  breakfast: 11,
  lunch: 16,
  snacks: 19,
  dinner: 23,
};

// ── Master recalculation ──

export function recalculateDay(profile: UserProfile | null, log: DailyLog): DayState {
  const adjustedTarget = getAdjustedDailyTarget(profile);
  const originalTarget = profile?.dailyCalories || 1600;
  const date = log.date || new Date().toISOString().split('T')[0];

  // Total burned (using effective burn from burn-service)
  const totalBurned = log.burned
    ? calculateBurnBreakdown(log.burned).effectiveBurn
    : log.caloriesBurned || 0;

  const totalAllowed = adjustedTarget + totalBurned;

  // Skipped meals
  const skipped = getSkippedMeals(date);
  const currentHour = new Date().getHours();

  // Build slots
  const slots: MealSlot[] = MEAL_NAMES.map(name => {
    const storeType = toStoreMealType(name);
    const meals = (log.meals || []).filter(m => m.type === storeType);
    // Recompute from items to avoid stale stored totals
    const consumedKcal = meals.reduce((s, m) =>
      s + m.items.reduce((is, i) => is + (i.calories || 0) * (i.quantity || 1), 0), 0);

    let status: MealSlotStatus = 'pending';
    if (skipped.includes(name)) {
      status = 'missed';
    } else if (meals.length > 0) {
      status = 'completed';
    } else if (currentHour >= MISSED_THRESHOLDS[name]) {
      // Auto-detect missed if time has passed and nothing logged
      status = 'missed';
    }

    return { name, status, consumedKcal, targetKcal: 0 };
  });

  // Total consumed from all meals (including missed/completed)
  const totalConsumed = slots.reduce((s, slot) => s + slot.consumedKcal, 0);
  const remaining = totalAllowed - totalConsumed;

  // Redistribute remaining among pending slots
  const pendingSlots = slots.filter(s => s.status === 'pending');

  if (remaining <= 0 || pendingSlots.length === 0) {
    // All pending get 0
    pendingSlots.forEach(s => { s.targetKcal = 0; });
  } else {
    const pendingNames = pendingSlots.map(s => s.name);
    const count = pendingSlots.length;

    // Calculate weights and normalize
    const rawWeights = pendingSlots.map(s => getWeightForMeal(s.name, count, pendingNames));
    const weightSum = rawWeights.reduce((a, b) => a + b, 0);

    pendingSlots.forEach((slot, i) => {
      slot.targetKcal = Math.round(remaining * (rawWeights[i] / weightSum));
    });
  }

  // Apply explicit redistribution adjustments (from user-triggered redistribution)
  const adjustments = getDailyAdjustments(date);
  for (const slot of slots) {
    const storeType = toStoreMealType(slot.name);
    const adj = adjustments[storeType] || adjustments[slot.name];
    if (adj && adj.calories > 0) {
      slot.targetKcal += adj.calories;
    }
  }

  return {
    originalTarget,
    adjustedTarget,
    totalBurned,
    totalAllowed,
    totalConsumed,
    remaining,
    slots,
  };
}
