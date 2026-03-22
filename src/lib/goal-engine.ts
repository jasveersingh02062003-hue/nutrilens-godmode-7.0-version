// ============================================
// NutriLens AI – Intelligent Goal Decision Engine
// ============================================
// Overrides user-chosen goals based on BMI to enforce healthy decisions.
// Applies safety limits (min calories, max deficit/surplus).
// Provides weekly adaptive adjustments based on actual progress.

import { calculateBMI, calculateBMR, calculateTDEE, calculateDailyTargets } from './nutrition';
import { getWeightEntries } from './weight-history';
import { getRecentLogs, getDailyTotals, type UserProfile } from './store';

// ── Types ──

export interface GoalDecision {
  originalGoal: string;
  effectiveGoal: 'lose' | 'maintain' | 'gain';
  wasOverridden: boolean;
  overrideReason: string | null;
  deficitPercent: number;
  surplusPercent: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  bmi: number;
  bmiCategory: string;
  expectedWeeklyChange: string;
  safetyNote: string | null;
}

export interface AdaptiveResult {
  shouldAdjust: boolean;
  newTargetCalories: number;
  reason: string;
  weeklyWeightChange: number; // kg per week (negative = loss)
  avgDailyIntake: number;
  consistencyScore: number; // 0-1, how consistently user logged
}

// ── BMI Categories (WHO Asian thresholds) ──

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 23) return 'normal';
  if (bmi < 27.5) return 'overweight';
  return 'obese';
}

// ── Goal Decision Engine ──

export function determineGoalAndTargets(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string,
  activityLevel: string,
  userGoal: string,
  healthConditions?: string[],
  womenHealth?: string[]
): GoalDecision {
  const bmi = calculateBMI(weightKg, heightCm);
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const bmiCategory = getBmiCategory(bmi);

  let effectiveGoal: 'lose' | 'maintain' | 'gain' = userGoal as any;
  let wasOverridden = false;
  let overrideReason: string | null = null;
  let deficitPercent = 0;
  let surplusPercent = 0;
  let safetyNote: string | null = null;

  // ── BMI-Based Override Logic ──
  if (bmiCategory === 'obese') {
    if (userGoal !== 'lose') {
      effectiveGoal = 'lose';
      wasOverridden = true;
      overrideReason = `Your BMI (${bmi.toFixed(1)}) indicates obesity. We've set your goal to fat loss for health safety.`;
    }
    deficitPercent = 25;
  } else if (bmiCategory === 'overweight') {
    if (userGoal === 'gain') {
      effectiveGoal = 'lose';
      wasOverridden = true;
      overrideReason = `Your BMI (${bmi.toFixed(1)}) is in the overweight range. We recommend fat loss before gaining.`;
      deficitPercent = 20;
    } else if (userGoal === 'lose') {
      deficitPercent = 20;
    } else {
      deficitPercent = 0;
    }
  } else if (bmiCategory === 'normal') {
    // User choice respected
    if (userGoal === 'lose') deficitPercent = 15;
    else if (userGoal === 'gain') surplusPercent = 10;
    else deficitPercent = 0;
  } else if (bmiCategory === 'underweight') {
    if (userGoal !== 'gain') {
      effectiveGoal = 'gain';
      wasOverridden = true;
      overrideReason = `Your BMI (${bmi.toFixed(1)}) is underweight. We've set your goal to healthy weight gain.`;
    }
    surplusPercent = 20;
  }

  // ── Calculate target calories with safety caps ──
  let targetCalories = tdee;

  if (effectiveGoal === 'lose') {
    targetCalories = tdee * (1 - deficitPercent / 100);
    // Safety minimum
    const minCalories = gender === 'female' ? 1200 : 1500;
    if (targetCalories < minCalories) {
      targetCalories = minCalories;
      safetyNote = `Calorie target capped at ${minCalories} kcal for safety. Never go below this.`;
    }
    // Max deficit 35%
    if (deficitPercent > 35) {
      targetCalories = tdee * 0.65;
      safetyNote = 'Maximum safe deficit applied (35%).';
    }
  } else if (effectiveGoal === 'gain') {
    targetCalories = tdee * (1 + surplusPercent / 100);
    // Ensure at least TDEE + 250
    if (targetCalories < tdee + 250) {
      targetCalories = tdee + 250;
    }
  }

  targetCalories = Math.round(targetCalories);

  // ── Calculate macros using existing logic (respects health conditions) ──
  const macros = calculateDailyTargets(tdee, effectiveGoal, healthConditions, womenHealth);
  // Scale macros to match our adjusted calorie target
  const calorieRatio = targetCalories / macros.calories;
  const targetProtein = Math.round(macros.protein * calorieRatio);
  const targetCarbs = Math.round(macros.carbs * calorieRatio);
  const targetFat = Math.round(macros.fat * calorieRatio);

  // ── Expected weekly change ──
  const weeklyDeficit = (tdee - targetCalories) * 7;
  const weeklyChange = weeklyDeficit / 7700; // 7700 kcal ≈ 1 kg fat
  let expectedWeeklyChange: string;
  if (effectiveGoal === 'lose') {
    expectedWeeklyChange = `~${weeklyChange.toFixed(1)} kg/week loss`;
  } else if (effectiveGoal === 'gain') {
    const weeklyGain = ((targetCalories - tdee) * 7) / 7700;
    expectedWeeklyChange = `~${weeklyGain.toFixed(1)} kg/week gain`;
  } else {
    expectedWeeklyChange = 'Maintain current weight';
  }

  return {
    originalGoal: userGoal,
    effectiveGoal,
    wasOverridden,
    overrideReason,
    deficitPercent,
    surplusPercent,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    bmi,
    bmiCategory,
    expectedWeeklyChange,
    safetyNote,
  };
}

