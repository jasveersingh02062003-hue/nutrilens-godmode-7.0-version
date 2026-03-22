// ============================================
// NutriLens AI – Behavioral Stats & Weekly Adaptation
// ============================================
// Tracks consistency, logging habits, late-night eating,
// and adapts base meal targets weekly based on patterns.

import { getProfile, getDailyLog, saveProfile, type UserProfile, getTodayKey } from './store';
import { getEatingPattern, getBehaviorMemory, type EatingPattern } from './smart-adjustment';

const BEHAVIOR_STATS_KEY = 'nutrilens_behavior_stats';
const WEEKLY_ADAPTATION_KEY = 'nutrilens_weekly_adaptation';

// ── Types ──

export interface BehaviorStats {
  weekStart: string;
  avgCaloriesConsumed: number;
  avgMealSplit: { breakfast: number; lunch: number; dinner: number; snacks: number };
  deviationPatterns: {
    breakfastOvereatCount: number;
    lunchUndereatCount: number;
    dinnerSkipCount: number;
  };
  consistencyScore: number; // 0–100
  loggingHabit: {
    missedLogsPerWeek: number;
    lateNightEatingFrequency: number; // meals logged after 10pm
  };
  daysTracked: number;
  lastUpdated: string;
  // Budget-aware fields
  eatingPattern: 'home_heavy' | 'outside_heavy' | 'balanced';
  overspendTendency: 'low' | 'medium' | 'high';
  outsideFrequency: number; // days per week with outside meals
  mealSkipping: boolean;
  impulsiveSpending: boolean;
}

const DEFAULT_STATS: BehaviorStats = {
  weekStart: '',
  avgCaloriesConsumed: 0,
  avgMealSplit: { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snacks: 0.10 },
  deviationPatterns: { breakfastOvereatCount: 0, lunchUndereatCount: 0, dinnerSkipCount: 0 },
  consistencyScore: 50,
  loggingHabit: { missedLogsPerWeek: 0, lateNightEatingFrequency: 0 },
  daysTracked: 0,
  lastUpdated: '',
};

// ── Get / Save ──

export function getBehaviorStats(): BehaviorStats {
  try {
    const data = localStorage.getItem(BEHAVIOR_STATS_KEY);
    return data ? { ...DEFAULT_STATS, ...JSON.parse(data) } : DEFAULT_STATS;
  } catch { return DEFAULT_STATS; }
}

function saveBehaviorStats(stats: BehaviorStats) {
  stats.lastUpdated = new Date().toISOString();
  localStorage.setItem(BEHAVIOR_STATS_KEY, JSON.stringify(stats));
}

// ── Consistency Score Calculation ──
// Based on: logging frequency, deviation from targets, meal regularity

