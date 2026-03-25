// ============================================
// Smart Calorie Correction Engine
// Rolling "calorie bank" that replaces rigid daily recovery
// ============================================

import { getDailyLog, getDailyTotals, getProfile, type UserProfile, type DailyLog } from '@/lib/store';

// ── Types ──

export interface CalorieBankState {
  calorieBank: number;
  adjustmentDaysRemaining: number;
  adjustmentPerDay: number;
  lastProcessedDate: string;
  dailyBalances: Array<{ date: string; diff: number }>;
  consecutiveSurplusDays: number;
}

const BANK_KEY = 'nutrilens_calorie_bank';

const DEFAULT_STATE: CalorieBankState = {
  calorieBank: 0,
  adjustmentDaysRemaining: 0,
  adjustmentPerDay: 0,
  lastProcessedDate: '',
  dailyBalances: [],
  consecutiveSurplusDays: 0,
};

// ── Persistence ──

function loadState(): CalorieBankState {
  const raw = localStorage.getItem(BANK_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state: CalorieBankState): void {
  localStorage.setItem(BANK_KEY, JSON.stringify(state));
}

// ── Core Functions ──

/**
 * Update calorie bank after any meal mutation (add/edit/delete).
 * Computes today's actual vs original target, updates rolling bank.
 */
export function updateCalorieBank(log?: DailyLog, profile?: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = new Date().toISOString().split('T')[0];
  const dailyLog = log || getDailyLog(today);
  const totals = getDailyTotals(dailyLog);
  const originalTarget = p.dailyCalories || 1600;

  const state = loadState();

  // Compute diff from original (not adjusted) target
  const diff = totals.eaten - originalTarget;

  // Find existing balance for today or create new
  const existingIdx = state.dailyBalances.findIndex(b => b.date === today);
  const previousDiff = existingIdx >= 0 ? state.dailyBalances[existingIdx].diff : 0;

  // Update bank: remove old diff for today, add new
  state.calorieBank = state.calorieBank - previousDiff + diff;

  // Update daily balances
  if (existingIdx >= 0) {
    state.dailyBalances[existingIdx].diff = diff;
  } else {
    state.dailyBalances.push({ date: today, diff });
  }

  // Keep only last 30 days
  if (state.dailyBalances.length > 30) {
    state.dailyBalances = state.dailyBalances.slice(-30);
  }

  // Track consecutive surplus days for adaptive behavior
  if (diff > 0) {
    if (state.lastProcessedDate !== today) {
      state.consecutiveSurplusDays++;
    }
  } else {
    state.consecutiveSurplusDays = 0;
  }

  saveState(state);
}

/**
 * Get today's adjusted daily calorie target based on calorie bank.
 * This is the main function used by calorie-engine.ts.
 */
export function getAdjustedDailyTarget(profile: UserProfile | null): number {
  const p = profile || getProfile();
  if (!p) return 1600;

  const originalTarget = p.dailyCalories || 1600;
  const state = loadState();

  if (Math.abs(state.calorieBank) < 50) {
    // Bank is essentially balanced — no adjustment needed
    return originalTarget;
  }

  if (state.calorieBank > 0) {
    // SURPLUS: reduce future targets to compensate
    const recoveryDays = Math.max(
      state.adjustmentDaysRemaining > 0 ? state.adjustmentDaysRemaining : 4,
      Math.min(7, state.consecutiveSurplusDays + 3) // Adaptive: extend for consecutive surplus
    );
    const maxAdjustment = originalTarget * 0.20; // Cap at 20%
    const adjustment = Math.min(state.calorieBank / recoveryDays, maxAdjustment);
    const nextTarget = originalTarget - adjustment;
    const floor = originalTarget * 0.80; // Never below 80%
    return Math.round(Math.max(floor, nextTarget));
  }

  // DEFICIT: partial recovery (40%)
  const recoveryAmount = Math.abs(state.calorieBank) * 0.4;
  const maxRecovery = originalTarget * 0.15; // Cap at 15%
  const recovery = Math.min(recoveryAmount, maxRecovery);
  const nextTarget = originalTarget + recovery;
  const ceiling = originalTarget * 1.15; // Never above 115%
  return Math.round(Math.min(ceiling, nextTarget));
}

/**
 * Protein target — always returns the original, never reduced.
 */
export function getProteinTarget(profile: UserProfile | null): number {
  return profile?.dailyProtein || 60;
}

/**
 * Process end-of-day / day rollover.
 * Called when dashboard loads and date has changed since last processing.
 */
export function processEndOfDay(profile: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = new Date().toISOString().split('T')[0];
  const state = loadState();

  if (state.lastProcessedDate === today) return; // Already processed today

  // If there was a previous day to process
  if (state.lastProcessedDate && state.lastProcessedDate < today) {
    // Ensure yesterday's balance is recorded
    const yesterday = state.lastProcessedDate;
    const yesterdayLog = getDailyLog(yesterday);
    const totals = getDailyTotals(yesterdayLog);
    const originalTarget = p.dailyCalories || 1600;
    const diff = totals.eaten - originalTarget;

    const existingIdx = state.dailyBalances.findIndex(b => b.date === yesterday);
    if (existingIdx < 0 && totals.eaten > 0) {
      state.dailyBalances.push({ date: yesterday, diff });
      state.calorieBank += diff;
    }

    // Decrement adjustment days
    if (state.adjustmentDaysRemaining > 0) {
      state.adjustmentDaysRemaining--;
    }

    // If adjustment period ended but bank still positive, start new plan
    if (state.adjustmentDaysRemaining === 0 && state.calorieBank > 50) {
      const days = Math.min(7, Math.max(4, state.consecutiveSurplusDays + 3));
      state.adjustmentDaysRemaining = days;
      state.adjustmentPerDay = Math.min(
        state.calorieBank / days,
        originalTarget * 0.20
      );
    }
  }

  state.lastProcessedDate = today;

  // Keep only last 30 days of balances
  if (state.dailyBalances.length > 30) {
    state.dailyBalances = state.dailyBalances.slice(-30);
  }

  saveState(state);
}

/**
 * Get summary of calorie bank for UI display.
 */
export function getCalorieBankSummary(): {
  bank: number;
  status: 'surplus' | 'deficit' | 'balanced';
  message: string;
} {
  const state = loadState();

  if (Math.abs(state.calorieBank) < 50) {
    return { bank: 0, status: 'balanced', message: 'Your intake is well balanced.' };
  }

  if (state.calorieBank > 0) {
    return {
      bank: Math.round(state.calorieBank),
      status: 'surplus',
      message: 'Your plan auto-adjusted to keep you aligned.',
    };
  }

  return {
    bank: Math.round(state.calorieBank),
    status: 'deficit',
    message: 'Slight increase applied to maintain your energy.',
  };
}

/**
 * Get daily balances for the last 30 days (for Progress page chart).
 */
export function getDailyBalances(): Array<{ date: string; diff: number }> {
  const state = loadState();
  return [...state.dailyBalances].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get user-friendly correction message for toast notifications.
 * Returns null if no message is needed.
 */
export function getCorrectionMessage(): { type: 'surplus' | 'deficit'; message: string } | null {
  const state = loadState();

  if (Math.abs(state.calorieBank) < 50) return null;

  if (state.calorieBank > 0) {
    return {
      type: 'surplus',
      message: "No worries — we've adjusted the next few days to keep you on track.",
    };
  }

  return {
    type: 'deficit',
    message: "We've increased today's plan slightly to keep your energy strong.",
  };
}

/**
 * Check if today's target differs from the original (for badge display).
 */
export function isTargetAdjusted(profile: UserProfile | null): boolean {
  const p = profile || getProfile();
  if (!p) return false;
  const original = p.dailyCalories || 1600;
  const adjusted = getAdjustedDailyTarget(p);
  return Math.abs(adjusted - original) > 10;
}
