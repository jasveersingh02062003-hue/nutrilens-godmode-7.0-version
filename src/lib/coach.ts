// ============================================
// NutriLens AI – Enhanced Adaptive Daily Coach
// ============================================
// Priority-scored, action-driven, pattern-detecting,
// feedback-learning coaching engine.

import { DailyLog, UserProfile, getDailyTotals, getRecentLogs } from './store';
import { getStreaks } from './streaks';
import { getUserConditions as getUserConditionsImported } from './condition-coach';

// ── Types ──

export interface CoachAction {
  label: string;
  icon: string;
  route?: string;          // navigate to route
  addWater?: boolean;      // quick-add water
  logMeal?: string;        // open log with meal type
}

export interface CoachMessage {
  id: string;
  category: 'meal' | 'hydration' | 'activity' | 'progress' | 'streak' | 'pattern' | 'report';
  icon: string;
  title: string;
  body: string;
  priority: number;        // 0-100 score
  tone: 'encouraging' | 'neutral' | 'celebratory' | 'urgent';
  actions?: CoachAction[];
}

export interface ContextStats {
  sourceBreakdown: Record<string, { count: number; avgCal: number }>;
  companionStats: Record<string, { count: number; avgCal: number }>;
  moodStats: Record<string, number>;
}

export interface WeeklyReport {
  mealsLogged: number;
  mealsPossible: number;
  hydrationDaysMet: number;
  proteinDaysMet: number;
  nutritionStreak: number;
  highestCalDay: string;
  patterns: string[];
  recommendations: string[];
  contextStats: ContextStats | null;
}

export interface CoachFeedback {
  messageId: string;
  reaction: 'positive' | 'negative';
  timestamp: string;
}

export interface CoachSettings {
  enabled: boolean;
  mealFeedback: boolean;
  hydrationAlerts: boolean;
  activityReminders: boolean;
  progressSummaries: boolean;
  streakCelebrations: boolean;
  weeklyReports: boolean;
  quietStartHour: number;
  quietEndHour: number;
}

export interface CoachState {
  lastSent: Record<string, string>;
  dismissedToday: string[];
  lastDismissDate: string;
  feedback: CoachFeedback[];
  suppressedIds: string[];          // auto-suppressed after repeated negative feedback
  lastWeeklyReport: string | null;  // ISO date of last report
}

// ── Storage keys ──

const SETTINGS_KEY = 'nutrilens_coach_settings';
const STATE_KEY = 'nutrilens_coach_state';

const DEFAULT_SETTINGS: CoachSettings = {
  enabled: true,
  mealFeedback: true,
  hydrationAlerts: true,
  activityReminders: true,
  progressSummaries: true,
  streakCelebrations: true,
  weeklyReports: true,
  quietStartHour: 22,
  quietEndHour: 7,
};

// ── Persistence ──

export function getCoachSettings(): CoachSettings {
  const d = localStorage.getItem(SETTINGS_KEY);
  return d ? { ...DEFAULT_SETTINGS, ...JSON.parse(d) } : { ...DEFAULT_SETTINGS };
}

export function saveCoachSettings(s: CoachSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function getCoachState(): CoachState {
  const d = localStorage.getItem(STATE_KEY);
  const today = new Date().toISOString().split('T')[0];
  if (d) {
    const parsed: CoachState = JSON.parse(d);
    if (parsed.lastDismissDate !== today) {
      parsed.dismissedToday = [];
      parsed.lastDismissDate = today;
    }
    return { feedback: [], suppressedIds: [], lastWeeklyReport: null, ...parsed };
  }
  return { lastSent: {}, dismissedToday: [], lastDismissDate: today, feedback: [], suppressedIds: [], lastWeeklyReport: null };
}

function saveCoachState(s: CoachState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(s));
}

export function dismissCoachMessage(messageId: string) {
  const state = getCoachState();
  if (!state.dismissedToday.includes(messageId)) {
    state.dismissedToday.push(messageId);
  }
  saveCoachState(state);
}

// ── Feedback system ──

export function recordCoachFeedback(messageId: string, reaction: 'positive' | 'negative') {
  const state = getCoachState();
  state.feedback.push({ messageId, reaction, timestamp: new Date().toISOString() });
  // Auto-suppress after 3+ negatives for a message pattern
  const baseId = messageId.replace(/_breakfast|_lunch|_dinner|_snack/g, '');
  const negCount = state.feedback.filter(f => f.messageId.replace(/_breakfast|_lunch|_dinner|_snack/g, '') === baseId && f.reaction === 'negative').length;
  if (negCount >= 3 && !state.suppressedIds.includes(baseId)) {
    state.suppressedIds.push(baseId);
  }
  saveCoachState(state);
}

