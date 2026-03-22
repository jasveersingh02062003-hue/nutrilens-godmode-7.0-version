// ============================================
// NutriLens AI – Unified Rule Engine
// ============================================
// Consolidates food evaluation, recipe filtering,
// dietary enforcement, and budget checks into one module.
// Used by camera flow, meal planner, and AI coach.

import type { FoodItem, UserProfile } from './store';

// ── Condition Rules ──

export interface ConditionRule {
  avoidTags: string[];
  preferTags: string[];
  avoidKeywords: string[];
  preferKeywords: string[];
}

export const conditionRules: Record<string, ConditionRule> = {
  diabetes: {
    avoidTags: ['highGI', 'highSugar', 'refined'],
    preferTags: ['lowGI', 'highFiber', 'whole-grain'],
    avoidKeywords: ['sugar', 'jalebi', 'gulab jamun', 'cake', 'white rice', 'white bread', 'maida', 'cornflakes', 'instant noodles'],
    preferKeywords: ['oats', 'brown rice', 'quinoa', 'dal', 'sprouts', 'millet', 'ragi', 'barley'],
  },
  pcos: {
    avoidTags: ['highGI', 'inflammatory', 'processed'],
    preferTags: ['lowGI', 'antiInflammatory', 'highProtein'],
    avoidKeywords: ['sugar', 'maida', 'fried', 'processed', 'soda', 'juice'],
    preferKeywords: ['turmeric', 'flaxseed', 'nuts', 'leafy greens', 'berries', 'fish', 'lean protein'],
  },
  hypertension: {
    avoidTags: ['highSodium', 'processed'],
    preferTags: ['lowSodium', 'potassiumRich'],
    avoidKeywords: ['pickle', 'papad', 'chips', 'namkeen', 'canned', 'processed', 'sausage'],
    preferKeywords: ['banana', 'spinach', 'sweet potato', 'avocado', 'yogurt'],
  },
  lactose_intolerance: {
    avoidTags: ['dairy'],
    preferTags: ['dairyFree'],
    avoidKeywords: ['milk', 'paneer', 'cheese', 'cream', 'butter', 'ghee', 'curd', 'yogurt', 'kheer', 'ice cream'],
    preferKeywords: ['almond milk', 'soy milk', 'coconut milk', 'tofu'],
  },
  thyroid: {
    avoidTags: ['goitrogenic'],
    preferTags: ['seleniumRich', 'iodineRich'],
    avoidKeywords: ['soy', 'raw broccoli', 'raw cabbage', 'raw cauliflower'],
    preferKeywords: ['brazil nuts', 'eggs', 'fish', 'iodised salt', 'seaweed'],
  },
  cholesterol: {
    avoidTags: ['highSatFat', 'fried', 'processed'],
    preferTags: ['heartHealthy', 'highFiber'],
    avoidKeywords: ['fried', 'butter', 'ghee', 'cream', 'red meat', 'organ meat', 'egg yolk'],
    preferKeywords: ['oats', 'almonds', 'walnuts', 'olive oil', 'fish', 'flaxseed'],
  },
};

// ── Dietary Preference Rules ──

export const dietaryRules: Record<string, { excludeKeywords: string[]; requireTags?: string[] }> = {
  vegetarian: {
    excludeKeywords: ['chicken', 'mutton', 'fish', 'egg', 'prawn', 'shrimp', 'meat', 'pork', 'beef', 'lamb', 'kebab'],
    requireTags: ['vegetarian', 'veg'],
  },
  vegan: {
    excludeKeywords: ['chicken', 'mutton', 'fish', 'egg', 'milk', 'paneer', 'cheese', 'cream', 'butter', 'ghee', 'curd', 'yogurt', 'honey', 'meat'],
    requireTags: ['vegan'],
  },
  keto: {
    excludeKeywords: ['rice', 'roti', 'bread', 'naan', 'pasta', 'sugar', 'potato', 'banana'],
  },
  gluten_free: {
    excludeKeywords: ['wheat', 'roti', 'chapati', 'naan', 'bread', 'pasta', 'maida', 'atta', 'semolina', 'barley'],
  },
  dairy_free: {
    excludeKeywords: ['milk', 'paneer', 'cheese', 'cream', 'butter', 'ghee', 'curd', 'yogurt', 'kheer', 'ice cream'],
  },
};