// ── Weekly Adaptive Engine ──

const ADAPTATION_KEY = 'nutrilens_last_adaptation';
const ADAPTATION_LOG_KEY = 'nutrilens_adaptation_log';

export function getLastAdaptationDate(): string | null {
  return localStorage.getItem(ADAPTATION_KEY);
}

export function setLastAdaptationDate(date: string) {
  localStorage.setItem(ADAPTATION_KEY, date);
}

interface AdaptationLogEntry {
  date: string;
  oldTarget: number;
  newTarget: number;
  reason: string;
  weeklyWeightChange: number;
}

function getAdaptationLog(): AdaptationLogEntry[] {
  const data = localStorage.getItem(ADAPTATION_LOG_KEY);
  return data ? JSON.parse(data) : [];
}

function saveAdaptationEntry(entry: AdaptationLogEntry) {
  const log = getAdaptationLog();
  log.push(entry);
  // Keep last 12 entries
  if (log.length > 12) log.splice(0, log.length - 12);
  localStorage.setItem(ADAPTATION_LOG_KEY, JSON.stringify(log));
}

/**
 * Run weekly adaptive check.
 * Analyzes last 14 days of food logs and weight entries to decide
 * if calorie target should be adjusted.
 * Returns null if no adjustment needed or not enough data.
 */
