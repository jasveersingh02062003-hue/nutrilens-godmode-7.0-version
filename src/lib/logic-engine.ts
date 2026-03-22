// ============================================
// NutriLens AI – Unified Rule Engine
// ============================================
// Consolidates food evaluation, recipe filtering,
// dietary enforcement, budget checks, skin logic,
// gender-specific rules, and conflict resolution.

import type { FoodItem, UserProfile } from './store';

// ── Condition Priority ──

export const conditionPriority: Record<string, number> = {
  ibs: 10, diabetes: 10, pcos: 10,
  hypertension: 9, cholesterol: 9,
  anemia: 8, thyroid: 6,
};

// ── Condition Rules ──

export interface ConditionRule {
  avoidTags: string[];
  preferTags: string[];
  avoidKeywords: string[];
  preferKeywords: string[];
  macroAdjust?: { carbs?: string; protein?: string; satFatMax?: string };
  nutrientRules?: Record<string, number>;
}

export const conditionRules: Record<string, ConditionRule> = {
  diabetes: {
    avoidTags: ['highGI', 'highSugar', 'refined'],
    preferTags: ['lowGI', 'highFiber', 'whole-grain'],
    avoidKeywords: ['sugar', 'jalebi', 'gulab jamun', 'cake', 'white rice', 'white bread', 'maida', 'cornflakes', 'instant noodles'],
    preferKeywords: ['oats', 'brown rice', 'quinoa', 'dal', 'sprouts', 'millet', 'ragi', 'barley', 'lentils', 'vegetables', 'nuts', 'seeds'],
    macroAdjust: { carbs: '40-45%', protein: '20-25%' },
  },
  pcos: {
    avoidTags: ['highGI', 'inflammatory', 'processed'],
    preferTags: ['lowGI', 'antiInflammatory', 'highProtein'],
    avoidKeywords: ['sugar', 'maida', 'fried', 'processed', 'soda', 'juice', 'refined carbs'],
    preferKeywords: ['turmeric', 'flaxseed', 'nuts', 'leafy greens', 'berries', 'fish', 'lean protein', 'vegetables'],
    macroAdjust: { carbs: '30-40%' },
  },
  hypertension: {
    avoidTags: ['highSodium', 'processed'],
    preferTags: ['lowSodium', 'potassiumRich'],
    avoidKeywords: ['pickle', 'papad', 'chips', 'namkeen', 'canned', 'processed', 'sausage'],
    preferKeywords: ['banana', 'spinach', 'sweet potato', 'avocado', 'yogurt', 'beetroot', 'curd'],
    nutrientRules: { sodium_max_mg: 1500 },
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
    preferKeywords: ['brazil nuts', 'eggs', 'fish', 'iodised salt', 'seaweed', 'nuts'],
  },
  cholesterol: {
    avoidTags: ['highSatFat', 'fried', 'processed'],
    preferTags: ['heartHealthy', 'highFiber'],
    avoidKeywords: ['fried', 'butter', 'ghee', 'cream', 'red meat', 'organ meat', 'egg yolk'],
    preferKeywords: ['oats', 'almonds', 'walnuts', 'olive oil', 'fish', 'flaxseed'],
    macroAdjust: { satFatMax: '10%' },
  },
  ibs: {
    avoidTags: ['highFODMAP', 'fermentable'],
    preferTags: ['lowFODMAP', 'gentle'],
    avoidKeywords: ['onion', 'garlic', 'wheat', 'beans', 'lentils', 'apple', 'pear', 'mushroom', 'cauliflower', 'cabbage'],
    preferKeywords: ['rice', 'banana', 'curd', 'chicken', 'potato', 'carrot', 'zucchini', 'oats'],
  },
  anemia: {
    avoidTags: [],
    preferTags: ['ironRich', 'vitaminC'],
    avoidKeywords: ['tea with meals', 'coffee with meals'],
    preferKeywords: ['spinach', 'lentils', 'red meat', 'citrus', 'beetroot', 'pomegranate', 'jaggery', 'dates'],
  },
};

// ── Skin Rules ──

export interface SkinRule {
  focusKeywords: string[];
  avoidKeywords: string[];
  insight: string;
}

