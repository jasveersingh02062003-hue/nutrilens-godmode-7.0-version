import { scopedGet, scopedSet, scopedRemove } from "./scoped-storage";
import { safeJsonParse } from "./safe-json";
import {
  getBudgetSettings,
  getExpensesForRange,
  getExpensesForDate,
  getWeekDateRange,
  getMonthDateRange,
  type Expense,
  type BudgetSettings,
} from './expense-store';
import { getDailyLog, getDailyTotals, getAllLogDates, getTodayKey } from './store';
import { toLocalDateStr } from './date-utils';
import { getEnhancedBudgetSettings } from './budget-alerts';
import { getUnifiedBudget } from './budget-engine';
import { foodDatabase } from './pes-engine';
import { getActivePlan } from './event-plan-service';

export interface BudgetSummary {
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  period: 'week' | 'month';
  currency: string;
  byCategory: Record<string, number>;
  expenses: Expense[];
  planOverride?: boolean;
  planBudgetTier?: string;
}

export function getBudgetSummary(periodOverride?: 'week' | 'month'): BudgetSummary {
  const settings = getBudgetSettings();
  const period = periodOverride || settings.period;
  const range = period === 'week' ? getWeekDateRange() : getMonthDateRange();
  const budget = period === 'week' ? settings.weeklyBudget : settings.monthlyBudget;
  const expenses = getExpensesForRange(range.start, range.end);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  // Add supplement costs as a separate category
  try {
    const { getSupplementSpendingForRange } = require('./supplement-service');
    const suppCost = getSupplementSpendingForRange(range.start, range.end);
    if (suppCost > 0) {
      byCategory['supplements'] = suppCost;
    }
  } catch { /* supplement-service may not be loaded */ }

  // Plan budget tier override
  let finalBudget = budget;
  let planOverride = false;
  let planBudgetTier: string | undefined;
  const activePlan = getActivePlan();
  if (activePlan?.eventSettings?.budgetTier) {
    const tier = activePlan.eventSettings.budgetTier;
    planBudgetTier = tier;
    const dailyCaps: Record<string, number> = { tight: 150, moderate: 250 };
    if (tier in dailyCaps) {
      const dailyCap = dailyCaps[tier];
      const periodDays = period === 'week' ? 7 : 30;
      const cappedBudget = dailyCap * periodDays;
      if (cappedBudget < finalBudget) {
        finalBudget = cappedBudget;
        planOverride = true;
      }
    }
  }

  return {
    budget: finalBudget,
    spent,
    remaining: Math.max(0, finalBudget - spent),
    percentage: finalBudget > 0 ? Math.round((spent / finalBudget) * 100) : 0,
    period,
    currency: settings.currency,
    byCategory,
    expenses,
    planOverride,
    planBudgetTier,
  };
}

export interface NutritionalEconomics {
  avgCostPerProteinGram: number;
  bestProteinValue: { name: string; costPerGram: number } | null;
  worstProteinValue: { name: string; costPerGram: number } | null;
}

export function getNutritionalEconomics(period: 'week' | 'month' = 'week'): NutritionalEconomics {
  const range = period === 'week' ? getWeekDateRange() : getMonthDateRange();

  const allDates = getAllLogDates() as string[];
  let totalCost = 0;
  let totalProtein = 0;
  const mealCosts: { name: string; costPerGram: number }[] = [];

  for (const date of allDates) {
    if (date < range.start || date > range.end) continue;
    const log = getDailyLog(date);
    for (const meal of log.meals) {
      if (meal.cost?.amount && meal.totalProtein > 0) {
        totalCost += meal.cost.amount;
        totalProtein += meal.totalProtein;
        const cpg = meal.cost.amount / meal.totalProtein;
        const name = meal.items.map((i: any) => i.name).join(', ') || meal.type;
        mealCosts.push({ name, costPerGram: cpg });
      }
    }
  }

  mealCosts.sort((a, b) => a.costPerGram - b.costPerGram);

  return {
    avgCostPerProteinGram: totalProtein > 0 ? Math.round((totalCost / totalProtein) * 10) / 10 : 0,
    bestProteinValue: mealCosts[0] || null,
    worstProteinValue: mealCosts.length > 1 ? mealCosts[mealCosts.length - 1] : null,
  };
}

