// ============================================
// Gym Meal Engine — Time-Aware Pre/Post Workout Nutrition
// Science-backed suggestions based on gym timing, budget, and diet
// ============================================

import { getProfile, getDailyLog, toLocalDateKey, type UserProfile } from './store';

export interface MealSuggestion {
  title: string;
  items: string[];
  calories: number;
  protein: number;
  timing: string; // e.g. "1-2 hours before workout"
  tip?: string;
}

interface PrePostPair {
  pre: MealSuggestion[];
  post: MealSuggestion[];
}

// ── Standard Suggestions by Time of Day ──

const MORNING_MEALS: PrePostPair = {
  pre: [
    { title: 'Quick Energy Boost', items: ['Banana', 'Black coffee'], calories: 120, protein: 1, timing: '30-60 min before', tip: 'Drink water with electrolytes during workout' },
    { title: 'Oatmeal Power', items: ['Oatmeal with honey', 'Dates + almonds'], calories: 280, protein: 8, timing: '1 hour before' },
    { title: 'Light Fuel', items: ['2 dates', 'Handful of nuts', 'Green tea'], calories: 180, protein: 4, timing: '45 min before' },
  ],
  post: [
    { title: 'Strong Recovery', items: ['Eggs + toast', 'Glass of milk'], calories: 380, protein: 22, timing: 'Within 30 min' },
    { title: 'Protein Shake Bowl', items: ['Protein shake', 'Oats', 'Banana'], calories: 420, protein: 30, timing: 'Within 45 min' },
    { title: 'Desi Power Breakfast', items: ['Paneer bhurji', 'Multigrain roti', 'Curd'], calories: 450, protein: 28, timing: 'Within 1 hour' },
  ],
};

const AFTERNOON_MEALS: PrePostPair = {
  pre: [
    { title: 'Pre-Lunch Fuel', items: ['Apple', 'Rice cake with peanut butter'], calories: 200, protein: 5, timing: '30 min before', tip: 'Have a balanced lunch 2-3h before if possible' },
    { title: 'Light Snack', items: ['Banana', 'Handful of trail mix'], calories: 220, protein: 6, timing: '45 min before' },
  ],
  post: [
    { title: 'Recovery Bowl', items: ['Brown rice', 'Grilled chicken/paneer', 'Veggies'], calories: 480, protein: 32, timing: 'Within 45 min' },
    { title: 'Quinoa Power', items: ['Quinoa', 'Tofu/eggs', 'Sweet potato'], calories: 420, protein: 24, timing: 'Within 1 hour' },
  ],
};

const EVENING_MEALS: PrePostPair = {
  pre: [
    { title: 'Evening Snack', items: ['Peanut butter sandwich', 'Green tea'], calories: 250, protein: 8, timing: '1 hour before', tip: 'Skip if lunch was less than 3 hours ago' },
    { title: 'Quick Fuel', items: ['Rice cake with honey', 'Banana'], calories: 180, protein: 3, timing: '30-45 min before' },
  ],
  post: [
    { title: 'Recovery Dinner', items: ['Fish/paneer + roasted veggies', 'Brown rice'], calories: 450, protein: 30, timing: 'Within 1 hour' },
    { title: 'Protein Dinner', items: ['Chicken tikka/soya', 'Salad', 'Roti'], calories: 420, protein: 28, timing: 'Within 45 min', tip: 'Keep it moderate to avoid sleep disruption' },
  ],
};

const NIGHT_MEALS: PrePostPair = {
  pre: [
    { title: 'Very Light Fuel', items: ['Small banana', 'Green tea'], calories: 120, protein: 1, timing: '30 min before', tip: 'Avoid heavy food before late workouts' },
    { title: 'Minimal Pre-workout', items: ['5-6 almonds', 'Warm water'], calories: 80, protein: 3, timing: '20-30 min before' },
  ],
  post: [
    { title: 'Light Recovery', items: ['Cottage cheese/paneer', 'Boiled eggs'], calories: 250, protein: 24, timing: 'Within 30 min', tip: 'Keep it light — sleep is coming' },
    { title: 'Casein Recovery', items: ['Casein shake', 'Handful of almonds'], calories: 220, protein: 28, timing: 'Within 30 min' },
  ],
};

// ── Budget-conscious alternatives ──

const BUDGET_SWAPS: Record<string, string> = {
  'Protein shake': 'Sattu drink',
  'Protein Shake Bowl': 'Sattu + Banana Bowl',
  'Casein shake': 'Warm milk + turmeric',
  'Grilled chicken/paneer': 'Soya chunks',
  'Chicken tikka/soya': 'Soya chunks curry',
  'Fish/paneer + roasted veggies': 'Dal + roasted veggies',
  'Quinoa': 'Daliya (broken wheat)',
  'Tofu/eggs': 'Boiled eggs / moong sprouts',
  'Cottage cheese/paneer': 'Curd + chana',
  'Greek yogurt': 'Thick curd',
  'Whey protein': 'Sattu powder',
};

// ── Veg alternatives ──

const VEG_SWAPS: Record<string, string> = {
  'Eggs + toast': 'Besan cheela + toast',
  'Boiled eggs': 'Paneer cubes',
  'Grilled chicken/paneer': 'Grilled paneer',
  'Chicken tikka/soya': 'Soya tikka',
  'Fish/paneer + roasted veggies': 'Paneer + roasted veggies',
  'Tofu/eggs': 'Tofu scramble',
};

