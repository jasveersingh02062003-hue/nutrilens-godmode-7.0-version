// Weekly Feedback Engine — behavior correction loop
import { getRecentLogs, getDailyTotals, getProfile, type DailyLog } from './store';
import { getExpensesForRange, getBudgetSettings, getWeekDateRange, saveBudgetSettings } from './expense-store';
import { getWeightEntries } from './weight-history';
import { getMealPlannerProfile, saveMealPlannerProfile } from './meal-planner-store';
import { getNotificationSettings, saveNotificationSettings, sendNotification } from './notifications';

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  adherenceScore: number;
  mealsLogged: number;
  mealsPlanned: number;
  proteinConsumed: number;
  proteinTarget: number;
  spent: number;
  budget: number;
  weightChange: number | null;
  insight: string;
  dominantMetric: 'protein' | 'budget' | 'meals' | 'weight';
  autoFixApplied: boolean;
}

const SUMMARIES_KEY = 'nutrilens_weekly_summaries';

export function getWeeklySummaries(): WeeklySummary[] {
  const data = scopedGet(SUMMARIES_KEY);
  return data ? JSON.parse(data) : [];
}

function saveSummaries(summaries: WeeklySummary[]) {
  scopedSet(SUMMARIES_KEY, JSON.stringify(summaries));
}

export function saveWeeklySummary(summary: WeeklySummary) {
  const all = getWeeklySummaries();
  const idx = all.findIndex(s => s.weekStart === summary.weekStart);
  if (idx >= 0) all[idx] = summary;
  else all.unshift(summary);
  // Keep last 12 weeks
  saveSummaries(all.slice(0, 12));
}

function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 6);
  return {
    start: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
    end,
  };
}

function getLogsForRange(start: string, end: string): DailyLog[] {
  const logs: DailyLog[] = [];
  const d = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (d <= endD) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const { getDailyLog } = require('./store');
    logs.push(getDailyLog(key));
    d.setDate(d.getDate() + 1);
  }
  return logs;
}