export const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  groceries: { label: 'Groceries', emoji: '🛒', color: 'hsl(152, 55%, 42%)' },
  restaurant: { label: 'Restaurant', emoji: '🍽️', color: 'hsl(8, 80%, 62%)' },
  street_food: { label: 'Street Food', emoji: '🛺', color: 'hsl(38, 70%, 55%)' },
  packaged: { label: 'Packaged', emoji: '📦', color: 'hsl(256, 50%, 60%)' },
  home: { label: 'Home', emoji: '🏠', color: 'hsl(170, 35%, 48%)' },
  other: { label: 'Other', emoji: '💰', color: 'hsl(160, 8%, 48%)' },
};

// ─── Overspend Redistribution ───

export function adjustBudgetAfterOverspend(overspend: number, daysRemaining: number): number {
  if (daysRemaining <= 0 || overspend <= 0) return 0;
  return Math.round(overspend / daysRemaining);
}

export function getDaysRemainingInPeriod(period: 'week' | 'month' = 'week'): number {
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    return day === 0 ? 0 : 7 - day;
  }
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

// ─── Cash Flow Curve ───

export function getBudgetCurveMultiplier(dayOfMonth?: number): number {
  const day = dayOfMonth ?? new Date().getDate();
  if (day <= 5) return 1.2;
  if (day <= 20) return 1.0;
  if (day <= 25) return 0.9;
  return 0.7;
}

export function getAdjustedDailyBudget(): { dailyBudget: number; adjustedDailyBudget: number; overspend: number; daysRemaining: number; curveMultiplier: number } {
  const summary = getBudgetSummary();
  const daysRemaining = getDaysRemainingInPeriod(summary.period);
  const dailyBudget = summary.budget > 0
    ? Math.round(summary.budget / (summary.period === 'week' ? 7 : 30))
    : 0;
  const remaining = Math.max(0, summary.budget - summary.spent);
  const rawAdjusted = daysRemaining > 0 ? Math.round(remaining / daysRemaining) : remaining;
  const curveMultiplier = summary.period === 'month' ? getBudgetCurveMultiplier() : 1;
  const adjustedDailyBudget = Math.round(rawAdjusted * curveMultiplier);
  const overspend = Math.max(0, summary.spent - summary.budget);

  // Apply manual survival mode override
  const finalAdjusted = isSurvivalModeManual()
    ? Math.min(adjustedDailyBudget, 100)
    : adjustedDailyBudget;

  return { dailyBudget, adjustedDailyBudget: finalAdjusted, overspend, daysRemaining, curveMultiplier };
}

// ─── Real-Time Budget Intervention Engine ───

export type BudgetAlertLevel = 'ok' | 'warning' | 'overspend' | 'overspend_severe';

export interface BudgetAlertResult {
  level: BudgetAlertLevel;
  message: string;
  suggestion?: { name: string; cost: number };
  adjustedDailyBudget?: number;
}

const BUDGET_ALERT_KEY = 'nutrilens_budget_alert';

export function checkBudgetAfterMeal(mealCost: number): BudgetAlertResult {
  if (mealCost <= 0) return { level: 'ok', message: '' };

  const today = toLocalDateStr();
  const todayExpenses = getExpensesForDate(today);
  const spentToday = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const { adjustedDailyBudget, daysRemaining } = getAdjustedDailyBudget();

  if (adjustedDailyBudget <= 0) return { level: 'ok', message: '' };

  const ratio = spentToday / adjustedDailyBudget;
  let result: BudgetAlertResult;

  if (ratio >= 1.2) {
    const overshoot = spentToday - adjustedDailyBudget;
    const suggestion = getCheapMealSuggestion(Math.max(30, adjustedDailyBudget * 0.3));
    const newDaily = daysRemaining > 0
      ? Math.max(50, Math.round((getBudgetSummary().remaining) / daysRemaining))
      : adjustedDailyBudget;
    result = {
      level: 'overspend_severe',
      message: `⛔ Overspent by ₹${Math.round(overshoot)}! Remaining days: ₹${newDaily}/day.${suggestion ? ` Try ${suggestion.name} (₹${suggestion.cost})` : ''}`,
      suggestion: suggestion || undefined,
      adjustedDailyBudget: newDaily,
    };
  } else if (ratio >= 1.0) {
    const overshoot = spentToday - adjustedDailyBudget;
    const newDaily = daysRemaining > 0
      ? Math.max(50, Math.round((getBudgetSummary().remaining) / daysRemaining))
      : adjustedDailyBudget;
    result = {
      level: 'overspend',
      message: `🚫 Daily budget reached. Remaining days adjusted to ₹${newDaily}/day.`,
      adjustedDailyBudget: newDaily,
    };
  } else if (ratio >= 0.8) {
    const remaining = Math.round(adjustedDailyBudget - spentToday);
    result = {
      level: 'warning',
      message: `⚠️ 80% of today's budget used. Keep next meal under ₹${remaining}.`,
    };
  } else {
    result = { level: 'ok', message: '' };
  }

  if (result.level !== 'ok') {
    setLatestBudgetAlert(result);
  }

  return result;
}