// ── Frequency & suppression checks ──

const BASE_FREQ_LIMITS: Record<string, number> = {
  meal: 30,
  hydration: 240,
  activity: 480,
  progress: 360,
  streak: 1440,
  pattern: 1440,
  report: 10080,  // weekly
};

function getAdaptiveFrequency(category: string, messageId: string): number {
  const base = BASE_FREQ_LIMITS[category] || 60;
  const state = getCoachState();
  const baseId = messageId.replace(/_breakfast|_lunch|_dinner|_snack/g, '');

  // Count recent feedback for this message pattern
  const recentFeedback = state.feedback.filter(f => {
    const fbBase = f.messageId.replace(/_breakfast|_lunch|_dinner|_snack/g, '');
    return fbBase === baseId;
  });

  const negCount = recentFeedback.filter(f => f.reaction === 'negative').length;
  const posCount = recentFeedback.filter(f => f.reaction === 'positive').length;

  // Positive feedback → show more often (reduce interval by up to 50%)
  // Negative feedback → show less often (increase interval by 2x per negative)
  let multiplier = 1;
  if (posCount > negCount) {
    multiplier = Math.max(0.5, 1 - (posCount - negCount) * 0.15);
  } else if (negCount > posCount) {
    multiplier = Math.min(4, 1 + (negCount - posCount) * 0.75);
  }

  return Math.round(base * multiplier);
}

function canSend(category: string, messageId: string): boolean {
  const state = getCoachState();
  if (state.dismissedToday.includes(messageId)) return false;
  const baseId = messageId.replace(/_breakfast|_lunch|_dinner|_snack/g, '');
  if (state.suppressedIds.includes(baseId)) return false;
  const last = state.lastSent[messageId];
  if (!last) return true;
  const elapsed = (Date.now() - new Date(last).getTime()) / 60000;
  return elapsed >= getAdaptiveFrequency(category, messageId);
}

function markSent(messageId: string) {
  const state = getCoachState();
  state.lastSent[messageId] = new Date().toISOString();
  saveCoachState(state);
}

function isQuietHours(): boolean {
  const settings = getCoachSettings();
  const h = new Date().getHours();
  if (settings.quietStartHour > settings.quietEndHour) {
    return h >= settings.quietStartHour || h < settings.quietEndHour;
  }
  return h >= settings.quietStartHour && h < settings.quietEndHour;
}

// ── Tone selector ──

function selectTone(priority: number, isPositive: boolean): CoachMessage['tone'] {
  if (isPositive) return 'celebratory';
  if (priority >= 70) return 'urgent';
  if (priority >= 40) return 'neutral';
  return 'encouraging';
}

// ── Pattern detection ──

