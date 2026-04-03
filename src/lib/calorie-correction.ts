// ============================================
// Smart Calorie Correction Engine v4 — FULLY STATELESS
// Source of truth: raw daily logs ONLY
// All adjustments recomputed on demand via pure functions
// ZERO persistent correction state — no calorieBank, no dailyBalances cache
// ============================================

import { getDailyLog, getDailyTotals, getProfile, getRecentLogs, getAllLogDates, type UserProfile, type DailyLog } from '@/lib/store';
import { getActivePlan, getPlanProgress } from '@/lib/event-plan-service';
import { getReverseDietTarget } from '@/lib/reverse-diet-service';
import { scopedGet, scopedSet, scopedGetJSON, scopedSetJSON } from '@/lib/scoped-storage';

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

// Phase 3: Memoization cache for adjustment map
let _adjMapCache: { key: string; result: Record<string, number> } | null = null;

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
    const raw = scopedGet(PREFS_KEY);
    if (!raw) {
      // Migrate from old BANK_KEY if present
      const oldRaw = scopedGet('nutrilens_calorie_bank');
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        const prefs: CorrectionPrefs = {
          specialDays: old.specialDays || {},
          autoAdjustMeals: old.autoAdjustMeals ?? true,
          dayCutoffHour: old.dayCutoffHour ?? 3,
        };
        scopedSet(PREFS_KEY, JSON.stringify(prefs));
        // Migrate frozen targets
        if (old.dailyBalances) {
          const frozen: Record<string, number> = {};
          for (const b of old.dailyBalances) {
            if (b.adjustedTarget && b.date) frozen[b.date] = b.adjustedTarget;
          }
          scopedSet(FROZEN_TARGETS_KEY, JSON.stringify(frozen));
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
  scopedSet(PREFS_KEY, JSON.stringify(prefs));
}

function loadFrozenTargets(): Record<string, number> {
  try {
    const raw = scopedGet(FROZEN_TARGETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFrozenTargets(targets: Record<string, number>): void {
  scopedSet(FROZEN_TARGETS_KEY, JSON.stringify(targets));
}

// ── Utility ──

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

function getFutureDate(date: string, offset: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Time-Based Day Cutoff ──

export function getEffectiveDate(cutoffHour?: number): string {
  const now = new Date();
  const cutoff = cutoffHour ?? loadPrefs().dayCutoffHour;
  if (now.getHours() < cutoff) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return toLocalDateKey(yesterday);
  }
  return toLocalDateKey(now);
}

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
const VALID_MODES: CorrectionMode[] = ['aggressive', 'balanced', 'relaxed'];

// In-memory cache — localStorage is persistence only, never runtime source
let _cachedMode: CorrectionMode | null = null;
let _balancesCache: { key: string; result: DailyBalanceEntry[] } | null = null;

function sanitizeMode(raw: string | null): CorrectionMode {
  if (raw && VALID_MODES.includes(raw as CorrectionMode)) return raw as CorrectionMode;
  return 'balanced';
}

export function getCorrectionMode(): CorrectionMode {
  if (_cachedMode) return _cachedMode;
  _cachedMode = sanitizeMode(scopedGet(CORRECTION_MODE_KEY));
  return _cachedMode;
}

export function setCorrectionMode(mode: CorrectionMode) {
  _cachedMode = sanitizeMode(mode);
  scopedSet(CORRECTION_MODE_KEY, _cachedMode);
  recomputeCalorieEngine(); // centralized recompute + UI refresh
}

/**
 * Centralized recompute trigger.
 * Call after ANY mutation: food log, mode change, midnight rollover.
 * Forces full engine recompute from raw logs + notifies all UI subscribers.
 */
export function recomputeCalorieEngine(): void {
  // Invalidate memoization cache
  _adjMapCache = null;
  _balancesCache = null;
  // Then notify all UI subscribers to re-read from pure functions
  notifyUICallbacks();
}

/**
 * Clear all engine caches — call on logout/user switch.
 */
export function clearEngineCache(): void {
  _cachedMode = null;
  _adjMapCache = null;
  _balancesCache = null;
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
 * Uses mode-aware daily cap. Floor 2, cap 30.
 */
export function computeSafeSpreadDays(surplus: number, tdee: number, mode: CorrectionMode = 'balanced'): number {
  const maxDaily = computeMaxDailyAdjustment(tdee, mode);
  let days = Math.ceil(surplus / Math.max(1, maxDaily));
  return Math.max(2, Math.min(days, 30));
}

/**
 * Preview the impact of a correction mode without applying it.
 * Returns estimated days to absorb current total surplus and daily change.
 */
export function getModeImpactPreview(mode: CorrectionMode): {
  spreadDays: number;
  dailyChange: number;
  totalSurplus: number;
} {
  const p = getProfile();
  const baseTarget = p?.dailyCalories || 1600;
  const tdee = p?.tdee || baseTarget;
  const allBalances = getDailyBalances(baseTarget);
  const today = getEffectiveDate();
  const pastLogs = allBalances.filter(b => b.date < today && b.actual >= 300);

  // Sum up net surplus (only surplus days, deficits handled separately)
  let totalSurplus = 0;
  for (const day of pastLogs) {
    const diff = day.actual - baseTarget;
    if (diff > 50) totalSurplus += diff;
  }

  if (totalSurplus <= 0) return { spreadDays: 0, dailyChange: 0, totalSurplus: 0 };

  const maxDaily = computeMaxDailyAdjustment(tdee, mode);
  const spreadDays = computeSafeSpreadDays(totalSurplus, tdee, mode);
  const dailyChange = Math.min(maxDaily, Math.round(totalSurplus / spreadDays));

  return { spreadDays, dailyChange, totalSurplus };
}

/**
 * Internal: distribute diffs into an adjMap (shared by finalized and projected).
 * `cutoffDate` controls which days are treated as sources (day.date < cutoffDate).
 */
function _buildAdjustmentMap(
  logs: DailyBalanceEntry[],
  baseTarget: number,
  tdee: number,
  mode: CorrectionMode,
  cutoffDate: string
): Record<string, number> {
  const adjMap: Record<string, number> = {};
  const sourceTracker = new Map<string, Set<string>>();

  for (const day of logs) {
    if (day.date >= cutoffDate) continue;
    if (!day.actual || day.actual < 300) continue;

    const diff = day.actual - baseTarget;
    if (Math.abs(diff) < 50) continue;

    if (diff > 0) {
      // Surplus — spread across multiple future days
      const spreadDays = computeSafeSpreadDays(diff, tdee, mode);
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
      // Deficit — spread full amount across multiple future days (mirrors surplus logic)
      const deficit = Math.abs(diff);
      const deficitSpread = computeSafeSpreadDays(deficit, tdee, mode);
      const base = Math.floor(deficit / deficitSpread);
      const remainder = deficit % deficitSpread;
      for (let i = 1; i <= deficitSpread; i++) {
        const targetDate = getFutureDate(day.date, i);
        if (!sourceTracker.has(targetDate)) sourceTracker.set(targetDate, new Set());
        if (sourceTracker.get(targetDate)!.has(day.date)) continue;
        sourceTracker.get(targetDate)!.add(day.date);
        const perDay = base + (i <= remainder ? 1 : 0);
        adjMap[targetDate] = (adjMap[targetDate] || 0) + perDay;
      }
    }
  }

  // 🔒 CLAMP WITH REDISTRIBUTION
  let leftover = 0;
  const dates = Object.keys(adjMap).sort();
  const maxAdj = computeMaxDailyAdjustment(tdee, mode);

  for (const date of dates) {
    const raw = adjMap[date];
    const clamped = Math.max(-maxAdj, Math.min(maxAdj, raw));
    leftover += raw - clamped;
    adjMap[date] = clamped;
  }

  if (Math.abs(leftover) > 0) {
    const sign = leftover < 0 ? -1 : 1;
    let absLeftover = Math.abs(leftover);
    for (const date of dates) {
      if (absLeftover < 1) break;
      const current = adjMap[date];
      const capacity = maxAdj - Math.abs(current);
      if (capacity <= 0) continue;
      if (sign < 0 && current > 0) continue;
      if (sign > 0 && current < 0) continue;
      const shift = Math.min(capacity, absLeftover);
      adjMap[date] += shift * sign;
      absLeftover -= shift;
    }
    if (absLeftover > 1) {
      console.warn('[CalorieEngine] Adjustment overflow capped (daily limit reached):', Math.round(absLeftover), 'kcal');
    }
  }

  // Floor protection
  for (const date of dates) {
    const tentative = baseTarget + adjMap[date];
    if (tentative < 1200) {
      adjMap[date] = 1200 - baseTarget;
    }
  }

  return adjMap;
}

/**
 * Finalized adjustment map — only committed past days (before today).
 * This is the stable map used for frozen targets and reconciliation.
 */
export function computeAdjustmentMap(
  pastLogs: DailyBalanceEntry[],
  baseTarget: number,
  tdee: number = 2000,
  mode: CorrectionMode = 'balanced'
): Record<string, number> {
  const today = getEffectiveDate();
  
  // Memoization: check cache
  const cacheKey = `${baseTarget}|${tdee}|${mode}|${today}|${pastLogs.length}|${pastLogs[pastLogs.length - 1]?.date || ''}`;
  if (_adjMapCache && _adjMapCache.key === cacheKey) {
    return _adjMapCache.result;
  }
  
  const result = _buildAdjustmentMap(pastLogs, baseTarget, tdee, mode, today);
  _adjMapCache = { key: cacheKey, result };
  return result;
}

/**
 * Projected adjustment map — includes today's LIVE intake as a source.
 * Used for showing "if the day ended now" targets for tomorrow and beyond.
 * This gives the user real-time visibility into how today's eating affects future days.
 */
export function computeProjectedAdjustmentMap(
  baseTarget: number,
  tdee: number = 2000,
  mode: CorrectionMode = 'balanced'
): Record<string, number> {
  const today = getEffectiveDate();
  const allBalances = getDailyBalances(baseTarget);
  
  // Include today's live data as a source
  const todayLog = getDailyLog(today);
  const todayTotals = getDailyTotals(todayLog);
  
  // Build log entries including today
  const logsIncludingToday: DailyBalanceEntry[] = [
    ...allBalances.filter(b => b.date !== today),
  ];
  
  // Only include today if there's meaningful intake
  if (todayTotals.eaten >= 300) {
    logsIncludingToday.push({
      date: today,
      target: baseTarget,
      actual: todayTotals.eaten,
      diff: todayTotals.eaten - baseTarget,
    });
  }
  
  // Use tomorrow as cutoff so today is included as a source
  const tomorrow = getFutureDate(today, 1);
  return _buildAdjustmentMap(logsIncludingToday, baseTarget, tdee, mode, tomorrow);
}

/**
 * Finalize a day — freeze its adjusted target immediately.
 * Called by LastMealConfirmSheet or midnight rollover.
 */
export function finalizeDay(date: string): void {
  const p = getProfile();
  if (!p) return;
  
  const baseTarget = p.dailyCalories || 1600;
  const tdee = p.tdee || baseTarget;
  const allBalances = getDailyBalances(baseTarget);
  const frozenTarget = computeAdjustedTarget(date, baseTarget, allBalances, tdee, getCorrectionMode());
  
  const frozen = loadFrozenTargets();
  frozen[date] = frozenTarget;
  
  // Clean old entries (keep last 365 days for long-term accuracy)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffStr = toLocalDateKey(cutoff);
  for (const key of Object.keys(frozen)) {
    if (key < cutoffStr) delete frozen[key];
  }
  
  saveFrozenTargets(frozen);
  recomputeCalorieEngine();
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
  tdee: number = 2000,
  mode: CorrectionMode = 'balanced'
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
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget, tdee, mode);
  const adjustment = adjMap[date] || 0;
  return Math.round(clamp(baseTarget + adjustment, 1200, baseTarget * 1.15));
}

/**
 * Compute adjustment breakdown for a target date — which past days contribute.
 * UNIFIED: uses identical logic as computeAdjustmentMap to prevent mismatch.
 */
export function computeBreakdownForDate(
  targetDate: string,
  pastLogs: DailyBalanceEntry[],
  baseTarget: number,
  tdee: number = 2000,
  mode: CorrectionMode = 'balanced',
  includeToday: boolean = false
): AdjustmentSource[] {
  const result: AdjustmentSource[] = [];
  const today = getEffectiveDate();
  const cutoff = includeToday ? getFutureDate(today, 1) : today;

  for (const day of pastLogs) {
    if (day.date >= cutoff) continue;
    if (!day.actual || day.actual < 300) continue;

    const diff = day.actual - baseTarget;
    if (Math.abs(diff) < 50) continue;

    let contribution = 0;

    if (diff > 0) {
      const spreadDays = computeSafeSpreadDays(diff, tdee, mode);
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
      const deficit = Math.abs(diff);
      const deficitSpread = computeSafeSpreadDays(deficit, tdee, mode);
      const base = Math.floor(deficit / deficitSpread);
      const remainder = deficit % deficitSpread;
      for (let i = 1; i <= deficitSpread; i++) {
        if (getFutureDate(day.date, i) === targetDate) {
          const perDay = base + (i <= remainder ? 1 : 0);
          contribution += perDay;
        }
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
    const spreadDays = computeSafeSpreadDays(diff, tdeeVal, getCorrectionMode());
    const perDay = Math.round(diff / spreadDays);
    message = `You ate +${Math.round(diff)} kcal over target today.\n\n→ We'll reduce ~${perDay} kcal/day over the next ${spreadDays} days.`;
  } else {
    const deficit = Math.abs(diff);
    const tdeeVal = allBalances.length > 0 ? (allBalances[0]?.target || 2000) : 2000;
    const spreadDays = computeSafeSpreadDays(deficit, tdeeVal, getCorrectionMode());
    const perDay = Math.round(deficit / spreadDays);
    message = `You ate ${Math.round(deficit)} kcal less than your target.\n\n→ Tomorrow's calories will increase by ~${perDay} kcal/day over ${spreadDays} days.`;
  }

  const todayBalance: DailyBalanceEntry = {
    date: today, target: baseTarget, actual: actualCalories,
    diff, adjustedTarget: undefined,
  };
  const allPast = [...allBalances.filter(b => b.date !== today), todayBalance];

  const tomorrow = getFutureDate(today, 1);
  const tomorrowTarget = computeAdjustedTarget(tomorrow, baseTarget, allPast, undefined, getCorrectionMode());

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
  const joinDate = p?.joinDate;
  const dates = getAllLogDates().sort();

  // Memoization: return cached result if inputs haven't changed
  const cacheKey = `${target}:${tdee}:${dates.length}:${dates[dates.length - 1] || ''}:${joinDate || ''}`;
  if (_balancesCache && _balancesCache.key === cacheKey) {
    return _balancesCache.result;
  }

  const balances: DailyBalanceEntry[] = [];
  for (const date of dates) {
    // Skip dates before the user's join date
    if (joinDate && date < joinDate) continue;

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

    // Debug trace — only in dev mode
    if (import.meta.env.DEV) {
      console.debug('[CalorieEngine] Balance:', { date, actual: totals.eaten, baseTarget: target, diff: Math.round(diff) });
    }
  }

  // 🔒 RECONCILIATION — pure identity check: Σ(diff) + Σ(adj) ≈ 0
  const today = getEffectiveDate();
  const pastOnly = balances.filter(b => b.date < today && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastOnly, target, tdee, getCorrectionMode());

  const totalDiff = pastOnly.reduce((sum, d) => {
    const diff = d.actual - target;
    return Math.abs(diff) > 50 ? sum + diff : sum;
  }, 0);
  const totalAdj = Object.values(adjMap).reduce((s, v) => s + v, 0);
  if (Math.abs(totalDiff + totalAdj) > 1) {
    console.warn('[CalorieEngine] Conservation gap (expected when daily caps are reached):', { totalDiff: Math.round(totalDiff), totalAdj: Math.round(totalAdj), gap: Math.round(Math.abs(totalDiff + totalAdj)) });
  }

  // Verify per-day clamp integrity
  const maxAdj = computeMaxDailyAdjustment(tdee, getCorrectionMode());
  for (const [date, val] of Object.entries(adjMap)) {
    if (Math.abs(val) > maxAdj) {
      console.error('[CalorieEngine] CLAMP VIOLATION:', { date, val });
    }
  }

  _balancesCache = { key: cacheKey, result: balances };
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
  // Also dispatch global event for QuickLog widget and other listeners
  try { window.dispatchEvent(new Event('nutrilens:update')); } catch {}
}

/**
 * Sync after any meal mutation — triggers centralized recompute.
 * No correction state written. All data derived from raw logs.
 */
export function syncDailyBalance(_log?: DailyLog, _profile?: UserProfile | null): void {
  recomputeCalorieEngine();
}

/**
 * Get today's adjusted daily calorie target.
 * Delegates to the pure computeAdjustedTarget.
 */
export function getAdjustedDailyTarget(profile: UserProfile | null): number {
  const p = profile || getProfile();
  if (!p) return 1600;

  // Active plan override — plan targets take priority
  const activePlan = getActivePlan();
  if (activePlan) {
    // Refeed day logic: Day 10 of a 21-day sprint → TDEE (no deficit)
    const progress = getPlanProgress();
    if (progress && progress.dayNumber === 10 && activePlan.planId === 'celebrity_transformation') {
      return p.tdee || p.dailyCalories || 1600;
    }
    // Calorie cycling for muscle gain: rest days get -200 kcal
    if (activePlan.planId === 'gym_muscle_gain') {
      const trainingDays = _getTrainingDays();
      const today = new Date().getDay(); // 0=Sun
      if (!trainingDays.includes(today)) {
        return Math.max(1200, activePlan.dailyCalories - 200);
      }
    }
    return activePlan.dailyCalories;
  }

  // Reverse diet override — graduated return to TDEE after plan completion
  const reverseDietTarget = getReverseDietTarget();
  if (reverseDietTarget !== null) {
    return Math.max(1200, reverseDietTarget);
  }

  const baseTarget = p.dailyCalories || 1600;
  const tdee = p.tdee || baseTarget;
  const prefs = loadPrefs();
  const today = getEffectiveDate();
  const dayType = prefs.specialDays[today] || 'normal';

  if (dayType === 'fasting') return 0;
  if (dayType === 'cheat') return baseTarget;
  if (!prefs.autoAdjustMeals) return baseTarget;

  const allBalances = getDailyBalances(baseTarget);
  return computeAdjustedTarget(today, baseTarget, allBalances, tdee, getCorrectionMode());
}

/**
 * Protein target — always returns the original, never reduced.
 */
export function getProteinTarget(profile: UserProfile | null): number {
  const activePlan = getActivePlan();
  if (activePlan) return activePlan.dailyProtein;
  return profile?.dailyProtein || 60;
}

/**
 * Carb target — active plan override or profile default.
 */
export function getCarbTarget(profile: UserProfile | null): number {
  const activePlan = getActivePlan();
  if (activePlan) {
    // Refeed day: +50% carbs on Day 10 of celebrity plan
    const progress = getPlanProgress();
    if (progress && progress.dayNumber === 10 && activePlan.planId === 'celebrity_transformation') {
      return Math.round(activePlan.dailyCarbs * 1.5);
    }
    // Rest day cycling for muscle gain: reduce carbs by 30g
    if (activePlan.planId === 'gym_muscle_gain') {
      const trainingDays = _getTrainingDays();
      const today = new Date().getDay();
      if (!trainingDays.includes(today)) {
        return Math.max(50, activePlan.dailyCarbs - 30);
      }
    }
    return activePlan.dailyCarbs;
  }
  return profile?.dailyCarbs || 200;
}

/**
 * Fat target — active plan override or profile default.
 */
export function getFatTarget(profile: UserProfile | null): number {
  const activePlan = getActivePlan();
  if (activePlan) {
    // Rest day cycling for muscle gain: increase fat by 15g
    if (activePlan.planId === 'gym_muscle_gain') {
      const trainingDays = _getTrainingDays();
      const today = new Date().getDay();
      if (!trainingDays.includes(today)) {
        return activePlan.dailyFat + 15;
      }
    }
    return activePlan.dailyFat;
  }
  return profile?.dailyFat || 55;
}

// Training days helper for calorie cycling (default: Mon-Fri)
const TRAINING_DAYS_KEY = 'nutrilens_training_days';

function _getTrainingDays(): number[] {
  try {
    const raw = scopedGet(TRAINING_DAYS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [1, 2, 3, 4, 5];
}

export function setTrainingDays(days: number[]): void {
  scopedSetJSON(TRAINING_DAYS_KEY, days);
}

export function getTrainingDays(): number[] {
  return _getTrainingDays();
}

export function isTrainingDay(): boolean {
  return _getTrainingDays().includes(new Date().getDay());
}

/**
 * Process end-of-day / day rollover.
 * ONLY allowed mutation: freezes adjustedTarget for yesterday.
 */
export function processEndOfDay(profile: UserProfile | null): void {
  const p = profile || getProfile();
  if (!p) return;

  const today = getEffectiveDate();

  // Check if yesterday needs freezing
  const yesterday = getFutureDate(today, -1);
  const frozen = loadFrozenTargets();
  if (frozen[yesterday]) return; // Already frozen

  // Use finalizeDay for yesterday
  finalizeDay(yesterday);

  // Clean old special days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = toLocalDateKey(cutoff);
  const prefs = loadPrefs();
  for (const key of Object.keys(prefs.specialDays)) {
    if (key < cutoffStr) delete prefs.specialDays[key];
  }
  savePrefs(prefs);
}

// ══════════════════════════════════════════════
// QUERY FUNCTIONS — all derived from raw logs
// ══════════════════════════════════════════════

/**
 * Get contextual toast after a meal is logged.
 */
export function getContextualMealToast(): { type: 'surplus' | 'deficit' | 'walk_nudge'; message: string } | null {
  const p = getProfile();
  if (!p) return null;

  const today = getEffectiveDate();
  const log = getDailyLog(today);
  const totals = getDailyTotals(log);
  const target = p.dailyCalories || 1600;
  const diff = totals.eaten - target;

  // Post-meal walking nudge for active event plans (lunch/dinner time)
  const hour = new Date().getHours();
  if (hour >= 12 && hour <= 21) {
    try {
      const { getActivePlan } = require('@/lib/event-plan-service');
      const ap = getActivePlan();
      if (ap?.planId === 'event_based' && totals.eaten > 200) {
        const nudgeKey = `walk_nudge_${today}_${hour >= 18 ? 'dinner' : 'lunch'}`;
        if (!scopedGet(nudgeKey)) {
          scopedSet(nudgeKey, '1');
          return { type: 'walk_nudge', message: 'Great meal! A 10-min walk now will stabilize blood sugar 🚶' };
        }
      }
    } catch {}
  }

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
  return Math.abs(adjusted - original) > 5;
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
  // Walk backwards from yesterday — measure against adjustedTarget if available
  for (let i = balances.length - 1; i >= 0; i--) {
    const b = balances[i];
    if (b.date >= today) continue;
    const compareTarget = b.adjustedTarget || b.target;
    const effectiveDiff = b.actual - compareTarget;
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
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget, tdee, getCorrectionMode());
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
  const breakdown = computeBreakdownForDate(d, pastLogs, baseTarget, tdee, getCorrectionMode());

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
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget, tdee, getCorrectionMode());

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
    sources: computeBreakdownForDate(date, pastLogs, baseTarget, tdee, getCorrectionMode()),
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

