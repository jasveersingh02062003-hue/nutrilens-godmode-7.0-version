// ============================================
// NutriLens AI – Unified Health Score Service
// ============================================
// Scores meals against ALL active user conditions and goals.
// Single entry point for the entire app.

import type { FoodItem, UserProfile } from './store';
import { scoreMealForPCOS, getPCOSCondition, type PCOSMealScore } from './pcos-score';

// ── Food keyword lists ──

const HIGH_GI_FOODS = [
  'white rice', 'rice', 'potato', 'cornflakes', 'sugar', 'white bread',
  'bread', 'maida', 'naan', 'instant noodles', 'puri', 'jalebi',
  'gulab jamun', 'rasmalai', 'halwa', 'kheer', 'cake', 'biscuit',
  'mango', 'watermelon', 'pineapple', 'bhatura', 'kachori',
  'paratha', 'biryani', 'pulao',
];

const LOW_GI_FOODS = [
  'dal', 'lentil', 'chana', 'rajma', 'moong', 'oats', 'brown rice',
  'quinoa', 'barley', 'sweet potato', 'apple', 'pear', 'orange',
  'sabzi', 'salad', 'sprouts', 'millet', 'ragi', 'jowar',
];

const HIGH_SODIUM_FOODS = [
  'pickle', 'achar', 'papad', 'chips', 'namkeen', 'biscuit',
  'processed', 'sausage', 'canned', 'instant noodle', 'maggi',
  'cheese', 'ketchup', 'soy sauce', 'chaat masala', 'bhujia',
];

const POTASSIUM_FOODS = [
  'banana', 'spinach', 'palak', 'sweet potato', 'coconut water',
  'avocado', 'beans', 'lentil', 'dal', 'tomato', 'orange', 'pomegranate',
];

const DAIRY_FOODS = [
  'milk', 'paneer', 'cheese', 'cream', 'ice cream', 'kheer',
  'rasmalai', 'rabri', 'lassi', 'butter', 'curd', 'yogurt', 'dahi',
  'ghee', 'raita', 'whey',
];

const SUGAR_FOODS = [
  'sugar', 'jaggery', 'honey', 'syrup', 'jalebi', 'gulab jamun',
  'ladoo', 'barfi', 'halwa', 'mithai', 'cake', 'pastry',
  'cola', 'soda', 'sweet', 'candy', 'chocolate',
];

const GUT_HEALTHY_FOODS = [
  'curd', 'yogurt', 'dahi', 'buttermilk', 'chaas', 'kimchi',
  'idli', 'dosa', 'dhokla', 'kanji', 'oats', 'banana',
  'garlic', 'onion', 'flaxseed', 'apple', 'barley',
];

// ── Helpers ──

function itemMatches(item: FoodItem, keywords: string[]): boolean {
  const name = item.name.toLowerCase();
  return keywords.some(kw => name.includes(kw));
}

function matchedNames(items: FoodItem[], keywords: string[]): string[] {
  return items.filter(i => itemMatches(i, keywords)).map(i => i.name);
}

function matchCount(items: FoodItem[], keywords: string[]): number {
  return items.filter(i => itemMatches(i, keywords)).length;
}

// ── Per-condition scoring ──

export interface ConditionScore {
  condition: string;
  icon: string;
  score: number;       // 0–100
  color: 'green' | 'yellow' | 'red';
  reasons: string[];
  tips: string[];
}

