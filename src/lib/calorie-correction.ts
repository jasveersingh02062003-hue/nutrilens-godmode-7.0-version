// ============================================
// Smart Calorie Correction Engine
// Rolling "calorie bank" with adjustment plans
// Production-hardened with modes, adherence, confidence, streaks
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
  // Production fields
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
    // Backward compat: migrate old dailyBalances format
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
  const mealsPlanned = 7 * 3; // 3 meals/day for 7 days
  for (const log of logs) {
    mealsLogged += log.meals.length;
  }
  const score = Math.min(1, mealsLogged / mealsPlanned);
  const pct = Math.round(score * 100);
  const label = pct >= 80 ? 'Great' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Low';
  return { score, label };
}

// ── Helper: build adjustment plan ──

function buildAdjustmentPlan(surplus: number, originalTarget: number, startDate: string, days: number, mode: CorrectionMode, sourceDate?: string): { plan: AdjustmentPlanEntry[]; sources: AdjustmentSourceMap[] } {
  const config = MODE_CONFIG[mode];
  const maxPerDay = originalTarget * config.surplusCap;
  const perDay = Math.min(surplus / days, maxPerDay);
  const plan: AdjustmentPlanEntry[] = [];
  const sources: AdjustmentSourceMap[] = [];
  const start = new Date(startDate);
  for (let i = 1; i <= days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const targetDate = d.toISOString().split('T')[0];
    const adjustAmount = -Math.round(perDay);
    plan.push({ date: targetDate, adjust: adjustAmount });
    if (sourceDate) {
      sources.push({
        targetDate,
        sources: [{ sourceDate, surplus, appliedAdjustment: adjustAmount }],
      });
    }
  }
  return { plan, sources };
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

// ── Plan Merging ──

function mergePlans(existing: AdjustmentPlanEntry[], newEntries: AdjustmentPlanEntry[]): AdjustmentPlanEntry[] {
  const merged = [...existing];
  for (const newEntry of newEntries) {
    const idx = merged.findIndex(e => e.date === newEntry.date);
    if (idx !== -1) {
      merged[idx] = { ...merged[idx], adjust: merged[idx].adjust + newEntry.adjust };
    } else {
      merged.push(newEntry);
    }
  }
  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

function mergeSources(existing: AdjustmentSourceMap[], newEntries: AdjustmentSourceMap[]): AdjustmentSourceMap[] {
  const merged = [...existing];
  for (const entry of newEntries) {
    const idx = merged.findIndex(e => e.targetDate === entry.targetDate);
    if (idx !== -1) {
      merged[idx] = { ...merged[idx], sources: [...merged[idx].sources, ...entry.sources] };
    } else {
      merged.push(entry);
    }
  }
  return merged.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

// ── Core Functions ──

/**
 * Update calorie bank after any meal mutation (add/edit/delete).
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
  const mode = state.correctionMode;
  const config = MODE_CONFIG[mode];

  // Fasting day — no bank update
  if (dayType === 'fasting') return;

  const diff = totals.eaten - originalTarget;

  // Find existing balance for today
  const existingIdx = state.dailyBalances.findIndex(b => b.date === today);
  const previousDiff = existingIdx >= 0 ? state.dailyBalances[existingIdx].diff : 0;

  // Update bank: remove old diff for today, add new
  state.calorieBank = state.calorieBank - previousDiff + diff;

  const entry: DailyBalanceEntry = {
    date: today, target: originalTarget, actual: totals.eaten, diff, bankAfter: state.calorieBank,
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

  // Track consecutive surplus/deficit days
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

  // Cheat day — track bank but don't create adjustment plan
  if (dayType === 'cheat') {
    saveState(state);
    return;
  }

  // Confidence-based softening
  const confidence = getAverageConfidence(dailyLog);
  const confMultiplier = confidence < 0.7 ? 0.7 : 1;

  // Failure handling: if 3+ consecutive surplus days, reduce intensity
  const failureMultiplier = state.consecutiveSurplusDays > 3 ? 0.7 : 1;
  const effectiveMultiplier = confMultiplier * failureMultiplier;

  // Adherence-based softening
  const adherence = getAdherenceScore();
  const adherenceMultiplier = adherence.score < 0.5 ? 0.7 : 1;

  const totalMultiplier = effectiveMultiplier * adherenceMultiplier;

  // Build/update adjustment plan for surplus
  if (state.calorieBank > 50) {
    const [minDays, maxDays] = config.recoveryDays;
    const days = Math.min(maxDays + (state.consecutiveSurplusDays > 3 ? 2 : 0), Math.max(minDays, state.consecutiveSurplusDays + minDays));
    const effectiveSurplus = state.calorieBank * totalMultiplier;
    const { plan: newPlan, sources: newSources } = buildAdjustmentPlan(effectiveSurplus, originalTarget, today, Math.min(7, days), mode, today);
    // Dampen plan entries if consecutive surplus > 3
    if (state.consecutiveSurplusDays > 3) {
      newPlan.forEach(p => p.adjust = Math.round(p.adjust * 0.7));
      newSources.forEach(s => s.sources.forEach(src => src.appliedAdjustment = Math.round(src.appliedAdjustment * 0.7)));
    }
    state.adjustmentPlan = mergePlans(state.adjustmentPlan.filter(e => e.date >= today), newPlan);
    state.adjustmentSources = mergeSources(state.adjustmentSources.filter(s => s.targetDate >= today), newSources);
    state.adjustmentDaysRemaining = days;
    state.adjustmentPerDay = Math.min(effectiveSurplus / days, originalTarget * config.surplusCap);
  } else if (state.calorieBank < -50) {
    // Deficit: single-day partial recovery for tomorrow
    let recoveryFactor = config.deficitRecovery;
    if (state.consecutiveDeficitDays > 3) {
      recoveryFactor *= 0.5;
    }
    const recovery = Math.abs(state.calorieBank) * recoveryFactor * totalMultiplier;
    const maxRecovery = originalTarget * 0.15;
    const adjust = Math.round(Math.min(recovery, maxRecovery));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const newDeficitPlan = [{ date: tomorrowStr, adjust }];
    const newDeficitSources: AdjustmentSourceMap[] = [{
      targetDate: tomorrowStr,
      sources: [{ sourceDate: today, surplus: diff, appliedAdjustment: adjust }],
    }];
    state.adjustmentPlan = mergePlans(state.adjustmentPlan.filter(e => e.date >= today), newDeficitPlan);
    state.adjustmentSources = mergeSources(state.adjustmentSources.filter(s => s.targetDate >= today), newDeficitSources);
  } else {
    state.adjustmentPlan = [];
    state.adjustmentSources = [];
  }

  saveState(state);
  notifyUICallbacks();
}

/**
 * Get today's adjusted daily calorie target based on calorie bank.
 */
export function getAdjustedDailyTarget(profile: UserProfile | null): number {
  const p = profile || getProfile();
  if (!p) return 1600;

  const originalTarget = p.dailyCalories || 1600;
  const state = loadState();
  const today = getEffectiveDate();
  const dayType = state.specialDays[today] || 'normal';

  // Special day type handling
  if (dayType === 'fasting') return 0;
  if (dayType === 'cheat') return originalTarget;
  if (!state.autoAdjustMeals) return originalTarget;

  const mode = state.correctionMode;
  const config = MODE_CONFIG[mode];

  // Recovery day: half-intensity
  const intensityMultiplier = dayType === 'recovery' ? 0.5 : 1;

  // Check explicit adjustment plan first
  const planEntry = state.adjustmentPlan.find(e => e.date === today);
  if (planEntry) {
    const adjusted = originalTarget + Math.round(planEntry.adjust * intensityMultiplier);
    const floor = originalTarget * 0.80;
    const ceiling = originalTarget * 1.15;
    return Math.round(Math.max(floor, Math.min(ceiling, adjusted)));
  }

  if (Math.abs(state.calorieBank) < 50) return originalTarget;

  if (state.calorieBank > 0) {
    const [minDays, maxDays] = config.recoveryDays;
    const recoveryDays = Math.max(
      state.adjustmentDaysRemaining > 0 ? state.adjustmentDaysRemaining : minDays,
      Math.min(maxDays, state.consecutiveSurplusDays + minDays)
    );
    const maxAdjustment = originalTarget * config.surplusCap;
    const adjustment = Math.min(state.calorieBank / recoveryDays, maxAdjustment) * intensityMultiplier;
    const nextTarget = originalTarget - adjustment;
    const floor = originalTarget * 0.80;
    return Math.round(Math.max(floor, nextTarget));
  }

  // DEFICIT: partial recovery
  const recoveryAmount = Math.abs(state.calorieBank) * config.deficitRecovery;
  const maxRecovery = originalTarget * 0.15;
  const recovery = Math.min(recoveryAmount, maxRecovery) * intensityMultiplier;
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

  const today = getEffectiveDate();
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
        date: yesterday, target: originalTarget, actual: totals.eaten, diff, bankAfter: state.calorieBank + diff,
      });
      state.calorieBank += diff;
    }

    // Balance streak: |diff| <= 100 → increment, else reset
    const lastEntry = state.dailyBalances.find(b => b.date === yesterday);
    if (lastEntry && Math.abs(lastEntry.diff) <= 100) {
      state.balanceStreak++;
    } else if (lastEntry) {
      state.balanceStreak = 0;
    }

    // Clean expired adjustment plan entries
    state.adjustmentPlan = state.adjustmentPlan.filter(e => e.date >= today);

    if (state.adjustmentDaysRemaining > 0) state.adjustmentDaysRemaining--;

    // Rebuild plan if bank still positive and plan is empty
    if (state.adjustmentPlan.length === 0 && state.calorieBank > 50) {
      const [minDays, maxDays] = MODE_CONFIG[state.correctionMode].recoveryDays;
      const days = Math.min(maxDays + 2, Math.max(minDays, state.consecutiveSurplusDays + minDays));
      const { plan: newPlan, sources: newSources } = buildAdjustmentPlan(state.calorieBank, originalTarget, today, Math.min(7, days), state.correctionMode, yesterday);
      state.adjustmentPlan = mergePlans(state.adjustmentPlan, newPlan);
      state.adjustmentSources = mergeSources(state.adjustmentSources, newSources);
      state.adjustmentDaysRemaining = days;
      state.adjustmentPerDay = Math.min(state.calorieBank / days, originalTarget * MODE_CONFIG[state.correctionMode].surplusCap);
    }
  }

  state.lastProcessedDate = today;

   if (state.dailyBalances.length > 30) state.dailyBalances = state.dailyBalances.slice(-30);
  // Prune old adjustment sources
  if (state.adjustmentSources.length > 30) state.adjustmentSources = state.adjustmentSources.slice(-30);

  // Clean old special days (older than 30 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  for (const key of Object.keys(state.specialDays)) {
    if (key < cutoffStr) delete state.specialDays[key];
  }

  saveState(state);
  notifyUICallbacks();
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
 * Get daily balances for the last 30 days (enriched format).
 */
