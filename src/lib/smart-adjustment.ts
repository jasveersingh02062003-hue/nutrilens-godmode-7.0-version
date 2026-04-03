import { scopedGet, scopedSet } from "./scoped-storage";
import { safeJsonParse } from "./safe-json";
// ============================================
// NutriLens AI – Smart Calorie Adjustment & Recovery Engine (v2)
// ============================================
// Refined engine with: adaptive weights, macro protection, behavior memory,
// meal quality scoring, 2-day carry-forward limit, and single-action UI pattern.

import { getProfile, getDailyLog, getDailyTotals, getTodayKey, type UserProfile, type FoodItem } from './store';
import { getMealTarget, getDailyAdjustments, saveDailyAdjustments, type MealTarget } from './meal-targets';
import { isRedistributed } from './redistribution-service';

const TRACKING_MODE_KEY = 'nutrilens_tracking_mode';
const ADJUSTMENT_LOG_KEY = 'nutrilens_smart_adj_log_';
const RECOVERY_DISMISSED_KEY = 'nutrilens_recovery_dismissed_';
const OVEREAT_CARRY_KEY = 'nutrilens_overeat_carry';
const BEHAVIOR_MEMORY_KEY = 'nutrilens_behavior_memory';
const EATING_PATTERN_KEY = 'nutrilens_eating_pattern';
const FRESH_START_KEY = 'nutrilens_fresh_start_';

// ── Types ──

export type TrackingMode = 'flex' | 'strict';

export interface AdjustmentLogEntry {
  type: 'overeat' | 'undereat';
  sourceMeal: string;
  deviation: number;
  adjustments: Record<string, number>;
  timestamp: string;
}

export interface RecoveryOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export interface EatingPattern {
  breakfast: number; // percentage 0-1
  lunch: number;
  dinner: number;
  snacks: number;
  sampleCount: number;
  lastUpdated: string;
}

export interface BehaviorMemory {
  overeatenMeals: Array<{ mealType: string; count: number }>;
  skippedMeals: Array<{ mealType: string; count: number }>;
  lastReset: string;
}

export interface CarryForwardData {
  fromDate: string;
  calories: number;
  remainingDays: number;
  applied: boolean;
}

// ── Tracking Mode ──

export function getTrackingMode(): TrackingMode {
  return (scopedGet(TRACKING_MODE_KEY) as TrackingMode) || 'flex';
}

export function setTrackingMode(mode: TrackingMode) {
  scopedSet(TRACKING_MODE_KEY, mode);
}

// ── Adjustment Log ──

