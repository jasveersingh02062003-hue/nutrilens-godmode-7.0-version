// ─── Decision Engine: Overspend Options + Recovery + Reality Shock ───

import { getBudgetSummary, getDaysRemainingInPeriod, getAdjustedDailyBudget } from './budget-service';
import { getBudgetSettings, saveBudgetSettings } from './expense-store';

const RECOVERY_KEY = 'nutrilens_recovery_mode';

export interface OverspendOption {
  id: 'continue' | 'recover' | 'ignore';
  label: string;
  impact: string;
  emoji: string;
}

export function getOverspendOptions(mealCost: number): OverspendOption[] {
  const summary = getBudgetSummary();
  const { adjustedDailyBudget, daysRemaining } = getAdjustedDailyBudget();
  const dailyBudget = adjustedDailyBudget || Math.round(summary.budget / (summary.period === 'week' ? 7 : 30));
  const overspendAmount = Math.max(0, summary.spent + mealCost - summary.budget);
  const projectedMonthlyOvershoot = Math.round(overspendAmount * (summary.period === 'week' ? 4 : 1));

  const recoveryDays = Math.min(3, Math.max(1, daysRemaining));
  const recoveryBudget = daysRemaining > 0 ? Math.round((summary.remaining - mealCost) / recoveryDays) : 0;

  return [
    {
      id: 'continue',
      label: 'Continue as usual',
      impact: projectedMonthlyOvershoot > 0
        ? `Monthly overshoot ~₹${projectedMonthlyOvershoot}`
        : 'Budget is tight but manageable',
      emoji: '➡️',
    },
    {
      id: 'recover',
      label: 'Recovery mode',
      impact: `Next ${recoveryDays} days: ₹${Math.max(0, recoveryBudget)}/day (simple meals)`,
      emoji: '🔄',
    },
    {
      id: 'ignore',
      label: 'Ignore budget today',
      impact: "You'll be reminded again tomorrow",
      emoji: '🙈',
    },
  ];
}

export function applyDecision(choice: 'continue' | 'recover' | 'ignore'): string {
  if (choice === 'recover') {
    const recovery = {
      active: true,
      startDate: new Date().toISOString().split('T')[0],
      daysLeft: 3,
    };
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(recovery));
    return 'Recovery mode activated for 3 days. Meals will prioritise budget-friendly options.';
  }
  if (choice === 'ignore') {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('nutrilens_budget_ignored_' + today, 'true');
    return 'Budget tracking paused for today.';
  }
  return 'Continuing with current budget plan.';
}

export function isRecoveryModeActive(): boolean {
  try {
    const data = localStorage.getItem(RECOVERY_KEY);
    if (!data) return false;
    const recovery = JSON.parse(data);
    if (!recovery.active) return false;
    const start = new Date(recovery.startDate);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - start.getTime()) / (86400000));
    if (daysPassed >= recovery.daysLeft) {
      localStorage.removeItem(RECOVERY_KEY);
      return false;
    }
    return true;
  } catch { return false; }
}

export function shouldTriggerOverspendDecision(mealCost: number): boolean {
  const { adjustedDailyBudget } = getAdjustedDailyBudget();
  if (adjustedDailyBudget <= 0) return false;
  return mealCost > adjustedDailyBudget * 0.5;
}

// ─── Reality Shock Protocol ───

export interface RealityShock {
  daysEquivalent: number;
  message: string;
}

export function getRealityShock(mealCost: number): RealityShock | null {
  const { adjustedDailyBudget } = getAdjustedDailyBudget();
  if (adjustedDailyBudget <= 0) return null;
  if (mealCost <= adjustedDailyBudget * 1.5) return null;

  const daysEquivalent = Math.round((mealCost / adjustedDailyBudget) * 10) / 10;
  return {
    daysEquivalent,
    message: `⚠️ ₹${mealCost} on a single meal = ${daysEquivalent} days of your food budget (₹${adjustedDailyBudget}/day).`,
  };
}

export function getFinancialInsight(mealCost: number): string | null {
  if (mealCost < 80) return null;
  const eggMeals = Math.floor(mealCost / 25);
  const dalRiceMeals = Math.floor(mealCost / 45);
  const proteinGrams = Math.round(eggMeals * 12);
  return `₹${mealCost} = ${dalRiceMeals} dal-rice meals = ~${proteinGrams}g protein worth`;
}

export function getOpportunityCost(amount: number) {
  return {
    eggMeals: Math.floor(amount / 25),
    dalRiceMeals: Math.floor(amount / 45),
    pohaMeals: Math.floor(amount / 20),
    proteinEquivalent: Math.round((amount / 25) * 12),
    savingsPerWeek: Math.round(amount * 0.7),
  };
}