export function getDailyBalances(): DailyBalanceEntry[] {
  return [...loadState().dailyBalances].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get the active adjustment plan entries.
 */
export function getAdjustmentPlan(): AdjustmentPlanEntry[] {
  const state = loadState();
  const today = getEffectiveDate();
  return state.adjustmentPlan.filter(e => e.date >= today);
}

/**
 * Get monthly stats for a given month (defaults to current).
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

  if (weekendSurplus / surplusEntries.length >= 0.5) {
    return { detected: true, message: 'You tend to eat more on weekends. We\'ve adjusted future plans to handle this better.' };
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
    const msg = state.consecutiveSurplusDays > 3
      ? "You've been eating well lately 😄 We're making gentle adjustments to keep things balanced."
      : "Big meal today 😄 We've got you covered for the next few days.";
    return { type: 'surplus', message: msg };
  }

  return { type: 'deficit', message: "Light day — we'll add a little extra tomorrow to keep your energy up 💪" };
}

/**
 * Get contextual toast after a meal is logged (for immediate feedback).
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
 * Get a plain-text explanation of why today's target changed.
 */
export function getAdjustmentExplanation(date?: string): string | null {
  const state = loadState();
  const d = date || getEffectiveDate();
  const sourceMap = state.adjustmentSources.find(s => s.targetDate === d);
  if (!sourceMap || sourceMap.sources.length === 0) return null;

  const grouped: Record<string, number> = {};
  for (const src of sourceMap.sources) {
    grouped[src.sourceDate] = (grouped[src.sourceDate] || 0) + src.surplus;
  }

  const lines = Object.entries(grouped).map(([srcDate, surplus]) => {
    const dayName = new Date(srcDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    return `On ${dayName}, you ate ${surplus > 0 ? '+' : ''}${surplus} kcal ${surplus > 0 ? 'over' : 'under'} target`;
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
  const activeSources = state.adjustmentSources.filter(s => s.targetDate >= today);

  // Deduplicate source days
  const sourceMap = new Map<string, number>();
  for (const entry of activeSources) {
    for (const src of entry.sources) {
      sourceMap.set(src.sourceDate, src.surplus);
    }
  }
  const recentSurplusDays = Array.from(sourceMap.entries())
    .map(([date, surplus]) => ({ date, surplus }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Future adjustments with sources
  const futureAdjustments = activeSources.map(entry => {
    const totalAdj = entry.sources.reduce((sum, s) => sum + s.appliedAdjustment, 0);
    return {
      date: entry.targetDate,
      adjustment: totalAdj,
      sources: entry.sources,
    };
  });

  return { recentSurplusDays, futureAdjustments };
}

/**
 * Get after-dinner notification summary.
 * Returns a user-friendly message about today's surplus/deficit and how it affects upcoming days.
 */
export function getDinnerNotificationSummary(): {
  message: string;
  tomorrowTarget: number;
} | null {
  const p = getProfile();
  if (!p) return null;

  const today = getEffectiveDate();
  const dailyLog = getDailyLog(today);
  const totals = getDailyTotals(dailyLog);
  const originalTarget = p.dailyCalories || 1600;
  const diff = totals.eaten - originalTarget;

  // Don't notify for balanced days
  if (Math.abs(diff) < 50) return null;

  const state = loadState();
  const mode = state.correctionMode;
  const config = MODE_CONFIG[mode];

  let message = '';

  if (diff > 0) {
    const [minDays] = config.recoveryDays;
    const spreadDays = Math.max(minDays, 4);
    const perDay = Math.round(diff / spreadDays);
    message = `You ate +${Math.round(diff)} kcal over target today.\n\n→ We'll reduce ~${perDay} kcal/day over the next ${spreadDays} days.`;
  } else {
    const deficit = Math.abs(diff);
    const recovery = Math.min(
      Math.round(deficit * config.deficitRecovery),
      Math.round(originalTarget * 0.15)
    );
    message = `You ate ${Math.round(deficit)} kcal less than your target.\n\n→ Tomorrow's calories will increase by ~${recovery} kcal.`;
  }

  // Compute tomorrow's adjusted target
  const tomorrowTarget = getAdjustedDailyTarget(p);

  // Pending adjustments from previous days
  const pendingAdj = state.adjustmentPlan
    .filter(e => e.date > today)
    .reduce((sum, e) => sum + Math.abs(e.adjust), 0);

  if (pendingAdj > 0) {
    message += `\n\n(${pendingAdj} kcal still being balanced from previous days.)`;
  }

  message += `\n\n👉 Tomorrow's target: ~${tomorrowTarget} kcal`;

  return { message, tomorrowTarget };
}
