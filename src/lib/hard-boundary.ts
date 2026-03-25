// ==========================================
// NutriLens AI – Hard Boundary Layer
// Alerts when weekly surplus > 1000 kcal
// ==========================================

import { getDailyBalances, type DailyBalanceEntry } from './calorie-correction';
import { getProfile, saveProfile } from './store';

const LOG_KEY = 'nutrilens_hard_boundary_log';
const COOLDOWN_KEY = 'nutrilens_hard_boundary_last';

export interface HardBoundaryAlert {
  weeklySurplus: number;
  message: string;
  suggestion: string;
}

export function checkWeeklySurplus(): HardBoundaryAlert | null {
  // Check cooldown (once per day max)
  const lastCheck = localStorage.getItem(COOLDOWN_KEY);
  const today = new Date().toISOString().split('T')[0];
  if (lastCheck === today) return null;

  const balances = getDailyBalances();
  const last7 = balances.slice(-7);
  if (last7.length < 3) return null;

  const weeklySurplus = last7.reduce((sum, b) => sum + Math.max(0, b.diff), 0);

  if (weeklySurplus <= 1000) return null;

  return {
    weeklySurplus: Math.round(weeklySurplus),
    message: "You're drifting off track this week. Let's reset tomorrow.",
    suggestion: `${Math.round(weeklySurplus)} kcal surplus this week — a one-day 15% reduction can fix this.`,
  };
}

export function applyHardReset(): void {
  const profile = getProfile();
  if (!profile) return;

  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(COOLDOWN_KEY, today);

  // Log the event
  const log: Array<{ date: string; surplus: number }> = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  const balances = getDailyBalances();
  const last7 = balances.slice(-7);
  const weeklySurplus = last7.reduce((sum, b) => sum + Math.max(0, b.diff), 0);
  log.push({ date: today, surplus: Math.round(weeklySurplus) });
  if (log.length > 20) log.splice(0, log.length - 20);
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

export function dismissHardBoundary(): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(COOLDOWN_KEY, today);
}
