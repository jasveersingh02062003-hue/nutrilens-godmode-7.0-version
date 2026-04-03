import { scopedGet, scopedSet } from "./scoped-storage";
import { safeJsonParse } from "./safe-json";
// ============================================
// NutriLens AI – Pattern Detection Engine
// ============================================
// Analyzes meal history for recurring behavioral patterns
// and surfaces actionable insights.

import { DailyLog, UserProfile, getDailyTotals, getRecentLogs } from './store';
import { getUserConditions } from './condition-coach';
import { toLocalDateStr } from './date-utils';

// ── Types ──

export interface DetectedPattern {
  id: string;
  type: string;
  category: 'timing' | 'macro' | 'hydration' | 'activity' | 'weight' | 'condition';
  severity: 'low' | 'medium' | 'high';
  icon: string;
  title: string;
  insight: string;
  recommendation: string;
  frequency?: number;
  data?: Record<string, number>;
}

// ── Helpers ──

function avgCalories(logs: DailyLog[]): number {
  if (logs.length === 0) return 0;
  return logs.reduce((s, l) => s + getDailyTotals(l).eaten, 0) / logs.length;
}

function logsWithMeals(logs: DailyLog[]): DailyLog[] {
  return logs.filter(l => l.meals.length > 0);
}

// ── Main engine ──

