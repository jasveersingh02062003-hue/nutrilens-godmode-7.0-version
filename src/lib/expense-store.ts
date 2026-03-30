import { getDailyLog, getRecentLogs, getAllLogDates, type MealEntry } from './store';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: 'groceries' | 'restaurant' | 'street_food' | 'packaged' | 'home' | 'other';
  description: string;
  mealId?: string;
  type: 'meal' | 'grocery' | 'manual';
}

export interface BudgetSettings {
  weeklyBudget: number;
  monthlyBudget: number;
  period: 'week' | 'month';
  currency: string;
}

const BUDGET_KEY = 'nutrilens_budget_settings';
const MANUAL_EXPENSES_KEY = 'nutrilens_manual_expenses';

export function getBudgetSettings(): BudgetSettings {
  const data = localStorage.getItem(BUDGET_KEY);
  if (data) return JSON.parse(data);
  return { weeklyBudget: 2000, monthlyBudget: 8000, period: 'week', currency: '₹' };
}

export function saveBudgetSettings(settings: BudgetSettings) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(settings));
}

export function getManualExpenses(): Expense[] {
  const data = localStorage.getItem(MANUAL_EXPENSES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveManualExpense(expense: Expense) {
  const expenses = getManualExpenses();
  expenses.push(expense);
  localStorage.setItem(MANUAL_EXPENSES_KEY, JSON.stringify(expenses));
}

export function deleteManualExpense(id: string) {
  const expenses = getManualExpenses().filter(e => e.id !== id);
  localStorage.setItem(MANUAL_EXPENSES_KEY, JSON.stringify(expenses));
}

export function updateManualExpense(id: string, updates: Partial<Expense>) {
  const expenses = getManualExpenses().map(e => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem(MANUAL_EXPENSES_KEY, JSON.stringify(expenses));
}

function mealSourceToCategory(meal: MealEntry): Expense['category'] {
  const src = meal.source?.category;
  if (src === 'restaurant' || src === 'fast_food') return 'restaurant';
  if (src === 'street_food') return 'street_food';
  if (src === 'packaged') return 'packaged';
  if (src === 'home') return 'home';
  return 'other';
}

export function getExpensesForDate(date: string): Expense[] {
  const log = getDailyLog(date);
  const mealExpenses: Expense[] = log.meals
    .filter(m => m.cost && m.cost.amount > 0)
    .map(m => ({
      id: `meal-${m.id}`,
      date,
      amount: m.cost!.amount,
      currency: m.cost!.currency || '₹',
      category: mealSourceToCategory(m),
      description: `${m.type.charAt(0).toUpperCase() + m.type.slice(1)} – ${m.items.map(i => i.name).join(', ') || 'Meal'}`,
      mealId: m.id,
      type: 'meal' as const,
    }));

  const manual = getManualExpenses().filter(e => e.date === date);
  return [...mealExpenses, ...manual];
}

export function getExpensesForRange(startDate: string, endDate: string): Expense[] {
  const allDates = getAllLogDates();
  const manualExpenses = getManualExpenses();
  const expenses: Expense[] = [];

  for (const date of allDates) {
    if (date >= startDate && date <= endDate) {
      expenses.push(...getExpensesForDate(date));
    }
  }

  // Add manual expenses in range not already from log dates
  for (const e of manualExpenses) {
    if (e.date >= startDate && e.date <= endDate && !allDates.includes(e.date)) {
      expenses.push(e);
    }
  }

  return expenses.sort((a, b) => b.date.localeCompare(a.date));
}

export function getWeekDateRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    start: fmt(monday),
    end: fmt(sunday),
  };
}

export function getMonthDateRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    start: fmt(start),
    end: fmt(end),
  };
}

export function hasExpensesOnDate(date: string): boolean {
  const log = getDailyLog(date);
  if (log.meals.some(m => m.cost && m.cost.amount > 0)) return true;
  return getManualExpenses().some(e => e.date === date);
}