function detectPatterns(logs: DailyLog[], profile: UserProfile): CoachMessage[] {
  const messages: CoachMessage[] = [];
  if (logs.length < 5) return messages;

  // Weekend overeating
  const weekendLogs = logs.filter(l => { const d = new Date(l.date).getDay(); return d === 0 || d === 6; });
  const weekdayLogs = logs.filter(l => { const d = new Date(l.date).getDay(); return d >= 1 && d <= 5; });
  if (weekendLogs.length >= 2 && weekdayLogs.length >= 3) {
    const wkendAvg = weekendLogs.reduce((s, l) => s + getDailyTotals(l).eaten, 0) / weekendLogs.length;
    const wkdayAvg = weekdayLogs.reduce((s, l) => s + getDailyTotals(l).eaten, 0) / weekdayLogs.length;
    if (wkendAvg > wkdayAvg * 1.2) {
      messages.push({
        id: 'pattern_weekend_overeating',
        category: 'pattern',
        icon: '📊',
        title: 'Weekend pattern detected',
        body: `You eat ~${Math.round(wkendAvg - wkdayAvg)} kcal more on weekends. Planning meals ahead could help.`,
        priority: 45,
        tone: 'neutral',
        actions: [{ label: 'Plan Weekend', icon: '📋', route: '/planner' }],
      });
    }
  }

  // Late-night eating
  const lateNightCount = logs.filter(l => l.meals.some(m => {
    const h = parseInt(m.time?.split(':')[0] || '0');
    return h >= 22 || h < 4;
  })).length;
  if (lateNightCount >= 3) {
    messages.push({
      id: 'pattern_late_night',
      category: 'pattern',
      icon: '🌙',
      title: 'Late-night eating trend',
      body: `You ate after 10 PM on ${lateNightCount} of the last ${logs.length} days. A protein-rich dinner might reduce late cravings.`,
      priority: 42,
      tone: 'neutral',
      actions: [{ label: 'Dinner Ideas', icon: '🍽️', route: '/planner' }],
    });
  }

  // Breakfast skipping
  const skippedBreakfast = logs.filter(l => l.meals.length > 0 && !l.meals.some(m => m.type === 'breakfast')).length;
  if (skippedBreakfast >= 4) {
    messages.push({
      id: 'pattern_skip_breakfast',
      category: 'pattern',
      icon: '🥣',
      title: 'Breakfast skipping habit',
      body: `You skipped breakfast ${skippedBreakfast} times recently. Overnight oats or a smoothie takes just 2 minutes.`,
      priority: 40,
      tone: 'encouraging',
      actions: [{ label: 'Breakfast Ideas', icon: '🌅', route: '/planner' }],
    });
  }

  // High-carb dinners
  const highCarbDinners = logs.filter(l => {
    const dinner = l.meals.find(m => m.type === 'dinner');
    return dinner && dinner.totalCarbs > 60 && dinner.totalProtein < 20;
  }).length;
  if (highCarbDinners >= 3) {
    messages.push({
      id: 'pattern_high_carb_dinner',
      category: 'pattern',
      icon: '🍚',
      title: 'High-carb dinner pattern',
      body: `Your dinners tend to be carb-heavy. Adding protein (paneer, dal, chicken) could improve satiety.`,
      priority: 38,
      tone: 'neutral',
      actions: [{ label: 'High-Protein Ideas', icon: '🥗', route: '/planner' }],
    });
  }

  return messages;
}

// ── Weekly report generator ──

