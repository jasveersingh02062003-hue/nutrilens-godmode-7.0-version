// ==========================================
// NutriLens AI – Hard Boundary Layer
// Alerts when weekly surplus > 1000 kcal
// Derived from raw logs — no cached state
// ==========================================

import { getDailyBalances } from './calorie-correction';

const LOG_KEY = 'nutrilens_hard_boundary_log';
const COOLDOWN_KEY = 'nutrilens_hard_boundary_last';

export interface HardBoundaryAlert {
  weeklySurplus: number;
  message: string;
  suggestion: string;
}

export function checkWeeklySurplus(): HardBoundaryAlert | null {
  const lastCheck = scopedGet(COOLDOWN_KEY);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (lastCheck === today) return null;

  const balances = getDailyBalances();
  const last7 = balances.slice(-7);
  if (last7.length < 3) return null;

  // diff = actual - baseTarget (derived from raw logs)
  const weeklySurplus = last7.reduce((sum, b) => sum + Math.max(0, b.diff), 0);

  if (weeklySurplus <= 1000) return null;

  return {
    weeklySurplus: Math.round(weeklySurplus),
    message: "You're drifting off track this week. Let's reset tomorrow.",
    suggestion: `${Math.round(weeklySurplus)} kcal surplus this week — a one-day 15% reduction can fix this.`,
  };
}

export function applyHardReset(): void {
  const now2 = new Date();
  const today = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-${String(now2.getDate()).padStart(2, '0')}`;
  scopedSet(COOLDOWN_KEY, today);

  let log: Array<{ date: string; surplus: number }> = [];
  try { log = JSON.parse(scopedGet(LOG_KEY) || '[]'); } catch {}
  const balances = getDailyBalances();
  const last7 = balances.slice(-7);
  const weeklySurplus = last7.reduce((sum, b) => sum + Math.max(0, b.diff), 0);
  log.push({ date: today, surplus: Math.round(weeklySurplus) });
  if (log.length > 20) log.splice(0, log.length - 20);
  scopedSet(LOG_KEY, JSON.stringify(log));
}

export function dismissHardBoundary(): void {
  const now3 = new Date();
  const today = `${now3.getFullYear()}-${String(now3.getMonth() + 1).padStart(2, '0')}-${String(now3.getDate()).padStart(2, '0')}`;
  scopedSet(COOLDOWN_KEY, today);
}
