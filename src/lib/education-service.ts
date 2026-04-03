// ============================================
// NutriLens AI – Nutritional Education Service
// ============================================

import { scopedGet, scopedSet } from './scoped-storage';
import { safeJsonParse } from './safe-json';

const EDUCATION_SHOWN_KEY = 'nutrilens_education_shown_';

export interface EducationContent {
  title: string;
  icon: string;
  animationEmoji: string;   // animated hero emoji
  message: string;
  tip: string;
  funFact?: string;
}

type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const CONTENT: Record<string, Record<MealKey, EducationContent>> = {
  lose: {
    breakfast: {
      title: 'Why breakfast matters',
      icon: '🌅',
      animationEmoji: '⚡',
      message: 'Skipping breakfast can slow your metabolism and lead to overeating later. Eating within 1 hour of waking helps regulate hunger hormones like ghrelin and leptin.',
      tip: 'Even a small breakfast – like yogurt with fruit – kickstarts your metabolism!',
      funFact: 'Studies show breakfast eaters consume 12% fewer calories at lunch.',
    },
    lunch: {
      title: 'Lunch keeps you on track',
      icon: '☀️',
      animationEmoji: '🔋',
      message: 'A balanced lunch keeps your energy steady and prevents afternoon cravings. Skipping lunch often leads to poor snack choices and overeating at dinner.',
      tip: 'Aim for protein + fiber at lunch to stay full until dinner.',
      funFact: 'Your body burns most calories between 10 AM and 2 PM.',
    },
    dinner: {
      title: 'Don\'t skip dinner',
      icon: '🌙',
      animationEmoji: '🛡️',
      message: 'Eating dinner helps control late-night snacking. Aim to eat 3–4 hours before bed so your body has time to digest.',
      tip: 'A lighter dinner with protein helps recovery without disrupting sleep.',
      funFact: 'Late-night snacking adds an average of 300 extra unplanned calories.',
    },
    snack: {
      title: 'Smart snacking helps',
      icon: '🍎',
      animationEmoji: '🎯',
      message: 'Strategic snacks bridge the gap between meals and prevent energy crashes. Choose protein + fiber combos to stay satisfied.',
      tip: 'Nuts, yogurt, or fruit are quick snacks that keep you on track!',
    },
  },
  gain: {
    breakfast: {
      title: 'Fuel your morning gains',
      icon: '🌅',
      animationEmoji: '💪',
      message: 'Breakfast kickstarts muscle protein synthesis after overnight fasting. Missing it means losing 25% of your daily protein window.',
      tip: 'Start with eggs, oats, or a protein shake to hit early targets.',
      funFact: 'Muscle protein synthesis peaks in the first 3 hours after eating.',
    },
    lunch: {
      title: 'Lunch powers your growth',
      icon: '☀️',
      animationEmoji: '🏋️',
      message: 'Lunch is key to hitting your calorie and protein targets. Spread meals evenly every 3–4 hours for optimal muscle growth.',
      tip: 'Include lean protein + complex carbs for sustained energy and recovery.',
      funFact: 'Distributing protein across meals increases muscle growth by 25%.',
    },
    dinner: {
      title: 'Repair while you sleep',
      icon: '🌙',
      animationEmoji: '🔧',
      message: 'Dinner provides nutrients for overnight muscle repair. Include slow-digesting protein like casein, paneer, or cottage cheese.',
      tip: 'A protein-rich dinner supports growth hormone release during sleep.',
      funFact: 'Most muscle repair happens during deep sleep – fuel it with dinner.',
    },
    snack: {
      title: 'Snacks build muscle too',
      icon: '🍎',
      animationEmoji: '📈',
      message: 'Between-meal snacks help you reach your calorie surplus. Every missed snack is missed fuel for your muscles.',
      tip: 'Keep protein bars, nuts, or Greek yogurt handy for quick gains.',
    },
  },
  maintain: {
    breakfast: {
      title: 'Start your day right',
      icon: '🌅',
      animationEmoji: '⚖️',
      message: 'Consistent breakfast eating helps regulate your appetite throughout the day. It sets the tone for balanced eating.',
      tip: 'A balanced breakfast prevents energy dips and poor mid-morning choices.',
      funFact: 'People who eat breakfast regularly maintain healthier body weight.',
    },
    lunch: {
      title: 'Stay balanced at lunch',
      icon: '☀️',
      animationEmoji: '🧘',
      message: 'A regular lunch prevents energy dips and helps you avoid poor food choices later in the afternoon.',
      tip: 'Keep lunch consistent in timing and size for best results.',
    },
    dinner: {
      title: 'Round out your day',
      icon: '🌙',
      animationEmoji: '✨',
      message: 'Dinner rounds out your daily nutrition. Keep it balanced and satisfying to prevent late-night cravings.',
      tip: 'Include vegetables, protein, and healthy fats for a complete dinner.',
    },
    snack: {
      title: 'Bridge the gap',
      icon: '🍎',
      animationEmoji: '🌿',
      message: 'Smart snacks prevent energy dips between meals. Choose whole foods over processed options.',
      tip: 'Pair a fruit with nuts or cheese for a balanced mini-meal.',
    },
  },
};

function getGoalKey(goal: string): string {
  const g = goal.toLowerCase();
  if (g.includes('lose') || g.includes('weight loss') || g.includes('fat')) return 'lose';
  if (g.includes('gain') || g.includes('muscle') || g.includes('bulk')) return 'gain';
  return 'maintain';
}

function normalizeMealType(mealType: string): MealKey {
  if (mealType === 'snacks') return 'snack';
  if (['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) return mealType as MealKey;
  return 'snack';
}

export function getEducationContent(goal: string, mealType: string): EducationContent {
  const goalKey = getGoalKey(goal);
  const mealKey = normalizeMealType(mealType);
  return CONTENT[goalKey]?.[mealKey] || CONTENT.maintain.snack;
}

// ── Shown flag to prevent duplicates ──

export function wasEducationShown(date: string, mealType: string): boolean {
  const data = scopedGet(EDUCATION_SHOWN_KEY + date);
  if (!data) return false;
  const shown: Record<string, boolean> = safeJsonParse(data, {});
  return !!shown[mealType];
}

export function markEducationShown(date: string, mealType: string) {
  const data = scopedGet(EDUCATION_SHOWN_KEY + date);
  const shown: Record<string, boolean> = data ? safeJsonParse(data, {}) : {};
  shown[mealType] = true;
  scopedSet(EDUCATION_SHOWN_KEY + date, JSON.stringify(shown));
}
