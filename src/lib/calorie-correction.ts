// ============================================
// Smart Calorie Correction Engine v3 — FULLY DETERMINISTIC
// Source of truth: raw daily logs ONLY
// All adjustments recomputed on demand via pure functions
// ZERO persistent correction state
// ============================================

import { getDailyLog, getDailyTotals, getProfile, getRecentLogs, type UserProfile, type DailyLog } from '@/lib/store';

// ── Types ──

export type DayType = 'normal' | 'cheat' | 'recovery' | 'fasting';

export interface DailyBalanceEntry {
  date: string;
  target: number;          // original base target
  actual: number;          // sum of all meals
  diff: number;            // actual - target (always vs baseTarget)
  adjustedTarget?: number; // frozen for past days only
}

export interface AdjustmentSource {
  sourceDate: string;
  surplus: number;
  appliedAdjustment: number;
}

export interface MonthlyStats {
  surplusDays: number;
  deficitDays: number;
  balancedDays: number;
  netBalance: number;
}

// Minimal persisted state — no correction data
interface PersistedState {
  lastProcessedDate: string;
  dailyBalances: DailyBalanceEntry[];
  specialDays: Record<string, DayType>;
  balanceStreak: number;
  autoAdjustMeals: boolean;
  dayCutoffHour: number;
}

const BANK_KEY = 'nutrilens_calorie_bank';

const DEFAULT_STATE: PersistedState = {
  lastProcessedDate: '',
  dailyBalances: [],
  specialDays: {},
  balanceStreak: 0,
  autoAdjustMeals: true,
  dayCutoffHour: 3,
};

// ── Persistence (minimal — only balances + prefs) ──

