// ==========================================
// NutriLens AI – Identity Shift Badges
// Rewards consistent behavior patterns
// ==========================================

import { getRecentLogs, getDailyTotals, getProfile } from './store';
import { getProteinTarget } from './calorie-correction';
import { getBudgetSettings, getExpensesForDate } from './expense-store';
import { toLocalDateStr } from './date-utils';

const BADGES_KEY = 'nutrilens_identity_badges';

export interface IdentityBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: string;
}

export const IDENTITY_BADGES: IdentityBadge[] = [
  {
    id: 'protein_pro',
    name: 'Protein Pro',
    emoji: '💪',
    description: 'Hit 90%+ protein target for 7 days straight',
    condition: '7-day protein adherence ≥ 90%',
  },
  {
    id: 'budget_master',
    name: 'Budget Master',
    emoji: '💰',
    description: 'Spent ≤90% of food budget this month',
    condition: 'Monthly spend ≤ 90% of budget',
  },
  {
    id: 'consistency_king',
    name: 'Consistency King',
    emoji: '👑',
    description: 'Logged meals for 14 consecutive days',
    condition: '14-day logging streak',
  },
  {
    id: 'hydration_hero',
    name: 'Hydration Hero',
    emoji: '💧',
    description: 'Hit water goal 7 days in a row',
    condition: '7-day water goal streak',
  },
];

export interface EarnedBadge {
  id: string;
  earnedAt: string;
  notified: boolean;
}

function getEarnedBadges(): EarnedBadge[] {
  try { return JSON.parse(scopedGet(BADGES_KEY) || '[]'); }
  catch { return []; }
}

function saveEarnedBadges(badges: EarnedBadge[]): void {
  scopedSet(BADGES_KEY, JSON.stringify(badges));
}

export function checkIdentityBadges(): EarnedBadge[] {
  const earned = getEarnedBadges();
  const earnedIds = new Set(earned.map(b => b.id));
  const newlyEarned: EarnedBadge[] = [];
  const profile = getProfile();
  if (!profile) return newlyEarned;

  const logs = getRecentLogs(14);
  const today = toLocalDateStr();

  // Protein Pro: 7-day protein ≥ 90%
  if (!earnedIds.has('protein_pro')) {
    const last7 = logs.slice(0, 7);
    const target = getProteinTarget(profile);
    const allMet = last7.every(log => {
      const totals = getDailyTotals(log);
      return totals.protein >= target * 0.9 && log.meals.length > 0;
    });
    if (allMet && last7.every(l => l.meals.length > 0)) {
      const badge: EarnedBadge = { id: 'protein_pro', earnedAt: today, notified: false };
      newlyEarned.push(badge);
    }
  }

  // Consistency King: 14-day streak
  if (!earnedIds.has('consistency_king')) {
    const allLogged = logs.every(log => log.meals.length > 0);
    if (allLogged && logs.length >= 14) {
      const badge: EarnedBadge = { id: 'consistency_king', earnedAt: today, notified: false };
      newlyEarned.push(badge);
    }
  }

  // Hydration Hero: 7-day water goal
  if (!earnedIds.has('hydration_hero')) {
    const last7 = logs.slice(0, 7);
    const waterGoal = profile.waterGoal || 8;
    const allMet = last7.every(log => log.waterCups >= waterGoal);
    if (allMet && last7.every(l => l.meals.length > 0)) {
      const badge: EarnedBadge = { id: 'hydration_hero', earnedAt: today, notified: false };
      newlyEarned.push(badge);
    }
  }

  // Budget Master: monthly spend ≤ 90%
  if (!earnedIds.has('budget_master')) {
    const budget = getBudgetSettings();
    if (budget.weeklyBudget > 0) {
      const monthlyBudget = budget.weeklyBudget * 4.33;
      let monthlySpent = 0;
      const thisMonth = today.slice(0, 7);
      for (let d = 1; d <= 31; d++) {
        const dateStr = `${thisMonth}-${String(d).padStart(2, '0')}`;
        if (dateStr > today) break;
        const expenses = getExpensesForDate(dateStr);
        monthlySpent += expenses.reduce((sum, e) => sum + e.amount, 0);
      }
      if (monthlySpent > 0 && monthlySpent <= monthlyBudget * 0.9) {
        const badge: EarnedBadge = { id: 'budget_master', earnedAt: today, notified: false };
        newlyEarned.push(badge);
      }
    }
  }

  if (newlyEarned.length > 0) {
    saveEarnedBadges([...earned, ...newlyEarned]);
  }

  return newlyEarned;
}

export function getIdentityBadges(): { badge: IdentityBadge; earned: EarnedBadge | null }[] {
  const earned = getEarnedBadges();
  return IDENTITY_BADGES.map(badge => ({
    badge,
    earned: earned.find(e => e.id === badge.id) || null,
  }));
}

export function markBadgeNotified(id: string): void {
  const earned = getEarnedBadges();
  const idx = earned.findIndex(b => b.id === id);
  if (idx >= 0) {
    earned[idx].notified = true;
    saveEarnedBadges(earned);
  }
}
