import { scopedGet, scopedSet } from './scoped-storage';
import {
  addMealToLog, addMealToLogForDate, addActivity, addActivityForDate,
  addWater, addWaterForDate, getDailyLog, getDailyTotals, getProfile,
  getRecentLogs, getWeightHistory, getAllLogDates,
  type MealEntry, type FoodItem, type ActivityEntry, type DailyLog
} from '@/lib/store';
import { validateFoodItem, validateMealTotals } from '@/lib/food-validation';
import { calculateBurnBreakdown } from '@/lib/burn-service';
import { getWeatherSummary } from '@/lib/weather-service';
import { getDashboardWeatherNudge } from '@/lib/weather-nudge-service';
import { ACTIVITY_TYPES, calculateCalories, getMetForIntensity } from '@/lib/activities';
import { getWeightEntries } from '@/lib/weight-history';
import { getStreaks } from '@/lib/streaks';
import { getUnlockedBadges, computeAchievementStats } from '@/lib/achievements';
import { getBudgetSettings } from '@/lib/expense-store';
import { evaluateFood, compareFoods, bestUnderPrice, findFoodByName, dailyEfficiency } from '@/lib/pes-engine';
import { buildConditionGuidance, getUserConditions } from '@/lib/condition-coach';

// ─── Action types that Monica can propose ───

export interface MealAction {
  type: 'log_meal';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
    unit: string;
    emoji?: string;
  }>;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  cost?: number;
  date?: string; // defaults to today
}

export interface ActivityAction {
  type: 'log_activity';
  activity: string;
  duration: number;
  intensity: 'light' | 'moderate' | 'intense';
  caloriesBurned: number;
  date?: string;
}

export interface WaterAction {
  type: 'log_water';
  cups: number;
  date?: string;
}

export interface ReportAction {
  type: 'generate_report';
  startDate: string;
  endDate: string;
}

export interface SponsorSuggestionAction {
  type: 'sponsor_suggestion';
  campaignId: string;
  creativeId: string;
  brandName: string;
  productName: string;
  ctaText: string;
  ctaUrl?: string;
  pesScore: number;
}

export type MonikaAction = MealAction | ActivityAction | WaterAction | ReportAction | SponsorSuggestionAction;

// ─── Parse actions from Monica's streamed text ───

const ACTION_REGEX = /```action\n([\s\S]*?)```/g;

export function parseActions(text: string): { cleanText: string; actions: MonikaAction[] } {
  const actions: MonikaAction[] = [];
  const cleanText = text.replace(ACTION_REGEX, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (parsed?.type) actions.push(parsed as MonikaAction);
    } catch { /* ignore malformed */ }
    return '';
  }).trim();

  return { cleanText, actions };
}

// ─── Execute a confirmed action ───