export function generateWeeklyReport(profile: UserProfile): WeeklyReport | null {
  const logs = getRecentLogs(7);
  const logsWithMeals = logs.filter(l => l.meals.length > 0);

  if (logsWithMeals.length < 3) return null;

  const mealsLogged = logs.reduce((s, l) => s + l.meals.length, 0);
  const hydrationDaysMet = logs.filter(l => l.waterCups >= profile.waterGoal).length;
  const proteinDaysMet = logs.filter(l => getDailyTotals(l).protein >= profile.dailyProtein * 0.8).length;

  let highestCalDay = '';
  let highestCal = 0;
  for (const l of logs) {
    const t = getDailyTotals(l);
    if (t.eaten > highestCal) { highestCal = t.eaten; highestCalDay = l.date; }
  }
  const dayName = highestCalDay ? new Date(highestCalDay + 'T12:00:00').toLocaleDateString('en', { weekday: 'long' }) : '';

  const streaks = getStreaks();
  const patterns: string[] = [];
  const recommendations: string[] = [];

  // Detect patterns for report
  const weekendLogs = logs.filter(l => { const d = new Date(l.date).getDay(); return d === 0 || d === 6; });
  const weekdayLogs = logs.filter(l => { const d = new Date(l.date).getDay(); return d >= 1 && d <= 5; });
  if (weekendLogs.length >= 1 && weekdayLogs.length >= 2) {
    const wkendAvg = weekendLogs.reduce((s, l) => s + getDailyTotals(l).eaten, 0) / weekendLogs.length;
    const wkdayAvg = weekdayLogs.reduce((s, l) => s + getDailyTotals(l).eaten, 0) / weekdayLogs.length;
    if (wkendAvg > wkdayAvg * 1.15) {
      patterns.push(`Your highest calorie day was ${dayName}`);
      recommendations.push('Plan a lighter weekend lunch');
    }
  }

  const skippedBreakfast = logs.filter(l => l.meals.length > 0 && !l.meals.some(m => m.type === 'breakfast')).length;
  if (skippedBreakfast >= 3) {
    patterns.push(`You skipped breakfast ${skippedBreakfast} times`);
    recommendations.push('Prep overnight oats on Sunday night');
  }

  if (proteinDaysMet < 4) {
    patterns.push(`You hit protein goal only ${proteinDaysMet}/7 days`);
    recommendations.push('Aim for protein at every meal');
  }

  if (hydrationDaysMet < 5) {
    recommendations.push('Set more frequent water reminders');
  }

  // Condition-specific weekly insights
  const conditions: string[] = getUserConditionsImported(profile);

  if (conditions.includes('diabetes')) {
    const highCarbMeals = logsWithMeals.flatMap(l => l.meals).filter(m => m.totalCarbs > 60).length;
    if (highCarbMeals > 0) {
      patterns.push(`You exceeded 60g carbs in ${highCarbMeals} meals (diabetes)`);
      recommendations.push('Try swapping white rice for brown rice in 2 meals next week');
    }
  }

  if (conditions.includes('pcos')) {
    if (proteinDaysMet >= 5) {
      patterns.push(`You met your protein goal ${proteinDaysMet}/7 days – great for PCOS management!`);
    } else {
      recommendations.push('Higher protein at each meal helps with PCOS hormone balance');
    }
  }

  if (conditions.includes('hypertension')) {
    const sodiumKw = ['pickle', 'papad', 'namkeen', 'chips', 'processed', 'instant', 'maggi'];
    const sodiumMeals = logsWithMeals.flatMap(l => l.meals).filter(m =>
      m.items?.some(i => sodiumKw.some(k => i.name.toLowerCase().includes(k)))
    ).length;
    if (sodiumMeals > 0) {
      patterns.push(`${sodiumMeals} meals contained high-sodium items (BP)`);
      recommendations.push('Replace processed snacks with fresh fruits and nuts');
    }
  }

  // ── Context stats ──
  const allMeals = logs.flatMap(l => l.meals);
  const mealsWithSource = allMeals.filter(m => m.source?.category);
  let contextStats: ContextStats | null = null;

  if (mealsWithSource.length >= 3) {
    const srcMap: Record<string, { count: number; totalCal: number }> = {};
    const compMap: Record<string, { count: number; totalCal: number }> = {};
    const moodMap: Record<string, number> = {};

    for (const m of mealsWithSource) {
      const cat = m.source!.category;
      if (!srcMap[cat]) srcMap[cat] = { count: 0, totalCal: 0 };
      srcMap[cat].count++;
      srcMap[cat].totalCal += m.totalCalories;

      for (const c of (m.source!.companions || [])) {
        if (!compMap[c]) compMap[c] = { count: 0, totalCal: 0 };
        compMap[c].count++;
        compMap[c].totalCal += m.totalCalories;
      }

      if (m.source!.mood) {
        moodMap[m.source!.mood] = (moodMap[m.source!.mood] || 0) + 1;
      }
    }

    const sourceBreakdown: Record<string, { count: number; avgCal: number }> = {};
    for (const [k, v] of Object.entries(srcMap)) {
      sourceBreakdown[k] = { count: v.count, avgCal: Math.round(v.totalCal / v.count) };
    }
    const companionStats: Record<string, { count: number; avgCal: number }> = {};
    for (const [k, v] of Object.entries(compMap)) {
      companionStats[k] = { count: v.count, avgCal: Math.round(v.totalCal / v.count) };
    }

    contextStats = { sourceBreakdown, companionStats, moodStats: moodMap };
  }

  return {
    mealsLogged,
    mealsPossible: 21,
    hydrationDaysMet,
    proteinDaysMet,
    nutritionStreak: streaks.nutrition.current,
    highestCalDay: dayName,
    patterns,
    recommendations,
    contextStats,
  };
}

// ── Main evaluation engine ──

