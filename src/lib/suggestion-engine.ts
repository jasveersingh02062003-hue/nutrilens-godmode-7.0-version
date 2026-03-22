// ============================================
// NutriLens AI – Meal Suggestion Engine
// ============================================
// Generates actionable food suggestions based on
// current meal gaps, user goals, and health conditions.

import type { FoodItem, UserProfile } from './store';
import { evaluateConditions } from './condition-coach';

export interface MealSuggestion {
  id: string;
  text: string;
  emoji: string;
  food: FoodItem;
  reason: string;
  priority: number;
  type: 'add' | 'swap' | 'reduce';
}

// ── Quick-add food database ──

const QUICK_ADD_FOODS: Array<FoodItem & { tags: string[] }> = [
  // High protein
  { id: 'qa_eggs', name: 'Eggs (2 boiled)', calories: 140, protein: 12, carbs: 1, fat: 9, fiber: 0, quantity: 2, unit: 'eggs', tags: ['protein', 'breakfast'] },
  { id: 'qa_paneer', name: 'Paneer (50g)', calories: 120, protein: 10, carbs: 2, fat: 8, fiber: 0, quantity: 50, unit: 'g', tags: ['protein', 'vegetarian'] },
  { id: 'qa_yogurt', name: 'Greek Yogurt (1 cup)', calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, quantity: 1, unit: 'cup', tags: ['protein', 'calcium', 'breakfast'] },
  { id: 'qa_dal', name: 'Dal (1 bowl)', calories: 120, protein: 9, carbs: 15, fat: 4, fiber: 5, quantity: 1, unit: 'bowl', tags: ['protein', 'fiber', 'vegetarian', 'low-gi'] },
  { id: 'qa_chicken', name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, quantity: 100, unit: 'g', tags: ['protein', 'non-veg'] },
  { id: 'qa_tofu', name: 'Tofu (100g)', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, quantity: 100, unit: 'g', tags: ['protein', 'vegan', 'anti-inflammatory'] },
  { id: 'qa_sprouts', name: 'Sprouts (1 bowl)', calories: 65, protein: 7, carbs: 8, fat: 0.5, fiber: 4, quantity: 1, unit: 'bowl', tags: ['protein', 'fiber', 'vegetarian'] },
  { id: 'qa_curd', name: 'Curd / Dahi (1 cup)', calories: 98, protein: 11, carbs: 4, fat: 4.3, fiber: 0, quantity: 1, unit: 'cup', tags: ['protein', 'calcium', 'probiotic'] },

  // Vegetables / fiber
  { id: 'qa_salad', name: 'Mixed Salad', calories: 50, protein: 2, carbs: 10, fat: 0.5, fiber: 3, quantity: 1, unit: 'serving', tags: ['fiber', 'veggies', 'low-cal'] },
  { id: 'qa_palak', name: 'Palak Sabzi (1 katori)', calories: 70, protein: 3, carbs: 4, fat: 5, fiber: 2.5, quantity: 1, unit: 'katori', tags: ['fiber', 'veggies', 'iron', 'folate', 'anti-inflammatory'] },
  { id: 'qa_broccoli', name: 'Steamed Broccoli', calories: 55, protein: 4, carbs: 11, fat: 0.6, fiber: 5, quantity: 1, unit: 'cup', tags: ['fiber', 'veggies'] },
  { id: 'qa_cucumber', name: 'Cucumber Raita (1 bowl)', calories: 60, protein: 3, carbs: 5, fat: 3, fiber: 0.5, quantity: 1, unit: 'bowl', tags: ['veggies', 'probiotic', 'low-cal'] },

  // Healthy fats
  { id: 'qa_almonds', name: 'Almonds (10 pcs)', calories: 70, protein: 2.5, carbs: 2.5, fat: 6, fiber: 1.5, quantity: 10, unit: 'pieces', tags: ['healthy-fat', 'anti-inflammatory'] },
  { id: 'qa_flaxseed', name: 'Flaxseed (1 tbsp)', calories: 37, protein: 1.3, carbs: 2, fat: 3, fiber: 1.9, quantity: 1, unit: 'tbsp', tags: ['healthy-fat', 'fiber', 'anti-inflammatory'] },

  // Low-GI swaps
  { id: 'qa_brown_rice', name: 'Brown Rice (1 bowl)', calories: 110, protein: 2.5, carbs: 23, fat: 0.9, fiber: 1.8, quantity: 1, unit: 'bowl', tags: ['low-gi', 'fiber'] },
  { id: 'qa_ragi_roti', name: 'Ragi Roti (1 pc)', calories: 80, protein: 2, carbs: 16, fat: 1, fiber: 3.5, quantity: 1, unit: 'piece', tags: ['low-gi', 'fiber', 'calcium', 'gluten-free'] },
  { id: 'qa_oats', name: 'Oats (1 bowl)', calories: 150, protein: 5, carbs: 27, fat: 2.5, fiber: 4, quantity: 1, unit: 'bowl', tags: ['low-gi', 'fiber', 'breakfast'] },

  // Folate-rich (pregnancy)
  { id: 'qa_beetroot', name: 'Beetroot (1 small)', calories: 35, protein: 1.3, carbs: 8, fat: 0.1, fiber: 2, quantity: 1, unit: 'piece', tags: ['folate', 'iron'] },

  // Potassium (hypertension)
  { id: 'qa_banana', name: 'Banana (1 medium)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3, quantity: 1, unit: 'piece', tags: ['potassium', 'energy'] },
  { id: 'qa_coconut_water', name: 'Coconut Water (1 glass)', calories: 46, protein: 1.7, carbs: 9, fat: 0.5, fiber: 2.6, quantity: 1, unit: 'glass', tags: ['potassium', 'hydration'] },
];

// ── Helpers ──

function getUserDietaryTags(profile: UserProfile): string[] {
  const tags: string[] = [];
  const prefs = (profile.dietaryPrefs || []).map(p => p.toLowerCase());
  if (prefs.some(p => p.includes('vegan'))) tags.push('vegan');
  else if (prefs.some(p => p.includes('vegetarian'))) tags.push('vegetarian');
  return tags;
}

function filterByDiet(foods: typeof QUICK_ADD_FOODS, profile: UserProfile): typeof QUICK_ADD_FOODS {
  const prefs = (profile.dietaryPrefs || []).map(p => p.toLowerCase());
  const isVegetarian = prefs.some(p => p.includes('vegetarian'));
  const isVegan = prefs.some(p => p.includes('vegan'));

  return foods.filter(f => {
    if (isVegan && f.tags.includes('non-veg')) return false;
    if (isVegan && !f.tags.includes('vegan') && (f.name.toLowerCase().includes('egg') || f.name.toLowerCase().includes('yogurt') || f.name.toLowerCase().includes('paneer') || f.name.toLowerCase().includes('curd') || f.name.toLowerCase().includes('chicken'))) return false;
    if (isVegetarian && f.tags.includes('non-veg')) return false;
    return true;
  });
}

// ── Main suggestion generator ──

export function generateSuggestions(
  items: FoodItem[],
  profile: UserProfile | null,
  mealType: string,
): MealSuggestion[] {
  if (!profile) return [];

  const suggestions: MealSuggestion[] = [];
  const existingNames = new Set(items.map(i => i.name.toLowerCase()));

  const totalCal = items.reduce((s, f) => s + f.calories * f.quantity, 0);
  const totalProtein = items.reduce((s, f) => s + f.protein * f.quantity, 0);
  const totalCarbs = items.reduce((s, f) => s + f.carbs * f.quantity, 0);
  const totalFat = items.reduce((s, f) => s + f.fat * f.quantity, 0);

  const mealShare = mealType === 'snack' ? 0.15 : 0.3;
  const idealProtein = profile.dailyProtein * mealShare;
  const idealCarbs = profile.dailyCarbs * mealShare;

  const eligible = filterByDiet(QUICK_ADD_FOODS, profile).filter(
    f => !existingNames.has(f.name.toLowerCase())
  );

  // 1. Low protein → suggest protein foods
  if (totalProtein < idealProtein * 0.7) {
    const proteinFoods = eligible.filter(f => f.tags.includes('protein')).slice(0, 3);
    proteinFoods.forEach(f => {
      suggestions.push({
        id: `add_${f.id}`,
        text: `+ ${f.name}`,
        emoji: '🥚',
        food: { ...f },
        reason: `+${f.protein}g protein`,
        priority: 80,
        type: 'add',
      });
    });
  }

  // 2. No veggies → suggest veggies
  const vegKeywords = ['salad', 'sabzi', 'vegetable', 'palak', 'bhindi', 'gobi', 'broccoli', 'spinach', 'beans', 'carrot', 'cucumber'];
  const hasVeggies = items.some(item => vegKeywords.some(kw => item.name.toLowerCase().includes(kw)));
  if (!hasVeggies && mealType !== 'snack') {
    const vegFoods = eligible.filter(f => f.tags.includes('veggies')).slice(0, 2);
    vegFoods.forEach(f => {
      suggestions.push({
        id: `add_${f.id}`,
        text: `+ ${f.name}`,
        emoji: '🥗',
        food: { ...f },
        reason: '+fiber & vitamins',
        priority: 70,
        type: 'add',
      });
    });
  }

  // 3. High carbs → suggest swap or reduce
  if (totalCarbs > idealCarbs * 1.3) {
    const lowGI = eligible.filter(f => f.tags.includes('low-gi')).slice(0, 2);
    lowGI.forEach(f => {
      suggestions.push({
        id: `swap_${f.id}`,
        text: `Try ${f.name}`,
        emoji: '🔄',
        food: { ...f },
        reason: 'Lower GI option',
        priority: 60,
        type: 'swap',
      });
    });
  }

  // 4. Condition-specific suggestions
  const conditions = (profile.healthConditions || []).map(c => c.toLowerCase());
  const womenHealth = (profile.womenHealth || []).map(c => c.toLowerCase());

  // Diabetes → low-GI
  if (conditions.some(c => c.includes('diabetes')) && totalCarbs > 50) {
    const lowGI = eligible.filter(f => f.tags.includes('low-gi') && !suggestions.some(s => s.food.id === f.id)).slice(0, 1);
    lowGI.forEach(f => {
      suggestions.push({
        id: `cond_${f.id}`,
        text: `+ ${f.name}`,
        emoji: '🩸',
        food: { ...f },
        reason: 'Diabetes-friendly',
        priority: 85,
        type: 'add',
      });
    });
  }

  // PCOS → protein + anti-inflammatory
  if (womenHealth.some(c => c.includes('pcos')) || conditions.some(c => c.includes('pcos'))) {
    if (totalProtein < 25) {
      const antiInflam = eligible.filter(f => f.tags.includes('anti-inflammatory') && !suggestions.some(s => s.food.id === f.id)).slice(0, 1);
      antiInflam.forEach(f => {
        suggestions.push({
          id: `cond_${f.id}`,
          text: `+ ${f.name}`,
          emoji: '🌿',
          food: { ...f },
          reason: 'Anti-inflammatory',
          priority: 75,
          type: 'add',
        });
      });
    }
  }

  // Hypertension → potassium
  if (conditions.some(c => c.includes('hypertension') || c.includes('blood pressure'))) {
    const potFoods = eligible.filter(f => f.tags.includes('potassium') && !suggestions.some(s => s.food.id === f.id)).slice(0, 1);
    potFoods.forEach(f => {
      suggestions.push({
        id: `cond_${f.id}`,
        text: `+ ${f.name}`,
        emoji: '🍌',
        food: { ...f },
        reason: 'Potassium for BP',
        priority: 65,
        type: 'add',
      });
    });
  }

  // Pregnancy → folate
  if (womenHealth.some(c => c.includes('pregnan')) || conditions.some(c => c.includes('pregnan'))) {
    const folateFoods = eligible.filter(f => f.tags.includes('folate') && !suggestions.some(s => s.food.id === f.id)).slice(0, 1);
    folateFoods.forEach(f => {
      suggestions.push({
        id: `cond_${f.id}`,
        text: `+ ${f.name}`,
        emoji: '🤰',
        food: { ...f },
        reason: 'Rich in folate',
        priority: 70,
        type: 'add',
      });
    });
  }

  // 5. Low fat → healthy fats
  const idealFat = profile.dailyFat * mealShare;
  if (totalFat < idealFat * 0.5 && mealType !== 'snack') {
    const fatFoods = eligible.filter(f => f.tags.includes('healthy-fat') && !suggestions.some(s => s.food.id === f.id)).slice(0, 1);
    fatFoods.forEach(f => {
      suggestions.push({
        id: `add_${f.id}`,
        text: `+ ${f.name}`,
        emoji: '🥜',
        food: { ...f },
        reason: 'Healthy fats',
        priority: 50,
        type: 'add',
      });
    });
  }

  // Sort by priority, deduplicate, limit
  suggestions.sort((a, b) => b.priority - a.priority);
  const seen = new Set<string>();
  return suggestions.filter(s => {
    if (seen.has(s.food.id)) return false;
    seen.add(s.food.id);
    return true;
  }).slice(0, 5);
}
