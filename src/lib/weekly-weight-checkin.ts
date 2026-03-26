// ==========================================
// NutriLens AI – Weekly Weight Check-In
// Prompts on Sunday for weight + gives feedback
// Derived from raw logs — no cached state
// ==========================================

import { getWeightEntries, addWeightEntry, getWeekStart, type WeightEntry } from './weight-history';
import { getDailyBalances } from './calorie-correction';

const LAST_CHECKIN_KEY = 'nutrilens_weekly_checkin_last';

export function shouldPromptWeightCheckin(): boolean {
  const now = new Date();
  if (now.getDay() !== 0) return false;

  const lastCheckin = localStorage.getItem(LAST_CHECKIN_KEY);
  const thisWeek = getWeekStart(now.toISOString().split('T')[0]);
  return lastCheckin !== thisWeek;
}

export function markWeightCheckinDone(): void {
  const thisWeek = getWeekStart(new Date().toISOString().split('T')[0]);
  localStorage.setItem(LAST_CHECKIN_KEY, thisWeek);
}

export interface WeightFeedback {
  expectedLoss: number;
  actualChange: number;
  emoji: string;
  message: string;
  status: 'on_track' | 'slower' | 'faster';
}

export function computeWeightFeedback(newWeight: number): WeightFeedback {
  const entries = getWeightEntries();
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const lastWeight = lastEntry ? lastEntry.weight : newWeight;

  // Calculate expected loss from calorie deficit (derived from raw logs)
  const balances = getDailyBalances();
  const last7 = balances.slice(-7);
  const weeklyDeficit = last7.reduce((sum, b) => sum + b.diff, 0);
  // 7700 kcal ≈ 1 kg
  const expectedLoss = Math.round((-weeklyDeficit / 7700) * 10) / 10;
  const actualChange = Math.round((lastWeight - newWeight) * 10) / 10;

  let status: 'on_track' | 'slower' | 'faster';
  let emoji: string;
  let message: string;

  if (Math.abs(actualChange - expectedLoss) < 0.2) {
    status = 'on_track';
    emoji = '✅';
    message = 'Perfect! Your progress matches expectations.';
  } else if (actualChange < expectedLoss - 0.2) {
    status = 'slower';
    emoji = '📊';
    message = "Slightly slower than expected. We'll tighten your plan this week.";
  } else {
    status = 'faster';
    emoji = '👏';
    message = 'Great progress! You\'re ahead of schedule!';
  }

  return {
    expectedLoss: Math.max(0, expectedLoss),
    actualChange,
    emoji,
    message,
    status,
  };
}

export function submitWeightCheckin(weight: number, unit: 'kg' | 'lbs' = 'kg'): WeightFeedback {
  const today = new Date().toISOString().split('T')[0];
  const entry: WeightEntry = {
    id: `wc_${Date.now()}`,
    date: today,
    weekStart: getWeekStart(today),
    weight,
    unit,
    photo: null,
    verified: false,
    note: 'Weekly check-in',
    timestamp: new Date().toISOString(),
  };
  addWeightEntry(entry);
  markWeightCheckinDone();
  return computeWeightFeedback(weight);
}