export function calculateConsistencyScore(daysData: Array<{ calories: number; target: number; mealsLogged: number; totalMeals: number }>): number {
  if (daysData.length === 0) return 50;

  let score = 0;

  // 1. Logging frequency (40 points) - how many days had at least 1 meal logged
  const daysWithLogs = daysData.filter(d => d.mealsLogged > 0).length;
  const logFrequency = daysWithLogs / daysData.length;
  score += logFrequency * 40;

  // 2. Calorie accuracy (35 points) - how close to targets
  const accuracyScores = daysData
    .filter(d => d.target > 0 && d.calories > 0)
    .map(d => {
      const deviation = Math.abs(d.calories - d.target) / d.target;
      return Math.max(0, 1 - deviation); // 1 = perfect, 0 = 100%+ off
    });
  const avgAccuracy = accuracyScores.length > 0
    ? accuracyScores.reduce((s, v) => s + v, 0) / accuracyScores.length
    : 0.5;
  score += avgAccuracy * 35;

  // 3. Meal completeness (25 points) - how many meals logged out of total
  const totalMealsLogged = daysData.reduce((s, d) => s + d.mealsLogged, 0);
  const totalMealsPossible = daysData.reduce((s, d) => s + d.totalMeals, 0);
  const completeness = totalMealsPossible > 0 ? totalMealsLogged / totalMealsPossible : 0.5;
  score += completeness * 25;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ── Daily Update ──
// Call this once per day (e.g., on dashboard load) to update rolling stats

export function updateDailyBehaviorStats() {
  const profile = getProfile();
  if (!profile) return;

  const stats = getBehaviorStats();
  const today = getTodayKey();

  // Don't update more than once per day
  if (stats.lastUpdated) {
    const lastDate = stats.lastUpdated.split('T')[0];
    if (lastDate === today) return;
  }

  const log = getDailyLog(today);
  const totalCalories = log.meals.reduce((s, m) => s + m.totalCalories, 0);
  const mealsLogged = new Set(log.meals.map(m => m.type)).size;

  // Track late-night eating (meals after 10pm)
  const lateNightMeals = log.meals.filter(m => {
    const hour = new Date(m.time).getHours();
    return hour >= 22;
  }).length;

  // Check meal-specific patterns
  const breakfastMeals = log.meals.filter(m => m.type === 'breakfast');
  const breakfastCal = breakfastMeals.reduce((s, m) => s + m.totalCalories, 0);
  const bfTarget = profile.dailyCalories * 0.25;
  if (breakfastCal > bfTarget * 1.3) stats.deviationPatterns.breakfastOvereatCount++;

  const lunchMeals = log.meals.filter(m => m.type === 'lunch');
  const lunchCal = lunchMeals.reduce((s, m) => s + m.totalCalories, 0);
  const lnTarget = profile.dailyCalories * 0.35;
  if (lunchCal > 0 && lunchCal < lnTarget * 0.5) stats.deviationPatterns.lunchUndereatCount++;

  const dinnerMeals = log.meals.filter(m => m.type === 'dinner');
  if (dinnerMeals.length === 0 && new Date().getHours() >= 22) stats.deviationPatterns.dinnerSkipCount++;

  // Update rolling averages
  const alpha = 0.2; // smoothing factor
  stats.avgCaloriesConsumed = totalCalories > 0
    ? Math.round(stats.avgCaloriesConsumed * (1 - alpha) + totalCalories * alpha)
    : stats.avgCaloriesConsumed;

  if (totalCalories > 0) {
    const split = stats.avgMealSplit;
    split.breakfast = split.breakfast * (1 - alpha) + (breakfastCal / Math.max(totalCalories, 1)) * alpha;
    split.lunch = split.lunch * (1 - alpha) + (lunchCal / Math.max(totalCalories, 1)) * alpha;
    const dinnerCal = dinnerMeals.reduce((s, m) => s + m.totalCalories, 0);
    split.dinner = split.dinner * (1 - alpha) + (dinnerCal / Math.max(totalCalories, 1)) * alpha;
    const snackCal = log.meals.filter(m => m.type === 'snack').reduce((s, m) => s + m.totalCalories, 0);
    split.snacks = split.snacks * (1 - alpha) + (snackCal / Math.max(totalCalories, 1)) * alpha;

    // Normalize
    const total = split.breakfast + split.lunch + split.dinner + split.snacks;
    if (total > 0) {
      split.breakfast /= total;
      split.lunch /= total;
      split.dinner /= total;
      split.snacks /= total;
    }
  }

  // Update logging habits
  stats.loggingHabit.lateNightEatingFrequency = Math.round(
    stats.loggingHabit.lateNightEatingFrequency * (1 - alpha) + lateNightMeals * alpha * 7
  );
  if (mealsLogged === 0) {
    stats.loggingHabit.missedLogsPerWeek = Math.round(
      stats.loggingHabit.missedLogsPerWeek * (1 - alpha) + 1 * alpha * 7
    );
  }

  stats.daysTracked++;
  saveBehaviorStats(stats);
}

// ── Weekly Adaptation ──
// Adjusts base meal split and targets based on consistent patterns.
// Call once per week (check in dashboard load).

export function runWeeklyAdaptation(): { adapted: boolean; changes: string[] } {
  const profile = getProfile();
  if (!profile) return { adapted: false, changes: [] };

  const stats = getBehaviorStats();
  const changes: string[] = [];

  // Only run if enough data (at least 4 days tracked)
  if (stats.daysTracked < 4) return { adapted: false, changes: [] };

  // Check if already run this week
  const lastAdaptation = localStorage.getItem(WEEKLY_ADAPTATION_KEY);
  const currentWeek = getWeekKey();
  if (lastAdaptation === currentWeek) return { adapted: false, changes: [] };

  // 1. Calculate consistency score from last 7 days
  const daysData = getLast7DaysData(profile);
  stats.consistencyScore = calculateConsistencyScore(daysData);

  // 2. Adapt meal split: blend original with behavior (70/30)
  const originalSplit = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snacks: 0.10 };
  const behaviorSplit = stats.avgMealSplit;

  const newSplit = {
    breakfast: originalSplit.breakfast * 0.7 + behaviorSplit.breakfast * 0.3,
    lunch: originalSplit.lunch * 0.7 + behaviorSplit.lunch * 0.3,
    dinner: originalSplit.dinner * 0.7 + behaviorSplit.dinner * 0.3,
    snacks: originalSplit.snacks * 0.7 + behaviorSplit.snacks * 0.3,
  };

  // Normalize
  const total = newSplit.breakfast + newSplit.lunch + newSplit.dinner + newSplit.snacks;
  if (total > 0) {
    newSplit.breakfast /= total;
    newSplit.lunch /= total;
    newSplit.dinner /= total;
    newSplit.snacks /= total;
  }

  // 3. Chronic overeating fix: if breakfast overeat > 4 times, increase breakfast target
  if (stats.deviationPatterns.breakfastOvereatCount > 4) {
    const increase = 0.05; // 5% shift
    newSplit.breakfast += increase;
    newSplit.dinner -= increase; // take from dinner
    changes.push('Increased breakfast target (you consistently eat more at breakfast)');
    stats.deviationPatterns.breakfastOvereatCount = 0; // reset after adaptation
  }

  // 4. Chronic dinner skipping: redistribute to other meals
  if (stats.deviationPatterns.dinnerSkipCount > 3) {
    const shift = newSplit.dinner * 0.3;
    newSplit.lunch += shift * 0.6;
    newSplit.snacks += shift * 0.4;
    newSplit.dinner -= shift;
    changes.push('Reduced dinner target (you often skip dinner)');
    stats.deviationPatterns.dinnerSkipCount = 0;
  }

  // Save updated stats
  saveBehaviorStats(stats);

  // Store the adapted split in the eating pattern
  const pattern = getEatingPattern();
  pattern.breakfast = newSplit.breakfast;
  pattern.lunch = newSplit.lunch;
  pattern.dinner = newSplit.dinner;
  pattern.snacks = newSplit.snacks;
  pattern.lastUpdated = new Date().toISOString();
  localStorage.setItem('nutrilens_eating_pattern', JSON.stringify(pattern));

  localStorage.setItem(WEEKLY_ADAPTATION_KEY, currentWeek);

  return { adapted: changes.length > 0, changes };
}