function scoreForDiabetes(
  items: FoodItem[],
  totalCarbs: number,
  totalProtein: number,
  profile: UserProfile
): ConditionScore {
  let score = 100;
  const reasons: string[] = [];
  const tips: string[] = [];
  const conditions = (profile as unknown as Record<string, unknown>).conditions as Record<string, any> | undefined;
  const dtype = conditions?.diabetes?.type || 'type2';

  // High-GI penalty
  const highGI = matchedNames(items, HIGH_GI_FOODS);
  if (highGI.length > 0) {
    score -= 15 * highGI.length;
    reasons.push(`High-GI foods (${highGI.slice(0, 2).join(', ')}) may spike blood sugar`);
    tips.push('Swap white rice for brown rice or millets');
  }

  // Low-GI bonus
  if (matchCount(items, LOW_GI_FOODS) > 0) {
    score += 10;
    reasons.push('Includes low-GI foods (great for blood sugar)');
  }

  // Sugar penalty
  const sugarItems = matchedNames(items, SUGAR_FOODS);
  if (sugarItems.length > 0) {
    score -= 15 * sugarItems.length;
    reasons.push('Contains sugary foods – limit for diabetes');
    tips.push('Try berries or dates as natural alternatives');
  }

  // High carb penalty
  if (totalCarbs > 60) {
    score -= 10;
    reasons.push(`High carbs (${Math.round(totalCarbs)}g) – aim for 45-60g/meal`);
  } else if (totalCarbs <= 50 && totalProtein >= 20) {
    score += 10;
    reasons.push('Good protein-to-carb ratio');
  }

  score = Math.max(0, Math.min(100, score));
  const color: ConditionScore['color'] = score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red';
  return { condition: 'Diabetes', icon: '🩸', score, color, reasons, tips };
}

function scoreForHypertension(
  items: FoodItem[],
): ConditionScore {
  let score = 100;
  const reasons: string[] = [];
  const tips: string[] = [];

  const highSodium = matchedNames(items, HIGH_SODIUM_FOODS);
  if (highSodium.length > 0) {
    score -= 15 * highSodium.length;
    reasons.push(`High-sodium foods (${highSodium.slice(0, 2).join(', ')}) may raise BP`);
    tips.push('Use fresh herbs and lemon instead of salt');
  }

  const potassium = matchCount(items, POTASSIUM_FOODS);
  if (potassium > 0) {
    score += Math.min(15, potassium * 5);
    reasons.push('Potassium-rich foods help lower blood pressure');
  }

  score = Math.max(0, Math.min(100, score));
  const color: ConditionScore['color'] = score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red';
  return { condition: 'Hypertension', icon: '🧂', score, color, reasons, tips };
}

function scoreForLactose(
  items: FoodItem[],
): ConditionScore {
  let score = 100;
  const reasons: string[] = [];
  const tips: string[] = [];

  const dairy = matchedNames(items, DAIRY_FOODS);
  if (dairy.length > 0) {
    score -= 20 * dairy.length;
    reasons.push(`Dairy detected (${dairy.slice(0, 2).join(', ')}) – may cause discomfort`);
    tips.push('Try almond milk, coconut curd, or soy alternatives');
  }

  score = Math.max(0, Math.min(100, score));
  const color: ConditionScore['color'] = score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red';
  return { condition: 'Lactose', icon: '🥛', score, color, reasons, tips };
}

function scoreForProteinGoal(
  items: FoodItem[],
  totalProtein: number,
): ConditionScore {
  let score = 100;
  const reasons: string[] = [];
  const tips: string[] = [];

  if (totalProtein >= 30) {
    score += 10;
    reasons.push(`Great protein (${Math.round(totalProtein)}g) – on track for your goal`);
  } else if (totalProtein >= 20) {
    reasons.push(`Decent protein (${Math.round(totalProtein)}g) – try to hit 30g+`);
  } else {
    score -= 15;
    reasons.push(`Low protein (${Math.round(totalProtein)}g) – aim for 30g+ per meal`);
    tips.push('Add eggs, chicken, paneer, or protein shake');
  }

  score = Math.max(0, Math.min(100, score));
  const color: ConditionScore['color'] = score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red';
  return { condition: 'Protein Goal', icon: '💪', score, color, reasons, tips };
}

function scoreForGutHealth(
  items: FoodItem[],
): ConditionScore {
  let score = 80; // neutral start
  const reasons: string[] = [];
  const tips: string[] = [];

  const gutFoods = matchCount(items, GUT_HEALTHY_FOODS);
  if (gutFoods > 0) {
    score += Math.min(20, gutFoods * 8);
    reasons.push('Includes gut-friendly foods (probiotics/fiber)');
  } else {
    score -= 10;
    reasons.push('No probiotic or prebiotic foods detected');
    tips.push('Add curd, buttermilk, or oats for gut health');
  }

  score = Math.max(0, Math.min(100, score));
  const color: ConditionScore['color'] = score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red';
  return { condition: 'Gut Health', icon: '🦠', score, color, reasons, tips };
}

