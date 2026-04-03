import { scopedGet, scopedSet } from './scoped-storage';
import { getProfile, getDailyLog, getDailyTotals, getTodayKey } from '@/lib/store';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealStatus = 'completed' | 'late_completed' | 'current' | 'pending' | 'missed';

export interface MealSlotData {
  type: MealSlot;
  emoji: string;
  label: string;
  timeHint: string;
  status: MealStatus;
  loggedCalories: number;
  loggedProtein: number;
}

export interface WidgetData {
  remainingCalories: number;
  remainingProtein: number;
  totalCalories: number;
  totalProtein: number;
  meals: MealSlotData[];
  message: string;
}

const SLOT_META: Record<MealSlot, { emoji: string; label: string; timeHint: string; startHour: number; endHour: number }> = {
  breakfast: { emoji: '🌅', label: 'Breakfast', timeHint: '6–11 AM', startHour: 5, endHour: 11 },
  lunch:     { emoji: '☀️', label: 'Lunch',     timeHint: '11 AM–3 PM', startHour: 11, endHour: 15 },
  snack:     { emoji: '🍿', label: 'Snack',     timeHint: '3–6 PM', startHour: 15, endHour: 18 },
  dinner:    { emoji: '🌙', label: 'Dinner',    timeHint: '6–10 PM', startHour: 18, endHour: 22 },
};

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export function getMealStatus(type: MealSlot, loggedTypes: Set<string>): MealStatus {
  const hour = new Date().getHours();
  const meta = SLOT_META[type];
  const isLogged = loggedTypes.has(type);

  if (isLogged && hour >= meta.endHour) return 'late_completed';
  if (isLogged) return 'completed';
  if (hour >= meta.startHour && hour < meta.endHour) return 'current';
  if (hour >= meta.endHour) return 'missed';
  return 'pending';
}

export function getWidgetData(): WidgetData {
  const profile = getProfile();
  const log = getDailyLog(getTodayKey());
  const totals = getDailyTotals(log);

  const targetCal = profile?.dailyCalories || 2000;
  const targetProtein = profile?.dailyProtein || 60;

  const loggedTypes = new Set(log.meals.map(m => m.type));

  const meals: MealSlotData[] = SLOT_ORDER.map(type => {
    const meta = SLOT_META[type];
    const mealItems = log.meals.filter(m => m.type === type);
    const mealCals = mealItems.reduce((s, m) => s + m.items.reduce((a, i) => a + (i.calories || 0) * (i.quantity || 1), 0), 0);
    const mealProtein = mealItems.reduce((s, m) => s + m.items.reduce((a, i) => a + (i.protein || 0) * (i.quantity || 1), 0), 0);

    return {
      type,
      emoji: meta.emoji,
      label: meta.label,
      timeHint: meta.timeHint,
      status: getMealStatus(type, loggedTypes),
      loggedCalories: Math.round(mealCals),
      loggedProtein: Math.round(mealProtein),
    };
  });

  const remaining = Math.max(0, targetCal - totals.eaten);
  const remainingProtein = Math.max(0, targetProtein - totals.protein);

  return {
    remainingCalories: Math.round(remaining),
    remainingProtein: Math.round(remainingProtein),
    totalCalories: targetCal,
    totalProtein: targetProtein,
    meals,
    message: getDynamicMessage(totals.eaten, targetCal, totals.protein, targetProtein, meals),
  };
}

function getDynamicMessage(
  eaten: number, targetCal: number,
  protein: number, targetProtein: number,
  meals: MealSlotData[]
): string {
  const hour = new Date().getHours();
  const calPct = eaten / Math.max(1, targetCal);
  const proteinPct = protein / Math.max(1, targetProtein);
  const remaining = targetCal - eaten;

  // Yesterday check — comeback message
  if (eaten === 0 && hour < 11) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const yLog = getDailyLog(yKey);
    if (yLog.meals.length === 0) return "Let's get back on track today 💪";
    return "Good morning! Ready to start logging? 🌞";
  }

  // Protein behind in afternoon
  if (proteinPct < 0.4 && hour > 14) return "You're behind on protein — add some! 💪";

  // Under-eating at night
  if (hour >= 20 && remaining > 800) return "You're under-eating today — fuel up 🍽️";

  // Over target
  if (calPct > 1.05) {
    const dinnerPending = meals.find(m => m.type === 'dinner' && (m.status === 'pending' || m.status === 'current'));
    if (dinnerPending) return "Over target — keep dinner light tonight 🧘";
    return "You've gone over target — stay mindful 🧘";
  }

  // Almost at target
  if (calPct > 0.9 && calPct <= 1.05) return "Almost at your target — great job! 🎯";

  // Current meal prompt
  const currentMeal = meals.find(m => m.status === 'current');
  if (currentMeal && currentMeal.loggedCalories === 0) {
    return `Time for ${currentMeal.label.toLowerCase()}! 🍽️`;
  }

  // Mid-day on track
  if (calPct > 0.5) return "You're on track today! Keep going 💚";

  return "Keep logging to stay on track 📋";
}

/** Dispatch global event for QuickLog and other listeners */
export function notifyWidgetUpdate(): void {
  window.dispatchEvent(new Event('nutrilens:update'));
}

/** Get/set last used logging mode */
const LAST_MODE_KEY = 'nutrilens_last_log_mode';
export function getLastLogMode(): string {
  return scopedGet(LAST_MODE_KEY) || 'manual';
}
export function setLastLogMode(mode: string): void {
  scopedSet(LAST_MODE_KEY, mode);
}

/** Track quicklog visits for smart PWA hint */
const QUICKLOG_VISITS_KEY = 'nutrilens_quicklog_visits';
export function trackQuickLogVisit(): number {
  const count = parseInt(scopedGet(QUICKLOG_VISITS_KEY) || '0', 10) + 1;
  scopedSet(QUICKLOG_VISITS_KEY, count.toString());
  return count;
}
export function getQuickLogVisits(): number {
  return parseInt(scopedGet(QUICKLOG_VISITS_KEY) || '0', 10);
}
