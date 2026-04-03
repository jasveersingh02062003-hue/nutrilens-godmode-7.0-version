import { scopedGet, scopedSet, scopedRemove } from "./scoped-storage";
import { safeJsonParse } from "./safe-json";
// ============================================
// NutriLens AI – Exercise-Aware Meal Adjustment Service (v2)
// Behavior-first hybrid distribution with smart caps,
// late logging, post-workout recovery, carry-forward limits,
// flexible meal windows, and priority weights.
// ============================================

import { getProfile, getDailyLog, getTodayKey, type UserProfile, type ActivityEntry } from './store';
import { getMealTarget, getDailyAdjustments, saveDailyAdjustments } from './meal-targets';
import { calculateBurnBreakdown } from './burn-service';
import { getTrackingMode } from './smart-adjustment';

const EXERCISE_ADJ_KEY = 'nutrilens_exercise_adj_';
const EAT_BACK_FACTOR_KEY = 'nutrilens_eat_back_factor';
const CARRY_FORWARD_KEY = 'nutrilens_exercise_carry_';
const RECOVERY_SNACK_KEY = 'nutrilens_recovery_snack_';

// ── Types ──

export interface ExerciseAdjustmentLog {
  activityType: string;
  rawCalories: number;
  effectiveBurn: number;
  eatBackFactor: number;
  addedCalories: number;
  distribution: Array<{ mealType: string; added: number }>;
  timestamp: string;
  wasLateLogged?: boolean;
  lateReduction?: number;
  recoverySnack?: number;
  carriedForward?: number;
}

export interface RecoverySnack {
  calories: number;
  timestamp: string;
  dismissed: boolean;
}

export interface CarryForwardData {
  amount: number;
  sourceDate: string;
  applied: boolean;
}

// ── Constants ──

const MAX_CARRY_FORWARD = 300;
const MAX_RECOVERY_SNACK = 300;
const LATE_LOG_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const LATE_LOG_REDUCTION = 0.5; // 50% reduction for late logs
const FLEXIBLE_WINDOW_MIN = 90; // ±90 minutes

// ── Meal Priority Weights (behavior-first) ──

const MEAL_PRIORITY_WEIGHTS: Record<string, number> = {
  current: 0.4,   // meal within flexible window
  dinner: 0.3,
  lunch: 0.2,
  snacks: 0.1,
  breakfast: 0.15,
};

// ── Eat-Back Factor ──

export function getDefaultEatBackFactor(goal?: string): number {
  switch (goal) {
    case 'lose': case 'weight_loss': return 0.4;
    case 'maintain': case 'maintenance': return 0.8;
    case 'gain': case 'weight_gain': case 'muscle_gain': return 1.0;
    default: return 0.5;
  }
}

export function getEatBackFactor(): number {
  const stored = scopedGet(EAT_BACK_FACTOR_KEY);
  if (stored) return parseFloat(stored);
  const profile = getProfile();
  return getDefaultEatBackFactor(profile?.goal);
}

export function setEatBackFactor(factor: number) {
  scopedSet(EAT_BACK_FACTOR_KEY, String(Math.max(0, Math.min(1, factor))));
}

// ── Exercise Adjustment Log ──

