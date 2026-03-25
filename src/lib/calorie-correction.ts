// ============================================
// Smart Calorie Correction Engine
// Rolling "calorie bank" with adjustment plans
// ============================================

import { getDailyLog, getDailyTotals, getProfile, type UserProfile, type DailyLog } from '@/lib/store';

// ── Types ──

export interface DailyBalanceEntry {
  date: string;
  target: number;
  actual: number;
  diff: number;
  bankAfter: number;
}

export interface AdjustmentPlanEntry {
  date: string;
  adjust: number;
}

export interface CalorieBankState {
  calorieBank: number;
  adjustmentPlan: AdjustmentPlanEntry[];
  adjustmentDaysRemaining: number;
  adjustmentPerDay: number;
  lastProcessedDate: string;
  dailyBalances: DailyBalanceEntry[];
  consecutiveSurplusDays: number;
}

export interface MonthlyStats {
  surplusDays: number;
  deficitDays: number;
  balancedDays: number;
  netBalance: number;
}

const BANK_KEY = 'nutrilens_calorie_bank';

const DEFAULT_STATE: CalorieBankState = {
  calorieBank: 0,
  adjustmentPlan: [],
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
    const parsed = JSON.parse(raw);
    // Backward compat: migrate old dailyBalances format
    if (parsed.dailyBalances?.length && typeof parsed.dailyBalances[0].target === 'undefined') {
      parsed.dailyBalances = parsed.dailyBalances.map((b: any) => ({
        date: b.date,
        target: 0,
        actual: 0,
        diff: b.diff ?? 0,
        bankAfter: 0,
      }));
    }
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state: CalorieBankState): void {
  localStorage.setItem(BANK_KEY, JSON.stringify(state));
}

// ── Helper: build adjustment plan ──

function buildAdjustmentPlan(surplus: number, originalTarget: number, startDate: string, days: number): AdjustmentPlanEntry[] {
  const maxPerDay = originalTarget * 0.20;
  const perDay = Math.min(surplus / days, maxPerDay);
  const plan: AdjustmentPlanEntry[] = [];
  const start = new Date(startDate);
  for (let i = 1; i <= days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    plan.push({ date: d.toISOString().split('T')[0], adjust: -Math.round(perDay) });
  }
  return plan;
}

// ── Core Functions ──

/**
 * Update calorie bank after any meal mutation (add/edit/delete).
 */
export function updateCalorieBank(log?: DailyLog, profile?: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = new Date().toISOString().split('T')[0];
  const dailyLog = log || getDailyLog(today);
  const totals = getDailyTotals(dailyLog);
  const originalTarget = p.dailyCalories || 1600;

  const state = loadState();

  const diff = totals.eaten - originalTarget;

  // Find existing balance for today
  const existingIdx = state.dailyBalances.findIndex(b => b.date === today);
  const previousDiff = existingIdx >= 0 ? state.dailyBalances[existingIdx].diff : 0;

  // Update bank: remove old diff for today, add new
  state.calorieBank = state.calorieBank - previousDiff + diff;

  const entry: DailyBalanceEntry = {
    date: today,
    target: originalTarget,
    actual: totals.eaten,
    diff,
    bankAfter: state.calorieBank,
  };

  if (existingIdx >= 0) {
    state.dailyBalances[existingIdx] = entry;
  } else {
    state.dailyBalances.push(entry);
  }

  // Keep only last 30 days
  if (state.dailyBalances.length > 30) {
    state.dailyBalances = state.dailyBalances.slice(-30);
  }

  // Track consecutive surplus days
  if (diff > 0) {
    if (state.lastProcessedDate !== today) {
      state.consecutiveSurplusDays++;
    }
  } else {
    state.consecutiveSurplusDays = 0;
  }

  // Build/update adjustment plan for surplus
  if (state.calorieBank > 50) {
    const days = Math.min(7, Math.max(4, state.consecutiveSurplusDays + 3));
    state.adjustmentPlan = buildAdjustmentPlan(state.calorieBank, originalTarget, today, days);
    state.adjustmentDaysRemaining = days;
    state.adjustmentPerDay = Math.min(state.calorieBank / days, originalTarget * 0.20);
  } else if (state.calorieBank < -50) {
    // Deficit: single-day partial recovery for tomorrow
    const recovery = Math.abs(state.calorieBank) * 0.4;
    const maxRecovery = originalTarget * 0.15;
    const adjust = Math.round(Math.min(recovery, maxRecovery));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    state.adjustmentPlan = [{ date: tomorrow.toISOString().split('T')[0], adjust }];
  } else {
    state.adjustmentPlan = [];
  }

  saveState(state);
}

/**
 * Get today's adjusted daily calorie target based on calorie bank.
 */
