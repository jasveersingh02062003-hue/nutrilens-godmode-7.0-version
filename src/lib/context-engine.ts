// ============================================
// NutriLens AI – Context Intelligence Engine
// ============================================
// Synthesizes occupation, lifestyle, weather, last meal,
// and stress/sleep data into proactive food suggestions.
// Includes feedback system + tiered cooldowns.

import { UserProfile, getDailyLog, getDailyTotals, getTodayKey } from './store';
import { getWeather } from './weather-service';

// ── Types ──

export interface ContextSuggestion {
  type: 'meal_idea' | 'hydration' | 'food_suggestion' | 'next_meal' | 'timing' | 'meal_prep' | 'wellness';
  icon: string;
  text: string;
  explanation: string;
  priority: number;
  recipes?: string[];
  dismissKey: string;
}

// ── Persistence ──

const DISMISS_STORE = 'nutrilens_context_dismissed';
const FEEDBACK_STORE = 'nutrilens_context_feedback';

function getDismissed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISS_STORE) || '{}'); } catch { return {}; }
}

export function dismissContextTip(key: string) {
  const d = getDismissed();
  d[key] = Date.now();
  localStorage.setItem(DISMISS_STORE, JSON.stringify(d));
}

// #7 — Tiered cooldowns: static tips = 7 days, dynamic (date-based) = 24h
function isDismissed(key: string): boolean {
  const d = getDismissed();
  const ts = d[key];
  if (!ts) return false;
  const isDateBased = /\d{4}-\d{2}-\d{2}$/.test(key);
  const cooldownMs = isDateBased ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return Date.now() - ts < cooldownMs;
}

// #9 — Feedback mechanism
interface TipFeedback {
  key: string;
  reaction: 'positive' | 'negative';
  timestamp: string;
}

function getFeedbackStore(): TipFeedback[] {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_STORE) || '[]'); } catch { return []; }
}

export function recordTipFeedback(key: string, reaction: 'positive' | 'negative') {
  const store = getFeedbackStore();
  store.push({ key, reaction, timestamp: new Date().toISOString() });
  localStorage.setItem(FEEDBACK_STORE, JSON.stringify(store.slice(-100)));
}

function isSuppressed(baseKey: string): boolean {
  const store = getFeedbackStore();
  const base = baseKey.replace(/_\d{4}-\d{2}-\d{2}$/, '');
  const negCount = store.filter(f => f.key.replace(/_\d{4}-\d{2}-\d{2}$/, '') === base && f.reaction === 'negative').length;
  return negCount >= 3;
}

// ── Main engine ──