export function getExerciseAdjustments(date: string = getTodayKey()): ExerciseAdjustmentLog[] {
  try {
    const data = scopedGet(EXERCISE_ADJ_KEY + date);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveExerciseAdjustments(date: string, logs: ExerciseAdjustmentLog[]) {
  scopedSet(EXERCISE_ADJ_KEY + date, JSON.stringify(logs));
}

export function getTotalExerciseAddedCalories(date: string = getTodayKey()): number {
  return getExerciseAdjustments(date).reduce((s, a) => s + a.addedCalories, 0);
}

// ── Carry-Forward ──

export function getCarryForward(date: string): CarryForwardData | null {
  try {
    const data = scopedGet(CARRY_FORWARD_KEY + date);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveCarryForward(date: string, data: CarryForwardData) {
  scopedSet(CARRY_FORWARD_KEY + date, JSON.stringify(data));
}

export function applyCarryForwardToday(date: string = getTodayKey()): { lunch: number; dinner: number } | null {
  const carry = getCarryForward(date);
  if (!carry || carry.applied || carry.amount <= 0) return null;

  // Distribute to lunch (60%) and dinner (40%) only — never breakfast
  const lunchAdd = Math.round(carry.amount * 0.6);
  const dinnerAdd = carry.amount - lunchAdd;

  const profile = getProfile();
  if (!profile) return null;

  const adjustments = getDailyAdjustments(date);
  const prevLunch = adjustments['lunch'] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const prevDinner = adjustments['dinner'] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  adjustments['lunch'] = {
    calories: prevLunch.calories + lunchAdd,
    protein: prevLunch.protein + Math.round(lunchAdd * 0.20),
    carbs: prevLunch.carbs + Math.round(lunchAdd * 0.55),
    fat: prevLunch.fat + Math.round(lunchAdd * 0.25),
  };
  adjustments['dinner'] = {
    calories: prevDinner.calories + dinnerAdd,
    protein: prevDinner.protein + Math.round(dinnerAdd * 0.20),
    carbs: prevDinner.carbs + Math.round(dinnerAdd * 0.55),
    fat: prevDinner.fat + Math.round(dinnerAdd * 0.25),
  };

  saveDailyAdjustments(date, adjustments);
  carry.applied = true;
  saveCarryForward(date, carry);

  return { lunch: lunchAdd, dinner: dinnerAdd };
}

// ── Recovery Snack ──

export function getRecoverySnack(date: string = getTodayKey()): RecoverySnack | null {
  try {
    const data = scopedGet(RECOVERY_SNACK_KEY + date);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveRecoverySnack(date: string, data: RecoverySnack) {
  scopedSet(RECOVERY_SNACK_KEY + date, JSON.stringify(data));
}

export function dismissRecoverySnack(date: string = getTodayKey()) {
  const snack = getRecoverySnack(date);
  if (snack) {
    snack.dismissed = true;
    saveRecoverySnack(date, snack);
  }
}

// ── Meal Schedule Helper ──

const MEAL_SCHEDULE: Array<{ type: string; defaultHour: number }> = [
  { type: 'breakfast', defaultHour: 8 },
  { type: 'lunch', defaultHour: 13 },
  { type: 'snack', defaultHour: 16 },
  { type: 'dinner', defaultHour: 20 },
];

function getMealHour(profile: UserProfile | null, mealType: string): number {
  if (profile?.mealTimes) {
    const timeStr = (profile.mealTimes as Record<string, string>)[mealType === 'snack' ? 'snacks' : mealType];
    if (timeStr) {
      const match = timeStr.match(/(\d+)/);
      if (match) return parseInt(match[1]);
    }
  }
  return MEAL_SCHEDULE.find(m => m.type === mealType)?.defaultHour ?? 12;
}

interface RemainingMeal {
  type: string;
  weight: number;
  target: number;
  isCurrent: boolean;
}

function getRemainingMealsWithPriority(date: string, profile: UserProfile): RemainingMeal[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMin = currentHour * 60 + currentMinutes;
  const log = getDailyLog(date);

  const remaining: RemainingMeal[] = [];

  for (const meal of MEAL_SCHEDULE) {
    // Check if meal already logged
    const logged = log.meals.some(m => m.type === meal.type);
    if (logged) continue;

    const mealHour = getMealHour(profile, meal.type);
    const mealTotalMin = mealHour * 60;

    // Flexible window: meal is "current" if within ±90 minutes
    const diffMin = mealTotalMin - currentTotalMin;

    if (diffMin < -FLEXIBLE_WINDOW_MIN) continue; // too far in the past

    const isCurrent = Math.abs(diffMin) <= FLEXIBLE_WINDOW_MIN;
    const weight = isCurrent
      ? MEAL_PRIORITY_WEIGHTS.current
      : (MEAL_PRIORITY_WEIGHTS[meal.type] ?? 0.15);

    const target = getMealTarget(profile, meal.type).calories;
    remaining.push({ type: meal.type, weight, target, isCurrent });
  }

  // Normalize weights
  const totalWeight = remaining.reduce((s, m) => s + m.weight, 0);
  if (totalWeight > 0) {
    remaining.forEach(m => m.weight = m.weight / totalWeight);
  }

  return remaining;
}

// ── Smart Cap per Meal ──

function getMaxIncrease(originalTarget: number): number {
  // Min of 40% increase OR +250 kcal absolute
  return Math.min(Math.round(originalTarget * 0.4), 250);
}

// ── Core: Handle Exercise Logged ──

export function handleExerciseAdjustment(
  activity: ActivityEntry,
  date: string = getTodayKey()
): ExerciseAdjustmentLog | null {
  const profile = getProfile();
  if (!profile) return null;

  // 1. Calculate effective burn for this activity
  const log = getDailyLog(date);
  const burned = log.burned || { steps: 0, stepsCount: 0, activities: [], total: 0 };
  const breakdown = calculateBurnBreakdown(burned);

  // Use the activity's own calories weighted by confidence
  const activityEffective = Math.round(activity.calories * 0.7); // simplified confidence

  // 2. Apply eat-back factor
  const factor = getEatBackFactor();
  let extraCalories = Math.round(activityEffective * factor);

  if (extraCalories < 30) return null; // too small to redistribute

  // 3. Check for late logging
  let wasLateLogged = false;
  let lateReduction = 0;
  const activityTime = activity.time;
  if (activityTime) {
    try {
      // Parse time like "02:30 PM"
      const now = new Date();
      const timeParts = activityTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const ampm = timeParts[3].toUpperCase();
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        const actDate = new Date(now);
        actDate.setHours(hours, minutes, 0, 0);
        const delayMs = now.getTime() - actDate.getTime();
        if (delayMs > LATE_LOG_THRESHOLD_MS) {
          wasLateLogged = true;
          lateReduction = Math.round(extraCalories * LATE_LOG_REDUCTION);
          extraCalories = extraCalories - lateReduction;
        }
      }
    } catch { /* ignore parse errors */ }
  }

  if (extraCalories < 20) return null;

  // 4. Get remaining meals with priority weights
  const remaining = getRemainingMealsWithPriority(date, profile);

  let recoverySnackCal = 0;
  let carriedForwardCal = 0;

  if (remaining.length === 0) {
    // No meals left → post-workout recovery snack + carry forward
    recoverySnackCal = Math.min(extraCalories, MAX_RECOVERY_SNACK);
    const leftover = extraCalories - recoverySnackCal;

    if (recoverySnackCal > 30) {
      saveRecoverySnack(date, {
        calories: recoverySnackCal,
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
    }

    if (leftover > 0) {
      // Carry forward to next day (lunch/dinner only)
      const existingCarry = getCarryForward(getNextDayKey(date));
      const currentCarry = existingCarry?.amount ?? 0;
      const toCarry = Math.min(leftover, MAX_CARRY_FORWARD - currentCarry);
      if (toCarry > 0) {
        carriedForwardCal = toCarry;
        saveCarryForward(getNextDayKey(date), {
          amount: currentCarry + toCarry,
          sourceDate: date,
          applied: false,
        });
      }
    }

    // Log the adjustment even though no meal distribution
    const adjLog: ExerciseAdjustmentLog = {
      activityType: activity.type,
      rawCalories: activity.calories,
      effectiveBurn: activityEffective,
      eatBackFactor: factor,
      addedCalories: recoverySnackCal + carriedForwardCal,
      distribution: [],
      timestamp: new Date().toISOString(),
      wasLateLogged,
      lateReduction,
      recoverySnack: recoverySnackCal,
      carriedForward: carriedForwardCal,
    };
    const existing = getExerciseAdjustments(date);
    existing.push(adjLog);
    saveExerciseAdjustments(date, existing);
    return adjLog;
  }

  // 5. Distribute using priority weights + smart caps
  const mode = getTrackingMode();
  const distribution: Array<{ mealType: string; added: number }> = [];
  let remainingExtra = extraCalories;

  // First pass: allocate based on weights, respecting smart caps
  const firstPass: Array<{ type: string; ideal: number; max: number; added: number }> = [];
  for (const meal of remaining) {
    const ideal = Math.round(extraCalories * meal.weight);
    const maxIncrease = getMaxIncrease(meal.target);
    const added = Math.min(ideal, maxIncrease);
    firstPass.push({ type: meal.type, ideal, max: maxIncrease, added });
    remainingExtra -= added;
  }

  // Second pass: redistribute surplus to uncapped meals
  if (remainingExtra > 0) {
    const uncapped = firstPass.filter(m => m.added < m.max);
    if (uncapped.length > 0) {
      const totalUncappedWeight = uncapped.reduce((s, m) => {
        const rm = remaining.find(r => r.type === m.type);
        return s + (rm?.weight ?? 0);
      }, 0);

      for (const m of uncapped) {
        if (remainingExtra <= 0) break;
        const rm = remaining.find(r => r.type === m.type);
        const weight = rm?.weight ?? 0;
        const extra = totalUncappedWeight > 0
          ? Math.round(remainingExtra * (weight / totalUncappedWeight))
          : Math.round(remainingExtra / uncapped.length);
        const canAdd = m.max - m.added;
        const toAdd = Math.min(extra, canAdd);
        m.added += toAdd;
        remainingExtra -= toAdd;
      }
    }

    // If still surplus after all capped → carry forward
    if (remainingExtra > 20) {
      const existingCarry = getCarryForward(getNextDayKey(date));
      const currentCarry = existingCarry?.amount ?? 0;
      const toCarry = Math.min(remainingExtra, MAX_CARRY_FORWARD - currentCarry);
      if (toCarry > 0) {
        carriedForwardCal = toCarry;
        saveCarryForward(getNextDayKey(date), {
          amount: currentCarry + toCarry,
          sourceDate: date,
          applied: false,
        });
      }
    }
  }

  // Build final distribution
  for (const m of firstPass) {
    if (m.added > 0) {
      distribution.push({ mealType: m.type, added: m.added });
    }
  }

  const totalAdded = distribution.reduce((s, d) => s + d.added, 0);
  if (totalAdded < 20 && recoverySnackCal === 0) return null;

  // 6. Apply to daily adjustments
  const adjustments = getDailyAdjustments(date);
  for (const d of distribution) {
    const prev = adjustments[d.mealType] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    adjustments[d.mealType] = {
      calories: prev.calories + d.added,
      protein: prev.protein + Math.round(d.added * 0.20),
      carbs: prev.carbs + Math.round(d.added * 0.55),
      fat: prev.fat + Math.round(d.added * 0.25),
    };
  }
  saveDailyAdjustments(date, adjustments);

  // 7. Log the adjustment
  const adjLog: ExerciseAdjustmentLog = {
    activityType: activity.type,
    rawCalories: activity.calories,
    effectiveBurn: activityEffective,
    eatBackFactor: factor,
    addedCalories: totalAdded,
    distribution,
    timestamp: new Date().toISOString(),
    wasLateLogged,
    lateReduction,
    recoverySnack: recoverySnackCal,
    carriedForward: carriedForwardCal,
  };

  const existing = getExerciseAdjustments(date);
  existing.push(adjLog);
  saveExerciseAdjustments(date, existing);

  return adjLog;
}

// ── Revert Exercise Adjustment on Activity Deletion ──

export function revertExerciseAdjustment(activityId: string, activityType: string, activityCalories: number, date: string) {
  const logs = getExerciseAdjustments(date);
  if (logs.length === 0) return;

  // Find matching log entry by type and raw calories (no activityId stored in logs)
  const matchIdx = logs.findIndex(l => l.activityType === activityType && l.rawCalories === activityCalories);
  if (matchIdx === -1) return;

  const removedLog = logs[matchIdx];

  // Remove the matching entry
  logs.splice(matchIdx, 1);
  saveExerciseAdjustments(date, logs);

  // Rebuild daily adjustments from scratch using remaining exercise logs
  // First, clear all exercise-contributed adjustments
  const adjustments = getDailyAdjustments(date);
  
  // Remove exercise contributions by zeroing out and replaying
  // We track which meal types were affected by ANY exercise log
  const allAffectedMeals = new Set<string>();
  for (const log of [...logs, removedLog]) {
    for (const d of log.distribution) {
      allAffectedMeals.add(d.mealType);
    }
  }

  // Subtract all exercise contributions from adjustments
  for (const mealType of allAffectedMeals) {
    const current = adjustments[mealType];
    if (!current) continue;
    
    // Calculate total exercise contribution for this meal from ALL original logs (before removal)
    const allLogs = [...logs, removedLog]; // all logs including removed
    let totalExerciseAdded = 0;
    for (const log of allLogs) {
      for (const d of log.distribution) {
        if (d.mealType === mealType) totalExerciseAdded += d.added;
      }
    }

    // Calculate remaining exercise contribution (without deleted)
    let remainingExerciseAdded = 0;
    for (const log of logs) {
      for (const d of log.distribution) {
        if (d.mealType === mealType) remainingExerciseAdded += d.added;
      }
    }

    const diff = totalExerciseAdded - remainingExerciseAdded;
    if (diff > 0) {
      adjustments[mealType] = {
        calories: current.calories - diff,
        protein: current.protein - Math.round(diff * 0.20),
        carbs: current.carbs - Math.round(diff * 0.55),
        fat: current.fat - Math.round(diff * 0.25),
      };
      // Clean up if zeroed out
      if (adjustments[mealType].calories <= 0) {
        delete adjustments[mealType];
      }
    }
  }

  saveDailyAdjustments(date, adjustments);

  // Handle recovery snack cleanup if the removed log had one
  if (removedLog.recoverySnack && removedLog.recoverySnack > 0) {
    const remainingRecovery = logs.reduce((s, l) => s + (l.recoverySnack ?? 0), 0);
    if (remainingRecovery === 0) {
      scopedRemove(RECOVERY_SNACK_KEY + date);
    } else {
      saveRecoverySnack(date, {
        calories: remainingRecovery,
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
    }
  }

  // Handle carry-forward cleanup if the removed log carried forward
  if (removedLog.carriedForward && removedLog.carriedForward > 0) {
    const nextDay = getNextDayKey(date);
    const existingCarry = getCarryForward(nextDay);
    if (existingCarry && !existingCarry.applied) {
      const newAmount = Math.max(0, existingCarry.amount - removedLog.carriedForward);
      if (newAmount <= 0) {
        scopedRemove(CARRY_FORWARD_KEY + nextDay);
      } else {
        saveCarryForward(nextDay, { ...existingCarry, amount: newAmount });
      }
    }
  }
}

// ── Helpers ──

function getNextDayKey(date: string): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Summary for UI ──

export interface PerExerciseEntry {
  activityType: string;
  rawCalories: number;
  addedCalories: number;
  distribution: Array<{ mealType: string; added: number }>;
  wasLateLogged?: boolean;
}

export interface ExerciseAdjustmentSummary {
  totalAdded: number;
  factor: number;
  adjustments: Array<{ mealType: string; label: string; added: number }>;
  perExercise: PerExerciseEntry[];
  hasRecoverySnack: boolean;
  recoverySnackCalories: number;
  hasCarryForward: boolean;
  carryForwardCalories: number;
  wasLateLogged: boolean;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snacks', dinner: 'Dinner',
};

export function getExerciseAdjustmentSummary(date: string = getTodayKey()): ExerciseAdjustmentSummary | null {
  const logs = getExerciseAdjustments(date);
  if (logs.length === 0) return null;

  const totalAdded = logs.reduce((s, l) => s + l.addedCalories, 0);
  const totalRecovery = logs.reduce((s, l) => s + (l.recoverySnack ?? 0), 0);
  const totalCarry = logs.reduce((s, l) => s + (l.carriedForward ?? 0), 0);
  const anyLate = logs.some(l => l.wasLateLogged);

  if (totalAdded < 20 && totalRecovery === 0 && totalCarry === 0) return null;

  // Aggregate distribution across all exercise logs
  const mealMap: Record<string, number> = {};
  for (const log of logs) {
    for (const d of log.distribution) {
      mealMap[d.mealType] = (mealMap[d.mealType] || 0) + d.added;
    }
  }

  const adjustments = Object.entries(mealMap).map(([type, added]) => ({
    mealType: type,
    label: MEAL_LABELS[type] || type,
    added,
  }));

  // Per-exercise breakdown
  const perExercise: PerExerciseEntry[] = logs.map(l => ({
    activityType: l.activityType,
    rawCalories: l.rawCalories,
    addedCalories: l.addedCalories,
    distribution: l.distribution,
    wasLateLogged: l.wasLateLogged,
  }));

  const recoverySnack = getRecoverySnack(date);

  return {
    totalAdded,
    factor: getEatBackFactor(),
    adjustments,
    perExercise,
    hasRecoverySnack: totalRecovery > 0 && !(recoverySnack?.dismissed),
    recoverySnackCalories: totalRecovery,
    hasCarryForward: totalCarry > 0,
    carryForwardCalories: totalCarry,
    wasLateLogged: anyLate,
  };
}