export function getAdjustedDailyTarget(profile: UserProfile | null): number {
  const p = profile || getProfile();
  if (!p) return 1600;

  const originalTarget = p.dailyCalories || 1600;
  const state = loadState();
  const today = new Date().toISOString().split('T')[0];

  // Check explicit adjustment plan first
  const planEntry = state.adjustmentPlan.find(e => e.date === today);
  if (planEntry) {
    const adjusted = originalTarget + planEntry.adjust;
    const floor = originalTarget * 0.80;
    const ceiling = originalTarget * 1.15;
    return Math.round(Math.max(floor, Math.min(ceiling, adjusted)));
  }

  if (Math.abs(state.calorieBank) < 50) {
    return originalTarget;
  }

  if (state.calorieBank > 0) {
    const recoveryDays = Math.max(
      state.adjustmentDaysRemaining > 0 ? state.adjustmentDaysRemaining : 4,
      Math.min(7, state.consecutiveSurplusDays + 3)
    );
    const maxAdjustment = originalTarget * 0.20;
    const adjustment = Math.min(state.calorieBank / recoveryDays, maxAdjustment);
    const nextTarget = originalTarget - adjustment;
    const floor = originalTarget * 0.80;
    return Math.round(Math.max(floor, nextTarget));
  }

  // DEFICIT: partial recovery (40%)
  const recoveryAmount = Math.abs(state.calorieBank) * 0.4;
  const maxRecovery = originalTarget * 0.15;
  const recovery = Math.min(recoveryAmount, maxRecovery);
  const nextTarget = originalTarget + recovery;
  const ceiling = originalTarget * 1.15;
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
 */
export function processEndOfDay(profile: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = new Date().toISOString().split('T')[0];
  const state = loadState();

  if (state.lastProcessedDate === today) return;

  if (state.lastProcessedDate && state.lastProcessedDate < today) {
    const yesterday = state.lastProcessedDate;
    const yesterdayLog = getDailyLog(yesterday);
    const totals = getDailyTotals(yesterdayLog);
    const originalTarget = p.dailyCalories || 1600;
    const diff = totals.eaten - originalTarget;

    const existingIdx = state.dailyBalances.findIndex(b => b.date === yesterday);
    if (existingIdx < 0 && totals.eaten > 0) {
      state.dailyBalances.push({
        date: yesterday,
        target: originalTarget,
        actual: totals.eaten,
        diff,
        bankAfter: state.calorieBank + diff,
      });
      state.calorieBank += diff;
    }

    // Clean expired adjustment plan entries
    state.adjustmentPlan = state.adjustmentPlan.filter(e => e.date >= today);

    if (state.adjustmentDaysRemaining > 0) {
      state.adjustmentDaysRemaining--;
    }

    // Rebuild plan if bank still positive and plan is empty
    if (state.adjustmentPlan.length === 0 && state.calorieBank > 50) {
      const days = Math.min(7, Math.max(4, state.consecutiveSurplusDays + 3));
      state.adjustmentPlan = buildAdjustmentPlan(state.calorieBank, originalTarget, today, days);
      state.adjustmentDaysRemaining = days;
      state.adjustmentPerDay = Math.min(state.calorieBank / days, originalTarget * 0.20);
    }
  }

  state.lastProcessedDate = today;

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
 * Get daily balances for the last 30 days (enriched format).
 */
export function getDailyBalances(): DailyBalanceEntry[] {
  const state = loadState();
  return [...state.dailyBalances].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get the active adjustment plan entries.
 */
export function getAdjustmentPlan(): AdjustmentPlanEntry[] {
  const state = loadState();
  const today = new Date().toISOString().split('T')[0];
  return state.adjustmentPlan.filter(e => e.date >= today);
}

/**
 * Get monthly stats for a given month (defaults to current).
 */
export function getMonthlyStats(month?: string): MonthlyStats {
  const state = loadState();
  const targetMonth = month || new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const monthBalances = state.dailyBalances.filter(b => b.date.startsWith(targetMonth));

  let surplusDays = 0;
  let deficitDays = 0;
  let balancedDays = 0;
  let netBalance = 0;

  for (const b of monthBalances) {
    netBalance += b.diff;
    if (b.diff > 50) surplusDays++;
    else if (b.diff < -50) deficitDays++;
    else balancedDays++;
  }

  return { surplusDays, deficitDays, balancedDays, netBalance: Math.round(netBalance) };
}

/**
 * Check if surplus days cluster on weekends (Sat/Sun).
 */
export function getWeekendPattern(): { detected: boolean; message: string } {
  const state = loadState();
  const surplusEntries = state.dailyBalances.filter(b => b.diff > 50);
  if (surplusEntries.length < 3) return { detected: false, message: '' };

  let weekendSurplus = 0;
  for (const b of surplusEntries) {
    const day = new Date(b.date + 'T00:00:00').getDay();
    if (day === 0 || day === 6) weekendSurplus++;
  }

  const ratio = weekendSurplus / surplusEntries.length;
  if (ratio >= 0.5) {
    return {
      detected: true,
      message: 'You tend to eat more on weekends. We\'ve adjusted future plans to handle this better.',
    };
  }

  return { detected: false, message: '' };
}

/**
 * Get user-friendly correction message for toast notifications.
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
 * Get contextual toast after a meal is logged (for immediate feedback).
 */
export function getContextualMealToast(): { type: 'surplus' | 'deficit'; message: string } | null {
  const p = getProfile();
  if (!p) return null;

  const today = new Date().toISOString().split('T')[0];
  const log = getDailyLog(today);
  const totals = getDailyTotals(log);
  const target = p.dailyCalories || 1600;
  const diff = totals.eaten - target;

  if (diff > 100) {
    return {
      type: 'surplus',
      message: "You went over your target today. No worries — we'll adjust the next few days to keep you on track.",
    };
  }

  if (diff < -300 && totals.eaten > 0) {
    return {
      type: 'deficit',
      message: "You ate a bit less today. We've slightly increased tomorrow's plan to keep your energy strong.",
    };
  }

  return null;
}

/**
 * Check if today's target differs from the original.
 */
export function isTargetAdjusted(profile: UserProfile | null): boolean {
  const p = profile || getProfile();
  if (!p) return false;
  const original = p.dailyCalories || 1600;
  const adjusted = getAdjustedDailyTarget(p);
  return Math.abs(adjusted - original) > 10;
}
