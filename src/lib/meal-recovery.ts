import { WeekPlan, DayPlan, getWeekPlan, getCurrentWeekStart } from './meal-planner-store';
import { recipes } from './recipes';
import { toLocalDateStr } from './date-utils';
import { recipes } from './recipes';

// ─── Yesterday Actuals ───

interface DayActuals {
  totalCalories: number;
  totalProtein: number;
  mealsLogged: number;
  mealsPlanned: number;
}

/**
 * Get yesterday's actual vs planned from the current week plan.
 */
export function getYesterdayActuals(): { planned: DayActuals; actual: DayActuals } | null {
  const weekStart = getCurrentWeekStart();
  const plan = getWeekPlan(weekStart);
  if (!plan) return null;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = toLocalDateStr(yesterday);

  const dayPlan = plan.days.find(d => d.date === yStr);
  if (!dayPlan) return null;

  let plannedCal = 0, plannedProt = 0;
  let actualCal = 0, actualProt = 0;
  let mealsLogged = 0;

  for (const meal of dayPlan.meals) {
    const recipe = recipes.find(r => r.id === meal.recipeId);
    if (recipe) {
      plannedCal += recipe.calories;
      plannedProt += recipe.protein;
    }
    if (meal.logged && recipe) {
      actualCal += recipe.calories;
      actualProt += recipe.protein;
      mealsLogged++;
    }
  }

  return {
    planned: { totalCalories: plannedCal, totalProtein: plannedProt, mealsLogged: dayPlan.meals.length, mealsPlanned: dayPlan.meals.length },
    actual: { totalCalories: actualCal, totalProtein: actualProt, mealsLogged, mealsPlanned: dayPlan.meals.length },
  };
}

// ─── Recovery Adjustment ───

export interface RecoveryAdjustment {
  boostProtein: boolean;
  extraProteinG: number;
  reduceCal: boolean;
  reductionCal: number;
  reason: string;
}

/**
 * Calculate next-day recovery adjustment based on yesterday's performance.
 */
export function calculateRecoveryAdjustment(
  dailyTargetCal: number,
  dailyTargetProtein: number
): RecoveryAdjustment | null {
  const data = getYesterdayActuals();
  if (!data) return null;

  const { planned, actual } = data;
  const adjustment: RecoveryAdjustment = {
    boostProtein: false, extraProteinG: 0,
    reduceCal: false, reductionCal: 0,
    reason: '',
  };

  // If no meals were logged, assume user skipped the day
  if (actual.mealsLogged === 0) return null;

  // Protein shortfall: if actual < planned - 15g
  const proteinShortfall = planned.totalProtein - actual.totalProtein;
  if (proteinShortfall > 15) {
    adjustment.boostProtein = true;
    adjustment.extraProteinG = Math.min(proteinShortfall, 30); // cap at 30g boost
    adjustment.reason = `Yesterday's protein was ${Math.round(proteinShortfall)}g short — today's meals have extra protein`;
  }

  // Calorie overshoot: if actual > planned + 200
  const calorieOvershoot = actual.totalCalories - planned.totalCalories;
  if (calorieOvershoot > 200) {
    const maxReduction = Math.round(dailyTargetCal * 0.15);
    adjustment.reduceCal = true;
    adjustment.reductionCal = Math.min(Math.round(calorieOvershoot * 0.5), maxReduction);
    adjustment.reason = adjustment.reason
      ? adjustment.reason + ` · Also reducing ${adjustment.reductionCal} kcal to compensate for yesterday's overshoot`
      : `Reducing ${adjustment.reductionCal} kcal today to balance yesterday's extra intake`;
  }

  if (!adjustment.boostProtein && !adjustment.reduceCal) return null;
  return adjustment;
}

/**
 * Apply recovery adjustments to today's macro targets.
 * Returns adjusted targets for the meal generator to use.
 */
export function getRecoveredTargets(
  baseCal: number,
  baseProtein: number
): { adjustedCal: number; adjustedProtein: number; recovery: RecoveryAdjustment | null } {
  const recovery = calculateRecoveryAdjustment(baseCal, baseProtein);
  if (!recovery) return { adjustedCal: baseCal, adjustedProtein: baseProtein, recovery: null };

  const adjustedCal = recovery.reduceCal ? baseCal - recovery.reductionCal : baseCal;
  const adjustedProtein = recovery.boostProtein ? baseProtein + recovery.extraProteinG : baseProtein;

  return { adjustedCal, adjustedProtein, recovery };
}