export function executeAction(action: MonikaAction): string {
  const profile = getProfile();

  switch (action.type) {
    case 'log_meal': {
      // Validate each item before logging
      const allWarnings: string[] = [];
      for (const item of action.items) {
        const itemWarnings = validateFoodItem(
          item.name,
          item.calories * item.quantity,
          item.carbs * item.quantity,
          item.protein * item.quantity,
          item.fat * item.quantity,
          undefined,
          item.quantity,
          item.unit,
        );
        for (const w of itemWarnings) {
          allWarnings.push(`⚠️ ${item.name}: ${w.message}`);
        }
      }

      // Validate meal totals
      const mealWarnings = validateMealTotals(
        action.totalCalories, action.totalProtein, action.totalCarbs, action.totalFat,
      );
      for (const w of mealWarnings) {
        allWarnings.push(`⚠️ ${w.message}`);
      }

      // If any errors (not just warnings), block the log
      const hasErrors = action.items.some(item => {
        const ws = validateFoodItem(
          item.name, item.calories * item.quantity, item.carbs * item.quantity,
          item.protein * item.quantity, item.fat * item.quantity,
          undefined, item.quantity, item.unit,
        );
        return ws.some(w => w.severity === 'error');
      });

      if (hasErrors) {
        return `❌ Meal NOT logged — validation errors:\n${allWarnings.join('\n')}\nPlease correct the values and try again.`;
      }

      const meal: MealEntry = {
        id: crypto.randomUUID(),
        type: action.mealType,
        items: action.items.map(item => ({
          ...item,
          id: crypto.randomUUID(),
          fiber: 0,
        })),
        totalCalories: action.totalCalories,
        totalProtein: action.totalProtein,
        totalCarbs: action.totalCarbs,
        totalFat: action.totalFat,
        time: new Date().toISOString(),
        source: (action as any).source || undefined,
        cost: action.cost ? { amount: action.cost, currency: '₹' } : undefined,
      };

      if (action.date) {
        addMealToLogForDate(action.date, meal);
      } else {
        addMealToLog(meal);
      }

      const warningText = allWarnings.length > 0 ? `\n${allWarnings.join('\n')}` : '';
      return `✅ ${action.mealType.charAt(0).toUpperCase() + action.mealType.slice(1)} logged: ${action.totalCalories} kcal | ${action.totalProtein}g protein | ${action.totalCarbs}g carbs | ${action.totalFat}g fat${warningText}`;
    }

    case 'log_activity': {
      const activityType = ACTIVITY_TYPES.find(a =>
        a.name.toLowerCase().includes(action.activity.toLowerCase()) ||
        action.activity.toLowerCase().includes(a.name.toLowerCase())
      ) || ACTIVITY_TYPES.find(a => a.id === 'other')!;

      // Duplicate detection: check if same activity type logged within 15 minutes
      const log = getDailyLog(action.date);
      const now = Date.now();
      const recentDuplicate = (log.burned?.activities || []).find((a: ActivityEntry) => {
        const isSameType = a.type.toLowerCase() === activityType.name.toLowerCase();
        const timeDiff = Math.abs(now - new Date(a.time).getTime());
        const within15Min = timeDiff < 15 * 60 * 1000;
        return isSameType && within15Min;
      });

      if (recentDuplicate) {
        return `⚠️ You already logged ${activityType.name} ${Math.round((now - new Date(recentDuplicate.time).getTime()) / 60000)} minutes ago (${recentDuplicate.calories} kcal). Are you sure you want to add another? Say "yes, log it" to confirm.`;
      }

      const met = getMetForIntensity(activityType, action.intensity);
      const weightKg = profile?.weightKg || 70;
      const calories = action.caloriesBurned || calculateCalories(met, weightKg, action.duration);

      const entry: ActivityEntry = {
        id: crypto.randomUUID(),
        type: activityType.name,
        duration: action.duration,
        intensity: action.intensity,
        calories,
        met,
        source: 'manual',
        time: new Date().toISOString(),
      };

      if (action.date) {
        addActivityForDate(action.date, entry);
      } else {
        addActivity(entry);
      }

      return `✅ ${activityType.name} (${action.intensity}, ${action.duration} min) logged: ${calories} kcal burned`;
    }

    case 'log_water': {
      const cups = action.cups || 1;
      for (let i = 0; i < cups; i++) {
        if (action.date) addWaterForDate(action.date);
        else addWater();
      }
      return `✅ Added ${cups} cup${cups > 1 ? 's' : ''} of water`;
    }

    case 'generate_report': {
      return '__REPORT__'; // Handled specially in chat screen
    }

    case 'sponsor_suggestion': {
      return '__SPONSOR__'; // Handled specially in chat screen — tracked via ad event
    }

    default:
      return '⚠️ Unknown action';
  }
}

// ─── Build rich context for Monica ───

function formatLogForContext(l: DailyLog) {
  const t = getDailyTotals(l);
  return {
    date: l.date,
    calories: t.eaten, protein: t.protein, carbs: t.carbs, fat: t.fat, burned: t.burned,
    meals: l.meals.map(m => ({
      type: m.type,
      items: m.items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', '),
      calories: m.totalCalories, protein: m.totalProtein, carbs: m.totalCarbs, fat: m.totalFat,
    })),
    supplements: (l.supplements || []).map(s => `${s.name} ${s.dosage}${s.unit}`),
    waterCups: l.waterCups,
    activities: l.burned?.activities?.map(a => `${a.type} ${a.duration}min ${a.calories}kcal ${a.intensity}`) || [],
    weight: l.weight ?? null,
    journal: l.journal || null,
  };
}