export function getAdjustmentLog(date: string): AdjustmentLogEntry[] {
  try {
    const data = scopedGet(ADJUSTMENT_LOG_KEY + date);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveAdjustmentLog(date: string, log: AdjustmentLogEntry[]) {
  scopedSet(ADJUSTMENT_LOG_KEY + date, JSON.stringify(log));
}

// ── Eating Pattern (Adaptive Weights) ──

const DEFAULT_PATTERN: EatingPattern = {
  breakfast: 0.25, lunch: 0.40, dinner: 0.25, snacks: 0.10,
  sampleCount: 0, lastUpdated: '',
};

export function getEatingPattern(): EatingPattern {
  try {
    const data = scopedGet(EATING_PATTERN_KEY);
    return data ? { ...DEFAULT_PATTERN, ...JSON.parse(data) } : DEFAULT_PATTERN;
  } catch { return DEFAULT_PATTERN; }
}

export function updateEatingPattern(mealType: string, caloriesEaten: number, dailyTotal: number) {
  if (dailyTotal <= 0) return;
  const pattern = getEatingPattern();
  const key = mealType === 'snack' ? 'snacks' : mealType;
  if (!(key in pattern)) return;

  const ratio = caloriesEaten / dailyTotal;
  const alpha = Math.min(0.3, 1 / (pattern.sampleCount + 1)); // exponential moving average
  (pattern as any)[key] = (pattern as any)[key] * (1 - alpha) + ratio * alpha;

  // Normalize to sum = 1
  const total = pattern.breakfast + pattern.lunch + pattern.dinner + pattern.snacks;
  if (total > 0) {
    pattern.breakfast /= total;
    pattern.lunch /= total;
    pattern.dinner /= total;
    pattern.snacks /= total;
  }

  pattern.sampleCount++;
  pattern.lastUpdated = new Date().toISOString();
  scopedSet(EATING_PATTERN_KEY, JSON.stringify(pattern));
}

function getAdaptiveWeights(remainingMeals: string[]): Record<string, number> {
  const pattern = getEatingPattern();
  const weights: Record<string, number> = {};
  let total = 0;
  for (const m of remainingMeals) {
    const key = m === 'snack' ? 'snacks' : m;
    const w = (pattern as any)[key] || 0.25;
    weights[m] = w;
    total += w;
  }
  // Normalize
  if (total > 0) {
    for (const m of remainingMeals) weights[m] /= total;
  }
  return weights;
}

// ── Behavior Memory ──

export function getBehaviorMemory(): BehaviorMemory {
  try {
    const data = scopedGet(BEHAVIOR_MEMORY_KEY);
    return data ? JSON.parse(data) : { overeatenMeals: [], skippedMeals: [], lastReset: new Date().toISOString() };
  } catch { return { overeatenMeals: [], skippedMeals: [], lastReset: new Date().toISOString() }; }
}

function saveBehaviorMemory(mem: BehaviorMemory) {
  scopedSet(BEHAVIOR_MEMORY_KEY, JSON.stringify(mem));
}

export function recordBehavior(mealType: string, type: 'overeat' | 'skip') {
  const mem = getBehaviorMemory();
  const list = type === 'overeat' ? mem.overeatenMeals : mem.skippedMeals;
  const existing = list.find(e => e.mealType === mealType);
  if (existing) existing.count++;
  else list.push({ mealType, count: 1 });

  // Weekly reset: if lastReset > 7 days ago, halve all counts
  const daysSinceReset = (Date.now() - new Date(mem.lastReset).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceReset > 7) {
    for (const e of mem.overeatenMeals) e.count = Math.floor(e.count / 2);
    for (const e of mem.skippedMeals) e.count = Math.floor(e.count / 2);
    mem.overeatenMeals = mem.overeatenMeals.filter(e => e.count > 0);
    mem.skippedMeals = mem.skippedMeals.filter(e => e.count > 0);
    mem.lastReset = new Date().toISOString();
  }

  saveBehaviorMemory(mem);
}

export function getBehaviorInsight(): string | null {
  const mem = getBehaviorMemory();
  // Check for patterns (>=4 occurrences)
  for (const e of mem.overeatenMeals) {
    if (e.count >= 4) {
      const label = MEAL_LABELS[e.mealType] || e.mealType;
      return `You tend to overeat at ${label}. Consider increasing your ${label} target for a more realistic plan.`;
    }
  }
  for (const e of mem.skippedMeals) {
    if (e.count >= 4) {
      const label = MEAL_LABELS[e.mealType] || e.mealType;
      return `You often skip ${label}. Consider redistributing those calories to meals you do eat.`;
    }
  }
  return null;
}

// ── Meal Quality Score ──

export function mealQualityScore(items: FoodItem[]): number {
  if (items.length === 0) return 0.5;

  const totalCal = items.reduce((s, f) => s + f.calories * f.quantity, 0);
  const totalProtein = items.reduce((s, f) => s + f.protein * f.quantity, 0);
  const totalFiber = items.reduce((s, f) => s + (f.fiber || 0) * f.quantity, 0);

  let score = 0.5; // baseline

  // Protein density bonus (>15% of calories from protein)
  if (totalCal > 0 && (totalProtein * 4) / totalCal > 0.15) score += 0.15;

  // Fiber bonus (>5g fiber)
  if (totalFiber > 5) score += 0.10;

  // Variety bonus (3+ items)
  if (items.length >= 3) score += 0.10;

  // Penalty for very high calorie density (>300 kcal avg per item)
  const avgCal = totalCal / items.length;
  if (avgCal > 300) score -= 0.15;

  return Math.max(0, Math.min(1, score));
}

// ── Core Adjustment Algorithm (v2) ──

const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snacks',
  dinner: 'Dinner',
};

export interface AdjustmentResult {
  deviation: number;
  type: 'overeat' | 'undereat';
  adjustments: Array<{
    mealType: string;
    label: string;
    originalTarget: number;
    newTarget: number;
    change: number;
    proteinProtected: boolean;
  }>;
  message: string;
  qualityFactor: number;
  behaviorInsight: string | null;
}

export function computeSmartAdjustment(
  profile: UserProfile,
  loggedMealType: string,
  loggedCalories: number,
  date: string = getTodayKey(),
  mealItems?: FoodItem[]
): AdjustmentResult | null {
  const target = getMealTarget(profile, loggedMealType);
  let deviation = loggedCalories - target.calories;

  // Only trigger if deviation > 50 kcal
  if (Math.abs(deviation) < 50) return null;

  const mode = getTrackingMode();
  // Strict: 40% max reduction (refined from 50%), Flex: 30%
  const maxReductionPct = mode === 'strict' ? 0.40 : 0.30;
  const maxIncreasePct = 1.50;

  // Apply meal quality factor: junk food gets slightly stronger correction
  const quality = mealItems ? mealQualityScore(mealItems) : 0.5;
  const qualityFactor = 1 + (1 - quality) * 0.2; // max 20% amplification
  if (deviation > 0) {
    deviation = Math.round(deviation * qualityFactor);
  }

  // Find remaining unlogged meals
  const loggedIdx = MEAL_ORDER.indexOf(loggedMealType === 'snack' ? 'snack' : loggedMealType);
  const remaining = MEAL_ORDER.filter((_, i) => i > loggedIdx);
  if (remaining.length === 0) return null;

  const log = getDailyLog(date);
  const unloggedRemaining = remaining.filter(m =>
    !log.meals.some(meal => meal.type === m) && !isRedistributed(date, m)
  );
  if (unloggedRemaining.length === 0) return null;

  // Adaptive weights from user's eating pattern
  const weights = getAdaptiveWeights(unloggedRemaining);

  // Minimum daily protein requirement (never compromise)
  const minDailyProtein = profile.dailyProtein || 60;
  const consumedProtein = log.meals.reduce((s, m) => s + m.totalProtein, 0);
  const proteinRemaining = Math.max(0, minDailyProtein - consumedProtein);
  const proteinPerRemainingMeal = unloggedRemaining.length > 0
    ? proteinRemaining / unloggedRemaining.length : 0;

  const adjustments: AdjustmentResult['adjustments'] = [];
  let remainingDev = deviation;

  for (const meal of unloggedRemaining) {
    const mealTarget = getMealTarget(profile, meal);
    const weight = weights[meal] || (1 / unloggedRemaining.length);
    let change = Math.round(remainingDev * weight);

    let proteinProtected = false;

    if (deviation > 0) {
      // Overeat → reduce future meals
      const maxReduction = Math.round(mealTarget.calories * maxReductionPct);
      change = Math.min(change, maxReduction);

      // Macro protection: ensure protein can still be met
      // Protein needs ~4 kcal/g; if reducing below protein floor, cap reduction
      const proteinFloorCal = Math.round(proteinPerRemainingMeal * 4 * 1.5); // protein + buffer
      if (mealTarget.calories - change < proteinFloorCal) {
        change = Math.max(0, mealTarget.calories - proteinFloorCal);
        proteinProtected = true;
      }

      // Don't reduce snacks below 50 kcal
      if (meal === 'snack' && mealTarget.calories - change < 50) {
        change = Math.max(0, mealTarget.calories - 50);
      }
    } else {
      // Undereat → increase future meals
      const maxIncrease = Math.round(mealTarget.calories * (maxIncreasePct - 1));
      change = Math.max(change, -maxIncrease);
    }

    adjustments.push({
      mealType: meal,
      label: MEAL_LABELS[meal] || meal,
      originalTarget: mealTarget.calories,
      newTarget: mealTarget.calories - change,
      change: -change,
      proteinProtected,
    });

    remainingDev -= change;
  }

  // Record behavior
  if (deviation > 0) recordBehavior(loggedMealType, 'overeat');

  const type = deviation > 0 ? 'overeat' : 'undereat';
  const absDeviation = Math.abs(loggedCalories - target.calories); // use original

  const message = type === 'overeat'
    ? `Over by ${absDeviation} kcal. Remaining meals adjusted.`
    : `Under by ${absDeviation} kcal. Extra added to upcoming meals.`;

  const behaviorInsight = getBehaviorInsight();

  return { deviation, type, adjustments, message, qualityFactor, behaviorInsight };
}

// ── Apply Adjustment ──

export function applySmartAdjustment(result: AdjustmentResult, date: string = getTodayKey()) {
  const existing = getDailyAdjustments(date);

  for (const adj of result.adjustments) {
    const prev = existing[adj.mealType] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    // When reducing, cut carbs/fat more, protect protein
    const proteinRatio = adj.change < 0 && adj.proteinProtected ? 0.10 : 0.25;
    const carbsRatio = adj.change < 0 ? 0.55 : 0.50;
    const fatRatio = 1 - proteinRatio - carbsRatio;

    existing[adj.mealType] = {
      calories: prev.calories + adj.change,
      protein: prev.protein + Math.round(adj.change * proteinRatio),
      carbs: prev.carbs + Math.round(adj.change * carbsRatio),
      fat: prev.fat + Math.round(adj.change * fatRatio),
    };
  }

  saveDailyAdjustments(date, existing);

  // Save log
  const adjLog = getAdjustmentLog(date);
  adjLog.push({
    type: result.type,
    sourceMeal: result.adjustments[0]?.mealType || '',
    deviation: result.deviation,
    adjustments: Object.fromEntries(result.adjustments.map(a => [a.mealType, a.change])),
    timestamp: new Date().toISOString(),
  });
  saveAdjustmentLog(date, adjLog);

  // Update eating pattern
  const profile = getProfile();
  if (profile) {
    const log = getDailyLog(date);
    const totalEaten = log.meals.reduce((s, m) => s + m.totalCalories, 0);
    if (totalEaten > 0) {
      const mealType = result.adjustments[0]?.mealType;
      if (mealType) {
        const mealCal = log.meals.filter(m => m.type === mealType).reduce((s, m) => s + m.totalCalories, 0);
        updateEatingPattern(mealType, mealCal, totalEaten);
      }
    }
  }
}

// ── Manual Adjustment ──

export function applyManualAdjustment(
  adjustments: Array<{ mealType: string; change: number }>,
  date: string = getTodayKey()
) {
  const existing = getDailyAdjustments(date);

  for (const adj of adjustments) {
    existing[adj.mealType] = {
      calories: adj.change,
      protein: Math.round(adj.change * 0.20),
      carbs: Math.round(adj.change * 0.55),
      fat: Math.round(adj.change * 0.25),
    };
  }

  saveDailyAdjustments(date, existing);
}

// ── End-of-Day Recovery ──

export function getDailyOverage(date: string = getTodayKey()): number {
  const profile = getProfile();
  if (!profile) return 0;
  const log = getDailyLog(date);
  const totals = getDailyTotals(log);
  return Math.max(0, totals.eaten - profile.dailyCalories);
}

export function isRecoveryDismissed(date: string = getTodayKey()): boolean {
  return scopedGet(RECOVERY_DISMISSED_KEY + date) === '1';
}

export function dismissRecovery(date: string = getTodayKey()) {
  scopedSet(RECOVERY_DISMISSED_KEY + date, '1');
}

// Single primary action + secondary options behind "More"
export function getRecoveryOptions(overage: number): { primary: RecoveryOption; secondary: RecoveryOption[] } | null {
  if (overage < 100) return null;

  const walkMinutes = Math.min(Math.round(overage / 5), 45);

  const primary: RecoveryOption = {
    id: 'light_meal',
    label: 'Eat lighter next meal',
    emoji: '🥗',
    description: 'Opt for soup, salad, or fruit to balance out',
  };

  const secondary: RecoveryOption[] = [
    {
      id: 'walk',
      label: `Walk ${walkMinutes} mins`,
      emoji: '🚶',
      description: `A brisk walk can burn ~${Math.min(overage, 225)} kcal`,
    },
  ];

  if (overage <= 150) {
    secondary.push({
      id: 'carry_forward',
      label: 'Adjust tomorrow',
      emoji: '📅',
      description: `Reduce tomorrow's meals by ${overage} kcal (max 2 days)`,
    });
  }

  return { primary, secondary };
}

// ── Carry-Forward with 2-Day Hard Reset ──

export function applyOverageCarryForward(overage: number) {
  const capped = Math.min(overage, 150);
  const carry: CarryForwardData = {
    fromDate: getTodayKey(),
    calories: capped,
    remainingDays: 2, // hard limit
    applied: false,
  };
  scopedSet(OVEREAT_CARRY_KEY, JSON.stringify(carry));
}

export function applyOverageCarryOver(date: string): 'applied' | 'fresh_start' | 'none' {
  try {
    const data = scopedGet(OVEREAT_CARRY_KEY);
    if (!data) return 'none';
    const carry: CarryForwardData = JSON.parse(data);
    if (carry.applied) return 'none';

    // Check remaining days
    if (carry.remainingDays <= 0) {
      // Hard reset — fresh start
      carry.applied = true;
      scopedSet(OVEREAT_CARRY_KEY, JSON.stringify(carry));
      scopedSet(FRESH_START_KEY + date, '1');
      return 'fresh_start';
    }

    // Apply: spread reduction across breakfast (60%) and lunch (40%)
    const adjustments = getDailyAdjustments(date);
    const bfReduction = -Math.round(carry.calories * 0.6);
    const lnReduction = -Math.round(carry.calories * 0.4);

    const bfPrev = adjustments['breakfast'] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    adjustments['breakfast'] = {
      calories: bfPrev.calories + bfReduction,
      protein: bfPrev.protein + Math.round(bfReduction * 0.15), // protect protein
      carbs: bfPrev.carbs + Math.round(bfReduction * 0.55),
      fat: bfPrev.fat + Math.round(bfReduction * 0.30),
    };

    const lnPrev = adjustments['lunch'] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    adjustments['lunch'] = {
      calories: lnPrev.calories + lnReduction,
      protein: lnPrev.protein + Math.round(lnReduction * 0.15),
      carbs: lnPrev.carbs + Math.round(lnReduction * 0.55),
      fat: lnPrev.fat + Math.round(lnReduction * 0.30),
    };

    saveDailyAdjustments(date, adjustments);

    carry.remainingDays--;
    if (carry.remainingDays <= 0) carry.applied = true;
    scopedSet(OVEREAT_CARRY_KEY, JSON.stringify(carry));
    return 'applied';
  } catch { return 'none'; }
}

export function isFreshStart(date: string = getTodayKey()): boolean {
  return scopedGet(FRESH_START_KEY + date) === '1';
}

export function dismissFreshStart(date: string = getTodayKey()) {
  scopedSet(FRESH_START_KEY + date, '0');
}