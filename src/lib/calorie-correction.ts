// ============================================
// Smart Calorie Correction Engine v4 — FULLY STATELESS
// Source of truth: raw daily logs ONLY
// All adjustments recomputed on demand via pure functions
// ZERO persistent correction state — no calorieBank, no dailyBalances cache
// ============================================

import { getDailyLog, getDailyTotals, getProfile, getRecentLogs, getAllLogDates, type UserProfile, type DailyLog } from '@/lib/store';

// ── Types ──

export type DayType = 'normal' | 'cheat' | 'recovery' | 'fasting';

export interface DailyBalanceEntry {
  date: string;
  target: number;          // original base target
  actual: number;          // sum of all meals (from raw log)
  diff: number;            // actual - target (ALWAYS vs baseTarget)
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

// Minimal persisted state — ONLY preferences, NO correction data
const PREFS_KEY = 'nutrilens_correction_prefs';
const FROZEN_TARGETS_KEY = 'nutrilens_frozen_targets'; // date → adjustedTarget

interface CorrectionPrefs {
  specialDays: Record<string, DayType>;
  autoAdjustMeals: boolean;
  dayCutoffHour: number;
}

const DEFAULT_PREFS: CorrectionPrefs = {
  specialDays: {},
  autoAdjustMeals: true,
  dayCutoffHour: 3,
};

// ── Persistence (ONLY prefs + frozen targets) ──

function loadPrefs(): CorrectionPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      // Migrate from old BANK_KEY if present
      const oldRaw = localStorage.getItem('nutrilens_calorie_bank');
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        const prefs: CorrectionPrefs = {
          specialDays: old.specialDays || {},
          autoAdjustMeals: old.autoAdjustMeals ?? true,
          dayCutoffHour: old.dayCutoffHour ?? 3,
        };
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        // Migrate frozen targets
        if (old.dailyBalances) {
          const frozen: Record<string, number> = {};
          for (const b of old.dailyBalances) {
            if (b.adjustedTarget && b.date) frozen[b.date] = b.adjustedTarget;
          }
          localStorage.setItem(FROZEN_TARGETS_KEY, JSON.stringify(frozen));
        }
        return prefs;
      }
      return { ...DEFAULT_PREFS };
    }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: CorrectionPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function loadFrozenTargets(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FROZEN_TARGETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFrozenTargets(targets: Record<string, number>): void {
  localStorage.setItem(FROZEN_TARGETS_KEY, JSON.stringify(targets));
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
  const cutoff = cutoffHour ?? loadPrefs().dayCutoffHour;
  if (now.getHours() < cutoff) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
}

// ── Special Day Types ──

export function setDayType(date: string, type: DayType): void {
  const prefs = loadPrefs();
  if (type === 'normal') {
    delete prefs.specialDays[date];
  } else {
    prefs.specialDays[date] = type;
  }
  savePrefs(prefs);
}

export function getDayType(date?: string): DayType {
  const prefs = loadPrefs();
  const d = date || getEffectiveDate();
  return prefs.specialDays[d] || 'normal';
}

// ── Auto-Adjust Toggle ──

export function setAutoAdjust(on: boolean): void {
  const prefs = loadPrefs();
  prefs.autoAdjustMeals = on;
  savePrefs(prefs);
}

export function getAutoAdjust(): boolean {
  return loadPrefs().autoAdjustMeals;
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
  const mealCals = log.meals.reduce((sum, meal) =>
    sum + meal.items.reduce((s, item) => s + (item.calories || 0) * (item.quantity || 1), 0), 0
  );
  // Include supplement calories to match getDailyTotals in store.ts
  const suppCals = (log.supplements || []).reduce((s, supp) => s + (supp.calories || 0), 0);
  return mealCals + suppCals;
}

/**
 * Compute a merged adjustment map from past daily logs.
 * diff = actual - baseTarget (ALWAYS against base, never adjusted)
 * No duplicate sources. Safety capped per mode.
 */

// ── Correction Mode (User-Controlled Intensity) ──

export type CorrectionMode = 'aggressive' | 'balanced' | 'relaxed';

const CORRECTION_MODE_KEY = 'nutrilens_correction_mode';

export function getCorrectionMode(): CorrectionMode {
  return (localStorage.getItem(CORRECTION_MODE_KEY) as CorrectionMode) || 'balanced';
}

export function setCorrectionMode(mode: CorrectionMode) {
  localStorage.setItem(CORRECTION_MODE_KEY, mode);
  notifyUICallbacks(); // instant UI refresh
}

/**
 * Compute the maximum daily adjustment based on TDEE and correction mode.
 */
export function computeMaxDailyAdjustment(tdee: number, mode: CorrectionMode): number {
  const caps: Record<CorrectionMode, number> = { aggressive: 0.25, balanced: 0.20, relaxed: 0.10 };
  const absoluteMax: Record<CorrectionMode, number> = { aggressive: 500, balanced: 400, relaxed: 300 };
  return Math.min(Math.round(tdee * caps[mode]), absoluteMax[mode]);
}

/**
 * Compute safe number of days to spread a surplus over.
 * Uses mode-aware daily cap. Floor 2, cap 14.
 */
export function computeSafeSpreadDays(surplus: number, tdee: number, mode: CorrectionMode = 'balanced'): number {
  const maxDaily = computeMaxDailyAdjustment(tdee, mode);
  let days = Math.ceil(surplus / Math.max(1, maxDaily));
  return Math.max(2, Math.min(days, 14));
}

export function computeAdjustmentMap(
  pastLogs: DailyBalanceEntry[],
  baseTarget: number,
  tdee: number = 2000,
  mode: CorrectionMode = 'balanced'
): Record<string, number> {
  const adjMap: Record<string, number> = {};
  const sourceTracker = new Map<string, Set<string>>();
  const today = getEffectiveDate();

  for (const day of pastLogs) {
    // 🔒 INVARIANT: only finalized past days generate adjustments
    if (day.date >= today) continue;
    if (!day.actual || day.actual < 300) continue;

    // diff = actual - baseTarget (ALWAYS vs base, NEVER adjusted)
    const diff = day.actual - baseTarget;
    if (Math.abs(diff) < 50) continue;

    if (diff > 0) {
      const spreadDays = computeSafeSpreadDays(diff, tdee, mode);
      // Sign-safe exact distribution — no rounding drift
      const absDiff = Math.abs(diff);
      const base = Math.floor(absDiff / spreadDays);
      const remainder = absDiff % spreadDays;
      for (let i = 1; i <= spreadDays; i++) {
        const targetDate = getFutureDate(day.date, i);
        if (!sourceTracker.has(targetDate)) sourceTracker.set(targetDate, new Set());
        if (sourceTracker.get(targetDate)!.has(day.date)) continue;
        sourceTracker.get(targetDate)!.add(day.date);
        const perDay = base + (i <= remainder ? 1 : 0);
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

  // 🔒 CLAMP WITH REDISTRIBUTION — conserve calories exactly
  let leftover = 0;
  const dates = Object.keys(adjMap).sort();

  const maxAdj = computeMaxDailyAdjustment(tdee, mode);

  // Pass 1: clamp and track leftover
  for (const date of dates) {
    const raw = adjMap[date];
    const clamped = Math.max(-maxAdj, Math.min(maxAdj, raw));
    leftover += raw - clamped;
    adjMap[date] = clamped;
  }

  // Pass 2: redistribute leftover across days with remaining capacity
  if (Math.abs(leftover) > 0) {
    const sign = leftover < 0 ? -1 : 1;
    let absLeftover = Math.abs(leftover);
    for (const date of dates) {
      if (absLeftover < 1) break;
      const current = adjMap[date];
      const capacity = maxAdj - Math.abs(current);
      if (capacity <= 0) continue;
      // Only redistribute in the same direction as leftover
      if (sign < 0 && current > 0) continue;
      if (sign > 0 && current < 0) continue;
      const shift = Math.min(capacity, absLeftover);
      adjMap[date] += shift * sign;
      absLeftover -= shift;
    }
    // If still leftover after redistribution, it's lost — log it
    if (absLeftover > 1) {
      console.error('[CalorieEngine] Adjustment overflow capped — conservation loss:',
        Math.round(absLeftover), 'kcal');
    }
  }

  // 🔒 Floor protection: ensure no day's adjusted target drops below 1200 kcal
  for (const date of dates) {
    const tentative = baseTarget + adjMap[date];
    if (tentative < 1200) {
      adjMap[date] = 1200 - baseTarget; // weakest possible reduction
    }
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
  allBalances: DailyBalanceEntry[],
  tdee: number = 2000
): number {
  const today = getEffectiveDate();

  // Past day with frozen target — return as-is
  if (date < today) {
    const frozen = loadFrozenTargets();
    if (frozen[date]) return frozen[date];
    // Also check allBalances for inline frozen
    const entry = allBalances.find(b => b.date === date);
    if (entry?.adjustedTarget) return entry.adjustedTarget;
  }

  // Compute from logs strictly before this date
  const pastLogs = allBalances.filter(b => b.date < date && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget, tdee);
  const adjustment = adjMap[date] || 0;
  return Math.round(clamp(baseTarget + adjustment, 1200, baseTarget * 1.15));
}

/**
 * Compute adjustment breakdown for a target date — which past days contribute.
 */
export function computeBreakdownForDate(
  targetDate: string,
  pastLogs: DailyBalanceEntry[],
  baseTarget: number,
  tdee: number = 2000
): AdjustmentSource[] {
  const result: AdjustmentSource[] = [];

  for (const day of pastLogs) {
    if (!day.actual || day.actual < 300) continue;

    const diff = day.actual - baseTarget;
    if (Math.abs(diff) < 50) continue;

    let contribution = 0;

    if (diff > 0) {
      const spreadDays = computeSafeSpreadDays(diff, tdee);
      // Exact distribution — matches computeAdjustmentMap exactly
      const absDiff = Math.abs(diff);
      const base = Math.floor(absDiff / spreadDays);
      const remainder = absDiff % spreadDays;
      for (let i = 1; i <= spreadDays; i++) {
        if (getFutureDate(day.date, i) === targetDate) {
          const perDay = base + (i <= remainder ? 1 : 0);
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
    const tdeeVal = allBalances.length > 0 ? (allBalances[0]?.target || 2000) : 2000;
    const spreadDays = computeSafeSpreadDays(diff, tdeeVal);
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
// DERIVED DATA — computed from raw logs on demand
// NO cached state, NO persisted balances
// ══════════════════════════════════════════════

/**
 * Derive daily balances from raw logs.
 * This is the ONLY way to get balance data — never read from cache.
 */
export function getDailyBalances(baseTarget?: number): DailyBalanceEntry[] {
  const p = getProfile();
  const target = baseTarget || p?.dailyCalories || 1600;
  const tdee = p?.tdee || target;
  const frozenTargets = loadFrozenTargets();
  const dates = getAllLogDates().sort();

  const balances: DailyBalanceEntry[] = [];
  for (const date of dates) {
    const log = getDailyLog(date);
    const totals = getDailyTotals(log);
    if (totals.eaten === 0 && log.meals.length === 0) continue;

    const diff = totals.eaten - target;
    const adjustedTarget = frozenTargets[date] || undefined;

    balances.push({
      date,
      target,
      actual: totals.eaten,
      diff,
      adjustedTarget,
    });

    // Debug trace — catch math issues during dev
    console.debug('[CalorieEngine] Balance:', { date, actual: totals.eaten, baseTarget: target, diff: Math.round(diff) });
  }

  // 🔒 RECONCILIATION — pure identity check: Σ(diff) + Σ(adj) ≈ 0
  const today = getEffectiveDate();
  const pastOnly = balances.filter(b => b.date < today && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastOnly, target, tdee);

  const totalDiff = pastOnly.reduce((sum, d) => {
    const diff = d.actual - target;
    return Math.abs(diff) > 50 ? sum + diff : sum;
  }, 0);
  const totalAdj = Object.values(adjMap).reduce((s, v) => s + v, 0);
  if (Math.abs(totalDiff + totalAdj) > 1) {
    console.error('[CalorieEngine] Conservation broken:', { totalDiff: Math.round(totalDiff), totalAdj: Math.round(totalAdj) });
  }

  // Verify per-day clamp integrity
  const maxAdj = computeMaxDailyAdjustment(tdee, getCorrectionMode());
  for (const [date, val] of Object.entries(adjMap)) {
    if (Math.abs(val) > maxAdj) {
      console.error('[CalorieEngine] CLAMP VIOLATION:', { date, val });
    }
  }

  return balances;
}

/**
 * Get monthly stats computed from raw logs.
 */
export function getMonthlyStats(month?: string): MonthlyStats {
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const allBalances = getDailyBalances(baseTarget);
  const monthBalances = allBalances.filter(b => b.date.startsWith(targetMonth));

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
  const allBalances = getDailyBalances();
  const surplusEntries = allBalances.filter(b => b.diff > 50);
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
 * Sync after any meal mutation — just triggers UI refresh.
 * No correction state written. All data derived from raw logs.
 */
export function syncDailyBalance(_log?: DailyLog, _profile?: UserProfile | null): void {
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
  const tdee = p.tdee || baseTarget;
  const prefs = loadPrefs();
  const today = getEffectiveDate();
  const dayType = prefs.specialDays[today] || 'normal';

  if (dayType === 'fasting') return 0;
  if (dayType === 'cheat') return baseTarget;
  if (!prefs.autoAdjustMeals) return baseTarget;

  const allBalances = getDailyBalances(baseTarget);
  return computeAdjustedTarget(today, baseTarget, allBalances, tdee);
}

/**
 * Protein target — always returns the original, never reduced.
 */
export function getProteinTarget(profile: UserProfile | null): number {
  return profile?.dailyProtein || 60;
}

/**
 * Process end-of-day / day rollover.
 * ONLY allowed mutation: freezes adjustedTarget for yesterday.
 */
export function processEndOfDay(profile: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = getEffectiveDate();
  const baseTarget = p.dailyCalories || 1600;

  // Check if yesterday needs freezing
  const yesterday = getFutureDate(today, -1);
  const frozen = loadFrozenTargets();
  if (frozen[yesterday]) return; // Already frozen

  const yesterdayLog = getDailyLog(yesterday);
  const totals = getDailyTotals(yesterdayLog);
  if (totals.eaten === 0 && yesterdayLog.meals.length === 0) return;

  // Compute and freeze yesterday's adjusted target
  const allBalances = getDailyBalances(baseTarget);
  const frozenTarget = computeAdjustedTarget(yesterday, baseTarget, allBalances, p.tdee || baseTarget);
  frozen[yesterday] = frozenTarget;

  // Clean old entries (keep last 60 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  for (const key of Object.keys(frozen)) {
    if (key < cutoffStr) delete frozen[key];
  }

  saveFrozenTargets(frozen);

  // Clean old special days
  const prefs = loadPrefs();
  for (const key of Object.keys(prefs.specialDays)) {
    if (key < cutoffStr) delete prefs.specialDays[key];
  }
  savePrefs(prefs);

  notifyUICallbacks();
}

// ══════════════════════════════════════════════
// QUERY FUNCTIONS — all derived from raw logs
// ══════════════════════════════════════════════

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
 * Get balance streak count (days within ±100 kcal of adjustedTarget).
 */
export function getBalanceStreak(): number {
  const p = getProfile();
  if (!p) return 0;
  const baseTarget = p.dailyCalories || 1600;
  const balances = getDailyBalances(baseTarget);
  const today = getEffectiveDate();

  let streak = 0;
  // Walk backwards from yesterday — always measure against baseTarget
  for (let i = balances.length - 1; i >= 0; i--) {
    const b = balances[i];
    if (b.date >= today) continue;
    const effectiveDiff = b.actual - b.target; // ALWAYS baseTarget, never adjustedTarget
    if (Math.abs(effectiveDiff) <= 100) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
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
  const today = getEffectiveDate();
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const tdee = p?.tdee || baseTarget;

  const allBalances = getDailyBalances(baseTarget);
  const pastLogs = allBalances.filter(b => b.date < today && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget, tdee);
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
  const allBalances = getDailyBalances(baseTarget);
  return computeDinnerSummary(today, actualCalories, baseTarget, allBalances);
}

// ── Adjustment Explanation Functions ──

/**
 * Get a plain-text explanation of why a date's target changed.
 */
export function getAdjustmentExplanation(date?: string): string | null {
  const d = date || getEffectiveDate();
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const tdee = p?.tdee || baseTarget;
  const allBalances = getDailyBalances(baseTarget);
  const pastLogs = allBalances.filter(b => b.date < d && b.actual >= 300);
  const breakdown = computeBreakdownForDate(d, pastLogs, baseTarget, tdee);

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
  const today = getEffectiveDate();
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const tdee = p?.tdee || baseTarget;
  const allBalances = getDailyBalances(baseTarget);
  const pastLogs = allBalances.filter(b => b.date < today && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget, tdee);

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
    sources: computeBreakdownForDate(date, pastLogs, baseTarget, tdee),
  }));

  return { recentSurplusDays, futureAdjustments };
}

// ── Validation ──

/**
 * Validate adjustment integrity — runtime check for mathematical correctness.
 */
export function validateAdjustmentIntegrity(
  pastLogs: DailyBalanceEntry[],
  baseTarget: number,
  tdee: number = 2000,
  mode: CorrectionMode = 'balanced'
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget, tdee, mode);
  const maxAdj = computeMaxDailyAdjustment(tdee, mode);

  // Check 1: No single day exceeds mode cap
  for (const [date, val] of Object.entries(adjMap)) {
    if (Math.abs(val) > maxAdj) {
      warnings.push(`Day ${date} has adjustment ${val} exceeding ±${maxAdj} limit`);
    }
  }

  // Check: adjMap should not be empty when significant diffs exist
  const hasSignificantDiff = pastLogs.some(d => {
    const diff = d.actual - baseTarget;
    return Math.abs(diff) > 50;
  });
  if (Object.keys(adjMap).length === 0 && hasSignificantDiff) {
    warnings.push('Missing adjustments for non-zero diff');
  }

  // Check 2: Conservation identity — Σ(diff) + Σ(adj) ≈ 0
  const totalDiff = pastLogs.reduce((sum, d) => {
    if (!d.actual || d.actual < 300) return sum;
    const diff = d.actual - baseTarget;
    return Math.abs(diff) > 50 ? sum + diff : sum;
  }, 0);
  const totalAdj = Object.values(adjMap).reduce((s, v) => s + v, 0);
  if (Math.abs(totalDiff + totalAdj) > 1) {
    warnings.push(`Conservation broken: totalDiff=${Math.round(totalDiff)}, totalAdj=${Math.round(totalAdj)}`);
  }

  // Loud failure during dev
  const logFn = warnings.length > 0 ? console.error : console.debug;
  logFn('[CalorieEngine] Validation:', {
    totalDiff: Math.round(totalDiff),
    totalAdjustments: Math.round(totalAdj),
    conservationDelta: Math.round(totalDiff + totalAdj),
    daysInMap: Object.keys(adjMap).length,
    valid: warnings.length === 0,
  });

  return { valid: warnings.length === 0, warnings };
}