export function getCheapMealSuggestion(maxCost: number): { name: string; cost: number } | null {
  const cheap = foodDatabase
    .filter(f => f.price <= maxCost && !f.tags.includes('junk'))
    .sort((a, b) => b.proteinPerRupee - a.proteinPerRupee);
  if (cheap.length > 0) return { name: cheap[0].name, cost: cheap[0].price };
  return { name: 'Egg Bhurji', cost: 20 };
}

export function setLatestBudgetAlert(alert: BudgetAlertResult): void {
  const data = { ...alert, timestamp: Date.now(), date: toLocalDateStr() };
  scopedSet(BUDGET_ALERT_KEY, JSON.stringify(data));
}

export function getLatestBudgetAlert(): (BudgetAlertResult & { timestamp: number; date: string }) | null {
  const raw = scopedGet(BUDGET_ALERT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    // Only show alerts from today
    if (data.date !== toLocalDateStr()) {
      scopedRemove(BUDGET_ALERT_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

export function clearLatestBudgetAlert(): void {
  scopedRemove(BUDGET_ALERT_KEY);
}

// ─── Manual ₹100 Survival Mode ───

const SURVIVAL_MODE_KEY = 'nutrilens_survival_manual';

export function activateSurvivalMode(): void {
  scopedSet(SURVIVAL_MODE_KEY, 'true');
}

export function deactivateSurvivalMode(): void {
  scopedRemove(SURVIVAL_MODE_KEY);
}

export function isSurvivalModeManual(): boolean {
  return scopedGet(SURVIVAL_MODE_KEY) === 'true';
}

// ─── Per-Meal Budget Cascade ───

const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

export function cascadeMealBudget(mealType: string, spent: number): { nextMeal: string; reducedBudget: number } | null {
  const unified = getUnifiedBudget();
  const slotKey = mealType === 'snack' ? 'snacks' : mealType;
  const allocated = (unified.perMeal as any)[slotKey] || 0;
  const overage = spent - allocated;

  if (overage <= 0) return null;

  const idx = MEAL_ORDER.indexOf(mealType);
  if (idx < 0 || idx >= MEAL_ORDER.length - 1) return null;

  const nextMeal = MEAL_ORDER[idx + 1];
  const nextKey = nextMeal === 'snack' ? 'snacks' : nextMeal;
  const nextBudget = (unified.perMeal as any)[nextKey] || 0;
  const reducedBudget = Math.max(10, nextBudget - overage);

  return { nextMeal, reducedBudget };
}

// ─── Dual-Sync Insight Engine ───

export interface DualSyncInsight {
  type: 'low_efficiency' | 'check_quality';
  emoji: string;
  message: string;
}

export function getDualSyncInsight(targetCalories: number): DualSyncInsight | null {
  const { adjustedDailyBudget } = getAdjustedDailyBudget();
  if (adjustedDailyBudget <= 0 || targetCalories <= 0) return null;

  const log = getDailyLog(getTodayKey());
  const totals = getDailyTotals(log);
  const totalSpent = log.meals.reduce((s, m) => s + (m.cost?.amount || 0), 0);

  const calPercent = totals.eaten / targetCalories;
  const budgetPercent = totalSpent / adjustedDailyBudget;

  if (budgetPercent > 0.8 && calPercent < 0.3) {
    const remaining = Math.round(targetCalories - totals.eaten);
    return {
      type: 'low_efficiency',
      emoji: '⚠️',
      message: `Spent ${Math.round(budgetPercent * 100)}% of budget but only ${Math.round(calPercent * 100)}% calories. Need ~${remaining} kcal — switch to home staples.`,
    };
  }

  if (calPercent > 0.9 && budgetPercent < 0.2) {
    return {
      type: 'check_quality',
      emoji: '🔍',
      message: `Calorie target hit but only ${Math.round(budgetPercent * 100)}% budget used. Use surplus for protein-rich foods tomorrow.`,
    };
  }

  return null;
}