export function generateWeeklySummary(): WeeklySummary {
  const { start, end } = getCurrentWeekRange();
  const profile = getProfile();
  const plannerProfile = getMealPlannerProfile();
  const budgetSettings = getBudgetSettings();

  // Aggregate 7 days
  const logs: DailyLog[] = [];
  const d = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (d <= endD) {
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    // Use dynamic import to avoid issues
    const data = scopedGet(`nutrilens_log_${key}`);
    if (data) {
      const parsed = JSON.parse(data);
      logs.push(parsed);
    } else {
      logs.push({ date: key, meals: [], supplements: [], waterCups: 0, caloriesBurned: 0, burned: { steps: 0, stepsCount: 0, activities: [], total: 0 } } as any);
    }
    d.setDate(d.getDate() + 1);
  }

  // Meals
  let mealsLogged = 0;
  let proteinConsumed = 0;
  for (const log of logs) {
    const meals = log.meals || [];
    mealsLogged += meals.length;
    for (const m of meals) {
      proteinConsumed += m.totalProtein || 0;
    }
    for (const s of (log.supplements || [])) {
      proteinConsumed += (s as any).protein || 0;
    }
  }

  const mealsPerDay = plannerProfile?.mealsPerDay || 3;
  const mealsPlanned = mealsPerDay * 7;

  const dailyProtein = profile?.dailyProtein || plannerProfile?.dailyProtein || 80;
  const proteinTarget = dailyProtein * 7;

  // Budget
  const expenses = getExpensesForRange(start, end);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const budget = budgetSettings.weeklyBudget || budgetSettings.monthlyBudget / 4;

  // Weight
  const weightEntries = getWeightEntries();
  const weekWeights = weightEntries.filter(w => w.date >= start && w.date <= end);
  let weightChange: number | null = null;
  if (weekWeights.length >= 2) {
    weightChange = Number((weekWeights[weekWeights.length - 1].weight - weekWeights[0].weight).toFixed(1));
  }

  // Adherence components
  const mealAdherence = Math.min(100, mealsPlanned > 0 ? (mealsLogged / mealsPlanned) * 100 : 100);
  const proteinAdherence = Math.min(100, proteinTarget > 0 ? (proteinConsumed / proteinTarget) * 100 : 100);
  const budgetAdherence = budget > 0 ? Math.min(100, ((budget - Math.max(0, spent - budget)) / budget) * 100) : 100;
  
  let weightProgress = 50; // neutral
  if (weightChange !== null && profile) {
    const goalType = profile.goal;
    if (goalType === 'lose' && weightChange < 0) weightProgress = 100;
    else if (goalType === 'lose' && weightChange > 0) weightProgress = 0;
    else if (goalType === 'gain' && weightChange > 0) weightProgress = 100;
    else if (goalType === 'gain' && weightChange < 0) weightProgress = 0;
    else if (goalType === 'maintain' && Math.abs(weightChange) < 0.3) weightProgress = 100;
    else weightProgress = 50;
  }

  const adherenceScore = Math.round(
    mealAdherence * 0.3 + proteinAdherence * 0.3 + budgetAdherence * 0.3 + weightProgress * 0.1
  );

  // Dominant metric (worst performing)
  const metrics: { key: WeeklySummary['dominantMetric']; score: number }[] = [
    { key: 'meals', score: mealAdherence },
    { key: 'protein', score: proteinAdherence },
    { key: 'budget', score: budgetAdherence },
  ];
  if (weightChange !== null) {
    metrics.push({ key: 'weight', score: weightProgress });
  }
  metrics.sort((a, b) => a.score - b.score);
  const dominantMetric = metrics[0].key;

  const insight = getInsight(dominantMetric, {
    proteinConsumed, proteinTarget, spent, budget, mealsLogged, mealsPlanned, weightChange,
    goalType: profile?.goal || 'maintain',
  });

  const summary: WeeklySummary = {
    weekStart: start,
    weekEnd: end,
    adherenceScore,
    mealsLogged,
    mealsPlanned,
    proteinConsumed: Math.round(proteinConsumed),
    proteinTarget: Math.round(proteinTarget),
    spent: Math.round(spent),
    budget: Math.round(budget),
    weightChange,
    insight,
    dominantMetric,
    autoFixApplied: false,
  };

  saveWeeklySummary(summary);
  return summary;
}

function getInsight(
  metric: WeeklySummary['dominantMetric'],
  data: { proteinConsumed: number; proteinTarget: number; spent: number; budget: number; mealsLogged: number; mealsPlanned: number; weightChange: number | null; goalType: string }
): string {
  switch (metric) {
    case 'protein': {
      const deficit = Math.round(data.proteinTarget - data.proteinConsumed);
      if (deficit > 0) return `You missed your protein target by ${deficit}g this week. Add ${Math.ceil(deficit / 7)}g/day next week.`;
      return `Great protein intake! You hit ${Math.round((data.proteinConsumed / data.proteinTarget) * 100)}% of your target.`;
    }
    case 'budget': {
      const overshoot = Math.round(data.spent - data.budget);
      if (overshoot > 0) return `You overspent ₹${overshoot} this week. Try switching to higher-PES foods.`;
      return `Budget on track! You saved ₹${Math.abs(overshoot)} this week.`;
    }
    case 'meals': {
      const skipPct = Math.round(((data.mealsPlanned - data.mealsLogged) / data.mealsPlanned) * 100);
      if (skipPct > 0) return `You skipped logging ${skipPct}% of meals. Consistency is key — log every meal.`;
      return `Perfect logging! All ${data.mealsPlanned} meals tracked.`;
    }
    case 'weight': {
      if (data.weightChange === null) return 'No weight data this week. Weigh in to track progress.';
      if (data.goalType === 'lose' && data.weightChange > 0) return `You gained ${data.weightChange}kg this week. Review your calorie intake.`;
      if (data.goalType === 'gain' && data.weightChange < 0) return `You lost ${Math.abs(data.weightChange)}kg. Increase calories to support your goal.`;
      return `Weight change: ${data.weightChange > 0 ? '+' : ''}${data.weightChange}kg. Staying on track.`;
    }
  }
}