export function buildMonikaContext() {
  const profile = getProfile();
  const log = getDailyLog();
  const recentLogs = getRecentLogs(30);
  const weightEntries = getWeightEntries();
  let streaks: any = null;
  try { streaks = getStreaks(); } catch { /* ok */ }
  let badges: string[] = [];
  try { badges = getUnlockedBadges(); } catch { /* ok */ }
  let stats: any = null;
  try { stats = computeAchievementStats(); } catch { /* ok */ }

  // Build 30-day history (compact)
  const history = recentLogs.map(formatLogForContext);

  // Weight trend (last 30 entries)
  const weightHistory = weightEntries.slice(-30).map((e: any) => ({
    date: e.date, weight: e.weight, unit: e.unit,
  }));

  // Weather context
  const weatherSummary = getWeatherSummary();
  const weatherNudge = getDashboardWeatherNudge();

  // Budget context
  const budgetSettings = getBudgetSettings();
  const todayMeals = log.meals || [];
  const todaySpending = todayMeals.reduce((sum: number, m: any) => {
    const cost = m.cost || m.items?.reduce((s: number, i: any) => s + (i.cost || 0), 0) || 0;
    return sum + cost;
  }, 0);

  // Skin concerns from onboarding data
  let skinConcerns: string | null = null;
  try {
    const onboardingData = scopedGet('nutrilens_user');
    if (onboardingData) {
      const parsed = JSON.parse(onboardingData);
      skinConcerns = parsed?.health?.skin || null;
    }
  } catch { /* ok */ }

  // Supplement data from today's log
  const todaySupplements = log.supplements || [];

  // Liked/disliked foods from learning data
  let foodPreferences: any = null;
  try {
    const learning = scopedGet('nutrilens_learning');
    if (learning) {
      const parsed = JSON.parse(learning);
      foodPreferences = {
        liked: parsed?.likedFoods || [],
        disliked: parsed?.dislikedFoods || [],
        frequent: parsed?.frequentFoods || [],
      };
    }
  } catch { /* ok */ }

  // Real-time calorie engine calculations
  const totals = getDailyTotals(log);
  const burnBreakdown = calculateBurnBreakdown(log.burned || { steps: 0, stepsCount: 0, total: 0, activities: [] });
  const effectiveBurn = burnBreakdown.effectiveBurn;
  const baseTarget = profile?.dailyCalories || 0;
  const dailyBudget = Math.round((budgetSettings.weeklyBudget || 0) / 7);

  return {
    currentHour: new Date().getHours(),
    profile: profile ? {
      name: profile.name, age: profile.age, gender: profile.gender,
      occupation: profile.occupation, jobType: profile.jobType,
      workActivity: profile.workActivity, exerciseRoutine: profile.exerciseRoutine,
      sleepHours: profile.sleepHours, stressLevel: profile.stressLevel,
      cookingHabits: profile.cookingHabits, eatingOut: profile.eatingOut,
      caffeine: profile.caffeine, alcohol: profile.alcohol,
      goal: profile.goal, targetWeight: profile.targetWeight, goalSpeed: profile.goalSpeed,
      dailyCalories: profile.dailyCalories, dailyProtein: profile.dailyProtein,
      dailyCarbs: profile.dailyCarbs, dailyFat: profile.dailyFat,
      bmi: profile.bmi, bmr: profile.bmr, tdee: profile.tdee,
      weightKg: profile.weightKg, heightCm: profile.heightCm,
      dietaryPrefs: profile.dietaryPrefs, healthConditions: profile.healthConditions,
      womenHealth: profile.womenHealth, menHealth: profile.menHealth,
      medications: profile.medications, activityLevel: profile.activityLevel,
      waterGoal: profile.waterGoal,
      mealTimes: profile.mealTimes,
      skinConcerns,
    } : null,
    realTimeStatus: {
      baseTarget,
      totalConsumed: totals.eaten,
      totalBurned: effectiveBurn,
      totalAllowed: baseTarget + effectiveBurn,
      remainingCalories: baseTarget + effectiveBurn - totals.eaten,
      totalProteinConsumed: totals.protein,
      remainingProtein: (profile?.dailyProtein || 0) - totals.protein,
      dailyBudget,
      totalSpent: todaySpending,
      remainingBudget: dailyBudget - todaySpending,
      mealsLogged: ['breakfast', 'lunch', 'dinner', 'snack'].map(type => ({
        type,
        logged: (log.meals || []).some((m: any) => m.type === type),
        calories: (log.meals || []).filter((m: any) => m.type === type).reduce((s: number, m: any) => s + (m.totalCalories || 0), 0),
      })),
    },
    today: formatLogForContext(log),
    todaySupplements: todaySupplements.map((s: any) => ({
      name: s.name, dosage: s.dosage, unit: s.unit, taken: s.taken,
    })),
    budgetSettings: {
      dailyBudget,
      weeklyBudget: budgetSettings.weeklyBudget,
      monthlyBudget: budgetSettings.monthlyBudget,
      currency: budgetSettings.currency,
    },
    todaySpending,
    foodPreferences,
    history,
    weightHistory,
    streaks,
    achievements: { unlocked: badges, stats },
    allLoggedDates: getAllLogDates(),
    weather: {
      current: weatherSummary,
      nudge: weatherNudge ? weatherNudge.message : null,
    },
    pesEngine: {
      dailyEfficiency: dailyEfficiency(),
      capabilities: [
        'Compare foods: "compare eggs vs paneer"',
        'Best under price: "best protein under ₹50"',
        'Evaluate food: "how good is chicken curry"',
        'Market prices: "what\'s cheapest protein today?"',
        'City prices: "egg price in hyderabad"',
      ],
    },
    marketIntelligence: (() => {
      try {
        const { foodDatabase } = require('./pes-engine');
        const topItems = [...foodDatabase]
          .filter((f: any) => f.protein > 0 && f.price > 0)
          .sort((a: any, b: any) => b.proteinPerRupee - a.proteinPerRupee)
          .slice(0, 5)
          .map((f: any) => ({
            name: f.name,
            price: f.price,
            protein: f.protein,
            proteinPerRupee: f.proteinPerRupee,
          }));
        const userCity = (profile as any)?.city || null;
        return {
          city: userCity,
          topProteinValues: topItems,
          tip: topItems.length > 0
            ? `Best protein value today: ${topItems[0].name} at ₹${topItems[0].price} for ${topItems[0].protein}g protein (₹${topItems[0].proteinPerRupee.toFixed(2)}/g)`
            : null,
        };
      } catch { return null; }
    })(),
  };
}