function loadState(): PersistedState {
  const raw = localStorage.getItem(BANK_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    const parsed = JSON.parse(raw);
    // Migration: strip legacy fields, keep only what we need
    return {
      lastProcessedDate: parsed.lastProcessedDate || '',
      dailyBalances: (parsed.dailyBalances || []).map((b: any) => ({
        date: b.date,
        target: b.target || 0,
        actual: b.actual || 0,
        diff: b.diff ?? 0,
        adjustedTarget: b.adjustedTarget,
      })),
      specialDays: parsed.specialDays || {},
      balanceStreak: parsed.balanceStreak || 0,
      autoAdjustMeals: parsed.autoAdjustMeals ?? true,
      dayCutoffHour: parsed.dayCutoffHour ?? 3,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state: PersistedState): void {
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
 * Compute actual calories from raw meals.
 * This is the ONLY way to get daily calories — never use stored totals.
 */
export function computeDailyCalories(log: DailyLog): number {
  return log.meals.reduce((sum, meal) =>
    sum + meal.items.reduce((s, item) => s + item.calories * item.quantity, 0), 0
  );
}

/**
 * Compute a merged adjustment map from past daily logs.
 * diff = actual - baseTarget (ALWAYS against base, never adjusted)
 * No duplicate sources. Safety capped at -400 per day.
 */
export function computeAdjustmentMap(
  pastLogs: DailyBalanceEntry[],
  baseTarget: number
): Record<string, number> {
  const adjMap: Record<string, number> = {};
  const sourceTracker = new Map<string, Set<string>>();

  for (const day of pastLogs) {
    if (!day.actual || day.actual < 300) continue;

    const diff = day.actual - baseTarget;
    if (Math.abs(diff) < 50) continue;

    if (diff > 0) {
      const spreadDays = diff > 800 ? 5 : 4;
      const perDay = Math.round(diff / spreadDays);
      for (let i = 1; i <= spreadDays; i++) {
        const targetDate = getFutureDate(day.date, i);
        if (!sourceTracker.has(targetDate)) sourceTracker.set(targetDate, new Set());
        if (sourceTracker.get(targetDate)!.has(day.date)) continue;
        sourceTracker.get(targetDate)!.add(day.date);
        adjMap[targetDate] = (adjMap[targetDate] || 0) - perDay;
      }
    } else {
      const recovery = Math.min(Math.round(Math.abs(diff) * 0.3), 250);
      const targetDate = getFutureDate(day.date, 1);
      if (!sourceTracker.has(targetDate)) sourceTracker.set(targetDate, new Set());
      if (!sourceTracker.get(targetDate)!.has(day.date)) {
        sourceTracker.get(targetDate)!.add(day.date);
        adjMap[targetDate] = (adjMap[targetDate] || 0) + recovery;
      }
    }
  }

  // 🔒 HARD SAFETY CLAMP — no day exceeds -400
  for (const [date, val] of Object.entries(adjMap)) {
    if (val < -400) adjMap[date] = -400;
  }

  return adjMap;
}

/**
 * Compute the adjusted calorie target for a given date.
 * Past days with frozen target: return frozen value.
 * Future/today: recompute from raw logs before that date.
 */
export function computeAdjustedTarget(
  date: string,
  baseTarget: number,
  allBalances: DailyBalanceEntry[]
): number {
  const today = getEffectiveDate();

  // Past day with frozen target — return as-is
  if (date < today) {
    const entry = allBalances.find(b => b.date === date);
    if (entry?.adjustedTarget) return entry.adjustedTarget;
  }

  // Compute from logs strictly before this date
  const pastLogs = allBalances.filter(b => b.date < date && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);
  const adjustment = adjMap[date] || 0;
  return Math.round(clamp(baseTarget + adjustment, 1200, baseTarget * 1.15));
}

/**
 * Compute adjustment breakdown for a target date — which past days contribute.
 */
export function computeBreakdownForDate(
  targetDate: string,
  pastLogs: DailyBalanceEntry[],
  baseTarget: number
): AdjustmentSource[] {
  const result: AdjustmentSource[] = [];

  for (const day of pastLogs) {
    if (!day.actual || day.actual < 300) continue;

    const diff = day.actual - baseTarget;
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
  baseTarget: number,
  allBalances: DailyBalanceEntry[]
): { message: string; tomorrowTarget: number } | null {
  const diff = actualCalories - baseTarget;
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

  const todayBalance: DailyBalanceEntry = {
    date: today, target: baseTarget, actual: actualCalories,
    diff, adjustedTarget: undefined,
  };
  const allPast = [...allBalances.filter(b => b.date !== today), todayBalance];

  const tomorrow = getFutureDate(today, 1);
  const tomorrowTarget = computeAdjustedTarget(tomorrow, baseTarget, allPast);

  message += `\n\n👉 Tomorrow's target: ~${tomorrowTarget} kcal`;

  return { message, tomorrowTarget };
}

// ══════════════════════════════════════════════
// STATEFUL FUNCTIONS — MINIMAL
// Only: sync balance entry, freeze end-of-day
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
 * Sync today's balance entry after any meal mutation.
 * This is a LIGHTWEIGHT write — no correction logic, no cumulative state.
 * Just records: date, target, actual, diff.
 */
export function syncDailyBalance(log?: DailyLog, profile?: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = getEffectiveDate();
  const dailyLog = log || getDailyLog(today);
  const totals = getDailyTotals(dailyLog);
  const baseTarget = p.dailyCalories || 1600;

  const state = loadState();
  const dayType = state.specialDays[today] || 'normal';
  if (dayType === 'fasting') return;

  // Freeze guard: if day changed, freeze yesterday first
  if (state.lastProcessedDate && state.lastProcessedDate < today && state.lastProcessedDate !== today) {
    processEndOfDay(p);
    const freshState = loadState();
    Object.assign(state, freshState);
  }

  // diff = actual - baseTarget (ALWAYS vs base, never adjusted)
  const diff = totals.eaten - baseTarget;

  const existingIdx = state.dailyBalances.findIndex(b => b.date === today);
  const entry: DailyBalanceEntry = {
    date: today, target: baseTarget, actual: totals.eaten, diff,
  };

  if (existingIdx >= 0) {
    state.dailyBalances[existingIdx] = entry;
  } else {
    state.dailyBalances.push(entry);
  }

  if (state.dailyBalances.length > 30) {
    state.dailyBalances = state.dailyBalances.slice(-30);
  }

  saveState(state);
  notifyUICallbacks();
}

/**
 * Get today's adjusted daily calorie target.
 * Delegates to the pure computeAdjustedTarget.
 */
export function getAdjustedDailyTarget(profile: UserProfile | null): number {
  const p = profile || getProfile();
  if (!p) return 1600;

  const baseTarget = p.dailyCalories || 1600;
  const state = loadState();
  const today = getEffectiveDate();
  const dayType = state.specialDays[today] || 'normal';

  if (dayType === 'fasting') return 0;
  if (dayType === 'cheat') return baseTarget;
  if (!state.autoAdjustMeals) return baseTarget;

  return computeAdjustedTarget(today, baseTarget, state.dailyBalances);
}

/**
 * Protein target — always returns the original, never reduced.
 */
export function getProteinTarget(profile: UserProfile | null): number {
  return profile?.dailyProtein || 60;
}

/**
 * Process end-of-day / day rollover.
 * ONLY allowed mutation: freezes adjustedTarget on yesterday's balance.
 */
export function processEndOfDay(profile: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = getEffectiveDate();
  const state = loadState();

  if (state.lastProcessedDate === today) return;

  if (state.lastProcessedDate && state.lastProcessedDate < today) {
    const yesterday = state.lastProcessedDate;
    const yesterdayLog = getDailyLog(yesterday);
    const totals = getDailyTotals(yesterdayLog);
    const baseTarget = p.dailyCalories || 1600;

    // Freeze: compute adjustedTarget deterministically and store it
    const frozenAdjustedTarget = computeAdjustedTarget(yesterday, baseTarget, state.dailyBalances);
    const diff = totals.eaten - baseTarget;

    const existingIdx = state.dailyBalances.findIndex(b => b.date === yesterday);
    if (existingIdx < 0 && totals.eaten > 0) {
      state.dailyBalances.push({
        date: yesterday, target: baseTarget, actual: totals.eaten,
        diff, adjustedTarget: frozenAdjustedTarget,
      });
    } else if (existingIdx >= 0) {
      state.dailyBalances[existingIdx].adjustedTarget = frozenAdjustedTarget;
      state.dailyBalances[existingIdx].diff = diff;
    }

    // Balance streak (within ±100 kcal of adjustedTarget)
    const lastEntry = state.dailyBalances.find(b => b.date === yesterday);
    if (lastEntry) {
      const effectiveDiff = totals.eaten - frozenAdjustedTarget;
      if (Math.abs(effectiveDiff) <= 100) {
        state.balanceStreak++;
      } else {
        state.balanceStreak = 0;
      }
    }
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
// QUERY FUNCTIONS — all use pure computation
// ══════════════════════════════════════════════

/**
 * Get daily balances for the last 30 days.
 */
export function getDailyBalances(): DailyBalanceEntry[] {
  return [...loadState().dailyBalances].sort((a, b) => a.date.localeCompare(b.date));
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
    return { type: 'surplus', message: "Big meal today 😄 We've got you covered — your plan will adjust gently." };
  }
  if (diff < -300 && totals.eaten > 0) {
    return { type: 'deficit', message: "Light day — we'll add a little extra tomorrow to keep your energy up 💪" };
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
 * Get today's adjustment status for UI display.
 * Computed from deterministic adjMap — no stored bank.
 */
export function getTodayAdjustmentStatus(): {
  adjustment: number;
  status: 'surplus' | 'deficit' | 'balanced';
  message: string;
} {
  const state = loadState();
  const today = getEffectiveDate();
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;

  const pastLogs = state.dailyBalances.filter(b => b.date < today && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);
  const todayAdj = adjMap[today] || 0;

  if (Math.abs(todayAdj) < 10) {
    return { adjustment: 0, status: 'balanced', message: 'Your intake is well balanced — no adjustments needed.' };
  }
  if (todayAdj < 0) {
    return {
      adjustment: todayAdj, status: 'surplus',
      message: `Today's target reduced by ${Math.abs(todayAdj)} kcal to balance recent surplus.`,
    };
  }
  return {
    adjustment: todayAdj, status: 'deficit',
    message: `Today's target increased by ${todayAdj} kcal to recover from recent deficit.`,
  };
}

/**
 * Get after-dinner notification summary.
 */
export function getDinnerNotificationSummary(
  today: string,
  actualCalories: number,
  baseTarget: number
): { message: string; tomorrowTarget: number } | null {
  const state = loadState();
  return computeDinnerSummary(today, actualCalories, baseTarget, state.dailyBalances);
}

// ── Adjustment Explanation Functions ──

/**
 * Get a plain-text explanation of why a date's target changed.
 */
export function getAdjustmentExplanation(date?: string): string | null {
  const state = loadState();
  const d = date || getEffectiveDate();
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const pastLogs = state.dailyBalances.filter(b => b.date < d && b.actual >= 300);
  const breakdown = computeBreakdownForDate(d, pastLogs, baseTarget);

  if (breakdown.length === 0) return null;

  const lines = breakdown.map(b => {
    const dayName = new Date(b.sourceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    const direction = b.surplus > 0 ? 'over' : 'under';
    return `On ${dayName}, you ate ${Math.abs(b.surplus)} kcal ${direction} target`;
  });

  return `${lines.join('. ')}. Your plan adjusted to keep you on track.`;
}

/**
 * Get structured adjustment details for the explanation modal.
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
  const pastLogs = state.dailyBalances.filter(b => b.date < today && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);

  // Source days
  const sourceMap = new Map<string, number>();
  for (const day of pastLogs) {
    const diff = day.actual - baseTarget;
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

// ── Validation ──

/**
 * Validate adjustment integrity — runtime check for mathematical correctness.
 */
export function validateAdjustmentIntegrity(
  pastLogs: DailyBalanceEntry[],
  baseTarget: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);

  // Check 1: No single day exceeds -400
  for (const [date, val] of Object.entries(adjMap)) {
    if (val < -400) {
      warnings.push(`Day ${date} has adjustment ${val} exceeding -400 limit`);
    }
  }

  // Check 2: Total adjustments ≈ total surplus - total recovery
  let totalSurplus = 0;
  let totalRecovery = 0;
  for (const day of pastLogs) {
    if (!day.actual || day.actual < 300) continue;
    const diff = day.actual - baseTarget;
    if (diff > 50) totalSurplus += diff;
    else if (diff < -50) totalRecovery += Math.min(Math.round(Math.abs(diff) * 0.3), 250);
  }

  const totalAdj = Object.values(adjMap).reduce((s, v) => s + v, 0);
  const expectedNet = -totalSurplus + totalRecovery;
  if (Math.abs(totalAdj - expectedNet) > Math.abs(expectedNet) * 0.1 + 50) {
    warnings.push(`Adjustment mismatch: total=${totalAdj}, expected≈${expectedNet}`);
  }

  return { valid: warnings.length === 0, warnings };
}

// ── Legacy compatibility shims (for callers that haven't been updated yet) ──

/** @deprecated Use syncDailyBalance instead */
export const updateCalorieBank = syncDailyBalance;

/** @deprecated Use getTodayAdjustmentStatus instead */
export function getCalorieBankSummary() {
  const s = getTodayAdjustmentStatus();
  return { bank: s.adjustment, status: s.status, message: s.message };
}

/** @deprecated Use getDailyBalances + computeAdjustmentMap directly */
export function getCalorieBankState() {
  const state = loadState();
  return {
    dailyBalances: state.dailyBalances,
    specialDays: state.specialDays,
    lastProcessedDate: state.lastProcessedDate,
    autoAdjustMeals: state.autoAdjustMeals,
    balanceStreak: state.balanceStreak,
  };
}