// ── Food Evaluation Result ──

export interface FoodEvaluation {
  warnings: FoodWarning[];
  positives: string[];
  overallSafety: 'safe' | 'caution' | 'avoid';
}

export interface FoodWarning {
  message: string;
  severity: 'info' | 'warning' | 'critical';
  condition: string;
  icon: string;
}

/**
 * Evaluate a food item against user's health conditions and dietary preferences.
 * Returns warnings, positive notes, and an overall safety assessment.
 */
export function evaluateFoodForUser(food: FoodItem, profile: UserProfile | null): FoodEvaluation {
  if (!profile) return { warnings: [], positives: [], overallSafety: 'safe' };

  const warnings: FoodWarning[] = [];
  const positives: string[] = [];
  const foodName = food.name.toLowerCase();

  // Check health conditions
  const conditions = profile.healthConditions || [];
  const womenHealth = profile.womenHealth || [];

  for (const condition of conditions) {
    const rules = conditionRules[condition];
    if (!rules) continue;

    const hasAvoid = rules.avoidKeywords.some(kw => foodName.includes(kw));
    const hasPrefer = rules.preferKeywords.some(kw => foodName.includes(kw));

    if (hasAvoid) {
      warnings.push({
        message: getConditionWarning(condition, food.name),
        severity: 'warning',
        condition,
        icon: getConditionIcon(condition),
      });
    }
    if (hasPrefer) {
      positives.push(`✅ Good choice for ${formatConditionName(condition)}`);
    }
  }

  // PCOS from women's health
  if (womenHealth.includes('pcos')) {
    const rules = conditionRules.pcos;
    const hasAvoid = rules.avoidKeywords.some(kw => foodName.includes(kw));
    const hasPrefer = rules.preferKeywords.some(kw => foodName.includes(kw));
    if (hasAvoid) {
      warnings.push({
        message: 'This food may worsen PCOS symptoms. Consider anti-inflammatory options.',
        severity: 'warning',
        condition: 'pcos',
        icon: '🩺',
      });
    }
    if (hasPrefer) positives.push('✅ Anti-inflammatory — good for PCOS');
  }

  // Check dietary preferences
  const dietPrefs = profile.dietaryPrefs || [];
  for (const pref of dietPrefs) {
    const rules = dietaryRules[pref];
    if (!rules) continue;
    const violates = rules.excludeKeywords.some(kw => foodName.includes(kw));
    if (violates) {
      warnings.push({
        message: `This contains ingredients not aligned with your ${formatDietName(pref)} preference.`,
        severity: 'info',
        condition: pref,
        icon: '🍽️',
      });
    }
  }

  const overallSafety: 'safe' | 'caution' | 'avoid' =
    warnings.some(w => w.severity === 'critical') ? 'avoid' :
    warnings.length > 0 ? 'caution' : 'safe';

  return { warnings, positives, overallSafety };
}

/**
 * Filter recipes based on user conditions and diet.
 */
export function filterRecipesForUser(
  recipes: Array<{ tags: string[]; name: string; [key: string]: any }>,
  profile: UserProfile | null
): typeof recipes {
  if (!profile) return recipes;

  let filtered = [...recipes];
  const conditions = profile.healthConditions || [];
  const dietPrefs = profile.dietaryPrefs || [];
  const womenHealth = profile.womenHealth || [];

  // Filter by conditions
  for (const condition of [...conditions, ...(womenHealth.includes('pcos') ? ['pcos'] : [])]) {
    const rules = conditionRules[condition];
    if (!rules) continue;
    filtered = filtered.filter(r => {
      const name = r.name.toLowerCase();
      return !rules.avoidKeywords.some(kw => name.includes(kw));
    });
  }

  // Filter by dietary prefs
  for (const pref of dietPrefs) {
    const rules = dietaryRules[pref];
    if (!rules) continue;
    filtered = filtered.filter(r => {
      const name = r.name.toLowerCase();
      return !rules.excludeKeywords.some(kw => name.includes(kw));
    });
  }

  return filtered;
}