export function getContextualSuggestions(profile: UserProfile | null): ContextSuggestion[] {
  if (!profile) return [];

  const suggestions: ContextSuggestion[] = [];
  const weather = getWeather();
  const todayLog = getDailyLog(getTodayKey());
  const lastMeal = todayLog.meals.length > 0 ? todayLog.meals[todayLog.meals.length - 1] : null;
  const hour = new Date().getHours();

  // ─── Occupation & Work ───

  const jt = (profile.jobType || '').toLowerCase();
  const wa = (profile.workActivity || '').toLowerCase();
  const occ = (profile.occupation || '').toLowerCase();
  const travelFreq = profile.travelFrequency || '';
  const userCarriesFood = profile.carriesFood || '';
  const workFacilities: string[] = profile.workplaceFacilities || [];
  const kitchenApps: string[] = profile.kitchenAppliances || [];
  const living = profile.livingSituation || '';

  const isPhysical = jt === 'physical' || jt === 'field' || wa === 'heavy' || wa === 'very_active' ||
    ['driver', 'labourer', 'labor', 'construction', 'delivery', 'farmer'].some(k => occ.includes(k));

  const isDesk = jt === 'desk' || jt === 'office' || wa === 'sedentary' ||
    ['software', 'engineer', 'analyst', 'accountant', 'manager', 'designer'].some(k => occ.includes(k));

  const travelsOften = travelFreq === 'often' ||
    ['travel', 'sales', 'consultant', 'driver', 'pilot', 'flight'].some(k => occ.includes(k));

  const isNightShift = ['night', 'shift', 'bpo', 'call center'].some(k => occ.includes(k));

  if (isPhysical) {
    suggestions.push({
      type: 'meal_idea', icon: '💪',
      text: 'Your job burns a lot of energy — pack high-protein, slow-digesting meals like soya wrap, eggs, dal rice',
      explanation: 'Physical jobs burn 2-3x more calories. Sustained energy from protein + complex carbs prevents mid-shift fatigue.',
      priority: 75, recipes: ['soya_wrap', 'egg_bhurji', 'dal_rice'], dismissKey: 'ctx_physical_job',
    });
  }

  if (isDesk && hour >= 14 && hour <= 16) {
    suggestions.push({
      type: 'wellness', icon: '🧘',
      text: 'Afternoon slump? Take a 5-min stretch break. A light snack like makhana or green tea can help',
      explanation: 'Desk workers experience energy dips post-lunch. Movement + light snacks stabilize blood sugar.',
      priority: 35, recipes: ['makhana_roast', 'green_tea'], dismissKey: 'ctx_desk_slump',
    });
  }

  if (travelsOften) {
    suggestions.push({
      type: 'meal_prep', icon: '🚗',
      text: 'No-fridge meals for travel: wraps, boiled eggs, makhana, roasted chana, sprouts box',
      explanation: 'Frequent travelers often miss meals or grab junk. These options are portable and nutrient-dense.',
      priority: 65, recipes: ['soya_wrap', 'sprout_chaat', 'makhana_roast'], dismissKey: 'ctx_travel_meals',
    });
  }

  if (userCarriesFood === 'never' && travelsOften) {
    suggestions.push({
      type: 'food_suggestion', icon: '🎒',
      text: 'Quick grab options when you can\'t carry food: fruit, roasted chana pouch, curd cup',
      explanation: 'You travel often but don\'t pack food. These require zero prep and are available everywhere.',
      priority: 60, dismissKey: 'ctx_no_carry',
    });
  }

  if (isNightShift) {
    suggestions.push({
      type: 'timing', icon: '🌙',
      text: 'Night shift? Eat your main meal before your shift starts. Avoid heavy food after midnight',
      explanation: 'Eating heavy meals late disrupts circadian rhythm and digestion. A light post-midnight snack is better.',
      priority: 70, dismissKey: 'ctx_night_shift',
    });
  }

  // Workplace facilities
  if (workFacilities.length > 0 && !workFacilities.includes('microwave')) {
    suggestions.push({
      type: 'meal_prep', icon: '❄️',
      text: 'No microwave at work? Try no-reheat meals: wraps, curd rice, salads, boiled eggs',
      explanation: 'Without reheating, you need meals that taste good at room temp. These are designed for that.',
      priority: 45, recipes: ['curd_rice', 'veg_wrap', 'sprout_salad'], dismissKey: 'ctx_no_microwave',
    });
  }

  // #11 — Kitchen appliances
  if (kitchenApps.length > 0 && !kitchenApps.includes('oven')) {
    // Don't suggest oven recipes
  }
  if (kitchenApps.length > 0 && kitchenApps.includes('air_fryer')) {
    suggestions.push({
      type: 'meal_idea', icon: '🍟',
      text: 'You have an air fryer! Try oil-free snacks: roasted makhana, paneer tikka, grilled sandwich',
      explanation: 'Air fryers reduce oil by 80%. Perfect for crispy snacks without the calories.',
      priority: 32, recipes: ['roasted_makhana', 'paneer_tikka', 'grilled_sandwich'], dismissKey: 'ctx_air_fryer',
    });
  }

  // Cooking habits
  const cookingHabits = (profile.cookingHabits || '').toLowerCase();
  if (cookingHabits === 'none' || cookingHabits === 'minimal') {
    suggestions.push({
      type: 'meal_idea', icon: '⚡',
      text: 'Zero-cook meals: curd + muesli, fruit bowl with nuts, sprout chaat, banana shake',
      explanation: 'You prefer minimal cooking. These require no stove time and still deliver balanced nutrition.',
      priority: 50, recipes: ['muesli_curd', 'fruit_bowl', 'sprout_chaat'], dismissKey: 'ctx_no_cook',
    });
  }

  // #10 — Living situation
  if (living === 'alone') {
    suggestions.push({
      type: 'meal_prep', icon: '🏠',
      text: 'Living alone? Single-serving recipes save food waste — try chilla, egg bhurji, or overnight oats',
      explanation: 'Cooking for one often leads to waste. These recipes are perfectly portioned for a single serving.',
      priority: 30, recipes: ['moong_dal_chilla', 'egg_bhurji', 'overnight_oats'], dismissKey: 'ctx_living_alone',
    });
  }
  if (living === 'family') {
    suggestions.push({
      type: 'meal_prep', icon: '👨‍👩‍👧‍👦',
      text: 'Cooking for family? Batch recipes like dal, khichdi, and sabzi save time and money',
      explanation: 'Family cooking is efficient when batch-prepared. These recipes scale well and taste great reheated.',
      priority: 28, recipes: ['dal_rice', 'khichdi', 'aloo_gobi'], dismissKey: 'ctx_family_cooking',
    });
  }

  // ─── Weather & Season (#8 — skip weather tips if type conflicts with WeatherNudgeCard) ───

  const temp = weather.temperature;
  const season = weather.season;

  // Only show weather tips that are ACTIONABLE (food suggestions), not generic hydration
  // The WeatherNudgeCard already handles hydration/weather awareness
  // We focus on meal-specific suggestions here

  if ((temp > 34 || season === 'summer') && hour >= 11 && hour <= 14) {
    suggestions.push({
      type: 'food_suggestion', icon: '🌡️',
      text: `${temp}°C today — cool down with cucumber raita, watermelon, or buttermilk with lunch`,
      explanation: 'High temperatures increase sweat loss. Adding cooling sides to meals prevents dehydration.',
      priority: 62, recipes: ['cucumber_raita', 'buttermilk', 'watermelon_salad'],
      dismissKey: `ctx_hot_food_${getTodayKey()}`,
    });
  }

  if ((temp < 18 || season === 'winter') && hour >= 17 && hour <= 20) {
    suggestions.push({
      type: 'food_suggestion', icon: '🧣',
      text: 'Cold evening — warm up with ginger tea, soup, or dal for dinner',
      explanation: 'Cold weather increases calorie burn. Warming foods improve circulation and immunity.',
      priority: 50, recipes: ['ginger_tea', 'dal_soup', 'gajar_halwa'],
      dismissKey: `ctx_cold_food_${getTodayKey()}`,
    });
  }

  if (season === 'monsoon') {
    suggestions.push({
      type: 'food_suggestion', icon: '🌧️',
      text: 'Monsoon immunity boost — turmeric milk, ginger tea, light cooked meals. Avoid raw salads',
      explanation: 'Monsoon weakens digestive fire (Agni). Raw foods increase bacterial risk. Warm, cooked meals are safer.',
      priority: 55, recipes: ['haldi_doodh', 'moong_khichdi', 'ginger_tea'],
      dismissKey: `ctx_monsoon_${getTodayKey()}`,
    });
  }

  // ─── Last Meal & Timing ───

  if (lastMeal && lastMeal.totalCalories > 800) {
    suggestions.push({
      type: 'next_meal', icon: '🍽️',
      text: 'Your last meal was heavy. Consider a light dinner — soup, salad, or curd rice',
      explanation: `Your last meal was ${lastMeal.totalCalories} kcal. A lighter next meal keeps you within your daily target.`,
      priority: 62, recipes: ['tomato_soup', 'green_salad', 'curd_rice'],
      dismissKey: `ctx_heavy_meal_${getTodayKey()}`,
    });
  }

  if (lastMeal && lastMeal.totalCalories < 300 && todayLog.meals.length >= 1) {
    suggestions.push({
      type: 'next_meal', icon: '🥚',
      text: 'You ate very little last time — add a protein-rich snack like eggs, paneer, or nuts',
      explanation: 'Under-eating leads to energy crashes and overeating later. A protein snack stabilizes blood sugar.',
      priority: 55, recipes: ['boiled_eggs', 'paneer_tikka', 'mixed_nuts'],
      dismissKey: `ctx_light_meal_${getTodayKey()}`,
    });
  }

  if (hour >= 19 && hour <= 21 && !todayLog.meals.some(m => m.type === 'dinner')) {
    suggestions.push({
      type: 'timing', icon: '🕖',
      text: 'Dinner time! Try a light, cooked meal. Eating before 8 PM improves digestion',
      explanation: 'Late dinners disrupt sleep and metabolism. A lighter, earlier dinner is healthier.',
      priority: 48, dismissKey: `ctx_dinner_nudge_${getTodayKey()}`,
    });
  }

  // ─── Stress & Sleep ───

  const stress = (profile.stressLevel || '').toLowerCase();
  const sleep = profile.sleepHours || '';

  if (stress === 'high') {
    suggestions.push({
      type: 'wellness', icon: '😌',
      text: 'High stress? Calming foods: bananas, oats, dark chocolate, walnuts (rich in magnesium)',
      explanation: 'Stress depletes magnesium. These foods replenish it and support serotonin production.',
      priority: 52, recipes: ['banana_oat_smoothie', 'dark_choc_walnut'], dismissKey: 'ctx_stress',
    });
  }

  const sleepNum = parseFloat(sleep);
  if (!isNaN(sleepNum) && sleepNum < 6) {
    suggestions.push({
      type: 'wellness', icon: '😴',
      text: 'Low sleep increases hunger hormones — prioritize protein to stay full longer',
      explanation: 'Less than 6 hours of sleep raises ghrelin (hunger hormone) by 28%. Protein curbs this.',
      priority: 58, dismissKey: 'ctx_low_sleep',
    });
  }

  // ─── Filter: dismissed + suppressed + sort by priority, return top 3 ───

  const active = suggestions
    .filter(s => !isDismissed(s.dismissKey) && !isSuppressed(s.dismissKey))
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