export const skinRules: Record<string, SkinRule> = {
  acne: {
    focusKeywords: ['zinc', 'pumpkin seeds', 'low gi', 'whole grain', 'green vegetables'],
    avoidKeywords: ['dairy', 'sugar', 'chocolate', 'fried', 'whey'],
    insight: 'Zinc-rich and low-glycemic foods reduce acne inflammation.',
  },
  dry: {
    focusKeywords: ['omega 3', 'salmon', 'flaxseed', 'walnuts', 'avocado', 'vitamin e', 'almonds'],
    avoidKeywords: ['alcohol'],
    insight: 'Healthy fats improve skin hydration.',
  },
  oily: {
    focusKeywords: ['fiber', 'zinc', 'whole grain', 'vegetables'],
    avoidKeywords: ['fried', 'butter', 'cheese', 'cream'],
    insight: 'Balanced blood sugar helps control oil production.',
  },
  eczema: {
    focusKeywords: ['omega 3', 'probiotics', 'curd', 'fermented', 'fish'],
    avoidKeywords: ['processed', 'refined', 'artificial'],
    insight: 'Anti-inflammatory foods reduce flare-ups.',
  },
  rosacea: {
    focusKeywords: ['cucumber', 'melon', 'leafy greens'],
    avoidKeywords: ['spicy', 'alcohol', 'hot drinks', 'chilli'],
    insight: 'Avoid triggers to reduce redness.',
  },
  sensitive: {
    focusKeywords: ['antioxidant', 'berries', 'green tea', 'vegetables'],
    avoidKeywords: ['processed', 'artificial', 'preservatives'],
    insight: 'Antioxidant-rich foods support skin barrier.',
  },
  combination: {
    focusKeywords: ['zinc', 'omega 3', 'vegetables', 'whole grain'],
    avoidKeywords: ['sugar', 'fried'],
    insight: 'Balance omega fatty acids and avoid sugar spikes.',
  },
  psoriasis: {
    focusKeywords: ['omega 3', 'turmeric', 'fish', 'vegetables'],
    avoidKeywords: ['alcohol', 'red meat', 'processed', 'sugar'],
    insight: 'Anti-inflammatory diet helps manage psoriasis flare-ups.',
  },
};

// ── Male Health Rules ──

export interface MaleHealthRule {
  focusKeywords: string[];
  avoidKeywords: string[];
}

export const maleHealthRules: Record<string, MaleHealthRule> = {
  testosterone: {
    focusKeywords: ['zinc', 'eggs', 'nuts', 'healthy fats', 'avocado', 'pumpkin seeds', 'oysters'],
    avoidKeywords: ['alcohol', 'sugar', 'soy', 'processed'],
  },
  prostate: {
    focusKeywords: ['tomato', 'lycopene', 'vegetables', 'green tea', 'broccoli', 'pomegranate'],
    avoidKeywords: ['red meat', 'processed meat', 'dairy excess'],
  },
};

// ── Budget Tiers ──

export const budgetTiers: Record<string, { protein: string[]; carbs: string[]; fats: string[] }> = {
  low: {
    protein: ['eggs', 'soya', 'lentils', 'chickpeas', 'moong dal', 'chana'],
    carbs: ['rice', 'roti', 'oats', 'potato', 'banana'],
    fats: ['milk', 'peanuts', 'coconut', 'mustard oil'],
  },
  mid: {
    protein: ['chicken', 'paneer', 'curd', 'fish', 'rajma'],
    carbs: ['brown rice', 'millet', 'sweet potato'],
    fats: ['nuts', 'seeds', 'ghee', 'cheese'],
  },
  high: {
    protein: ['salmon', 'prawns', 'lamb', 'whey protein'],
    carbs: ['quinoa', 'avocado toast', 'granola'],
    fats: ['avocado', 'olive oil', 'almond butter', 'chia seeds'],
  },
};

export function getBudgetTier(monthlyBudget: number): 'low' | 'mid' | 'high' {
  if (monthlyBudget <= 5000) return 'low';
  if (monthlyBudget <= 12000) return 'mid';
  return 'high';
}