export function autoFixNextWeek(summary: WeeklySummary): { changes: string[]; applied: boolean } {
  const changes: string[] = [];
  const profile = getProfile();
  const plannerProfile = getMealPlannerProfile();
  let profileChanged = false;

  switch (summary.dominantMetric) {
    case 'protein': {
      const deficit = summary.proteinTarget - summary.proteinConsumed;
      if (deficit > 0 && plannerProfile) {
        const increase = Math.ceil(deficit / 7);
        plannerProfile.dailyProtein = Math.round(plannerProfile.dailyProtein + increase);
        saveMealPlannerProfile(plannerProfile);
        changes.push(`Protein target increased to ${plannerProfile.dailyProtein}g/day`);
      }
      if (deficit > 0 && profile) {
        profile.dailyProtein = profile.dailyProtein + Math.ceil(deficit / 7);
        profileChanged = true;
        changes.push(`Daily protein goal updated to ${profile.dailyProtein}g`);
      }
      break;
    }
    case 'budget': {
      const overshoot = summary.spent - summary.budget;
      if (overshoot > 0) {
        const bs = getBudgetSettings();
        const newWeekly = Math.max(350, bs.weeklyBudget - overshoot);
        bs.weeklyBudget = newWeekly;
        bs.monthlyBudget = newWeekly * 4;
        saveBudgetSettings(bs);
        changes.push(`Weekly budget adjusted to ₹${newWeekly}`);
      }
      break;
    }
    case 'meals': {
      const settings = getNotificationSettings();
      if (!settings.mealReminders) {
        settings.mealReminders = true;
        saveNotificationSettings(settings);
        changes.push('Meal reminders turned on');
      } else {
        changes.push('Keep logging — consistency builds habits');
      }
      break;
    }
    case 'weight': {
      if (profile && summary.weightChange !== null) {
        profile.dailyCalories = Math.round(profile.dailyCalories * 0.95);
        profileChanged = true;
        changes.push(`Calories reduced to ${profile.dailyCalories} kcal/day`);
      }
      break;
    }
  }

  // Save profile properly via store
  if (profileChanged && profile) {
    const { saveProfile } = require('./store');
    saveProfile(profile);
  }

  // Regenerate meal plan with updated targets
  if (changes.length > 0 && plannerProfile) {
    try {
      const { generateWeekPlan } = require('./meal-plan-generator');
      const { saveWeekPlan } = require('./meal-planner-store');
      const newPlan = generateWeekPlan(plannerProfile, profile?.healthConditions, profile?.womenHealth);
      saveWeekPlan(newPlan);
      changes.push('Meal plan regenerated for next week');
    } catch (e) {
      // Plan generation is best-effort
    }
  }

  // Mark as applied
  summary.autoFixApplied = true;
  saveWeeklySummary(summary);

  return { changes, applied: changes.length > 0 };
}

export function shouldGenerateSummary(): boolean {
  const { start } = getCurrentWeekRange();
  const summaries = getWeeklySummaries();
  const exists = summaries.some(s => s.weekStart === start);
  return !exists;
}

export function scheduleWeeklyNotification(summary?: WeeklySummary) {
  if (!summary) {
    const summaries = getWeeklySummaries();
    if (summaries.length === 0) return;
    summary = summaries[0];
  }
  const now = new Date();
  if (now.getDay() === 0 && now.getHours() >= 19) {
    sendNotification(
      '📊 Your weekly progress is ready',
      summary.insight,
      { tag: 'weekly-feedback' }
    );
  }
}

export function getLatestSummary(): WeeklySummary | null {
  const all = getWeeklySummaries();
  return all.length > 0 ? all[0] : null;
}
