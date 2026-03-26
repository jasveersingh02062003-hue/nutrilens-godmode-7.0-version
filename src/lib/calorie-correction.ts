// ============================================
// Smart Calorie Correction Engine
// Deterministic: daily logs = source of truth
// Adjustments recomputed from raw logs, never stored incrementally
// ============================================

import { getDailyLog, getDailyTotals, getProfile, getRecentLogs, type UserProfile, type DailyLog } from '@/lib/store';

// ── Types ──

export type CorrectionMode = 'aggressive' | 'balanced' | 'flexible';
export type DayType = 'normal' | 'cheat' | 'recovery' | 'fasting';

export interface DailyBalanceEntry {
  date: string;
  target: number;
  actual: number;
  diff: number;
  bankAfter: number;
  adjustedTarget?: number;
}

export interface AdjustmentPlanEntry {
  date: string;
  adjust: number;
}

export interface AdjustmentSource {
  sourceDate: string;
  surplus: number;
  appliedAdjustment: number;
}

export interface AdjustmentSourceMap {
  targetDate: string;
  sources: AdjustmentSource[];
}

export interface CalorieBankState {
  calorieBank: number;
  adjustmentPlan: AdjustmentPlanEntry[];
  adjustmentDaysRemaining: number;
  adjustmentPerDay: number;
  lastProcessedDate: string;
  dailyBalances: DailyBalanceEntry[];
  consecutiveSurplusDays: number;
  consecutiveDeficitDays: number;
  correctionMode: CorrectionMode;
  autoAdjustMeals: boolean;
  dayCutoffHour: number;
  specialDays: Record<string, DayType>;
  balanceStreak: number;
  adjustmentSources: AdjustmentSourceMap[];
}

export interface MonthlyStats {
  surplusDays: number;
  deficitDays: number;
  balancedDays: number;
  netBalance: number;
}

export interface EngineResponse {
  adjustedCalories: number;
  originalCalories: number;
  proteinTarget: number;
  bankStatus: 'surplus' | 'deficit' | 'balanced';
  bankAmount: number;
  adjustmentsApplied: AdjustmentPlanEntry[];
  confidenceScore: number;
  warnings: string[];
  adherenceScore: number;
  balanceStreak: number;
  dayType: DayType;
  correctionMode: CorrectionMode;
}

const BANK_KEY = 'nutrilens_calorie_bank';

const MODE_CONFIG: Record<CorrectionMode, { recoveryDays: [number, number]; surplusCap: number; deficitRecovery: number }> = {
  aggressive: { recoveryDays: [2, 3], surplusCap: 0.25, deficitRecovery: 0.50 },
  balanced:   { recoveryDays: [3, 5], surplusCap: 0.20, deficitRecovery: 0.40 },
  flexible:   { recoveryDays: [4, 6], surplusCap: 0.15, deficitRecovery: 0.30 },
};

const DEFAULT_STATE: CalorieBankState = {
  calorieBank: 0,
  adjustmentPlan: [],
  adjustmentDaysRemaining: 0,
  adjustmentPerDay: 0,
  lastProcessedDate: '',
  dailyBalances: [],
  consecutiveSurplusDays: 0,
  consecutiveDeficitDays: 0,
  correctionMode: 'balanced',
  autoAdjustMeals: true,
  dayCutoffHour: 3,
  specialDays: {},
  balanceStreak: 0,
  adjustmentSources: [],
};

// ── Persistence ──

