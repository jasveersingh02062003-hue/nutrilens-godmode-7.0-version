import { getProfile, getDailyLog, getDailyTotals, getTodayKey } from '@/lib/store';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealStatus = 'completed' | 'current' | 'pending' | 'missed';

export interface MealSlotData {
  type: MealSlot;
  emoji: string;
  label: string;
  timeHint: string;
  status: MealStatus;
  loggedCalories: number;
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

  if (loggedTypes.has(type)) return 'completed';
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
    const mealCals = log.meals
      .filter(m => m.type === type)
      .reduce((s, m) => s + m.items.reduce((a, i) => a + (i.calories || 0) * (i.quantity || 1), 0), 0);

    return {
      type,
      emoji: meta.emoji,
      label: meta.label,
      timeHint: meta.timeHint,
      status: getMealStatus(type, loggedTypes),
      loggedCalories: Math.round(mealCals),
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
  const pct = eaten / Math.max(1, targetCal);
  const currentMeal = meals.find(m => m.status === 'current');
  const proteinPct = protein / Math.max(1, targetProtein);

  if (eaten === 0 && hour < 11) return "Good morning! Ready to start logging? 🌞";
  if (currentMeal && currentMeal.status === 'current' && !meals.some(m => m.type === currentMeal.type && m.loggedCalories > 0)) {
    return `Time for ${currentMeal.label.toLowerCase()}! 🍽️`;
  }
  if (proteinPct < 0.3 && hour > 14) return "Low protein so far — add some! 💪";
  if (pct > 0.9 && pct <= 1.05) return "Almost at your target — great job! 🎯";
  if (pct > 1.05) return "You've gone over target — stay mindful 🧘";
  if (pct > 0.5) return "You're on track today! Keep going 💚";
  return "Keep logging to stay on track 📋";
}