// ── Conflict Resolution ──

interface ConflictResolution {
  conditions: string[];
  mergedAvoidExtra: string[];
  mergedPreferExtra: string[];
  label: string;
}

const conflictResolutions: ConflictResolution[] = [
  {
    conditions: ['diabetes', 'ibs'],
    mergedAvoidExtra: ['wheat', 'beans', 'lentils', 'sugar', 'refined flour'],
    mergedPreferExtra: ['rice', 'oats', 'curd', 'chicken', 'low gi vegetables'],
    label: 'low_fodmap_low_gi',
  },
  {
    conditions: ['cholesterol', 'acne'],
    mergedAvoidExtra: ['dairy', 'butter', 'fried', 'saturated fat'],
    mergedPreferExtra: ['oats', 'flaxseed', 'zinc', 'vegetables'],
    label: 'low_dairy_low_satfat',
  },
  {
    conditions: ['ibs', 'anemia'],
    mergedAvoidExtra: ['onion', 'garlic', 'wheat', 'tea with meals'],
    mergedPreferExtra: ['spinach', 'rice', 'chicken', 'citrus', 'beetroot'],
    label: 'low_fodmap_iron_rich',
  },
  {
    conditions: ['pcos', 'diabetes'],
    mergedAvoidExtra: ['sugar', 'refined carbs', 'processed', 'white rice', 'maida'],
    mergedPreferExtra: ['flaxseed', 'nuts', 'lean protein', 'millet', 'vegetables'],
    label: 'anti_inflammatory_low_gi',
  },
];

export interface EffectiveRestrictions {
  avoid: string[];
  prefer: string[];
  macroAdjustments: Record<string, string>;
  skinInsight: string | null;
  conflictLabels: string[];
}

export function getEffectiveRestrictions(profile: UserProfile | null): EffectiveRestrictions {
  if (!profile) return { avoid: [], prefer: [], macroAdjustments: {}, skinInsight: null, conflictLabels: [] };

  const avoid = new Set<string>();
  const prefer = new Set<string>();
  const macroAdj: Record<string, string> = {};
  const conflictLabels: string[] = [];

  const allConditions = [...(profile.healthConditions || [])];
  if (profile.womenHealth?.includes('pcos') && !allConditions.includes('pcos')) {
    allConditions.push('pcos');
  }

  const sorted = allConditions
    .filter(c => conditionRules[c])
    .sort((a, b) => (conditionPriority[b] || 0) - (conditionPriority[a] || 0));

  for (const condition of sorted) {
    const rules = conditionRules[condition];
    rules.avoidKeywords.forEach(k => avoid.add(k));
    rules.preferKeywords.forEach(k => prefer.add(k));
    if (rules.macroAdjust) {
      Object.entries(rules.macroAdjust).forEach(([k, v]) => {
        if (!macroAdj[k]) macroAdj[k] = v;
      });
    }
  }

  for (const cr of conflictResolutions) {
    if (cr.conditions.every(c => allConditions.includes(c))) {
      cr.mergedAvoidExtra.forEach(k => avoid.add(k));
      cr.mergedPreferExtra.forEach(k => prefer.add(k));
      conflictLabels.push(cr.label);
    }
  }

  let skinInsight: string | null = null;
  if (profile.skinConcerns) {
    for (const [skinType, rule] of Object.entries(skinRules)) {
      if ((profile.skinConcerns as any)[skinType]) {
        rule.avoidKeywords.forEach(k => avoid.add(k));
        rule.focusKeywords.forEach(k => prefer.add(k));
        skinInsight = rule.insight;
      }
    }
  }

  if (profile.menHealth) {
    if (profile.menHealth.prostateConcerns) {
      maleHealthRules.prostate.avoidKeywords.forEach(k => avoid.add(k));
      maleHealthRules.prostate.focusKeywords.forEach(k => prefer.add(k));
    }
    if ((profile.menHealth as any).testosteroneConcerns) {
      maleHealthRules.testosterone.avoidKeywords.forEach(k => avoid.add(k));
      maleHealthRules.testosterone.focusKeywords.forEach(k => prefer.add(k));
    }
  }

  return { avoid: [...avoid], prefer: [...prefer], macroAdjustments: macroAdj, skinInsight, conflictLabels };
}

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