// ── Nudge Frequency Control ──
// Low-consistency users get fewer nudges

export function shouldShowNudge(type: 'adjustment' | 'recovery' | 'skin' | 'weather'): boolean {
  const stats = getBehaviorStats();

  // High consistency (>75): show all nudges
  if (stats.consistencyScore > 75) return true;

  // Medium consistency (40-75): show important nudges only
  if (stats.consistencyScore > 40) {
    return type === 'adjustment' || type === 'recovery';
  }

  // Low consistency (<40): only show recovery nudges (don't overwhelm)
  return type === 'recovery';
}

// ── Helpers ──

function getWeekKey(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return monday.toISOString().split('T')[0];
}

function getLast7DaysData(profile: UserProfile): Array<{ calories: number; target: number; mealsLogged: number; totalMeals: number }> {
  const data: Array<{ calories: number; target: number; mealsLogged: number; totalMeals: number }> = [];
  const today = new Date();

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const log = getDailyLog(dateKey);
    const totalCalories = log.meals.reduce((s, m) => s + m.totalCalories, 0);
    const mealsLogged = new Set(log.meals.map(m => m.type)).size;

    data.push({
      calories: totalCalories,
      target: profile.dailyCalories,
      mealsLogged,
      totalMeals: 4, // breakfast, lunch, dinner, snacks
    });
  }

  return data;
}
