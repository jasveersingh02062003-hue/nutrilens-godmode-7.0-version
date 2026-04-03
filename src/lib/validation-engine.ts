// ═══════════════════════════════════════════════════
// NutriLens AI – Validation Engine
// ═══════════════════════════════════════════════════
// Ensures all food logs are accurate, physically possible,
// and personalized to the user's health profile.
// Runs client-side for instant feedback.

import type { FoodItem, UserProfile, MealSourceCategory } from './store';
import { getFoodByName } from './indian-foods';
import { crossValidate } from './ifct-reference';
import { wouldExceedBudget } from './budget-alerts';

// ─── Types ───

export type IssueSeverity = 'block' | 'critical' | 'warning' | 'hint';

export interface ValidationIssue {
  ruleId: string;
  itemName?: string;
  itemId?: string;
  message: string;
  suggestedFix?: string;
  severity: IssueSeverity;
  icon: string;
}

export interface ValidationSuggestion {
  id: string;
  type: 'swap' | 'reduce' | 'add' | 'cheaper' | 'pair';
  emoji: string;
  text: string;
  detail: string;
  action?: () => void; // optional callback
}

export interface ValidationResult {
  valid: boolean;           // false if any 'block' severity
  hasBlocks: boolean;
  hasCritical: boolean;
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface NormalizedItem extends FoodItem {
  grams: number;
  confidence?: number;
}

// ─── Override Learning Storage ───

const OVERRIDE_KEY = 'nutrilens_validation_overrides';

export interface OverrideRecord {
  ruleId: string;
  count: number;
  lastTimestamp: string;
}

export function getOverrides(): OverrideRecord[] {
  try {
    return JSON.parse(scopedGet(OVERRIDE_KEY) || '[]');
  } catch { return []; }
}

export function recordOverride(ruleId: string) {
  const overrides = getOverrides();
  const existing = overrides.find(o => o.ruleId === ruleId);
  if (existing) {
    existing.count++;
    existing.lastTimestamp = new Date().toISOString();
  } else {
    overrides.push({ ruleId, count: 1, lastTimestamp: new Date().toISOString() });
  }
  scopedSet(OVERRIDE_KEY, JSON.stringify(overrides));
}

function getOverrideCount(ruleId: string): number {
  return getOverrides().find(o => o.ruleId === ruleId)?.count || 0;
}

// ─── Unit → Gram Normalization ───

const UNIT_WEIGHTS: Record<string, number> = {
  piece: 50, roti: 40, chapati: 40, paratha: 60, naan: 90, puri: 30,
  bowl: 200, katori: 150, cup: 200, glass: 250, plate: 300,
  slice: 30, tablespoon: 15, tbsp: 15, teaspoon: 5, tsp: 5,
  serving: 100, ml: 1, // ml treated as gram equivalent for most foods
};

function normalizeToGrams(item: FoodItem): number {
  // If estimatedWeightGrams is present, use it
  if (item.estimatedWeightGrams && item.estimatedWeightGrams > 0) {
    return item.estimatedWeightGrams * item.quantity;
  }

  // Try food database for standard weight
  const dbFood = getFoodByName(item.name);
  if (dbFood) {
    return dbFood.defaultServing * item.quantity;
  }

  // Fallback: use unit mapping
  const unitKey = item.unit.toLowerCase().replace(/s$/, ''); // de-pluralize
  const gramsPerUnit = UNIT_WEIGHTS[unitKey] || 100;
  return gramsPerUnit * item.quantity;
}

// ─── CORE VALIDATION RULES ───

function checkCalorieDensity(item: NormalizedItem): ValidationIssue | null {
  if (item.grams <= 0) return null;
  const totalCal = item.calories * item.quantity;
  const density = totalCal / item.grams;

  if (density > 9) {
    return {
      ruleId: 'calorie_density',
      itemName: item.name,
      itemId: item.id,
      message: `${Math.round(totalCal)} kcal for ${Math.round(item.grams)}g exceeds physical limit (max ~9 kcal/g).`,
      suggestedFix: 'Reduce portion or verify the food item.',
      severity: 'block',
      icon: '🚫',
    };
  }

  if (density > 6) {
    return {
      ruleId: 'calorie_density_high',
      itemName: item.name,
      itemId: item.id,
      message: `${item.name} is very calorie-dense (${density.toFixed(1)} kcal/g). Double-check portion.`,
      suggestedFix: 'Verify portion size.',
      severity: 'warning',
      icon: '⚡',
    };
  }

  return null;
}

function checkMacroConsistency(item: NormalizedItem): ValidationIssue | null {
  const totalCal = item.calories * item.quantity;
  const totalP = item.protein * item.quantity;
  const totalC = item.carbs * item.quantity;
  const totalF = item.fat * item.quantity;

  if (totalCal < 10) return null; // skip tiny items

  const expectedCal = (totalP * 4) + (totalC * 4) + (totalF * 9);
  const diff = Math.abs(expectedCal - totalCal);

  if (diff > totalCal * 0.4) {
    return {
      ruleId: 'macro_consistency',
      itemName: item.name,
      itemId: item.id,
      message: `Macros for ${item.name} don't add up to calories (expected ~${Math.round(expectedCal)} kcal from macros, got ${Math.round(totalCal)} kcal).`,
      suggestedFix: 'Data may be inaccurate. Consider using a different food entry.',
      severity: 'warning',
      icon: '📊',
    };
  }
  return null;
}

function checkCarbsLimit(item: NormalizedItem): ValidationIssue | null {
  const totalCarbs = item.carbs * item.quantity;
  if (totalCarbs > item.grams) {
    return {
      ruleId: 'carbs_limit',
      itemName: item.name,
      itemId: item.id,
      message: `${Math.round(totalCarbs)}g carbs can't exceed ${Math.round(item.grams)}g food weight.`,
      suggestedFix: 'Reduce carb estimate or increase portion.',
      severity: 'block',
      icon: '🚫',
    };
  }
  return null;
}

function checkProteinLimit(item: NormalizedItem): ValidationIssue | null {
  const totalProtein = item.protein * item.quantity;
  if (totalProtein > item.grams) {
    return {
      ruleId: 'protein_limit',
      itemName: item.name,
      itemId: item.id,
      message: `${Math.round(totalProtein)}g protein can't exceed ${Math.round(item.grams)}g food weight.`,
      suggestedFix: 'Reduce protein estimate or verify food.',
      severity: 'block',
      icon: '🚫',
    };
  }
  return null;
}

function checkPortionSanity(item: NormalizedItem): ValidationIssue | null {
  const dbFood = getFoodByName(item.name);
  if (!dbFood) return null;

  const standardGrams = dbFood.defaultServing;
  const minGrams = standardGrams * 0.2;
  const maxGrams = standardGrams * 8; // allow up to 8x standard serving

  if (item.grams < minGrams) {
    return {
      ruleId: 'portion_too_small',
      itemName: item.name,
      itemId: item.id,
      message: `${Math.round(item.grams)}g of ${item.name} seems too small (typical: ${standardGrams}g per ${dbFood.servingUnit}).`,
      suggestedFix: `Did you mean ${item.quantity} ${dbFood.servingUnit}(s)?`,
      severity: 'warning',
      icon: '📏',
    };
  }

  if (item.grams > maxGrams) {
    return {
      ruleId: 'portion_too_large',
      itemName: item.name,
      itemId: item.id,
      message: `${Math.round(item.grams)}g of ${item.name} is very large (typical: ${standardGrams}g per ${dbFood.servingUnit}).`,
      suggestedFix: `Adjust quantity. That's about ${Math.round(item.grams / standardGrams)} servings.`,
      severity: 'warning',
      icon: '📏',
    };
  }

  return null;
}

function checkSingleItemOutlier(item: NormalizedItem): ValidationIssue | null {
  const totalCal = item.calories * item.quantity;
  if (totalCal > 1500) {
    return {
      ruleId: 'single_item_outlier',
      itemName: item.name,
      itemId: item.id,
      message: `${Math.round(totalCal)} kcal for a single item (${item.name}) is very high.`,
      suggestedFix: 'Double-check the quantity.',
      severity: 'warning',
      icon: '⚠️',
    };
  }
  return null;
}

// ─── IFCT 2017 CROSS-VALIDATION ───

function checkIFCTAccuracy(item: NormalizedItem): ValidationIssue | null {
  // Look up the food in our database to get per-100g values (not per-serving)
  const dbFood = getFoodByName(item.name);
  if (!dbFood) return null;

  // IFCT data is for RAW ingredients. Our DB has cooked values.
  // Cooked items (rice, dal, curry) absorb water → per-100g values are much lower.
  // Only compare dry/flour items where values should be close to raw IFCT.
  const COOKED_CATEGORIES = ['Dals', 'Vegetables', 'Non-Veg', 'Soups'];
  const isCooked = COOKED_CATEGORIES.includes(dbFood.category) || 
    dbFood.name.toLowerCase().includes('cooked') ||
    dbFood.name.toLowerCase().includes('curry');
  
  // Use higher tolerance for cooked foods (water dilutes per-100g values)
  const tolerance = isCooked ? 80 : 30;

  const discrepancies = crossValidate(
    item.name,
    dbFood.calories,   // per-100g from our DB
    dbFood.protein,
    dbFood.carbs,
    dbFood.fat,
    tolerance,
  );

  if (discrepancies.length === 0) return null;

  const worst = discrepancies.reduce((a, b) => a.diffPercent > b.diffPercent ? a : b);
  const otherCount = discrepancies.length - 1;

  return {
    ruleId: 'ifct_mismatch',
    itemName: item.name,
    itemId: item.id,
    message: `${item.name}: ${worst.nutrient} differs from IFCT 2017 reference (yours: ${worst.appValue}, IFCT: ${worst.ifctValue})${otherCount > 0 ? ` +${otherCount} more` : ''}.`,
    suggestedFix: `Verified IFCT data: ${worst.ifctName} (${worst.ifctCode}). Consider using database values.`,
    severity: worst.diffPercent > 100 ? 'critical' : 'hint',
    icon: '📚',
  };
}

// ─── CONTEXT-AWARE VALIDATION RULES ───

// GI / condition keywords (reuse from condition-coach concepts)
const HIGH_GI_KEYWORDS = [
  'white rice', 'rice', 'potato', 'cornflakes', 'sugar', 'white bread',
  'bread', 'maida', 'naan', 'instant noodles', 'puri', 'jalebi',
  'gulab jamun', 'rasmalai', 'halwa', 'kheer', 'cake', 'biscuit',
  'mango', 'watermelon', 'pineapple',
];

const HIGH_SODIUM_KEYWORDS = [
  'pickle', 'achar', 'papad', 'chips', 'namkeen', 'biscuit',
  'processed', 'sausage', 'canned', 'instant noodle', 'maggi',
  'cheese', 'ketchup', 'soy sauce', 'chaat masala', 'bhujia',
];

const SUGAR_KEYWORDS = [
  'sugar', 'jaggery', 'honey', 'syrup', 'candy', 'chocolate',
  'jalebi', 'gulab jamun', 'ladoo', 'barfi', 'halwa', 'mithai',
  'ice cream', 'cake', 'pastry', 'cola', 'soda', 'sweet',
];

function itemMatchesAny(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function checkPCOS(items: NormalizedItem[], totalCarbs: number, profile: UserProfile): ValidationIssue[] {
  const conditions = profile.healthConditions || [];
  if (!conditions.some(c => typeof c === 'string' && c.toLowerCase().includes('pcos'))) return [];

  const issues: ValidationIssue[] = [];

  if (totalCarbs > 50) {
    issues.push({
      ruleId: 'pcos_high_carbs',
      message: `${Math.round(totalCarbs)}g carbs in this meal – PCOS management recommends <50g per meal to control insulin.`,
      suggestedFix: 'Reduce rice/roti or swap with protein-rich food.',
      severity: 'critical',
      icon: '🩺',
    });
  }

  const highGIItems = items.filter(i => itemMatchesAny(i.name, HIGH_GI_KEYWORDS));
  if (highGIItems.length > 0) {
    issues.push({
      ruleId: 'pcos_high_gi',
      message: `${highGIItems.map(i => i.name).join(', ')} may spike insulin (PCOS concern).`,
      suggestedFix: 'Pair with protein/fat, or swap with millet/brown rice.',
      severity: 'critical',
      icon: '📈',
    });
  }

  return issues;
}

function checkDiabetes(items: NormalizedItem[], totalCarbs: number, profile: UserProfile): ValidationIssue[] {
  const conditions = profile.healthConditions || [];
  if (!conditions.some(c => typeof c === 'string' && c.toLowerCase().includes('diab'))) return [];

  const issues: ValidationIssue[] = [];

  if (totalCarbs > 60) {
    issues.push({
      ruleId: 'diabetes_high_carbs',
      message: `${Math.round(totalCarbs)}g carbs – diabetes management recommends 45–60g per meal.`,
      suggestedFix: 'Reduce portion of rice/roti/bread.',
      severity: 'critical',
      icon: '🩸',
    });
  }

  const highGIItems = items.filter(i => itemMatchesAny(i.name, HIGH_GI_KEYWORDS));
  if (highGIItems.length > 0) {
    issues.push({
      ruleId: 'diabetes_high_gi',
      message: `${highGIItems.map(i => i.name).join(', ')} has high glycemic index – may spike blood sugar.`,
      suggestedFix: 'Reduce portion or add fiber/protein to slow absorption.',
      severity: 'critical',
      icon: '📈',
    });
  }

  const sugarItems = items.filter(i => itemMatchesAny(i.name, SUGAR_KEYWORDS));
  if (sugarItems.length > 0) {
    issues.push({
      ruleId: 'diabetes_sugar',
      message: `${sugarItems.map(i => i.name).join(', ')} contains significant sugar.`,
      suggestedFix: 'Avoid or limit to small portions.',
      severity: 'critical',
      icon: '🍬',
    });
  }

  return issues;
}

function checkHypertension(items: NormalizedItem[], profile: UserProfile): ValidationIssue[] {
  const conditions = profile.healthConditions || [];
  if (!conditions.some(c => typeof c === 'string' && (c.toLowerCase().includes('hyper') || c.toLowerCase().includes('bp') || c.toLowerCase().includes('blood pressure')))) return [];

  const highSodiumItems = items.filter(i => itemMatchesAny(i.name, HIGH_SODIUM_KEYWORDS));
  if (highSodiumItems.length === 0) return [];

  return [{
    ruleId: 'hypertension_sodium',
    message: `${highSodiumItems.map(i => i.name).join(', ')} is high in sodium – avoid with high BP.`,
    suggestedFix: 'Limit processed/pickled foods and add potassium-rich items.',
    severity: 'warning',
    icon: '🫀',
  }];
}

function checkMealCalorieOutlier(totalCal: number): ValidationIssue | null {
  if (totalCal > 3000) {
    return {
      ruleId: 'meal_calorie_outlier',
      message: `${Math.round(totalCal)} kcal in one meal is extremely high. Please verify all items.`,
      severity: 'block',
      icon: '🚫',
    };
  }
  if (totalCal > 1500) {
    return {
      ruleId: 'meal_calorie_high',
      message: `${Math.round(totalCal)} kcal is a heavy meal. Make sure quantities are correct.`,
      severity: 'warning',
      icon: '⚠️',
    };
  }
  return null;
}

function checkBudget(totalCost: number, profile: UserProfile, mealType?: string): ValidationIssue | null {
  const budgetCheck = totalCost > 0 ? wouldExceedBudget(totalCost) : null;
  if (budgetCheck?.exceeds) {
    return {
      ruleId: 'budget_exceeded',
      message: `This meal (₹${totalCost}) will push you over budget (₹${budgetCheck.newTotal}/₹${budgetCheck.budget}).`,
      suggestedFix: 'Consider cheaper alternatives or cooking at home.',
      severity: 'warning',
      icon: '💸',
    };
  }
  return null;
}

function checkLowProtein(totalProtein: number, totalCal: number, profile: UserProfile): ValidationIssue | null {
  if (totalCal < 100) return null;
  const proteinCalPercent = (totalProtein * 4) / totalCal * 100;
  
  // Check if user has high-protein goal
  const goal = profile.goal?.toLowerCase() || '';
  const needsProtein = goal.includes('muscle') || goal.includes('protein') || goal.includes('gain');
  
  if (needsProtein && proteinCalPercent < 20) {
    return {
      ruleId: 'low_protein_goal',
      message: `Only ${Math.round(proteinCalPercent)}% protein – your goal needs ≥25%. Add eggs, paneer, or dal.`,
      severity: 'warning',
      icon: '💪',
    };
  }
  
  if (proteinCalPercent < 10 && totalCal > 300) {
    return {
      ruleId: 'very_low_protein',
      message: `Very low protein (${Math.round(totalProtein)}g). Add a protein source for better nutrition.`,
      severity: 'hint',
      icon: '🥚',
    };
  }
  
  return null;
}

// ─── SUGGESTION GENERATION ───

function generateSuggestions(
  issues: ValidationIssue[],
  items: NormalizedItem[],
  profile: UserProfile,
): ValidationSuggestion[] {
  const suggestions: ValidationSuggestion[] = [];
  const addedTypes = new Set<string>();

  for (const issue of issues) {
    if (issue.ruleId.includes('pcos_high_gi') || issue.ruleId.includes('diabetes_high_gi')) {
      if (!addedTypes.has('swap_gi')) {
        suggestions.push({
          id: 'swap_gi',
          type: 'swap',
          emoji: '🔄',
          text: 'Swap high-GI item',
          detail: 'Replace with brown rice, millets, or whole grains',
        });
        addedTypes.add('swap_gi');
      }
    }

    if (issue.ruleId.includes('pcos_high_carbs') || issue.ruleId.includes('diabetes_high_carbs')) {
      if (!addedTypes.has('reduce_carbs')) {
        suggestions.push({
          id: 'reduce_carbs',
          type: 'reduce',
          emoji: '📉',
          text: 'Reduce carbs',
          detail: 'Remove 1 roti or halve the rice portion',
        });
        addedTypes.add('reduce_carbs');
      }
    }

    if (issue.ruleId === 'budget_exceeded') {
      if (!addedTypes.has('cheaper')) {
        suggestions.push({
          id: 'cheaper',
          type: 'cheaper',
          emoji: '💰',
          text: 'Go cheaper',
          detail: 'Replace expensive protein with eggs or soya chunks',
        });
        addedTypes.add('cheaper');
      }
    }

    if (issue.ruleId.includes('low_protein') || issue.ruleId === 'very_low_protein') {
      if (!addedTypes.has('add_protein')) {
        suggestions.push({
          id: 'add_protein',
          type: 'add',
          emoji: '🥚',
          text: 'Add protein',
          detail: 'Add 2 eggs, paneer, or a bowl of dal',
        });
        addedTypes.add('add_protein');
      }
    }

    if (issue.ruleId === 'hypertension_sodium') {
      if (!addedTypes.has('reduce_sodium')) {
        suggestions.push({
          id: 'reduce_sodium',
          type: 'swap',
          emoji: '🫀',
          text: 'Reduce sodium',
          detail: 'Remove pickle/papad and add fresh salad',
        });
        addedTypes.add('reduce_sodium');
      }
    }
  }

  // Pair suggestion for high-GI + no protein
  const hasHighGI = issues.some(i => i.ruleId.includes('high_gi'));
  const hasProtein = items.some(i => i.protein * i.quantity > 10);
  if (hasHighGI && !hasProtein && !addedTypes.has('pair_protein')) {
    suggestions.push({
      id: 'pair_protein',
      type: 'pair',
      emoji: '🤝',
      text: 'Pair with protein',
      detail: 'Adding protein/fat slows sugar absorption',
    });
  }

  return suggestions.slice(0, 4); // max 4 suggestions
}

// ─── SEVERITY ADJUSTMENT (Learning) ───

function adjustSeverity(issue: ValidationIssue): ValidationIssue {
  const count = getOverrideCount(issue.ruleId);
  
  // If user has ignored this rule 5+ times, downgrade
  if (count >= 5 && issue.severity === 'critical') {
    return { ...issue, severity: 'warning' };
  }
  if (count >= 10 && issue.severity === 'warning') {
    return { ...issue, severity: 'hint' };
  }
  
  return issue;
}

// ═══════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════

export function validateMeal(
  items: FoodItem[],
  profile: UserProfile | null,
  context?: {
    mealType?: string;
    costEstimate?: number;
  },
): ValidationResult {
  if (items.length === 0) {
    return {
      valid: true,
      hasBlocks: false,
      hasCritical: false,
      issues: [],
      suggestions: [],
      totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }

  // Step 1: Normalize items to grams
  const normalized: NormalizedItem[] = items.map(item => ({
    ...item,
    grams: normalizeToGrams(item),
  }));

  // Step 2: Compute totals
  const totalCal = normalized.reduce((s, f) => s + f.calories * f.quantity, 0);
  const totalProtein = normalized.reduce((s, f) => s + f.protein * f.quantity, 0);
  const totalCarbs = normalized.reduce((s, f) => s + f.carbs * f.quantity, 0);
  const totalFat = normalized.reduce((s, f) => s + f.fat * f.quantity, 0);

  // Step 3: Run core validation
  const coreIssues: ValidationIssue[] = [];
  for (const item of normalized) {
    const checks = [
      checkCalorieDensity(item),
      checkMacroConsistency(item),
      checkCarbsLimit(item),
      checkProteinLimit(item),
      checkPortionSanity(item),
      checkSingleItemOutlier(item),
      checkIFCTAccuracy(item),
    ];
    for (const check of checks) {
      if (check) coreIssues.push(check);
    }
  }

  // Meal-level checks
  const mealCalCheck = checkMealCalorieOutlier(totalCal);
  if (mealCalCheck) coreIssues.push(mealCalCheck);

  // Step 4: Context-aware validation
  const contextIssues: ValidationIssue[] = [];
  if (profile) {
    contextIssues.push(...checkPCOS(normalized, totalCarbs, profile));
    contextIssues.push(...checkDiabetes(normalized, totalCarbs, profile));
    contextIssues.push(...checkHypertension(normalized, profile));

    const proteinCheck = checkLowProtein(totalProtein, totalCal, profile);
    if (proteinCheck) contextIssues.push(proteinCheck);

    if (context?.costEstimate) {
      const budgetCheck = checkBudget(context.costEstimate, profile, context.mealType);
      if (budgetCheck) contextIssues.push(budgetCheck);
    }
  }

  // Step 5: Combine, adjust severity, deduplicate
  const allIssues = [...coreIssues, ...contextIssues]
    .map(adjustSeverity)
    .filter((issue, index, arr) =>
      arr.findIndex(i => i.ruleId === issue.ruleId && i.itemId === issue.itemId) === index
    );

  // Step 6: Generate suggestions
  const suggestions = generateSuggestions(allIssues, normalized, profile || {} as UserProfile);

  const hasBlocks = allIssues.some(i => i.severity === 'block');
  const hasCritical = allIssues.some(i => i.severity === 'critical');

  return {
    valid: !hasBlocks,
    hasBlocks,
    hasCritical,
    issues: allIssues,
    suggestions,
    totalNutrition: {
      calories: Math.round(totalCal),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    },
  };
}

// ─── Per-item validation (for inline display) ───

export function validateSingleItem(item: FoodItem): ValidationIssue[] {
  const grams = normalizeToGrams(item);
  const normalized: NormalizedItem = { ...item, grams };

  return [
    checkCalorieDensity(normalized),
    checkMacroConsistency(normalized),
    checkCarbsLimit(normalized),
    checkProteinLimit(normalized),
    checkPortionSanity(normalized),
    checkSingleItemOutlier(normalized),
    checkIFCTAccuracy(normalized),
  ].filter(Boolean) as ValidationIssue[];
}
