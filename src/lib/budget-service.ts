import {
  getBudgetSettings,
  getExpensesForRange,
  getWeekDateRange,
  getMonthDateRange,
  type Expense,
  type BudgetSettings,
} from './expense-store';
import { getDailyLog, getDailyTotals, getAllLogDates } from './store';

export interface BudgetSummary {
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  period: 'week' | 'month';
  currency: string;
  byCategory: Record<string, number>;
  expenses: Expense[];
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

  return {
    budget,
    spent,
    remaining: Math.max(0, budget - spent),
    percentage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
    period,
    currency: settings.currency,
    byCategory,
    expenses,
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
