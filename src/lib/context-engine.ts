// ============================================
// NutriLens AI – Context Intelligence Engine
// ============================================
// Synthesizes occupation, lifestyle, weather, last meal,
// and stress/sleep data into proactive food suggestions.

import { UserProfile, getDailyLog, getDailyTotals, getTodayKey } from './store';
import { getWeather, type WeatherData } from './weather-service';

// ── Types ──

export interface ContextSuggestion {
  type: 'meal_idea' | 'hydration' | 'food_suggestion' | 'next_meal' | 'timing' | 'meal_prep' | 'wellness';
  icon: string;
  text: string;
  explanation: string;    // "Why this tip?" content
  priority: number;       // 0-100
  recipes?: string[];
  dismissKey: string;
}

const DISMISS_STORE = 'nutrilens_context_dismissed';

function getDismissed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISS_STORE) || '{}'); } catch { return {}; }
}

export function dismissContextTip(key: string) {
  const d = getDismissed();
  d[key] = Date.now();
  localStorage.setItem(DISMISS_STORE, JSON.stringify(d));
}

function isDismissed(key: string): boolean {
  const d = getDismissed();
  const ts = d[key];
  if (!ts) return false;
  // 24h cooldown
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}

// ── Main engine ──

export function getContextualSuggestions(profile: UserProfile | null): ContextSuggestion[] {
  if (!profile) return [];

  const suggestions: ContextSuggestion[] = [];
  const weather = getWeather();
  const todayLog = getDailyLog(getTodayKey());
  const totals = getDailyTotals(todayLog);
  const lastMeal = todayLog.meals.length > 0 ? todayLog.meals[todayLog.meals.length - 1] : null;
  const hour = new Date().getHours();

  // ─── Occupation & Work ───

  const jt = (profile.jobType || '').toLowerCase();
  const wa = (profile.workActivity || '').toLowerCase();
  const occ = (profile.occupation || '').toLowerCase();
  const travelFreq = (profile as any).travelFrequency || '';
  const carriesFood = (profile as any).carriesFood || '';
  const workplaceFacilities: string[] = (profile as any).workplaceFacilities || [];
  const kitchenAppliances: string[] = (profile as any).kitchenAppliances || [];

  const isPhysical = jt === 'physical' || jt === 'field' || wa === 'heavy' || wa === 'very_active' ||
    ['driver', 'labourer', 'labor', 'construction', 'delivery', 'farmer'].some(k => occ.includes(k));

  const isDesk = jt === 'desk' || jt === 'office' || wa === 'sedentary' ||
    ['software', 'engineer', 'analyst', 'accountant', 'manager', 'designer'].some(k => occ.includes(k));

  const travelsOften = travelFreq === 'often' ||
    ['travel', 'sales', 'consultant', 'driver', 'pilot', 'flight'].some(k => occ.includes(k));

  const isNightShift = ['night', 'shift', 'bpo', 'call center'].some(k => occ.includes(k));

  if (isPhysical) {
    suggestions.push({
      type: 'meal_idea',
      icon: '💪',
      text: 'Your job burns a lot of energy — pack high-protein, slow-digesting meals like soya wrap, eggs, dal rice',
      explanation: 'Physical jobs burn 2-3x more calories. Sustained energy from protein + complex carbs prevents mid-shift fatigue.',
      priority: 75,
      recipes: ['soya_wrap', 'egg_bhurji', 'dal_rice'],
      dismissKey: 'ctx_physical_job',
    });
  }

  if (isDesk && hour >= 14 && hour <= 16) {
    suggestions.push({
      type: 'wellness',
      icon: '🧘',
      text: 'Afternoon slump? Take a 5-min stretch break. A light snack like makhana or green tea can help',
      explanation: 'Desk workers experience energy dips post-lunch. Movement + light snacks stabilize blood sugar.',
      priority: 35,
      recipes: ['makhana_roast', 'green_tea'],
      dismissKey: 'ctx_desk_slump',
    });
  }

  if (travelsOften) {
    suggestions.push({
      type: 'meal_prep',
      icon: '🚗',
      text: 'No-fridge meals for travel: wraps, boiled eggs, makhana, roasted chana, sprouts box',
      explanation: 'Frequent travelers often miss meals or grab junk. These options are portable and nutrient-dense.',
      priority: 65,
      recipes: ['soya_wrap', 'sprout_chaat', 'makhana_roast'],
      dismissKey: 'ctx_travel_meals',
    });
  }

  if (carriesFood === 'never' && travelsOften) {
    suggestions.push({
      type: 'food_suggestion',
      icon: '🎒',
      text: 'Quick grab options when you can\'t carry food: fruit, roasted chana pouch, curd cup',
      explanation: 'You travel often but don\'t pack food. These require zero prep and are available everywhere.',
      priority: 60,
      dismissKey: 'ctx_no_carry',
    });
  }

  if (isNightShift) {
    suggestions.push({
      type: 'timing',
      icon: '🌙',
      text: 'Night shift? Eat your main meal before your shift starts. Avoid heavy food after midnight',
      explanation: 'Eating heavy meals late disrupts circadian rhythm and digestion. A light post-midnight snack is better.',
      priority: 70,
      dismissKey: 'ctx_night_shift',
    });
  }

  // Workplace facilities
  const noMicrowave = workplaceFacilities.length > 0 && !workplaceFacilities.includes('microwave');
  if (noMicrowave) {
    suggestions.push({
      type: 'meal_prep',
      icon: '❄️',
      text: 'No microwave at work? Try no-reheat meals: wraps, curd rice, salads, boiled eggs',
      explanation: 'Without reheating, you need meals that taste good at room temp. These are designed for that.',
      priority: 45,
      recipes: ['curd_rice', 'veg_wrap', 'sprout_salad'],
      dismissKey: 'ctx_no_microwave',
    });
  }

  // Cooking habits
  const cookingHabits = (profile.cookingHabits || '').toLowerCase();
  if (cookingHabits === 'none' || cookingHabits === 'minimal') {
    suggestions.push({
      type: 'meal_idea',
      icon: '⚡',
      text: 'Zero-cook meals: curd + muesli, fruit bowl with nuts, sprout chaat, banana shake',
      explanation: 'You prefer minimal cooking. These require no stove time and still deliver balanced nutrition.',
      priority: 50,
      recipes: ['muesli_curd', 'fruit_bowl', 'sprout_chaat'],
      dismissKey: 'ctx_no_cook',
    });
  }

  // ─── Weather & Season ───

  const temp = weather.temperature;
  const season = weather.season;

  if (temp > 34 || season === 'summer') {
    suggestions.push({
      type: 'hydration',
      icon: '🌡️',
      text: `Hot day (${temp}°C)! Drink +2 cups water. Cool down with cucumber, watermelon, buttermilk`,
      explanation: 'High temperatures increase sweat loss. Dehydration reduces focus and metabolism by up to 15%.',
      priority: 72,
      recipes: ['buttermilk', 'watermelon_salad', 'cucumber_raita'],
      dismissKey: `ctx_hot_${getTodayKey()}`,
    });
  }

  if (temp < 18 || season === 'winter') {
    suggestions.push({
      type: 'food_suggestion',
      icon: '🧣',
      text: 'Cold day — warm up with ginger tea, soup, dal, or root vegetables',
      explanation: 'Cold weather increases calorie burn. Warming foods improve circulation and immunity.',
      priority: 55,
      recipes: ['ginger_tea', 'dal_soup', 'gajar_halwa'],
      dismissKey: `ctx_cold_${getTodayKey()}`,
    });
  }

  if (season === 'monsoon') {
    suggestions.push({
      type: 'food_suggestion',
      icon: '🌧️',
      text: 'Monsoon immunity boost — turmeric milk, ginger tea, light cooked meals. Avoid raw salads',
      explanation: 'Monsoon weakens digestive fire (Agni). Raw foods increase bacterial risk. Warm, cooked meals are safer.',
      priority: 58,
      recipes: ['haldi_doodh', 'moong_khichdi', 'ginger_tea'],
      dismissKey: `ctx_monsoon_${getTodayKey()}`,
    });
  }

  // ─── Last Meal & Timing ───

  if (lastMeal && lastMeal.totalCalories > 800) {
    suggestions.push({
      type: 'next_meal',
      icon: '🍽️',
      text: 'Your last meal was heavy. Consider a light dinner — soup, salad, or curd rice',
      explanation: `Your last meal was ${lastMeal.totalCalories} kcal. A lighter next meal keeps you within your daily target.`,
      priority: 62,
      recipes: ['tomato_soup', 'green_salad', 'curd_rice'],
      dismissKey: `ctx_heavy_meal_${getTodayKey()}`,
    });
  }

  if (lastMeal && lastMeal.totalCalories < 300 && todayLog.meals.length >= 1) {
    suggestions.push({
      type: 'next_meal',
      icon: '🥚',
      text: 'You ate very little last time — add a protein-rich snack like eggs, paneer, or nuts',
      explanation: 'Under-eating leads to energy crashes and overeating later. A protein snack stabilizes blood sugar.',
      priority: 55,
      recipes: ['boiled_eggs', 'paneer_tikka', 'mixed_nuts'],
      dismissKey: `ctx_light_meal_${getTodayKey()}`,
    });
  }

  // Dinner time nudge
  if (hour >= 19 && hour <= 21 && !todayLog.meals.some(m => m.type === 'dinner')) {
    suggestions.push({
      type: 'timing',
      icon: '🕖',
      text: 'Dinner time! Try a light, cooked meal. Eating before 8 PM improves digestion',
      explanation: 'Late dinners disrupt sleep and metabolism. A lighter, earlier dinner is healthier.',
      priority: 48,
      dismissKey: `ctx_dinner_nudge_${getTodayKey()}`,
    });
  }

  // ─── Stress & Sleep ───

  const stress = (profile.stressLevel || '').toLowerCase();
  const sleep = profile.sleepHours || '';

  if (stress === 'high') {
    suggestions.push({
      type: 'wellness',
      icon: '😌',
      text: 'High stress? Calming foods: bananas, oats, dark chocolate, walnuts (rich in magnesium)',
      explanation: 'Stress depletes magnesium. These foods replenish it and support serotonin production.',
      priority: 52,
      recipes: ['banana_oat_smoothie', 'dark_choc_walnut'],
      dismissKey: 'ctx_stress',
    });
  }

  const sleepNum = parseFloat(sleep);
  if (!isNaN(sleepNum) && sleepNum < 6) {
    suggestions.push({
      type: 'wellness',
      icon: '😴',
      text: 'Low sleep increases hunger hormones — prioritize protein to stay full longer',
      explanation: 'Less than 6 hours of sleep raises ghrelin (hunger hormone) by 28%. Protein curbs this.',
      priority: 58,
      dismissKey: 'ctx_low_sleep',
    });
  }

  // ─── Filter dismissed, sort by priority, return top 3 ───

  const active = suggestions
    .filter(s => !isDismissed(s.dismissKey))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  // Deduplicate by type — keep highest priority per type
  const seen = new Set<string>();
  return active.filter(s => {
    if (seen.has(s.type)) return false;
    seen.add(s.type);
    return true;
  });
}