export function detectAllPatterns(profile: UserProfile, days = 14): DetectedPattern[] {
  const logs = getRecentLogs(days);
  const activeLogs = logsWithMeals(logs);
  if (activeLogs.length < 4) return [];

  const patterns: DetectedPattern[] = [];

  // ─── 1. Late-night eating ───
  const lateNightDays = activeLogs.filter(l =>
    l.meals.some(m => {
      const h = parseInt(m.time?.split(':')[0] || '0');
      return h >= 22 || h < 4;
    })
  ).length;

  if (lateNightDays >= 3) {
    patterns.push({
      id: 'late_night_eating',
      type: 'late_night_eating',
      category: 'timing',
      severity: lateNightDays >= 5 ? 'high' : 'medium',
      icon: '🌙',
      title: 'Late-night eating',
      insight: `You ate after 10 PM on ${lateNightDays} of the last ${days} days. Late meals may affect sleep and digestion.`,
      recommendation: 'Try finishing dinner by 8 PM. If hungry, choose a light snack like warm milk or a handful of nuts.',
      frequency: lateNightDays,
    });
  }

  // ─── 2. Breakfast skipping ───
  const skippedBreakfast = activeLogs.filter(l =>
    !l.meals.some(m => m.type === 'breakfast')
  ).length;

  if (skippedBreakfast >= 4) {
    patterns.push({
      id: 'skip_breakfast',
      type: 'skip_breakfast',
      category: 'timing',
      severity: skippedBreakfast >= 6 ? 'high' : 'medium',
      icon: '🥣',
      title: 'Breakfast skipping',
      insight: `You skipped breakfast ${skippedBreakfast} times in the last ${days} days.`,
      recommendation: 'Overnight oats, a banana smoothie, or 2 boiled eggs take under 5 minutes.',
      frequency: skippedBreakfast,
    });
  }

  // ─── 3. Weekend overeating ───
  const weekendLogs = activeLogs.filter(l => {
    const d = new Date(l.date).getDay();
    return d === 0 || d === 6;
  });
  const weekdayLogs = activeLogs.filter(l => {
    const d = new Date(l.date).getDay();
    return d >= 1 && d <= 5;
  });

  if (weekendLogs.length >= 2 && weekdayLogs.length >= 3) {
    const wkendAvg = avgCalories(weekendLogs);
    const wkdayAvg = avgCalories(weekdayLogs);
    const diff = Math.round(((wkendAvg / wkdayAvg) - 1) * 100);

    if (diff >= 20) {
      patterns.push({
        id: 'weekend_overeating',
        type: 'weekend_overeating',
        category: 'timing',
        severity: diff >= 35 ? 'high' : 'medium',
        icon: '📅',
        title: 'Weekend overeating',
        insight: `Your weekend calories are ${diff}% higher than weekdays (avg ${Math.round(wkendAvg)} vs ${Math.round(wkdayAvg)} kcal).`,
        recommendation: 'Plan weekend meals ahead. A structured Saturday lunch can prevent overeating.',
        data: { weekendAvg: Math.round(wkendAvg), weekdayAvg: Math.round(wkdayAvg), diff },
      });
    }
  }

  // ─── 4. Low protein at breakfast ───
  const breakfasts = activeLogs.flatMap(l =>
    l.meals.filter(m => m.type === 'breakfast')
  );

  if (breakfasts.length >= 3) {
    const avgBreakfastProtein = breakfasts.reduce((s, m) => s + m.totalProtein, 0) / breakfasts.length;
    if (avgBreakfastProtein < 15) {
      patterns.push({
        id: 'low_protein_breakfast',
        type: 'low_protein_breakfast',
        category: 'macro',
        severity: avgBreakfastProtein < 8 ? 'high' : 'medium',
        icon: '🥚',
        title: 'Low-protein breakfasts',
        insight: `Your breakfasts average only ${Math.round(avgBreakfastProtein)}g protein – aim for 20-25g to stay full longer.`,
        recommendation: 'Add eggs, Greek yogurt, paneer, or protein-rich chilla to your morning routine.',
        data: { avgProtein: Math.round(avgBreakfastProtein) },
      });
    }
  }

  // ─── 5. High-carb dinners ───
  const dinners = activeLogs.flatMap(l =>
    l.meals.filter(m => m.type === 'dinner')
  );
  const highCarbDinners = dinners.filter(d => d.totalCarbs > 60 && d.totalProtein < 20).length;

  if (highCarbDinners >= 3) {
    patterns.push({
      id: 'high_carb_dinners',
      type: 'high_carb_dinners',
      category: 'macro',
      severity: highCarbDinners >= 5 ? 'high' : 'medium',
      icon: '🍚',
      title: 'High-carb dinners',
      insight: `${highCarbDinners} of your recent dinners were carb-heavy with low protein.`,
      recommendation: 'Add dal, paneer, chicken, or tofu to your dinner to improve satiety and balance macros.',
      frequency: highCarbDinners,
    });
  }

  // ─── 6. Afternoon dehydration ───
  const lowWaterDays = logs.filter(l => {
    const hasMeals = l.meals.length > 0;
    return hasMeals && l.waterCups < Math.floor(profile.waterGoal * 0.5);
  }).length;

  if (lowWaterDays >= 4) {
    patterns.push({
      id: 'low_hydration',
      type: 'low_hydration',
      category: 'hydration',
      severity: lowWaterDays >= 7 ? 'high' : 'medium',
      icon: '💧',
      title: 'Low hydration',
      insight: `You fell below half your water goal on ${lowWaterDays} of the last ${days} days.`,
      recommendation: 'Set a 3 PM water reminder or keep a bottle at your desk.',
      frequency: lowWaterDays,
    });
  }

  // ─── 7. Inactive days ───
  const inactiveDays = logs.filter(l => {
    const burned = l.burned;
    return (!burned || burned.total === 0) && l.meals.length > 0;
  }).length;

  if (inactiveDays >= 5) {
    patterns.push({
      id: 'low_activity',
      type: 'low_activity',
      category: 'activity',
      severity: inactiveDays >= 8 ? 'high' : 'medium',
      icon: '🚶',
      title: 'Low activity',
      insight: `No activity logged on ${inactiveDays} of ${days} days.`,
      recommendation: 'A 20-minute daily walk can burn 100+ calories and improve mood.',
      frequency: inactiveDays,
    });
  }

  // ─── 8. Inconsistent calorie intake ───
  const dailyCals = activeLogs.map(l => getDailyTotals(l).eaten).filter(c => c > 0);
  if (dailyCals.length >= 5) {
    const mean = dailyCals.reduce((s, c) => s + c, 0) / dailyCals.length;
    const variance = dailyCals.reduce((s, c) => s + (c - mean) ** 2, 0) / dailyCals.length;
    const stddev = Math.sqrt(variance);
    const cv = stddev / mean;

    if (cv > 0.35) {
      patterns.push({
        id: 'inconsistent_calories',
        type: 'inconsistent_calories',
        category: 'macro',
        severity: cv > 0.5 ? 'high' : 'medium',
        icon: '📈',
        title: 'Inconsistent calorie intake',
        insight: `Your daily calories vary a lot (${Math.round(Math.min(...dailyCals))}–${Math.round(Math.max(...dailyCals))} kcal). Consistency helps reach goals faster.`,
        recommendation: 'Try meal prepping or following a weekly meal plan for more stability.',
        data: { min: Math.round(Math.min(...dailyCals)), max: Math.round(Math.max(...dailyCals)), cv: Math.round(cv * 100) },
      });
    }
  }

  // ─── 9. Condition-specific patterns ───
  const conditions = getUserConditions(profile);

  if (conditions.includes('diabetes')) {
    const highCarbMeals = activeLogs.flatMap(l => l.meals).filter(m => m.totalCarbs > 60).length;
    if (highCarbMeals > 3) {
      patterns.push({
        id: 'diabetes_high_carb',
        type: 'diabetes_high_carb',
        category: 'condition',
        severity: highCarbMeals > 6 ? 'high' : 'medium',
        icon: '🩺',
        title: 'High-carb meals (Diabetes)',
        insight: `You had ${highCarbMeals} meals with over 60g carbs. For diabetes management, aim for 45-60g per meal.`,
        recommendation: 'Reduce rice/roti portions and add more protein and fiber-rich foods.',
        frequency: highCarbMeals,
      });
    }
  }

  if (conditions.includes('pcos')) {
    const lowProteinMeals = activeLogs.flatMap(l => l.meals).filter(m => m.totalProtein < 15 && m.totalCalories > 200).length;
    if (lowProteinMeals > 4) {
      patterns.push({
        id: 'pcos_low_protein',
        type: 'pcos_low_protein',
        category: 'condition',
        severity: 'medium',
        icon: '🩺',
        title: 'Low-protein meals (PCOS)',
        insight: `${lowProteinMeals} meals were low in protein. Higher protein intake helps with PCOS hormone balance.`,
        recommendation: 'Include paneer, eggs, legumes, or tofu in every main meal.',
        frequency: lowProteinMeals,
      });
    }
  }

  if (conditions.includes('hypertension')) {
    // Check for frequent processed/high-sodium food names
    const sodiumKeywords = ['pickle', 'papad', 'namkeen', 'chips', 'processed', 'instant', 'maggi', 'noodle'];
    const highSodiumMeals = activeLogs.flatMap(l => l.meals).filter(m =>
      m.items?.some(i => sodiumKeywords.some(k => i.name.toLowerCase().includes(k)))
    ).length;
    if (highSodiumMeals >= 3) {
      patterns.push({
        id: 'hypertension_sodium',
        type: 'hypertension_sodium',
        category: 'condition',
        severity: 'high',
        icon: '🩺',
        title: 'High-sodium foods (BP)',
        insight: `You had ${highSodiumMeals} meals with potentially high-sodium items this period.`,
        recommendation: 'Replace pickles and processed snacks with fresh herbs, lemon, and home-cooked alternatives.',
        frequency: highSodiumMeals,
      });
    }
  }

  // ─── 10. Frequent restaurant eating ───
  const allMealsWithSource = activeLogs.flatMap(l => l.meals).filter(m => m.source?.category);
  const restaurantMeals = allMealsWithSource.filter(m => m.source?.category === 'restaurant');
  const homeMeals = allMealsWithSource.filter(m => m.source?.category === 'home');

  if (restaurantMeals.length >= 3) {
    const restaurantAvgCal = restaurantMeals.reduce((s, m) => s + m.totalCalories, 0) / restaurantMeals.length;
    const homeAvgCal = homeMeals.length > 0 ? homeMeals.reduce((s, m) => s + m.totalCalories, 0) / homeMeals.length : 0;
    const diff = homeAvgCal > 0 ? Math.round(restaurantAvgCal - homeAvgCal) : 0;

    patterns.push({
      id: 'frequent_restaurant',
      type: 'frequent_restaurant',
      category: 'timing',
      severity: restaurantMeals.length >= 5 ? 'high' : 'medium',
      icon: '🍽️',
      title: 'Frequent restaurant eating',
      insight: `You ate out ${restaurantMeals.length} times in ${days} days.${diff > 0 ? ` Restaurant meals average ${diff} kcal more than home meals.` : ''}`,
      recommendation: 'Try cooking at home twice this week for better calorie control.',
      frequency: restaurantMeals.length,
      data: { restaurantAvg: Math.round(restaurantAvgCal), homeAvg: Math.round(homeAvgCal) },
    });
  }

  // ─── 11. Social eating impact ───
  const socialMeals = allMealsWithSource.filter(m => m.source?.companions?.includes('friends'));
  const aloneMeals = allMealsWithSource.filter(m => m.source?.companions?.includes('alone'));

  if (socialMeals.length >= 2 && aloneMeals.length >= 2) {
    const socialAvg = socialMeals.reduce((s, m) => s + m.totalCalories, 0) / socialMeals.length;
    const aloneAvg = aloneMeals.reduce((s, m) => s + m.totalCalories, 0) / aloneMeals.length;
    const pctDiff = Math.round(((socialAvg / aloneAvg) - 1) * 100);

    if (pctDiff >= 20) {
      patterns.push({
        id: 'social_eating',
        type: 'social_eating',
        category: 'timing',
        severity: pctDiff >= 40 ? 'high' : 'medium',
        icon: '👥',
        title: 'Social eating impact',
        insight: `When eating with friends, your calorie intake is ${pctDiff}% higher.`,
        recommendation: 'Enjoy social meals, but consider sharing dishes or ordering lighter options.',
        data: { socialAvg: Math.round(socialAvg), aloneAvg: Math.round(aloneAvg) },
      });
    }
  }

  // ─── 12. Street food frequency ───
  const streetFoodMeals = allMealsWithSource.filter(m => m.source?.category === 'street_food');
  if (streetFoodMeals.length >= 3) {
    patterns.push({
      id: 'street_food_freq',
      type: 'street_food_freq',
      category: 'timing',
      severity: streetFoodMeals.length >= 5 ? 'high' : 'medium',
      icon: '🛺',
      title: 'Frequent street food',
      insight: `You had street food ${streetFoodMeals.length} times in ${days} days.`,
      recommendation: 'Balance street food with lighter, home-cooked dinners.',
      frequency: streetFoodMeals.length,
    });
  }

  // ─── 13. Stress eating ───
  const stressMeals = allMealsWithSource.filter(m => m.source?.mood === 'stressed');
  if (stressMeals.length >= 2) {
    const stressAvg = stressMeals.reduce((s, m) => s + m.totalCalories, 0) / stressMeals.length;
    patterns.push({
      id: 'stress_eating',
      type: 'stress_eating',
      category: 'timing',
      severity: stressMeals.length >= 4 ? 'high' : 'medium',
      icon: '😥',
      title: 'Stress eating',
      insight: `You logged ${stressMeals.length} meals when feeling stressed (avg ${Math.round(stressAvg)} kcal).`,
      recommendation: "It's okay – try a calming activity like a walk or deep breathing when stressed.",
      frequency: stressMeals.length,
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  patterns.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  return patterns;
}

// ── Persistence for weekly pattern snapshots ──

const PATTERNS_KEY = 'nutrilens_weekly_patterns';

export interface PatternSnapshot {
  date: string;
  patterns: DetectedPattern[];
}

export function savePatternSnapshot(patterns: DetectedPattern[]) {
  const key = toLocalDateStr();
  const history: PatternSnapshot[] = getPatternHistory();
  // Keep last 12 weeks
  history.push({ date: key, patterns });
  if (history.length > 12) history.splice(0, history.length - 12);
  scopedSet(PATTERNS_KEY, JSON.stringify(history));
}

export function getPatternHistory(): PatternSnapshot[] {
  const data = scopedGet(PATTERNS_KEY);
  return data ? JSON.parse(data) : [];
}
