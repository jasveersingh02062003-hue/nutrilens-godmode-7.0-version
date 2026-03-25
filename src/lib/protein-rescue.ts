// ==========================================
// NutriLens AI – Protein Rescue System
// Triggers after 6 PM when remaining protein > 40g
// ==========================================

import { type UserProfile, getDailyLog, getDailyTotals, addMealToLog, type MealEntry } from './store';
import { getProteinTarget } from './calorie-correction';

export interface ProteinRescueOption {
  id: string;
  name: string;
  emoji: string;
  protein: number;
  calories: number;
  cost: number;
  items: Array<{ name: string; protein: number; calories: number }>;
}

const RESCUE_OPTIONS: ProteinRescueOption[] = [
  {
    id: 'rescue_eggs_curd',
    name: '2 Eggs + Curd (200g)',
    emoji: '🥚',
    protein: 18,
    calories: 230,
    cost: 25,
    items: [
      { name: 'Boiled Egg', protein: 6, calories: 70 },
      { name: 'Boiled Egg', protein: 6, calories: 70 },
      { name: 'Curd (200g)', protein: 6, calories: 90 },
    ],
  },
  {
    id: 'rescue_soya',
    name: 'Soya Chunks Stir-fry (50g)',
    emoji: '🫘',
    protein: 26,
    calories: 150,
    cost: 15,
    items: [
      { name: 'Soya Chunks (50g)', protein: 26, calories: 150 },
    ],
  },
  {
    id: 'rescue_chana_egg',
    name: 'Roasted Chana + Egg',
    emoji: '🥜',
    protein: 14,
    calories: 190,
    cost: 20,
    items: [
      { name: 'Roasted Chana (50g)', protein: 8, calories: 120 },
      { name: 'Boiled Egg', protein: 6, calories: 70 },
    ],
  },
];

const DISMISSED_KEY = 'nutrilens_protein_rescue_dismissed';
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export function checkProteinRescue(profile: UserProfile): {
  needed: boolean;
  remaining: number;
  options: ProteinRescueOption[];
} {
  const hour = new Date().getHours();
  if (hour < 18) return { needed: false, remaining: 0, options: [] };

  const log = getDailyLog();
  const totals = getDailyTotals(log);
  const target = getProteinTarget(profile);
  const remaining = target - totals.protein;

  if (remaining <= 40) return { needed: false, remaining: 0, options: [] };

  // Check cooldown
  const dismissed = localStorage.getItem(DISMISSED_KEY);
  if (dismissed) {
    const dismissedAt = parseInt(dismissed, 10);
    if (Date.now() - dismissedAt < COOLDOWN_MS) {
      return { needed: false, remaining, options: [] };
    }
  }

  return { needed: true, remaining: Math.round(remaining), options: RESCUE_OPTIONS };
}

export function dismissProteinRescue(): void {
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
}

export function applyRescueOption(option: ProteinRescueOption): void {
  const meal: MealEntry = {
    id: `rescue_${Date.now()}`,
    type: 'dinner',
    items: option.items.map((item, idx) => ({
      id: `rescue_item_${Date.now()}_${idx}`,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: 0,
      fat: 0,
      quantity: 1,
      unit: 'serving',
      emoji: option.emoji,
      itemCost: Math.round(option.cost / option.items.length),
    })),
    totalCalories: option.calories,
    totalProtein: option.protein,
    totalCarbs: 0,
    totalFat: 0,
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    cost: { amount: option.cost },
  };
  addMealToLog(meal);
}