export function evaluateCoach(profile: UserProfile, log: DailyLog): CoachMessage | null {
  const settings = getCoachSettings();
  if (!settings.enabled || isQuietHours()) return null;

  const totals = getDailyTotals(log);
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const messages: CoachMessage[] = [];

  // ─── 1. Health risk: no meals by afternoon (priority 90-100) ───
  if (settings.mealFeedback && hour >= 14 && log.meals.length === 0) {
    messages.push({
      id: 'health_no_meals',
      category: 'meal',
      icon: '⚠️',
      title: 'No meals logged today',
      body: `It's ${hour > 12 ? hour - 12 : hour} PM and you haven't eaten. This can affect your energy and metabolism.`,
      priority: 92,
      tone: 'urgent',
      actions: [
        { label: 'Log Meal', icon: '📸', route: '/camera' },
        { label: 'Quick Add', icon: '✏️', route: '/log' },
      ],
    });
  }

  // ─── 2. Goal deviation: over calories (priority 70-89) ───
  if (settings.progressSummaries) {
    const caloriesLeft = profile.dailyCalories - totals.eaten;
    const pctEaten = Math.round((totals.eaten / Math.max(profile.dailyCalories, 1)) * 100);

    if (pctEaten >= 90 && hour < 18 && log.meals.length <= 2) {
      messages.push({
        id: 'goal_over_calories_early',
        category: 'progress',
        icon: '🛑',
        title: 'Calories running out',
        body: `You've used ${pctEaten}% of your calories and it's not even dinner. Plan a very light evening meal.`,
        priority: 78,
        tone: 'urgent',
        actions: [{ label: 'Light Dinner Ideas', icon: '🥗', route: '/planner' }],
      });
    }

    if (hour >= 22 && caloriesLeft < -200) {
      messages.push({
        id: 'goal_over_limit',
        category: 'progress',
        icon: '🔄',
        title: 'Over your goal today',
        body: `You're ${Math.abs(Math.round(caloriesLeft))} kcal over. No worries – balance it out tomorrow!`,
        priority: 35,
        tone: 'encouraging',
      });
    }

    // Morning plan
    if (hour >= 7 && hour < 10 && log.meals.length === 0) {
      messages.push({
        id: 'morning_plan',
        category: 'progress',
        icon: '🌅',
        title: 'Plan your day',
        body: `You have ${profile.dailyCalories} kcal today. Aim for ${profile.dailyProtein}g protein.`,
        priority: 40,
        tone: 'neutral',
        actions: [
          { label: 'View Plan', icon: '📋', route: '/planner' },
          { label: 'Log Breakfast', icon: '🍳', logMeal: 'breakfast' },
        ],
      });
    }

    // Afternoon check
    if (hour >= 14 && hour < 17 && pctEaten > 30 && pctEaten < 80) {
      messages.push({
        id: 'afternoon_check',
        category: 'progress',
        icon: '☀️',
        title: 'Afternoon check-in',
        body: `You've eaten ${pctEaten}% of calories. ${caloriesLeft > 0 ? `${Math.round(caloriesLeft)} kcal left for dinner.` : 'Go light tonight!'}`,
        priority: 35,
        tone: 'neutral',
        actions: caloriesLeft > 0 ? [{ label: 'Dinner Ideas', icon: '🍽️', route: '/planner' }] : undefined,
      });
    }

    // Evening protein gap
    const proteinLeft = profile.dailyProtein - totals.protein;
    if (hour >= 19 && hour < 22 && proteinLeft > 20) {
      messages.push({
        id: 'evening_protein',
        category: 'progress',
        icon: '🥚',
        title: 'Protein gap',
        body: `You still need ${Math.round(proteinLeft)}g protein. Greek yogurt, paneer, or eggs can help.`,
        priority: 55,
        tone: 'neutral',
        actions: [{ label: 'Log Snack', icon: '🍽️', logMeal: 'snack' }],
      });
    }
  }

  // ─── 3. After-meal macro feedback (priority 50-69) ───
  if (settings.mealFeedback && log.meals.length > 0) {
    const lastMeal = log.meals[log.meals.length - 1];
    const mp = lastMeal.totalProtein;
    const mc = lastMeal.totalCarbs;
    const mcal = lastMeal.totalCalories;

    if (mp < 10 && mcal > 100) {
      const suggestions = ['eggs', 'yogurt', 'dal', 'paneer'];
      messages.push({
        id: `low_protein_${lastMeal.type}`,
        category: 'meal',
        icon: '🥚',
        title: 'Low protein detected',
        body: `Your ${lastMeal.type} has only ${mp}g protein. Adding ${suggestions.slice(0, 2).join(' or ')} could keep you full.`,
        priority: 60,
        tone: 'neutral',
        actions: [{ label: 'Add Food', icon: '➕', logMeal: lastMeal.type }],
      });
    }

    if (mc > 60 && mp < 15 && mcal > 200) {
      messages.push({
        id: `high_carb_${lastMeal.type}`,
        category: 'meal',
        icon: '🍚',
        title: 'High carb meal',
        body: `This meal is carb-heavy (${mc}g). Pair it with protein to balance blood sugar.`,
        priority: 55,
        tone: 'neutral',
      });
    }

    // No veggies detected (heuristic: check for common veggie names)
    const hasVeggies = lastMeal.items?.some(item => {
      const n = item.name.toLowerCase();
      return ['salad', 'vegetable', 'sabzi', 'palak', 'gobi', 'bhindi', 'broccoli', 'spinach', 'carrot', 'beans', 'cucumber', 'tomato'].some(v => n.includes(v));
    });
    if (!hasVeggies && mcal > 300) {
      messages.push({
        id: `no_veggies_${lastMeal.type}`,
        category: 'meal',
        icon: '🥬',
        title: 'Add some veggies',
        body: `No veggies detected in this meal. A side salad adds fiber and vitamins.`,
        priority: 50,
        tone: 'encouraging',
        actions: [{ label: 'Add Salad', icon: '🥗', logMeal: lastMeal.type }],
      });
    }

    // Positive: balanced meal
    const proteinRatio = mp * 4 / Math.max(mcal, 1);
    if (proteinRatio >= 0.25 && mcal > 200) {
      messages.push({
        id: `balanced_${lastMeal.type}`,
        category: 'meal',
        icon: '✅',
        title: 'Great balance!',
        body: `Nice balanced ${lastMeal.type}! Good job hitting your macros.`,
        priority: 20,
        tone: 'celebratory',
        actions: [{ label: '👍', icon: '👍' }],
      });
    }
  }

  // ─── 4. Hydration (priority 30-49) ───
  if (settings.hydrationAlerts) {
    const waterPct = log.waterCups / Math.max(profile.waterGoal, 1);
    const waterLeft = profile.waterGoal - log.waterCups;

    if (hour >= 14 && waterPct < 0.3) {
      messages.push({
        id: 'low_water_afternoon',
        category: 'hydration',
        icon: '💧',
        title: 'Stay hydrated!',
        body: `You've only had ${log.waterCups} of ${profile.waterGoal} glasses. Drink up!`,
        priority: 45 + (hour >= 18 ? 10 : 0), // time decay: more urgent later
        tone: 'urgent',
        actions: [
          { label: '+1 Glass', icon: '💧', addWater: true },
          { label: '+2 Glasses', icon: '💧💧', addWater: true },
        ],
      });
    } else if (hour >= 17 && waterPct >= 0.5 && waterPct < 1.0) {
      messages.push({
        id: 'water_almost',
        category: 'hydration',
        icon: '💧',
        title: 'Almost there!',
        body: `Just ${waterLeft} more glass${waterLeft > 1 ? 'es' : ''} to hit your water goal.`,
        priority: 32,
        tone: 'encouraging',
        actions: [{ label: '+1 Glass', icon: '💧', addWater: true }],
      });
    }

    if (hour >= 18 && waterPct >= 1.0) {
      messages.push({
        id: 'water_goal_met',
        category: 'hydration',
        icon: '💦',
        title: 'Hydration goal met!',
        body: `Great job – you've hit your water goal today!`,
        priority: 15,
        tone: 'celebratory',
      });
    }
  }

  // ─── 5. Activity (priority 30-49) ───
  if (settings.activityReminders) {
    const burned = log.burned;
    if (hour >= 16 && (!burned || (burned.total === 0 && burned.stepsCount < 1000))) {
      const estBurn = Math.round(profile.weightKg * 3.5 * 0.25); // ~20 min walk
      messages.push({
        id: 'no_activity',
        category: 'activity',
        icon: '🚶',
        title: 'Get moving!',
        body: `No activity logged yet. A 20-min walk could burn ~${estBurn} kcal.`,
        priority: 35,
        tone: 'encouraging',
      });
    }

    if (burned && burned.stepsCount >= 8000) {
      messages.push({
        id: 'great_steps',
        category: 'activity',
        icon: '🏃',
        title: 'Great step count!',
        body: `${burned.stepsCount.toLocaleString()} steps today – keep it up!`,
        priority: 18,
        tone: 'celebratory',
      });
    }
  }

  // ─── 6. Streak messages ───
  if (settings.streakCelebrations) {
    const streaks = getStreaks();
    const ns = streaks.nutrition.current;
    const hs = streaks.hydration.current;

    // Near milestone
    const milestones = [7, 14, 30, 60, 90];
    for (const m of milestones) {
      if (ns === m - 1) {
        messages.push({
          id: `streak_near_${m}`,
          category: 'streak',
          icon: '🔥',
          title: `Almost ${m} days!`,
          body: `One more day to hit your ${m}-day nutrition streak! Log your meal now.`,
          priority: 28,
          tone: 'encouraging',
          actions: [{ label: 'Log Now', icon: '📸', route: '/camera' }],
        });
        break;
      }
    }

    // Celebrate (handled by streaks system, but coach can reinforce)
    if (ns > 0 && ns % 7 === 0) {
      messages.push({
        id: `streak_celebrate_${ns}`,
        category: 'streak',
        icon: '🔥',
        title: `${ns}-day streak!`,
        body: `You've logged meals for ${ns} days straight. You're building a powerful habit!`,
        priority: 25,
        tone: 'celebratory',
      });
    }

    // Streak broken
    if (ns === 0 && streaks.nutrition.longest > 3) {
      messages.push({
        id: 'streak_broken',
        category: 'streak',
        icon: '💪',
        title: 'Fresh start',
        body: `Your streak reset. Don't worry – consistency over perfection. Start fresh today!`,
        priority: 40,
        tone: 'encouraging',
        actions: [{ label: 'Log Meal', icon: '📸', route: '/camera' }],
      });
    }
  }

  // ─── 7. Pattern detection (once per day) ───
  if (settings.mealFeedback && hour >= 10) {
    try {
      const recent = getRecentLogs(14);
      const patternMsgs = detectPatterns(recent, profile);
      // Only on specific days to avoid overload
      if (dayOfWeek === 1 || dayOfWeek === 4) {
        messages.push(...patternMsgs);
      }
    } catch { /* ignore */ }
  }

  // ─── 8. Weekly report (Monday 8 AM) ───
  if (settings.weeklyReports && dayOfWeek === 1 && hour >= 8 && hour < 12) {
    const state = getCoachState();
    const today = new Date().toISOString().split('T')[0];
    if (state.lastWeeklyReport !== today) {
      const report = generateWeeklyReport(profile);
      if (report) {
        const patternText = report.patterns.length > 0 ? ` Patterns: ${report.patterns[0]}.` : '';
        messages.push({
          id: 'weekly_report',
          category: 'report',
          icon: '📊',
          title: 'Weekly Nutrition Report',
          body: `${report.mealsLogged}/${report.mealsPossible} meals logged. Hydration: ${report.hydrationDaysMet}/7 days. Protein goal: ${report.proteinDaysMet}/7 days.${patternText}`,
          priority: 48,
          tone: 'neutral',
          actions: [{ label: 'Full Report', icon: '📊', route: '/progress' }],
        });
      }
    }
  }

  // ─── 10. Context-aware coaching ───
  const recentMeals = log.meals;
  const lastMeal = recentMeals[recentMeals.length - 1];
  if (lastMeal?.source?.category === 'restaurant') {
    messages.push({
      id: 'context_restaurant',
      category: 'meal',
      icon: '🍽️',
      title: 'Restaurant meal tip',
      body: 'Restaurant meals often have more oil and larger portions. A lighter dinner tomorrow could balance your week.',
      priority: 32,
      tone: 'encouraging',
    });
  }
  if (lastMeal?.source?.mood === 'stressed') {
    messages.push({
      id: 'context_stress',
      category: 'meal',
      icon: '🧘',
      title: 'Feeling stressed?',
      body: "It's okay to eat when stressed. Tomorrow is a fresh start – try a calming walk or deep breathing.",
      priority: 34,
      tone: 'encouraging',
    });
  }
  if (lastMeal?.source?.companions?.includes('friends')) {
    const mealCal = lastMeal.totalCalories;
    if (mealCal > (profile.dailyCalories * 0.4)) {
      messages.push({
        id: 'context_social',
        category: 'meal',
        icon: '👥',
        title: 'Social meal tip',
        body: 'Great that you enjoyed time with friends! Social meals tend to be larger – consider a lighter next meal.',
        priority: 28,
        tone: 'encouraging',
      });
    }
  }

  // ─── Filter, score, and select ───
  const valid = messages.filter(m => canSend(m.category, m.id));
  if (valid.length === 0) return null;

  valid.sort((a, b) => b.priority - a.priority);
  const chosen = valid[0];
  markSent(chosen.id);

  // Mark weekly report as sent
  if (chosen.id === 'weekly_report') {
    const state = getCoachState();
    state.lastWeeklyReport = new Date().toISOString().split('T')[0];
    saveCoachState(state);
  }

  return chosen;
}

export function resetCoachPreferences() {
  const state = getCoachState();
  state.feedback = [];
  state.suppressedIds = [];
  saveCoachState(state);
}
