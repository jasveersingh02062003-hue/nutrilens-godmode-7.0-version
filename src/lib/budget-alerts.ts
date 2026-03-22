// ─── Budget Alerts & Enhanced Settings ───

import { getBudgetSummary } from './budget-service';
import { getBudgetSettings } from './expense-store';

export interface PerMealBudget {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
}

export interface EnhancedBudgetSettings {
  perMealBudget: number; // legacy single value
  perMeal?: PerMealBudget;
  outsideFoodLimit: number;
  onboardingDone?: boolean;
  incomeRange?: string;
  eatingOutPerWeek?: number;
  cooksAtHome?: 'yes' | 'no' | 'mixed';
  groceryStore?: string;
}

const ENHANCED_KEY = 'nutrilens_enhanced_budget';

export function getEnhancedBudgetSettings(): EnhancedBudgetSettings {
  const data = localStorage.getItem(ENHANCED_KEY);
  if (data) return JSON.parse(data);
  return { perMealBudget: 0, outsideFoodLimit: 0 };
}

export function saveEnhancedBudgetSettings(settings: EnhancedBudgetSettings) {
  localStorage.setItem(ENHANCED_KEY, JSON.stringify(settings));
}

// ─── Alert types ───

export interface BudgetAlert {
  id: string;
  type: 'threshold' | 'outside_food' | 'per_meal' | 'over_budget' | 'prediction';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  emoji: string;
  action?: string;
}

export function checkBudgetAlerts(): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const summary = getBudgetSummary();
  const enhanced = getEnhancedBudgetSettings();
  const pct = summary.percentage;

  // Threshold alerts
  if (pct >= 100) {
    alerts.push({
      id: 'over-100',
      type: 'over_budget',
      severity: 'critical',
      message: `You've exceeded your ${summary.period}ly budget! Spent ${summary.currency}${summary.spent} of ${summary.currency}${summary.budget}.`,
      emoji: '🚨',
      action: 'View cheaper alternatives',
    });
  } else if (pct >= 90) {
    alerts.push({
      id: 'threshold-90',
      type: 'threshold',
      severity: 'critical',
      message: `${pct}% of your ${summary.period}ly budget used! Only ${summary.currency}${summary.remaining} remaining.`,
      emoji: '⚠️',
    });
  } else if (pct >= 80) {
    alerts.push({
      id: 'threshold-80',
      type: 'threshold',
      severity: 'warning',
      message: `${pct}% of your ${summary.period}ly budget used. ${summary.currency}${summary.remaining} left.`,
      emoji: '💡',
    });
  }

  // ─── Predictive burn-rate projection ───
  if (pct > 0 && pct < 100) {
    const projection = getBurnRateProjection();
    if (projection && projection.projectedOverage > 0) {
      alerts.push({
        id: 'projection',
        type: 'prediction',
        severity: projection.projectedOverage > summary.budget * 0.2 ? 'critical' : 'warning',
        message: `At this rate, you'll exceed budget by ${summary.currency}${projection.projectedOverage} this ${summary.period}.`,
        emoji: '📈',
        action: 'Plan cheaper meals for remaining days',
      });
    }
  }

  // Outside food limit
  if (enhanced.outsideFoodLimit > 0) {
    const outsideSpend = (summary.byCategory['restaurant'] || 0) + (summary.byCategory['street_food'] || 0);
    const outsidePct = Math.round((outsideSpend / enhanced.outsideFoodLimit) * 100);
    if (outsidePct >= 100) {
      alerts.push({
        id: 'outside-over',
        type: 'outside_food',
        severity: 'critical',
        message: `Outside food limit exceeded! Spent ${summary.currency}${outsideSpend} of ${summary.currency}${enhanced.outsideFoodLimit} limit.`,
        emoji: '🍽️',
        action: 'Switch to home-cooked meals',
      });
    } else if (outsidePct >= 80) {
      alerts.push({
        id: 'outside-warning',
        type: 'outside_food',
        severity: 'warning',
        message: `${outsidePct}% of outside food limit used (${summary.currency}${outsideSpend}/${summary.currency}${enhanced.outsideFoodLimit}).`,
        emoji: '🍽️',
      });
    }
  }

  return alerts;
}

// ─── Burn Rate Projection ───

export interface BurnRateProjection {
  dailyBurnRate: number;
  daysRemaining: number;
  projectedTotal: number;
  projectedOverage: number;
  suggestedDailyBudget: number;
}

export function getBurnRateProjection(): BurnRateProjection | null {
  const summary = getBudgetSummary();
  if (summary.spent === 0) return null;

  const now = new Date();
  let daysPassed: number;
  let totalDays: number;

  if (summary.period === 'week') {
    const dayOfWeek = now.getDay();
    daysPassed = dayOfWeek === 0 ? 7 : dayOfWeek; // Mon=1
    totalDays = 7;
  } else {
    daysPassed = now.getDate();
    totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }

  if (daysPassed === 0) return null;

  const dailyBurnRate = Math.round(summary.spent / daysPassed);
  const daysRemaining = totalDays - daysPassed;
  const projectedTotal = dailyBurnRate * totalDays;
  const projectedOverage = Math.max(0, projectedTotal - summary.budget);
  const suggestedDailyBudget = daysRemaining > 0
    ? Math.round(summary.remaining / daysRemaining)
    : 0;

  return {
    dailyBurnRate,
    daysRemaining,
    projectedTotal,
    projectedOverage,
    suggestedDailyBudget,
  };
}

// ─── Check if a meal cost would push user over budget ───

export function wouldExceedBudget(mealCost: number): { exceeds: boolean; newTotal: number; budget: number } {
  const summary = getBudgetSummary();
  const newTotal = summary.spent + mealCost;
  return {
    exceeds: newTotal > summary.budget,
    newTotal,
    budget: summary.budget,
  };
}

// ─── Smart swap suggestion (rule-based) ───

export interface SwapSuggestion {
  original: string;
  suggestion: string;
  savings: number;
  proteinKept: string;
}

export function getSmartSwaps(): SwapSuggestion[] {
  return [
    { original: 'Paneer', suggestion: 'Soya Chunks', savings: 200, proteinKept: '52g vs 18g per 100g – soya wins!' },
    { original: 'Chicken', suggestion: 'Eggs + Dal', savings: 100, proteinKept: 'Similar protein at lower cost' },
    { original: 'Almonds', suggestion: 'Peanuts', savings: 150, proteinKept: '26g vs 21g per 100g – close match!' },
    { original: 'Quinoa', suggestion: 'Rajma + Rice', savings: 250, proteinKept: 'Complete protein combo at fraction of cost' },
    { original: 'Greek Yogurt', suggestion: 'Homemade Hung Curd', savings: 120, proteinKept: 'Same protein, 1/3rd the price' },
  ];
}