// ── Unified scoring ──

export interface UnifiedMealScore {
  overallScore: number;     // 0–100 weighted average
  overallColor: 'green' | 'yellow' | 'red';
  conditionScores: ConditionScore[];
  topReasons: string[];
  topTips: string[];
}

export function scoreUnifiedMeal(
  items: FoodItem[],
  totalCarbs: number,
  totalProtein: number,
  totalFat: number,
  totalCalories: number,
  profile: UserProfile | null,
): UnifiedMealScore {
  if (!profile || items.length === 0) {
    return { overallScore: 100, overallColor: 'green', conditionScores: [], topReasons: [], topTips: [] };
  }

  const conditions = ((profile as unknown as Record<string, unknown>).conditions || {}) as Record<string, any>;
  const healthGoals: string[] = ((profile as unknown as Record<string, unknown>).healthGoals || []) as string[];
  const healthConditions: string[] = profile.healthConditions || [];
  const scores: ConditionScore[] = [];

  // PCOS (reuse existing)
  if (conditions.pcos?.has || profile.womenHealth?.includes('pcos')) {
    const pcosCondition = getPCOSCondition(profile);
    if (pcosCondition?.has) {
      const pcos = scoreMealForPCOS(items, totalCarbs, totalProtein, totalFat, totalCalories, pcosCondition);
      scores.push({
        condition: 'PCOS',
        icon: '💜',
        score: pcos.score,
        color: pcos.color,
        reasons: pcos.reasons,
        tips: pcos.tips,
      });
    }
  }

  // Diabetes
  if (conditions.diabetes?.has || healthConditions.includes('diabetes')) {
    scores.push(scoreForDiabetes(items, totalCarbs, totalProtein, profile));
  }

  // Hypertension
  if (conditions.hypertension?.has || healthConditions.includes('hypertension')) {
    scores.push(scoreForHypertension(items));
  }

  // Lactose intolerance
  if (conditions.lactoseIntolerance?.has || healthConditions.includes('lactose_intolerance')) {
    scores.push(scoreForLactose(items));
  }

  // High-protein goal
  if (healthGoals.includes('high-protein') || healthGoals.includes('muscle-gain')) {
    scores.push(scoreForProteinGoal(items, totalProtein));
  }

  // Gut health goal
  if (healthGoals.includes('gut-health')) {
    scores.push(scoreForGutHealth(items));
  }

  if (scores.length === 0) {
    return { overallScore: 100, overallColor: 'green', conditionScores: [], topReasons: [], topTips: [] };
  }

  // Weighted average (equal weights for now)
  const overallScore = Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length);
  const overallColor: UnifiedMealScore['overallColor'] =
    overallScore >= 75 ? 'green' : overallScore >= 50 ? 'yellow' : 'red';

  // Collect top reasons/tips from worst-scoring conditions
  const sorted = [...scores].sort((a, b) => a.score - b.score);
  const topReasons = sorted.flatMap(s => s.reasons).slice(0, 4);
  const topTips = sorted.flatMap(s => s.tips).slice(0, 3);

  return { overallScore, overallColor, conditionScores: scores, topReasons, topTips };
}

// ── Score a full day ──

export function scoreDayUnified(
  meals: Array<{ items: FoodItem[]; totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number }>,
  profile: UserProfile | null,
): { avgScore: number; color: 'green' | 'yellow' | 'red'; mealScores: UnifiedMealScore[] } {
  if (!profile || meals.length === 0) {
    return { avgScore: 100, color: 'green', mealScores: [] };
  }

  const mealScores = meals.map(m =>
    scoreUnifiedMeal(m.items, m.totalCarbs, m.totalProtein, m.totalFat, m.totalCalories, profile)
  );

  const avgScore = Math.round(mealScores.reduce((s, m) => s + m.overallScore, 0) / mealScores.length);
  const color: 'green' | 'yellow' | 'red' = avgScore >= 75 ? 'green' : avgScore >= 50 ? 'yellow' : 'red';

  return { avgScore, color, mealScores };
}

// ── Check if user has ANY health conditions ──

