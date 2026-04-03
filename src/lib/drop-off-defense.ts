// ==========================================
// NutriLens AI – Drop-Off Defense
// Re-engagement after 3+ days of no logging
// ==========================================

import { getAllLogDates, getDailyLog } from './store';
import { toLocalDateStr } from './date-utils';
import { scopedGet, scopedSet } from './scoped-storage';

const LAST_LOG_KEY = 'nutrilens_last_log_date';
const RESTART_DISMISSED_KEY = 'nutrilens_dropoff_dismissed';

export interface DropOffResult {
  detected: boolean;
  daysMissed: number;
  message: string;
}

export function updateLastLogDate(): void {
  const today = toLocalDateStr();
  const log = getDailyLog(today);
  if (log.meals.length > 0) {
    scopedSet(LAST_LOG_KEY, today);
  }
}

export function checkDropOff(): DropOffResult {
  const today = toLocalDateStr();

  // Check if already dismissed today
  const dismissed = scopedGet(RESTART_DISMISSED_KEY);
  if (dismissed === today) return { detected: false, daysMissed: 0, message: '' };

  // Find last log date
  let lastLog = scopedGet(LAST_LOG_KEY);
  if (!lastLog) {
    // Find from actual logs
    const allDates = getAllLogDates().sort();
    const datesWithMeals = allDates.filter(d => {
      const log = getDailyLog(d);
      return log.meals.length > 0;
    });
    lastLog = datesWithMeals.length > 0 ? datesWithMeals[datesWithMeals.length - 1] : null;
    if (lastLog) scopedSet(LAST_LOG_KEY, lastLog);
  }

  if (!lastLog) return { detected: false, daysMissed: 0, message: '' };

  const daysMissed = Math.round(
    (new Date(today).getTime() - new Date(lastLog).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysMissed >= 3) {
    return {
      detected: true,
      daysMissed,
      message: `We paused your plan for ${daysMissed} days. Let's restart where you left off! 💪`,
    };
  }

  return { detected: false, daysMissed, message: '' };
}

export function dismissDropOff(): void {
  const today = toLocalDateStr();
  scopedSet(RESTART_DISMISSED_KEY, today);
  scopedSet(LAST_LOG_KEY, today);
}
