// ==========================================
// NutriLens AI – Cumulative Budget Impact
// Shows tangible savings in food equivalents
// ==========================================

import { getBudgetSettings, getExpensesForDate } from './expense-store';

export interface MonthlySavingsResult {
  totalBudget: number;
  totalSpent: number;
  saved: number;
  equivalents: string[];
}

const EQUIVALENTS: Array<{ name: string; price: number; unit: string; emoji: string }> = [
  { name: 'eggs', price: 7, unit: '', emoji: '🥚' },
  { name: 'kg chicken', price: 200, unit: 'kg', emoji: '🍗' },
  { name: 'litres milk', price: 60, unit: 'L', emoji: '🥛' },
  { name: 'kg paneer', price: 400, unit: 'kg', emoji: '🧀' },
];

export function savingsToEquivalents(saved: number): string[] {
  if (saved <= 0) return [];
  return EQUIVALENTS
    .map(e => {
      const count = Math.floor(saved / e.price);
      if (count < 1) return null;
      return `${e.emoji} ${count} ${e.name}`;
    })
    .filter(Boolean) as string[];
}

export function getMonthlySavings(): MonthlySavingsResult {
  const budget = getBudgetSettings();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const thisMonth = today.slice(0, 7);
  const monthlyBudget = Math.round((budget.weeklyBudget || 0) * 4.33);

  let totalSpent = 0;
  for (let d = 1; d <= 31; d++) {
    const dateStr = `${thisMonth}-${String(d).padStart(2, '0')}`;
    if (dateStr > today) break;
    const expenses = getExpensesForDate(dateStr);
    totalSpent += expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  const saved = Math.max(0, monthlyBudget - totalSpent);

  return {
    totalBudget: monthlyBudget,
    totalSpent: Math.round(totalSpent),
    saved: Math.round(saved),
    equivalents: savingsToEquivalents(saved),
  };
}