/**
 * Check if a meal cost is within the user's budget for a specific meal type.
 */
export function getMealBudget(profile: UserProfile | null, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'): number {
  if (!profile) return Infinity;
  const budget = (profile as any).budget;
  if (!budget?.enabled) return Infinity;

  const defaultSplit = { breakfast: 25, lunch: 30, dinner: 30, snacks: 15 };
  const split = budget.mealSplit || defaultSplit;
  const dailyAmount = budget.period === 'weekly' ? budget.amount / 7
    : budget.period === 'monthly' ? budget.amount / 30
    : budget.amount;

  return (dailyAmount * (split[mealType] || 25)) / 100;
}

export function isWithinBudget(cost: number, profile: UserProfile | null, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'): boolean {
  return cost <= getMealBudget(profile, mealType);
}

/**
 * Validate weight goal — warn if unrealistic.
 */
export function validateWeightGoal(
  currentWeight: number,
  targetWeight: number,
  goalSpeed: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const diff = Math.abs(currentWeight - targetWeight);
  const pctChange = (diff / currentWeight) * 100;

  if (goalSpeed > 1) {
    warnings.push('Losing more than 1 kg/week is not recommended and can cause muscle loss.');
  }
  if (pctChange > 25) {
    warnings.push(`Your target requires a ${pctChange.toFixed(0)}% change in body weight. Consider setting an intermediate goal.`);
  }
  if (diff > 0) {
    const weeksNeeded = diff / goalSpeed;
    if (weeksNeeded > 52) {
      warnings.push(`This goal would take ~${Math.round(weeksNeeded / 4)} months. Consider breaking it into phases.`);
    }
  }

  return { valid: warnings.length === 0, warnings };
}

// ── Helpers ──

function getConditionWarning(condition: string, foodName: string): string {
  const messages: Record<string, string> = {
    diabetes: `${foodName} may spike blood sugar. Consider a low-GI alternative.`,
    hypertension: `${foodName} may be high in sodium. Try a low-sodium option.`,
    thyroid: `${foodName} may interfere with thyroid function. Consult your doctor.`,
    cholesterol: `${foodName} may be high in saturated fat. Consider heart-healthy alternatives.`,
    lactose_intolerance: `${foodName} contains dairy — may cause discomfort. Try lactose-free alternatives.`,
  };
  return messages[condition] || `${foodName} may not be ideal for your ${condition} condition.`;
}

function getConditionIcon(condition: string): string {
  const icons: Record<string, string> = {
    diabetes: '🩸', hypertension: '🫀', thyroid: '🦋',
    cholesterol: '💊', lactose_intolerance: '🥛', pcos: '🩺',
  };
  return icons[condition] || '⚠️';
}

function formatConditionName(condition: string): string {
  const names: Record<string, string> = {
    diabetes: 'Diabetes', hypertension: 'Blood Pressure', thyroid: 'Thyroid',
    cholesterol: 'Cholesterol', lactose_intolerance: 'Lactose Intolerance', pcos: 'PCOS',
  };
  return names[condition] || condition;
}

function formatDietName(pref: string): string {
  const names: Record<string, string> = {
    vegetarian: 'Vegetarian', vegan: 'Vegan', keto: 'Keto',
    gluten_free: 'Gluten-Free', dairy_free: 'Dairy-Free', mediterranean: 'Mediterranean',
    paleo: 'Paleo',
  };
  return names[pref] || pref;
}