export function runWeeklyAdaptation(profile: UserProfile): AdaptiveResult | null {
  const lastAdaptation = getLastAdaptationDate();
  const today = new Date().toISOString().split('T')[0];

  // Only run once per week
  if (lastAdaptation) {
    const daysSince = (Date.now() - new Date(lastAdaptation).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return null;
  }

  // Get weight entries from last 14 days
  const weightEntries = getWeightEntries();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recentWeights = weightEntries.filter(w => new Date(w.date) >= twoWeeksAgo);

  // Need at least 2 weight entries to calculate trend
  if (recentWeights.length < 2) return null;

  // Get food logs for last 14 days
  const recentLogs = getRecentLogs(14);
  const loggedDays = recentLogs.filter(l => l.meals.length > 0);

  // Consistency score
  const consistencyScore = loggedDays.length / 14;

  // Skip if user hasn't logged at least 5 of 14 days
  if (loggedDays.length < 5) return null;

  // Average daily intake
  const totalIntake = loggedDays.reduce((sum, log) => {
    const totals = getDailyTotals(log);
    return sum + totals.eaten;
  }, 0);
  const avgDailyIntake = Math.round(totalIntake / loggedDays.length);

  // Weight change per week
  const firstWeight = recentWeights[0].weight;
  const lastWeight = recentWeights[recentWeights.length - 1].weight;
  const daysBetween = (new Date(recentWeights[recentWeights.length - 1].date).getTime() -
    new Date(recentWeights[0].date).getTime()) / (1000 * 60 * 60 * 24);
  const weeklyWeightChange = daysBetween > 0
    ? ((lastWeight - firstWeight) / daysBetween) * 7
    : 0;

  const currentTarget = profile.dailyCalories;
  const goal = profile.goal;
  const minCalories = profile.gender === 'female' ? 1200 : 1500;

  let shouldAdjust = false;
  let newTarget = currentTarget;
  let reason = '';

  if (goal === 'lose') {
    const bodyWeightPercent = Math.abs(weeklyWeightChange) / profile.weightKg * 100;

    if (weeklyWeightChange >= 0) {
      // Not losing weight — stalled
      const reduction = Math.round(currentTarget * 0.07); // Reduce by 7%
      newTarget = Math.max(minCalories, currentTarget - reduction);
      shouldAdjust = newTarget !== currentTarget;
      reason = `Weight stalled (${weeklyWeightChange > 0 ? '+' : ''}${weeklyWeightChange.toFixed(2)} kg/wk). Reducing target by ${reduction} kcal.`;
    } else if (bodyWeightPercent > 1) {
      // Losing too fast (>1% body weight per week)
      const increase = Math.round(currentTarget * 0.05); // Increase by 5%
      newTarget = currentTarget + increase;
      shouldAdjust = true;
      reason = `Losing too fast (${weeklyWeightChange.toFixed(2)} kg/wk, ${bodyWeightPercent.toFixed(1)}% BW). Increasing target by ${increase} kcal for safety.`;
    }
    // else: losing at healthy rate, no change
  } else if (goal === 'gain') {
    if (weeklyWeightChange <= 0) {
      // Not gaining
      const increase = Math.round(currentTarget * 0.07);
      newTarget = currentTarget + increase;
      shouldAdjust = true;
      reason = `Not gaining weight (${weeklyWeightChange.toFixed(2)} kg/wk). Increasing target by ${increase} kcal.`;
    } else if (weeklyWeightChange > 0.5) {
      // Gaining too fast
      const reduction = Math.round(currentTarget * 0.05);
      newTarget = currentTarget - reduction;
      shouldAdjust = true;
      reason = `Gaining too fast (${weeklyWeightChange.toFixed(2)} kg/wk). Reducing target by ${reduction} kcal.`;
    }
  }

  if (shouldAdjust) {
    setLastAdaptationDate(today);
    saveAdaptationEntry({
      date: today,
      oldTarget: currentTarget,
      newTarget,
      reason,
      weeklyWeightChange,
    });
  }

  return {
    shouldAdjust,
    newTargetCalories: Math.round(newTarget),
    reason,
    weeklyWeightChange,
    avgDailyIntake,
    consistencyScore,
  };
}

/**
 * Apply adaptive result to profile and recalculate macros.
 */
export function applyAdaptation(profile: UserProfile, newCalories: number): Partial<UserProfile> {
  const ratio = newCalories / profile.dailyCalories;
  return {
    dailyCalories: newCalories,
    dailyProtein: Math.round(profile.dailyProtein * ratio),
    dailyCarbs: Math.round(profile.dailyCarbs * ratio),
    dailyFat: Math.round(profile.dailyFat * ratio),
  };
}

/**
 * Get adaptation history for display.
 */
export function getAdaptationHistory(): AdaptationLogEntry[] {
  return getAdaptationLog();
}