// ── Food Evaluation ──

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

export function evaluateFoodForUser(food: FoodItem, profile: UserProfile | null): FoodEvaluation {
  if (!profile) return { warnings: [], positives: [], overallSafety: 'safe' };

  const warnings: FoodWarning[] = [];
  const positives: string[] = [];
  const foodName = food.name.toLowerCase();

  const conditions = profile.healthConditions || [];
  const womenHealth = profile.womenHealth || [];

  for (const condition of conditions) {
    const rules = conditionRules[condition];
    if (!rules) continue;
    if (rules.avoidKeywords.some(kw => foodName.includes(kw))) {
      warnings.push({ message: getConditionWarning(condition, food.name), severity: 'warning', condition, icon: getConditionIcon(condition) });
    }
    if (rules.preferKeywords.some(kw => foodName.includes(kw))) {
      positives.push(`✅ Good choice for ${formatConditionName(condition)}`);
    }
  }

  if (womenHealth.includes('pcos')) {
    const rules = conditionRules.pcos;
    if (rules.avoidKeywords.some(kw => foodName.includes(kw))) {
      warnings.push({ message: 'This food may worsen PCOS symptoms. Consider anti-inflammatory options.', severity: 'warning', condition: 'pcos', icon: '🩺' });
    }
    if (rules.preferKeywords.some(kw => foodName.includes(kw))) positives.push('✅ Anti-inflammatory — good for PCOS');
  }

  // Skin concerns
  if (profile.skinConcerns) {
    for (const [skinType, rule] of Object.entries(skinRules)) {
      if (!(profile.skinConcerns as any)[skinType]) continue;
      if (rule.avoidKeywords.some(kw => foodName.includes(kw))) {
        warnings.push({ message: `This may aggravate your ${skinType} skin. ${rule.insight}`, severity: 'info', condition: `skin_${skinType}`, icon: '🧴' });
      }
      if (rule.focusKeywords.some(kw => foodName.includes(kw))) {
        positives.push(`✅ Good for ${skinType} skin — ${rule.insight}`);
      }
    }
  }

  // Male health
  if (profile.menHealth) {
    if (profile.menHealth.prostateConcerns) {
      const rule = maleHealthRules.prostate;
      if (rule.avoidKeywords.some(kw => foodName.includes(kw))) warnings.push({ message: 'This may not be ideal for prostate health.', severity: 'info', condition: 'prostate', icon: '🩺' });
      if (rule.focusKeywords.some(kw => foodName.includes(kw))) positives.push('✅ Good for prostate health');
    }
    if ((profile.menHealth as any).testosteroneConcerns) {
      const rule = maleHealthRules.testosterone;
      if (rule.avoidKeywords.some(kw => foodName.includes(kw))) warnings.push({ message: 'This may lower testosterone. Consider zinc-rich alternatives.', severity: 'info', condition: 'testosterone', icon: '💪' });
      if (rule.focusKeywords.some(kw => foodName.includes(kw))) positives.push('✅ Supports healthy testosterone levels');
    }
  }

  // Dietary preferences
  for (const pref of (profile.dietaryPrefs || [])) {
    const rules = dietaryRules[pref];
    if (!rules) continue;
    if (rules.excludeKeywords.some(kw => foodName.includes(kw))) {
      warnings.push({ message: `This contains ingredients not aligned with your ${formatDietName(pref)} preference.`, severity: 'info', condition: pref, icon: '🍽️' });
    }
  }

  const overallSafety: 'safe' | 'caution' | 'avoid' =
    warnings.some(w => w.severity === 'critical') ? 'avoid' : warnings.length > 0 ? 'caution' : 'safe';

  return { warnings, positives, overallSafety };
}