function loadState(): CalorieBankState {
  const raw = localStorage.getItem(BANK_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.dailyBalances?.length && typeof parsed.dailyBalances[0].target === 'undefined') {
      parsed.dailyBalances = parsed.dailyBalances.map((b: any) => ({
        date: b.date, target: 0, actual: 0, diff: b.diff ?? 0, bankAfter: 0,
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

// ── Utility ──

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

function getFutureDate(date: string, offset: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

// ── Time-Based Day Cutoff ──

export function getEffectiveDate(cutoffHour?: number): string {
  const now = new Date();
  const cutoff = cutoffHour ?? loadState().dayCutoffHour;
  if (now.getHours() < cutoff) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
}

// ── Special Day Types ──

export function setDayType(date: string, type: DayType): void {
  const state = loadState();
  if (type === 'normal') {
    delete state.specialDays[date];
  } else {
    state.specialDays[date] = type;
  }
  saveState(state);
}

export function getDayType(date?: string): DayType {
  const state = loadState();
  const d = date || getEffectiveDate();
  return state.specialDays[d] || 'normal';
}

// ── Correction Mode ──

export function setCorrectionMode(mode: CorrectionMode): void {
  const state = loadState();
  state.correctionMode = mode;
  saveState(state);
}

export function getCorrectionMode(): CorrectionMode {
  return loadState().correctionMode;
}

// ── Auto-Adjust Toggle ──

export function setAutoAdjust(on: boolean): void {
  const state = loadState();
  state.autoAdjustMeals = on;
  saveState(state);
}

export function getAutoAdjust(): boolean {
  return loadState().autoAdjustMeals;
}

// ── Confidence Scoring ──

export function getAverageConfidence(log?: DailyLog): number {
  const l = log || getDailyLog(getEffectiveDate());
  let totalConf = 0;
  let count = 0;
  for (const meal of l.meals) {
    for (const item of meal.items) {
      totalConf += (item as any).confidenceScore ?? 0.85;
      count++;
    }
  }
  return count > 0 ? totalConf / count : 0.85;
}

// ── Adherence Tracking ──

export function getAdherenceScore(): { score: number; label: string } {
  const logs = getRecentLogs(7);
  let mealsLogged = 0;
  const mealsPlanned = 7 * 3;
  for (const log of logs) {
    mealsLogged += log.meals.length;
  }
  const score = Math.min(1, mealsLogged / mealsPlanned);
  const pct = Math.round(score * 100);
  const label = pct >= 80 ? 'Great' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Low';
  return { score, label };
}

// ══════════════════════════════════════════════
// DETERMINISTIC PURE FUNCTIONS
// These compute adjustments from raw daily logs.
// No side effects, no localStorage access.
// ══════════════════════════════════════════════

/**
 * Compute a merged adjustment map from past daily logs.
 * Returns Record<string, number> — date → total adjustment in kcal.
 * Surplus: spread over 4-5 days as negative adjustments.
 * Deficit: 30% recovery on next day (capped at 250), positive adjustment.
 */
export function computeAdjustmentMap(
  pastLogs: DailyBalanceEntry[],
  baseTarget: number
): Record<string, number> {
  const adjMap: Record<string, number> = {};

  for (const day of pastLogs) {
    // Guard: skip incomplete days (< 300 kcal logged)
    if (!day.actual || day.actual < 300) continue;

    // Use effectiveTarget to prevent double correction distortion
    const effectiveTarget = day.adjustedTarget ?? day.target ?? baseTarget;
    const diff = day.actual - effectiveTarget;
    if (Math.abs(diff) < 50) continue;

    if (diff > 0) {
      // Surplus: spread reduction
      const spreadDays = diff > 800 ? 5 : 4;
      const perDay = Math.round(diff / spreadDays);
      for (let i = 1; i <= spreadDays; i++) {
        const targetDate = getFutureDate(day.date, i);
        adjMap[targetDate] = (adjMap[targetDate] || 0) - perDay;
      }
    } else {
      // Deficit: partial recovery on next day
      const recovery = Math.min(Math.round(Math.abs(diff) * 0.3), 250);
      const targetDate = getFutureDate(day.date, 1);
      adjMap[targetDate] = (adjMap[targetDate] || 0) + recovery;
    }
  }

  return adjMap;
}

/**
 * Compute the adjusted calorie target for a given date.
 * For past dates with a frozen adjustedTarget, returns that.
 * Otherwise recomputes from daily balances before that date.
 */
export function computeAdjustedTarget(
  date: string,
  baseTarget: number,
  allBalances: DailyBalanceEntry[]
): number {
  const today = getEffectiveDate();

  // Past day with frozen target
  if (date < today) {
    const entry = allBalances.find(b => b.date === date);
    if (entry?.adjustedTarget) return entry.adjustedTarget;
  }

  // Compute from logs before this date
  const pastLogs = allBalances.filter(b => b.date < date && b.actual > 0);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);
  const adjustment = adjMap[date] || 0;
  return Math.round(clamp(baseTarget + adjustment, 1200, baseTarget * 1.15));
}

/**
 * Compute adjustment breakdown for a target date — which past days contribute to it.
 * Returns one entry per source day (grouped).
 */
export function computeBreakdownForDate(
  targetDate: string,
  pastLogs: DailyBalanceEntry[],
  baseTarget: number
): AdjustmentSource[] {
  const result: AdjustmentSource[] = [];

  for (const day of pastLogs) {
    // Guard: skip incomplete days (< 300 kcal logged)
    if (!day.actual || day.actual < 300) continue;

    // Use effectiveTarget to prevent double correction distortion
    const effectiveTarget = day.adjustedTarget ?? day.target ?? baseTarget;
    const diff = day.actual - effectiveTarget;
    if (Math.abs(diff) < 50) continue;

    let contribution = 0;

    if (diff > 0) {
      const spreadDays = diff > 800 ? 5 : 4;
      const perDay = Math.round(diff / spreadDays);
      for (let i = 1; i <= spreadDays; i++) {
        if (getFutureDate(day.date, i) === targetDate) {
          contribution -= perDay;
        }
      }
    } else {
      const recovery = Math.min(Math.round(Math.abs(diff) * 0.3), 250);
      if (getFutureDate(day.date, 1) === targetDate) {
        contribution += recovery;
      }
    }

    if (contribution !== 0) {
      result.push({
        sourceDate: day.date,
        surplus: Math.round(diff),
        appliedAdjustment: contribution,
      });
    }
  }

  return result;
}

/**
 * Compute dinner notification summary — pure function.
 */
export function computeDinnerSummary(
  today: string,
  actualCalories: number,
  targetCalories: number,
  allBalances: DailyBalanceEntry[]
): { message: string; tomorrowTarget: number; tomorrowImpact: number; next3DaysImpact: number; totalPending: number } | null {
  const diff = actualCalories - targetCalories;
  if (Math.abs(diff) < 50) return null;

  let message = '';

  if (diff > 0) {
    const spreadDays = diff > 800 ? 5 : 4;
    const perDay = Math.round(diff / spreadDays);
    message = `You ate +${Math.round(diff)} kcal over target today.\n\n→ We'll reduce ~${perDay} kcal/day over the next ${spreadDays} days.`;
  } else {
    const deficit = Math.abs(diff);
    const recovery = Math.min(Math.round(deficit * 0.3), 250);
    message = `You ate ${Math.round(deficit)} kcal less than your target.\n\n→ Tomorrow's calories will increase by ~${recovery} kcal.`;
  }

  // Include today's entry in balances for tomorrow's computation
  const todayBalance: DailyBalanceEntry = {
    date: today,
    target: targetCalories,
    actual: actualCalories,
    diff,
    bankAfter: 0,
  };
  const allPast = [...allBalances.filter(b => b.date !== today), todayBalance];

  const tomorrow = getFutureDate(today, 1);
  const tomorrowTarget = computeAdjustedTarget(tomorrow, targetCalories, allPast);

  // Pending adjustments for future dates
  const adjMap = computeAdjustmentMap(allPast.filter(b => b.actual >= 300), targetCalories);
  const futureEntries = Object.entries(adjMap).filter(([d]) => d > today).sort(([a], [b]) => a.localeCompare(b));
  
  const tomorrowImpact = adjMap[tomorrow] || 0;
  const next3Days = futureEntries.slice(0, 3);
  const next3DaysImpact = next3Days.reduce((sum, [, val]) => sum + val, 0);
  const totalPending = futureEntries.reduce((sum, [, val]) => sum + val, 0);

  if (Math.abs(totalPending) > 0) {
    message += `\n\n(${Math.abs(Math.round(totalPending))} kcal still being balanced from previous days.)`;
  }

  message += `\n\n👉 Tomorrow's target: ~${tomorrowTarget} kcal`;

  return { message, tomorrowTarget, tomorrowImpact, next3DaysImpact, totalPending };
}

// ══════════════════════════════════════════════
// STATEFUL FUNCTIONS (localStorage access)
// Simplified — only update balances and streaks.
// Adjustment plans are NO LONGER stored/patched.
// ══════════════════════════════════════════════

// ── UI Update Callbacks ──

let uiUpdateCallbacks: Array<() => void> = [];

export function onCalorieBankUpdate(cb: () => void): void {
  uiUpdateCallbacks.push(cb);
}

export function offCalorieBankUpdate(cb: () => void): void {
  uiUpdateCallbacks = uiUpdateCallbacks.filter(c => c !== cb);
}

function notifyUICallbacks(): void {
  for (const cb of uiUpdateCallbacks) {
    try { cb(); } catch {}
  }
}

/**
 * Update calorie bank after any meal mutation.
 * Now only updates dailyBalances + streaks. No plan building.
 */
export function updateCalorieBank(log?: DailyLog, profile?: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = getEffectiveDate();
  const dailyLog = log || getDailyLog(today);
  const totals = getDailyTotals(dailyLog);
  const originalTarget = p.dailyCalories || 1600;

  const state = loadState();
  const dayType = state.specialDays[today] || 'normal';

  if (dayType === 'fasting') return;

  // Freeze guard: if day changed since last process, freeze yesterday first
  if (state.lastProcessedDate && state.lastProcessedDate < today && state.lastProcessedDate !== today) {
    processEndOfDay(p);
    // Re-load state after processEndOfDay mutated it
    const freshState = loadState();
    Object.assign(state, freshState);
  }

  const diff = totals.eaten - originalTarget;

  const existingIdx = state.dailyBalances.findIndex(b => b.date === today);
  const previousDiff = existingIdx >= 0 ? state.dailyBalances[existingIdx].diff : 0;

  state.calorieBank = state.calorieBank - previousDiff + diff;

  const entry: DailyBalanceEntry = {
    date: today, target: originalTarget, actual: totals.eaten, diff, bankAfter: state.calorieBank,
  };

  if (existingIdx >= 0) {
    state.dailyBalances[existingIdx] = entry;
  } else {
    state.dailyBalances.push(entry);
  }

  if (state.dailyBalances.length > 30) {
    state.dailyBalances = state.dailyBalances.slice(-30);
  }

  // Track consecutive surplus/deficit
  if (diff > 0) {
    state.consecutiveSurplusDays = state.lastProcessedDate !== today ? state.consecutiveSurplusDays + 1 : state.consecutiveSurplusDays;
    state.consecutiveDeficitDays = 0;
  } else if (diff < -50) {
    state.consecutiveDeficitDays = state.lastProcessedDate !== today ? state.consecutiveDeficitDays + 1 : state.consecutiveDeficitDays;
    state.consecutiveSurplusDays = 0;
  } else {
    state.consecutiveSurplusDays = 0;
    state.consecutiveDeficitDays = 0;
  }

  saveState(state);
  notifyUICallbacks();
}

/**
 * Get today's adjusted daily calorie target.
 * Now delegates to the pure computeAdjustedTarget.
 */
export function getAdjustedDailyTarget(profile: UserProfile | null): number {
  const p = profile || getProfile();
  if (!p) return 1600;

  const originalTarget = p.dailyCalories || 1600;
  const state = loadState();
  const today = getEffectiveDate();
  const dayType = state.specialDays[today] || 'normal';

  if (dayType === 'fasting') return 0;
  if (dayType === 'cheat') return originalTarget;
  if (!state.autoAdjustMeals) return originalTarget;

  return computeAdjustedTarget(today, originalTarget, state.dailyBalances);
}

/**
 * Protein target — always returns the original, never reduced.
 */
export function getProteinTarget(profile: UserProfile | null): number {
  return profile?.dailyProtein || 60;
}

/**
 * Process end-of-day / day rollover.
 * Freezes adjustedTarget on yesterday's log.
 */
export function processEndOfDay(profile: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = getEffectiveDate();
  const state = loadState();

  if (state.lastProcessedDate === today) return;

  // Freeze timing: triggered on first app open after midnight OR first meal of new day
  if (state.lastProcessedDate && state.lastProcessedDate < today) {
    const yesterday = state.lastProcessedDate;
    const yesterdayLog = getDailyLog(yesterday);
    const totals = getDailyTotals(yesterdayLog);
    const originalTarget = p.dailyCalories || 1600;
    const diff = totals.eaten - originalTarget;

    // Freeze adjustedTarget using deterministic computation
    const frozenAdjustedTarget = computeAdjustedTarget(yesterday, originalTarget, state.dailyBalances);

    const existingIdx = state.dailyBalances.findIndex(b => b.date === yesterday);
    if (existingIdx < 0 && totals.eaten > 0) {
      state.dailyBalances.push({
        date: yesterday, target: originalTarget, actual: totals.eaten, diff, bankAfter: state.calorieBank + diff, adjustedTarget: frozenAdjustedTarget,
      });
      state.calorieBank += diff;
    } else if (existingIdx >= 0 && !state.dailyBalances[existingIdx].adjustedTarget) {
      state.dailyBalances[existingIdx].adjustedTarget = frozenAdjustedTarget;
    }

    // Balance streak
    const lastEntry = state.dailyBalances.find(b => b.date === yesterday);
    if (lastEntry && Math.abs(lastEntry.diff) <= 100) {
      state.balanceStreak++;
    } else if (lastEntry) {
      state.balanceStreak = 0;
    }

    if (state.adjustmentDaysRemaining > 0) state.adjustmentDaysRemaining--;
  }

  state.lastProcessedDate = today;

  if (state.dailyBalances.length > 30) state.dailyBalances = state.dailyBalances.slice(-30);

  // Clean old special days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  for (const key of Object.keys(state.specialDays)) {
    if (key < cutoffStr) delete state.specialDays[key];
  }

  saveState(state);
  notifyUICallbacks();
}

// ══════════════════════════════════════════════
// QUERY FUNCTIONS (read state, use pure functions)
// ══════════════════════════════════════════════

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
      bank: Math.round(state.calorieBank), status: 'surplus',
      message: state.autoAdjustMeals ? 'Your plan auto-adjusted to keep you aligned.' : 'Surplus detected — enable auto-adjust for corrections.',
    };
  }

  return {
    bank: Math.round(state.calorieBank), status: 'deficit',
    message: state.autoAdjustMeals ? 'Slight increase applied to maintain your energy.' : 'Deficit detected — enable auto-adjust for recovery.',
  };
}

/**
 * Get daily balances for the last 30 days.
 */
export function getDailyBalances(): DailyBalanceEntry[] {
  return [...loadState().dailyBalances].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get the active adjustment plan entries — computed from daily balances.
 */
export function getAdjustmentPlan(): AdjustmentPlanEntry[] {
  const state = loadState();
  const today = getEffectiveDate();
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const pastLogs = state.dailyBalances.filter(b => b.date < today && b.actual > 0);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);

  return Object.entries(adjMap)
    .filter(([date]) => date >= today)
    .map(([date, adjust]) => ({ date, adjust }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get monthly stats for a given month.
 */
export function getMonthlyStats(month?: string): MonthlyStats {
  const state = loadState();
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const monthBalances = state.dailyBalances.filter(b => b.date.startsWith(targetMonth));

  let surplusDays = 0, deficitDays = 0, balancedDays = 0, netBalance = 0;
  for (const b of monthBalances) {
    netBalance += b.diff;
    if (b.diff > 50) surplusDays++;
    else if (b.diff < -50) deficitDays++;
    else balancedDays++;
  }
  return { surplusDays, deficitDays, balancedDays, netBalance: Math.round(netBalance) };
}

/**
 * Check if surplus days cluster on weekends.
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

  if (weekendSurplus / surplusEntries.length >= 0.5) {
    return { detected: true, message: 'You tend to eat more on weekends. We\'ve adjusted future plans to handle this better.' };
  }
  return { detected: false, message: '' };
}

/**
 * Get user-friendly correction message.
 */
export function getCorrectionMessage(): { type: 'surplus' | 'deficit'; message: string } | null {
  const state = loadState();
  if (Math.abs(state.calorieBank) < 50) return null;

  if (state.calorieBank > 0) {
    const msg = state.consecutiveSurplusDays > 3
      ? "You've been eating well lately 😄 We're making gentle adjustments to keep things balanced."
      : "Big meal today 😄 We've got you covered for the next few days.";
    return { type: 'surplus', message: msg };
  }

  return { type: 'deficit', message: "Light day — we'll add a little extra tomorrow to keep your energy up 💪" };
}

/**
 * Get contextual toast after a meal is logged.
 */
export function getContextualMealToast(): { type: 'surplus' | 'deficit'; message: string } | null {
  const p = getProfile();
  if (!p) return null;

  const today = getEffectiveDate();
  const log = getDailyLog(today);
  const totals = getDailyTotals(log);
  const target = p.dailyCalories || 1600;
  const diff = totals.eaten - target;

  if (diff > 100) {
    return {
      type: 'surplus',
      message: "Big meal today 😄 We've got you covered — your plan will adjust gently.",
    };
  }

  if (diff < -300 && totals.eaten > 0) {
    return {
      type: 'deficit',
      message: "Light day — we'll add a little extra tomorrow to keep your energy up 💪",
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

/**
 * Get balance streak count.
 */
export function getBalanceStreak(): number {
  return loadState().balanceStreak;
}

/**
 * Standardized API contract for UI components.
 */
export function getEngineResponse(profile?: UserProfile | null, log?: DailyLog): EngineResponse {
  const p = profile || getProfile();
  const originalCalories = p?.dailyCalories || 1600;
  const state = loadState();
  const today = getEffectiveDate();
  const dailyLog = log || getDailyLog(today);

  const bankAbs = Math.abs(state.calorieBank);
  const bankStatus: 'surplus' | 'deficit' | 'balanced' = bankAbs < 50 ? 'balanced' : state.calorieBank > 0 ? 'surplus' : 'deficit';

  const warnings: string[] = [];
  const confidence = getAverageConfidence(dailyLog);
  if (confidence < 0.7) warnings.push('Low confidence data — adjustments are gentler.');
  const adherence = getAdherenceScore();
  if (adherence.score < 0.5) warnings.push('Low adherence — consider logging more meals.');
  if (state.consecutiveSurplusDays > 3) warnings.push('Consistency matters more than perfection.');

  return {
    adjustedCalories: getAdjustedDailyTarget(p),
    originalCalories,
    proteinTarget: getProteinTarget(p),
    bankStatus,
    bankAmount: Math.round(state.calorieBank),
    adjustmentsApplied: getAdjustmentPlan(),
    confidenceScore: Math.round(confidence * 100),
    warnings,
    adherenceScore: Math.round(adherence.score * 100),
    balanceStreak: state.balanceStreak,
    dayType: state.specialDays[today] || 'normal',
    correctionMode: state.correctionMode,
  };
}

// ── Adjustment Explanation Functions ──

/**
 * Get a plain-text explanation of why a date's target changed.
 * Now uses deterministic computation.
 */
export function getAdjustmentExplanation(date?: string): string | null {
  const state = loadState();
  const d = date || getEffectiveDate();
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const pastLogs = state.dailyBalances.filter(b => b.date < d && b.actual > 0);
  const breakdown = computeBreakdownForDate(d, pastLogs, baseTarget);

  if (breakdown.length === 0) return null;

  const lines = breakdown.map(b => {
    const dayName = new Date(b.sourceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    return `On ${dayName}, you ate ${b.surplus > 0 ? '+' : ''}${b.surplus} kcal ${b.surplus > 0 ? 'over' : 'under'} target`;
  });

  return `${lines.join('. ')}. Your plan adjusted to keep you on track.`;
}

/**
 * Get structured adjustment details for the explanation modal.
 * Now uses deterministic computation.
 */
export function getAdjustmentDetails(): {
  recentSurplusDays: Array<{ date: string; surplus: number }>;
  futureAdjustments: Array<{
    date: string;
    adjustment: number;
    sources: AdjustmentSource[];
  }>;
} {
  const state = loadState();
  const today = getEffectiveDate();
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const pastLogs = state.dailyBalances.filter(b => b.date < today && b.actual > 0);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);

  // Source days — use effectiveTarget
  const sourceMap = new Map<string, number>();
  for (const day of pastLogs) {
    if (!day.actual || day.actual < 300) continue;
    const effectiveTarget = day.adjustedTarget ?? day.target ?? baseTarget;
    const diff = day.actual - effectiveTarget;
    if (Math.abs(diff) >= 50) {
      sourceMap.set(day.date, Math.round(diff));
    }
  }
  const recentSurplusDays = Array.from(sourceMap.entries())
    .map(([date, surplus]) => ({ date, surplus }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Future adjustments with breakdowns
  const futureDates = Object.entries(adjMap)
    .filter(([d]) => d >= today)
    .sort(([a], [b]) => a.localeCompare(b));

  const futureAdjustments = futureDates.map(([date, adjustment]) => ({
    date,
    adjustment,
    sources: computeBreakdownForDate(date, pastLogs, baseTarget),
  }));

  return { recentSurplusDays, futureAdjustments };
}

/**
 * Get after-dinner notification summary.
 * Delegates to pure computeDinnerSummary.
 */
export function getDinnerNotificationSummary(
  today: string,
  actualCalories: number,
  targetCalories: number,
  _state?: CalorieBankState
): { message: string; tomorrowTarget: number } | null {
  const state = _state || loadState();
  const result = computeDinnerSummary(today, actualCalories, targetCalories, state.dailyBalances);
  if (!result) return null;
  return { message: result.message, tomorrowTarget: result.tomorrowTarget };
}

/**
 * Load the current calorie bank state.
 */
export function getCalorieBankState(): CalorieBankState {
  return loadState();
}
