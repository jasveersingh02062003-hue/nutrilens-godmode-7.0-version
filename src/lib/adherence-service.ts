// ─── Adherence Scoring & Behavior Model ───

import type { WeekPlan } from './meal-planner-store';
import { getMealPreferences } from './meal-plan-feedback';
import { scopedGetJSON, scopedSetJSON } from '@/lib/scoped-storage';

const ADHERENCE_KEY = 'nutrilens_adherence_history';

export interface AdherenceScore {
  weekStart: string;
  mealsPlanned: number;
  mealsCooked: number;
  score: number; // 0-1
}

export interface AdherenceTrend {
  direction: 'rising' | 'falling' | 'stable';
  currentScore: number;
  averageScore: number;
  weeks: number;
}

export interface BehaviorProfile {
  skipRate: number;          // 0-1: how often user skips meals
  outsideFoodFrequency: number; // estimated outside meals per week
  preferredMealTypes: string[];
  complexity: 'simple' | 'standard' | 'complex';
}

// ─── Adherence Score Calculation ───

export function calculateAdherenceScore(weekPlan: WeekPlan): AdherenceScore {
  let mealsPlanned = 0;
  let mealsCooked = 0;

  for (const day of weekPlan.days) {
    for (const meal of day.meals) {
      mealsPlanned++;
      if (meal.cooked) mealsCooked++;
    }
  }

  const score = mealsPlanned > 0 ? mealsCooked / mealsPlanned : 0;

  return {
    weekStart: weekPlan.weekStart,
    mealsPlanned,
    mealsCooked,
    score: Math.round(score * 100) / 100,
  };
}

// ─── Persistence ───

function getHistory(): AdherenceScore[] {
  const data = localStorage.getItem(ADHERENCE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveHistory(history: AdherenceScore[]) {
  // Keep last 12 weeks
  localStorage.setItem(ADHERENCE_KEY, JSON.stringify(history.slice(-12)));
}

export function saveAdherenceScore(score: AdherenceScore) {
  const history = getHistory();
  // Replace if same week exists
  const idx = history.findIndex(h => h.weekStart === score.weekStart);
  if (idx >= 0) history[idx] = score;
  else history.push(score);
  saveHistory(history);
}

export function getAdherenceHistory(): AdherenceScore[] {
  return getHistory().slice(-4);
}

// ─── Trend Analysis ───

export function getAdherenceTrend(): AdherenceTrend {
  const history = getHistory().slice(-4);

  if (history.length === 0) {
    return { direction: 'stable', currentScore: 0, averageScore: 0, weeks: 0 };
  }

  const currentScore = history[history.length - 1].score;
  const averageScore = Math.round((history.reduce((s, h) => s + h.score, 0) / history.length) * 100) / 100;

  let direction: AdherenceTrend['direction'] = 'stable';
  if (history.length >= 2) {
    const recent = history.slice(-2);
    const diff = recent[1].score - recent[0].score;
    if (diff > 0.1) direction = 'rising';
    else if (diff < -0.1) direction = 'falling';
  }

  return { direction, currentScore, averageScore, weeks: history.length };
}

// ─── Behavior Profile ───

export function getBehaviorProfile(): BehaviorProfile {
  const prefs = getMealPreferences();
  const history = getHistory().slice(-4);

  // Skip rate from adherence
  const totalPlanned = history.reduce((s, h) => s + h.mealsPlanned, 0);
  const totalCooked = history.reduce((s, h) => s + h.mealsCooked, 0);
  const skipRate = totalPlanned > 0 ? 1 - (totalCooked / totalPlanned) : 0.3; // default 30%

  // Outside food frequency: estimate from skip rate (skipped ≈ ate outside or skipped)
  const outsideFoodFrequency = Math.round(skipRate * 21 * 0.6); // ~60% of skipped = outside food

  // Preferred meal types: if they skip breakfasts a lot, they prefer lunch/dinner
  const preferredMealTypes = ['lunch', 'dinner'];
  if (skipRate < 0.3) preferredMealTypes.unshift('breakfast');

  // Complexity recommendation
  const avgScore = history.length > 0
    ? history.reduce((s, h) => s + h.score, 0) / history.length
    : 0.5;

  let complexity: BehaviorProfile['complexity'] = 'standard';
  if (avgScore < 0.5) complexity = 'simple';
  else if (avgScore > 0.8) complexity = 'complex';

  return { skipRate, outsideFoodFrequency, preferredMealTypes, complexity };
}

// ─── Complexity Recommendation ───

export function getComplexityRecommendation(adherenceScore?: number): {
  level: 'simple' | 'standard' | 'complex';
  maxIngredients: number;
  maxPrepTime: number;
  description: string;
} {
  const score = adherenceScore ?? getBehaviorProfile().skipRate;
  const effectiveScore = adherenceScore !== undefined ? adherenceScore : (1 - score);

  if (effectiveScore < 0.5) {
    return {
      level: 'simple',
      maxIngredients: 5,
      maxPrepTime: 15,
      description: 'simpler',
    };
  }
  if (effectiveScore > 0.8) {
    return {
      level: 'complex',
      maxIngredients: 15,
      maxPrepTime: 60,
      description: 'more complex',
    };
  }
  return {
    level: 'standard',
    maxIngredients: 10,
    maxPrepTime: 35,
    description: 'standard',
  };
}