export function filterRecipesForUser(
  recipes: Array<{ tags: string[]; name: string; [key: string]: any }>,
  profile: UserProfile | null
): typeof recipes {
  if (!profile) return recipes;
  let filtered = [...recipes];
  const conditions = profile.healthConditions || [];
  const womenHealth = profile.womenHealth || [];

  for (const condition of [...conditions, ...(womenHealth.includes('pcos') ? ['pcos'] : [])]) {
    const rules = conditionRules[condition];
    if (!rules) continue;
    filtered = filtered.filter(r => !rules.avoidKeywords.some(kw => r.name.toLowerCase().includes(kw)));
  }
  for (const pref of (profile.dietaryPrefs || [])) {
    const rules = dietaryRules[pref];
    if (!rules) continue;
    filtered = filtered.filter(r => !rules.excludeKeywords.some(kw => r.name.toLowerCase().includes(kw)));
  }
  return filtered;
}

export function getMealBudget(profile: UserProfile | null, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'): number {
  if (!profile) return Infinity;
  const budget = (profile as any).budget;
  if (!budget?.enabled) return Infinity;
  const defaultSplit = { breakfast: 25, lunch: 30, dinner: 30, snacks: 15 };
  const split = budget.mealSplit || defaultSplit;
  const dailyAmount = budget.period === 'weekly' ? budget.amount / 7 : budget.period === 'monthly' ? budget.amount / 30 : budget.amount;
  return (dailyAmount * (split[mealType] || 25)) / 100;
}

export function isWithinBudget(cost: number, profile: UserProfile | null, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'): boolean {
  return cost <= getMealBudget(profile, mealType);
}

export function validateWeightGoal(currentWeight: number, targetWeight: number, goalSpeed: number): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const diff = Math.abs(currentWeight - targetWeight);
  const pctChange = (diff / currentWeight) * 100;
  if (goalSpeed > 1) warnings.push('Losing more than 1 kg/week is not recommended and can cause muscle loss.');
  if (pctChange > 25) warnings.push(`Your target requires a ${pctChange.toFixed(0)}% change in body weight. Consider setting an intermediate goal.`);
  if (diff > 0) {
    const weeksNeeded = diff / goalSpeed;
    if (weeksNeeded > 52) warnings.push(`This goal would take ~${Math.round(weeksNeeded / 4)} months. Consider breaking it into phases.`);
  }
  return { valid: warnings.length === 0, warnings };
}

// ── Helpers ──

function getConditionWarning(condition: string, foodName: string): string {
  const m: Record<string, string> = {
    diabetes: `${foodName} may spike blood sugar. Consider a low-GI alternative.`,
    hypertension: `${foodName} may be high in sodium. Try a low-sodium option.`,
    thyroid: `${foodName} may interfere with thyroid function. Consult your doctor.`,
    cholesterol: `${foodName} may be high in saturated fat. Consider heart-healthy alternatives.`,
    lactose_intolerance: `${foodName} contains dairy — may cause discomfort. Try lactose-free alternatives.`,
    ibs: `${foodName} may be high-FODMAP and trigger IBS symptoms. Try a low-FODMAP alternative.`,
    anemia: `${foodName} may inhibit iron absorption. Avoid consuming with iron-rich meals.`,
  };
  return m[condition] || `${foodName} may not be ideal for your ${condition} condition.`;
}

function getConditionIcon(condition: string): string {
  return ({ diabetes: '🩸', hypertension: '🫀', thyroid: '🦋', cholesterol: '💊', lactose_intolerance: '🥛', pcos: '🩺', ibs: '🫄', anemia: '🔴' } as Record<string, string>)[condition] || '⚠️';
}

function formatConditionName(condition: string): string {
  return ({ diabetes: 'Diabetes', hypertension: 'Blood Pressure', thyroid: 'Thyroid', cholesterol: 'Cholesterol', lactose_intolerance: 'Lactose Intolerance', pcos: 'PCOS', ibs: 'IBS', anemia: 'Anemia' } as Record<string, string>)[condition] || condition;
}

function formatDietName(pref: string): string {
  return ({ vegetarian: 'Vegetarian', vegan: 'Vegan', keto: 'Keto', gluten_free: 'Gluten-Free', dairy_free: 'Dairy-Free', mediterranean: 'Mediterranean', paleo: 'Paleo' } as Record<string, string>)[pref] || pref;
}