function applySwaps(suggestion: MealSuggestion, isBudget: boolean, isVeg: boolean): MealSuggestion {
  let items = [...suggestion.items];
  if (isVeg) {
    items = items.map(item => VEG_SWAPS[item] || item);
  }
  if (isBudget) {
    items = items.map(item => BUDGET_SWAPS[item] || item);
  }
  return { ...suggestion, items };
}

function getMealPair(timeOfDay: string): PrePostPair {
  switch (timeOfDay) {
    case 'morning': return MORNING_MEALS;
    case 'afternoon': return AFTERNOON_MEALS;
    case 'evening': return EVENING_MEALS;
    case 'night': return NIGHT_MEALS;
    default: return MORNING_MEALS;
  }
}

// ── Public API ──

export function getPreWorkoutSuggestion(profile: UserProfile | null): MealSuggestion | null {
  if (!profile?.gym?.goer || !profile.gym.timeOfDay) return null;
  const pair = getMealPair(profile.gym.timeOfDay);
  const isVeg = profile.dietaryPrefs?.some(d => ['vegetarian', 'vegan', 'veg'].includes(d)) || false;
  const isBudget = (profile as any).lifestyle?.budget?.enabled || false;
  const idx = Math.floor(Math.random() * pair.pre.length);
  return applySwaps(pair.pre[idx], isBudget, isVeg);
}

export function getPostWorkoutSuggestion(profile: UserProfile | null): MealSuggestion | null {
  if (!profile?.gym?.goer || !profile.gym.timeOfDay) return null;
  const pair = getMealPair(profile.gym.timeOfDay);
  const isVeg = profile.dietaryPrefs?.some(d => ['vegetarian', 'vegan', 'veg'].includes(d)) || false;
  const isBudget = (profile as any).lifestyle?.budget?.enabled || false;
  const idx = Math.floor(Math.random() * pair.post.length);
  return applySwaps(pair.post[idx], isBudget, isVeg);
}

export function shouldShowPreWorkout(profile: UserProfile | null): boolean {
  if (!profile?.gym?.goer || profile.gym.specificHour == null) return false;
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTotal = currentHour * 60 + currentMin;
  const gymTotal = profile.gym.specificHour * 60;
  const diff = gymTotal - currentTotal;
  // Show 30-60 min before gym time
  return diff >= 15 && diff <= 75;
}

export function shouldShowPostWorkout(profile: UserProfile | null): boolean {
  if (!profile?.gym?.goer || profile.gym.specificHour == null) return false;
  const today = toLocalDateKey(new Date());
  const log = getDailyLog(today);
  if (!log.gym?.attended) return false;
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTotal = currentHour * 60 + currentMin;
  const gymEnd = profile.gym.specificHour * 60 + (profile.gym.durationMinutes || 45);
  const diff = currentTotal - gymEnd;
  // Show within 90 min after gym ends
  return diff >= 0 && diff <= 90;
}

export function shouldShowCheckIn(profile: UserProfile | null): boolean {
  if (!profile?.gym?.goer || profile.gym.specificHour == null) return true; // fallback: always show
  const now = new Date();
  const currentTotal = now.getHours() * 60 + now.getMinutes();
  const gymEnd = profile.gym.specificHour * 60 + (profile.gym.durationMinutes || 45) + 30;
  // Show after expected gym end + 30 min
  return currentTotal >= gymEnd;
}

export function getGymMissedAdjustment(profile: UserProfile | null): { calorieReduction: number; carbReduction: number } {
  if (!profile) return { calorieReduction: 0, carbReduction: 0 };
  const goal = profile.goal;
  const baseCalories = profile.dailyCalories || 2000;
  if (goal === 'lose') {
    // Reduce by 8% (clamped to >= 1200)
    const reduction = Math.round(baseCalories * 0.08);
    return {
      calorieReduction: Math.min(reduction, baseCalories - 1200),
      carbReduction: 12, // percent
    };
  }
  // For maintain/gain: just reduce carbs slightly
  return { calorieReduction: 0, carbReduction: 10 };
}

export function getSleepDuration(profile: UserProfile | null): number | null {
  if (!profile?.gym?.sleepStart || !profile?.gym?.sleepEnd) return null;
  const [sh, sm] = profile.gym.sleepStart.split(':').map(Number);
  const [eh, em] = profile.gym.sleepEnd.split(':').map(Number);
  let sleepMin = sh * 60 + sm;
  let wakeMin = eh * 60 + em;
  if (wakeMin <= sleepMin) wakeMin += 24 * 60;
  return (wakeMin - sleepMin) / 60;
}

export function getLowSleepTip(profile: UserProfile | null): string | null {
  const hours = getSleepDuration(profile);
  if (hours === null || hours >= 6) return null;
  return 'Low sleep increases hunger — prioritise protein to stay full. Consider reducing workout intensity today.';
}

export function getWorkLifeTip(profile: UserProfile | null): string | null {
  if (!profile?.gym?.shiftType) return null;
  if (profile.gym.shiftType === 'night') {
    return 'Night shift: Try to gym before your shift starts. Keep post-workout meal light and protein-rich.';
  }
  if (profile.workActivity === 'physical') {
    return 'Physical job: Your body needs extra fuel. Consider adding a mid-morning snack.';
  }
  return null;
}