export function userHasHealthConditions(profile: UserProfile | null): boolean {
  if (!profile) return false;
  const conditions = ((profile as unknown as Record<string, unknown>).conditions || {}) as Record<string, any>;
  const healthGoals: string[] = ((profile as unknown as Record<string, unknown>).healthGoals || []) as string[];
  const healthConditions: string[] = profile.healthConditions || [];

  if (conditions.pcos?.has || conditions.diabetes?.has || conditions.hypertension?.has || conditions.lactoseIntolerance?.has) return true;
  if (healthConditions.some((c: string) => ['diabetes', 'hypertension', 'lactose_intolerance'].includes(c))) return true;
  if (profile.womenHealth?.includes('pcos')) return true;
  if (healthGoals.includes('high-protein') || healthGoals.includes('muscle-gain') || healthGoals.includes('gut-health')) return true;
  return false;
}

// ── Get active condition labels for display ──

export function getActiveConditionLabels(profile: UserProfile | null): Array<{ label: string; icon: string }> {
  if (!profile) return [];
  const labels: Array<{ label: string; icon: string }> = [];
  const conditions = (profile as any).conditions || {};
  const healthGoals: string[] = (profile as any).healthGoals || [];
  const healthConditions: string[] = profile.healthConditions || [];

  if (conditions.pcos?.has || profile.womenHealth?.includes('pcos')) labels.push({ label: 'PCOS', icon: '💜' });
  if (conditions.diabetes?.has || healthConditions.includes('diabetes')) labels.push({ label: 'Diabetes', icon: '🩸' });
  if (conditions.hypertension?.has || healthConditions.includes('hypertension')) labels.push({ label: 'BP', icon: '🧂' });
  if (conditions.lactoseIntolerance?.has || healthConditions.includes('lactose_intolerance')) labels.push({ label: 'Lactose', icon: '🥛' });
  if (healthGoals.includes('high-protein') || healthGoals.includes('muscle-gain')) labels.push({ label: 'Protein', icon: '💪' });
  if (healthGoals.includes('gut-health')) labels.push({ label: 'Gut', icon: '🦠' });

  return labels;
}

// ── Condition-specific food recommendations ──

export function getConditionRecommendations(profile: UserProfile | null): Array<{ name: string; emoji: string; reason: string }> {
  if (!profile) return [];
  const recs: Array<{ name: string; emoji: string; reason: string }> = [];
  const conditions = (profile as any).conditions || {};
  const healthGoals: string[] = (profile as any).healthGoals || [];
  const healthConditions: string[] = profile.healthConditions || [];

  if (conditions.diabetes?.has || healthConditions.includes('diabetes')) {
    recs.push(
      { name: 'Oats', emoji: '🥣', reason: 'Low-GI, stabilises blood sugar' },
      { name: 'Bitter Gourd', emoji: '🥒', reason: 'Natural blood sugar reducer' },
    );
  }
  if (conditions.hypertension?.has || healthConditions.includes('hypertension')) {
    recs.push(
      { name: 'Banana', emoji: '🍌', reason: 'Potassium helps lower BP' },
      { name: 'Spinach', emoji: '🥬', reason: 'Magnesium supports heart health' },
    );
  }
  if (conditions.lactoseIntolerance?.has || healthConditions.includes('lactose_intolerance')) {
    recs.push(
      { name: 'Almond Milk', emoji: '🥛', reason: 'Dairy-free calcium source' },
      { name: 'Coconut Curd', emoji: '🥥', reason: 'Probiotic without lactose' },
    );
  }
  if (healthGoals.includes('high-protein') || healthGoals.includes('muscle-gain')) {
    recs.push(
      { name: 'Eggs (3)', emoji: '🥚', reason: '+18g complete protein' },
      { name: 'Chicken Breast', emoji: '🍗', reason: '+31g lean protein' },
    );
  }
  if (healthGoals.includes('gut-health')) {
    recs.push(
      { name: 'Curd / Yogurt', emoji: '🥣', reason: 'Natural probiotic' },
      { name: 'Buttermilk', emoji: '🥤', reason: 'Digestive aid with probiotics' },
    );
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return recs.filter(r => { if (seen.has(r.name)) return false; seen.add(r.name); return true; }).slice(0, 8);
}
