import type { FoodItem, MealEntry } from '@/lib/store';
import type { UserProfile } from '@/lib/store';
import { evaluateConditions } from '@/lib/condition-coach';

export interface MealFeedback {
  message: string;
  score: number;       // 1–10
  color: 'green' | 'yellow' | 'red';
  suggestions: string[];
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  suggestedFoods: Array<{ name: string; emoji: string; reason: string }>;
}

export function getMealFeedback(
  items: FoodItem[],
  totalCalories: number,
  totalProtein: number,
  totalCarbs: number,
  totalFat: number,
  profile: UserProfile | null,
  mealType: string
): MealFeedback {
  if (items.length === 0) {
    return { message: 'No items logged yet.', score: 5, color: 'yellow', suggestions: [], remaining: null, suggestedFoods: [] };
  }

  let score = 7;
  const suggestions: string[] = [];
  const messages: string[] = [];
  const suggestedFoods: MealFeedback['suggestedFoods'] = [];

  const totalMacroG = totalProtein + totalCarbs + totalFat;
  const proteinPct = totalMacroG > 0 ? totalProtein / totalMacroG : 0;
  const carbPct = totalMacroG > 0 ? totalCarbs / totalMacroG : 0;
  const fatPct = totalMacroG > 0 ? totalFat / totalMacroG : 0;

  // Per-meal ideal targets
  const mealShare = mealType === 'snack' ? 0.15 : 0.3;
  const idealProtein = profile ? profile.dailyProtein * mealShare : 25;
  const idealCarbs = profile ? profile.dailyCarbs * mealShare : 60;
  const idealFat = profile ? profile.dailyFat * mealShare : 18;
  const idealCal = profile ? profile.dailyCalories * mealShare : 500;

  // Protein check
  if (proteinPct < 0.15) {
    score -= 2;
    const suggestion = mealType === 'breakfast'
      ? 'Adding eggs, paneer, or yogurt would boost protein.'
      : 'Consider adding dal, chicken, or tofu for more protein.';
    suggestions.push(suggestion);
    messages.push('Low in protein');
    if (mealType === 'breakfast') {
      suggestedFoods.push({ name: 'Eggs (2)', emoji: '🥚', reason: '+12g protein' });
      suggestedFoods.push({ name: 'Greek Yogurt', emoji: '🥛', reason: '+17g protein' });
      suggestedFoods.push({ name: 'Paneer (50g)', emoji: '🧀', reason: '+10g protein' });
    } else {
      suggestedFoods.push({ name: 'Dal (1 bowl)', emoji: '🍲', reason: '+9g protein' });
      suggestedFoods.push({ name: 'Chicken (100g)', emoji: '🍗', reason: '+25g protein' });
      suggestedFoods.push({ name: 'Tofu (100g)', emoji: '🫘', reason: '+8g protein' });
    }
  } else if (proteinPct > 0.25) {
    score += 1;
    messages.push('Great protein content');
  }

  // Carb check
  if (carbPct > 0.65) {
    score -= 1;
    suggestions.push('Pair carbs with protein to balance blood sugar.');
    messages.push('High in carbs');
  }

  // Fat check
  if (fatPct > 0.40) {
    score -= 1;
    suggestions.push('This meal is high in fat – balance with lighter options later.');
    messages.push('High in fat');
  }

  // Calorie check relative to daily goals
  if (profile) {
    if (totalCalories > idealCal * 1.3) {
      score -= 1;
      suggestions.push('This meal is over your typical budget – plan lighter for next meals.');
    }
  }

  // Very light meal
  if (totalCalories < 150 && mealType !== 'snack') {
    score -= 1;
    suggestions.push('This meal seems very light – you may feel hungry soon.');
    messages.push('Very light meal');
  }

  // Veggie detection
  const vegKeywords = ['salad', 'sabzi', 'vegetable', 'palak', 'bhindi', 'gobi', 'broccoli', 'spinach', 'beans', 'carrot', 'cucumber', 'tomato', 'capsicum'];
  const hasVeggies = items.some(item =>
    vegKeywords.some(kw => item.name.toLowerCase().includes(kw))
  );
  if (!hasVeggies && mealType !== 'snack') {
    suggestions.push('No veggies detected – try adding a side salad or sabzi.');
    if (suggestedFoods.length < 3) {
      suggestedFoods.push({ name: 'Mixed Salad', emoji: '🥗', reason: '+fiber & vitamins' });
    }
  } else if (hasVeggies) {
    score += 1;
  }

  // Condition-based scoring adjustment
  if (profile) {
    const condFeedback = evaluateConditions(items, totalCarbs, totalProtein, totalFat, totalCalories, profile);
    const condWarnings = condFeedback.messages.filter(m => m.type === 'warning').length;
    const condCautions = condFeedback.messages.filter(m => m.type === 'caution').length;
    score -= condWarnings * 1.5;
    score -= condCautions * 0.5;
    // Add top condition message to suggestions
    const topCondMsg = condFeedback.messages.find(m => m.type === 'warning' || m.type === 'caution');
    if (topCondMsg && !suggestions.includes(topCondMsg.text)) {
      suggestions.unshift(topCondMsg.text);
    }
  }

  score = Math.max(1, Math.min(10, score));
  const color: MealFeedback['color'] = score >= 7 ? 'green' : score >= 4 ? 'yellow' : 'red';

  // Remaining needs
  const remaining = profile ? {
    calories: Math.max(0, Math.round(idealCal - totalCalories)),
    protein: Math.max(0, Math.round(idealProtein - totalProtein)),
    carbs: Math.max(0, Math.round(idealCarbs - totalCarbs)),
    fat: Math.max(0, Math.round(idealFat - totalFat)),
  } : null;

  let message: string;
  if (score >= 8) {
    message = 'Great balanced meal! Good mix of protein, carbs, and healthy fats. 👏';
  } else if (score >= 6) {
    message = messages.length > 0
      ? `${messages.join('. ')}. ${suggestions[0] || 'Overall decent meal.'}`
      : 'Decent meal – small tweaks could make it even better.';
  } else {
    message = messages.length > 0
      ? `${messages.join('. ')}. ${suggestions[0] || 'Consider rebalancing your macros.'}`
      : 'This meal could use improvement – check suggestions below.';
  }

  return { message, score, color, suggestions, remaining, suggestedFoods };
}

export function getMealHealthColor(
  meals: MealEntry[],
  profile: UserProfile | null,
  mealType: string
): 'green' | 'yellow' | 'red' | null {
  if (meals.length === 0) return null;
  const items = meals.flatMap(m => m.items);
  const totalCal = meals.reduce((s, m) => s + m.totalCalories, 0);
  const totalP = meals.reduce((s, m) => s + m.totalProtein, 0);
  const totalC = meals.reduce((s, m) => s + m.totalCarbs, 0);
  const totalF = meals.reduce((s, m) => s + m.totalFat, 0);
  const fb = getMealFeedback(items, totalCal, totalP, totalC, totalF, profile, mealType);
  return fb.color;
}