// ─── Report generation ───

export function generateReportHTML(startDate: string, endDate: string): string {
  const profile = getProfile();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: DailyLog[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push(getDailyLog(key));
  }

  const weightEntries = getWeightEntries().filter((e: any) => e.date >= startDate && e.date <= endDate);
  const totalDays = days.length;
  const daysWithMeals = days.filter(d => d.meals.length > 0).length;

  let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0, totalWater = 0;
  days.forEach(d => {
    const t = getDailyTotals(d);
    totalCal += t.eaten; totalProt += t.protein; totalCarbs += t.carbs; totalFat += t.fat;
    totalWater += d.waterCups;
  });

  const avgCal = daysWithMeals ? Math.round(totalCal / daysWithMeals) : 0;
  const avgProt = daysWithMeals ? Math.round(totalProt / daysWithMeals) : 0;
  const avgCarbs = daysWithMeals ? Math.round(totalCarbs / daysWithMeals) : 0;
  const avgFat = daysWithMeals ? Math.round(totalFat / daysWithMeals) : 0;

  const mealRows = days.map(d => {
    const t = getDailyTotals(d);
    const mealList = d.meals.map(m =>
      `<span style="color:#666">${m.type}:</span> ${m.items.map(i => i.name).join(', ')} (${m.totalCalories} kcal)`
    ).join('<br/>');
    return `<tr>
      <td style="padding:6px;border-bottom:1px solid #eee;font-weight:600">${d.date}</td>
      <td style="padding:6px;border-bottom:1px solid #eee">${mealList || '<span style="color:#999">No meals logged</span>'}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${t.eaten}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${t.protein}g</td>
      <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${d.waterCups} 💧</td>
    </tr>`;
  }).join('');

  const weightRows = weightEntries.map((e: any) =>
    `<tr><td style="padding:4px">${e.date}</td><td style="padding:4px">${e.weight} ${e.unit}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', sans-serif; padding: 24px; max-width: 800px; margin: 0 auto; color: #333; }
  h1 { color: #2d8a5e; border-bottom: 3px solid #2d8a5e; padding-bottom: 8px; }
  h2 { color: #555; margin-top: 24px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .stat { background: #f0faf4; padding: 16px; border-radius: 12px; text-align: center; }
  .stat .num { font-size: 24px; font-weight: 700; color: #2d8a5e; }
  .stat .label { font-size: 12px; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #2d8a5e; color: white; padding: 8px; text-align: left; }
  .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; }
  .profile-grid div { padding: 4px 0; }
  .profile-grid strong { color: #555; }
</style></head><body>
  <h1>🥗 NutriLens Nutrition Report</h1>
  <p style="color:#888">${startDate} to ${endDate} • Generated ${new Date().toLocaleDateString()}</p>

  ${profile ? `<h2>👤 Profile</h2>
  <div class="profile-grid">
    <div><strong>Name:</strong> ${profile.name}</div>
    <div><strong>Age:</strong> ${profile.age}</div>
    <div><strong>Gender:</strong> ${profile.gender}</div>
    <div><strong>Goal:</strong> ${profile.goal}</div>
    <div><strong>Weight:</strong> ${profile.weightKg} kg</div>
    <div><strong>Target:</strong> ${profile.targetWeight} kg</div>
    <div><strong>BMI:</strong> ${profile.bmi?.toFixed(1)}</div>
    <div><strong>Daily Target:</strong> ${profile.dailyCalories} kcal</div>
    <div><strong>Health:</strong> ${(profile.healthConditions || []).join(', ') || 'None'}</div>
    <div><strong>Diet:</strong> ${(profile.dietaryPrefs || []).join(', ') || 'None'}</div>
  </div>` : ''}

  <h2>📊 Summary (${totalDays} days)</h2>
  <div class="stats">
    <div class="stat"><div class="num">${avgCal}</div><div class="label">Avg Calories</div></div>
    <div class="stat"><div class="num">${avgProt}g</div><div class="label">Avg Protein</div></div>
    <div class="stat"><div class="num">${avgCarbs}g</div><div class="label">Avg Carbs</div></div>
    <div class="stat"><div class="num">${avgFat}g</div><div class="label">Avg Fat</div></div>
  </div>
  <p><strong>Days logged:</strong> ${daysWithMeals}/${totalDays} • <strong>Total water:</strong> ${totalWater} cups</p>

  <h2>🍽️ Daily Breakdown</h2>
  <table>
    <thead><tr><th>Date</th><th>Meals</th><th>Calories</th><th>Protein</th><th>Water</th></tr></thead>
    <tbody>${mealRows}</tbody>
  </table>

  ${weightRows ? `<h2>⚖️ Weight Entries</h2>
  <table><thead><tr><th>Date</th><th>Weight</th></tr></thead><tbody>${weightRows}</tbody></table>` : ''}

  <p style="text-align:center;margin-top:32px;color:#aaa;font-size:11px">Generated by NutriLens AI</p>
</body></html>`;
}
