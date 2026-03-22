// ============================================
// NutriLens AI – Health-Condition-Aware Coaching
// ============================================
// Evaluates meals against user's medical conditions
// and produces prioritized, condition-specific feedback.

import type { FoodItem, UserProfile } from './store';

export interface ConditionMessage {
  text: string;
  priority: number; // 0–100
  condition: string;
  type: 'warning' | 'caution' | 'positive';
  icon: string;
}

export interface ConditionFeedback {
  messages: ConditionMessage[];
  overallColor: 'green' | 'yellow' | 'red';
  score: number; // 1–10 adjustment factor
}

// ── Keyword sets ──

const HIGH_GI_KEYWORDS = [
  'white rice', 'rice', 'potato', 'cornflakes', 'sugar', 'white bread',
  'bread', 'maida', 'naan', 'instant noodles', 'puri', 'jalebi',
  'gulab jamun', 'rasmalai', 'halwa', 'kheer', 'cake', 'biscuit',
  'mango', 'watermelon', 'pineapple',
];

const LOW_GI_KEYWORDS = [
  'dal', 'lentil', 'chana', 'rajma', 'moong', 'oats', 'brown rice',
  'quinoa', 'barley', 'sweet potato', 'apple', 'pear', 'orange',
  'vegetables', 'sabzi', 'salad', 'sprouts', 'millet', 'ragi', 'jowar',
];

const ANTI_INFLAMMATORY_KEYWORDS = [
  'turmeric', 'haldi', 'ginger', 'adrak', 'garlic', 'lehsun',
  'spinach', 'palak', 'berries', 'blueberry', 'nuts', 'almond',
  'walnut', 'flaxseed', 'green tea', 'avocado', 'olive oil',
  'fatty fish', 'salmon', 'sardine', 'broccoli',
];

const HIGH_SODIUM_KEYWORDS = [
  'pickle', 'achar', 'papad', 'chips', 'namkeen', 'biscuit',
  'processed', 'sausage', 'canned', 'instant noodle', 'maggi',
  'cheese', 'ketchup', 'soy sauce', 'chaat masala', 'bhujia',
];

const POTASSIUM_RICH_KEYWORDS = [
  'banana', 'spinach', 'palak', 'sweet potato', 'coconut water',
  'avocado', 'beans', 'lentil', 'dal', 'tomato', 'orange', 'pomegranate',
];

const DAIRY_KEYWORDS = [
  'milk', 'doodh', 'paneer', 'cheese', 'curd', 'yogurt', 'dahi',
  'ghee', 'butter', 'cream', 'raita', 'lassi', 'kheer', 'rabri',
  'rasmalai', 'ice cream', 'whey',
];

const WHEAT_GLUTEN_KEYWORDS = [
  'roti', 'chapati', 'paratha', 'naan', 'puri', 'bread', 'wheat',
  'maida', 'atta', 'pasta', 'noodle', 'biscuit', 'cake', 'samosa',
  'pizza', 'burger', 'bhatura',
];

const IODINE_RICH_KEYWORDS = [
  'fish', 'shrimp', 'prawn', 'curd', 'yogurt', 'milk', 'egg',
  'seaweed', 'iodized salt',
];

const GOITROGENIC_RAW_KEYWORDS = [
  'cabbage', 'cauliflower', 'gobi', 'broccoli', 'kale', 'radish',
  'turnip', 'soy', 'tofu', 'soybean',
];

const FOLATE_RICH_KEYWORDS = [
  'spinach', 'palak', 'lentil', 'dal', 'beans', 'rajma', 'chana',
  'broccoli', 'asparagus', 'orange', 'beetroot', 'avocado',
];

const SUGAR_KEYWORDS = [
  'sugar', 'jaggery', 'honey', 'syrup', 'candy', 'chocolate',
  'jalebi', 'gulab jamun', 'ladoo', 'barfi', 'halwa', 'mithai',
  'ice cream', 'cake', 'pastry', 'cola', 'soda', 'sweet',
];

// ── Helpers ──

function itemMatchesAny(item: FoodItem, keywords: string[]): boolean {
  const name = item.name.toLowerCase();
  return keywords.some(kw => name.includes(kw));
}

function anyItemMatches(items: FoodItem[], keywords: string[]): boolean {
  return items.some(item => itemMatchesAny(item, keywords));
}

function matchingItems(items: FoodItem[], keywords: string[]): FoodItem[] {
  return items.filter(item => itemMatchesAny(item, keywords));
}

// ── Condition rule evaluators ──

type RuleEvaluator = (items: FoodItem[], totalCarbs: number, totalProtein: number, totalFat: number, totalCal: number, profile: UserProfile) => ConditionMessage[];

const conditionRules: Record<string, RuleEvaluator> = {

  diabetes: (items, totalCarbs, totalProtein, _totalFat, _totalCal) => {
    const msgs: ConditionMessage[] = [];

    if (totalCarbs > 60) {
      msgs.push({
        text: `This meal has ${Math.round(totalCarbs)}g carbs – for diabetes management, aim for 45–60g per meal. Consider reducing rice/roti portion.`,
        priority: 90,
        condition: 'Diabetes',
        type: 'warning',
        icon: '🩸',
      });
    } else if (totalCarbs > 45 && totalCarbs <= 60) {
      msgs.push({
        text: `Carbs at ${Math.round(totalCarbs)}g – within the recommended range for diabetes. Good job!`,
        priority: 30,
        condition: 'Diabetes',
        type: 'positive',
        icon: '✅',
      });
    }

    if (anyItemMatches(items, SUGAR_KEYWORDS)) {
      msgs.push({
        text: 'This meal contains added sugar or sweets – opt for natural sweeteners or fruit instead.',
        priority: 85,
        condition: 'Diabetes',
        type: 'warning',
        icon: '🍬',
      });
    }

    const hasHighGI = anyItemMatches(items, HIGH_GI_KEYWORDS);
    const hasLowGI = anyItemMatches(items, LOW_GI_KEYWORDS);

    if (hasHighGI && !hasLowGI) {
      msgs.push({
        text: 'This meal has high-GI foods without low-GI balance. Pair with dal, vegetables, or whole grains to slow glucose absorption.',
        priority: 75,
        condition: 'Diabetes',
        type: 'caution',
        icon: '📈',
      });
    } else if (hasLowGI) {
      msgs.push({
        text: 'Great choice – this meal includes low-GI foods that help manage blood sugar levels.',
        priority: 25,
        condition: 'Diabetes',
        type: 'positive',
        icon: '💚',
      });
    }

    if (totalProtein >= 20 && totalCarbs <= 60) {
      msgs.push({
        text: 'Good protein-to-carb ratio – this helps stabilize blood sugar after meals.',
        priority: 20,
        condition: 'Diabetes',
        type: 'positive',
        icon: '👍',
      });
    }

    return msgs;
  },

  pcos: (items, totalCarbs, totalProtein) => {
    const msgs: ConditionMessage[] = [];

    if (totalProtein < 20) {
      msgs.push({
        text: `This meal has only ${Math.round(totalProtein)}g protein – for PCOS, aim for 25–30g per meal. Add paneer, tofu, eggs, or Greek yogurt.`,
        priority: 80,
        condition: 'PCOS',
        type: 'warning',
        icon: '🥚',
      });
    } else if (totalProtein >= 25) {
      msgs.push({
        text: 'Excellent protein intake – high protein supports hormone balance with PCOS.',
        priority: 20,
        condition: 'PCOS',
        type: 'positive',
        icon: '💪',
      });
    }

    if (anyItemMatches(items, HIGH_GI_KEYWORDS)) {
      msgs.push({
        text: 'High-GI carbs (rice, potato, maida) may worsen insulin resistance with PCOS. Try brown rice, millets, or quinoa.',
        priority: 75,
        condition: 'PCOS',
        type: 'caution',
        icon: '⚠️',
      });
    }

    if (anyItemMatches(items, ANTI_INFLAMMATORY_KEYWORDS)) {
      msgs.push({
        text: 'Anti-inflammatory ingredients detected – excellent for managing PCOS symptoms!',
        priority: 25,
        condition: 'PCOS',
        type: 'positive',
        icon: '🌿',
      });
    }

    if (anyItemMatches(items, DAIRY_KEYWORDS)) {
      msgs.push({
        text: 'Some studies suggest dairy may affect PCOS hormones. Consider plant-based alternatives if symptoms flare.',
        priority: 40,
        condition: 'PCOS',
        type: 'caution',
        icon: '🥛',
      });
    }

    return msgs;
  },

  hypertension: (items) => {
    const msgs: ConditionMessage[] = [];

    if (anyItemMatches(items, HIGH_SODIUM_KEYWORDS)) {
      const sodiumItems = matchingItems(items, HIGH_SODIUM_KEYWORDS).map(i => i.name).join(', ');
      msgs.push({
        text: `High-sodium foods detected (${sodiumItems}). For blood pressure, use fresh herbs and spices instead of salt and processed items.`,
        priority: 85,
        condition: 'Hypertension',
        type: 'warning',
        icon: '🧂',
      });
    }

    if (anyItemMatches(items, POTASSIUM_RICH_KEYWORDS)) {
      msgs.push({
        text: 'Potassium-rich foods help lower blood pressure – great choice for hypertension management!',
        priority: 25,
        condition: 'Hypertension',
        type: 'positive',
        icon: '🍌',
      });
    }

    return msgs;
  },

  thyroid: (items) => {
    const msgs: ConditionMessage[] = [];

    if (anyItemMatches(items, IODINE_RICH_KEYWORDS)) {
      msgs.push({
        text: 'Iodine-rich foods support thyroid function – this meal is thyroid-friendly.',
        priority: 25,
        condition: 'Thyroid',
        type: 'positive',
        icon: '🐟',
      });
    }

    if (anyItemMatches(items, GOITROGENIC_RAW_KEYWORDS)) {
      const goitItems = matchingItems(items, GOITROGENIC_RAW_KEYWORDS).map(i => i.name).join(', ');
      msgs.push({
        text: `${goitItems} may interfere with thyroid if consumed raw. Cooking reduces this effect significantly.`,
        priority: 35,
        condition: 'Thyroid',
        type: 'caution',
        icon: '🥦',
      });
    }

    return msgs;
  },

  'lactose intolerance': (items) => {
    const msgs: ConditionMessage[] = [];

    if (anyItemMatches(items, DAIRY_KEYWORDS)) {
      const dairyItems = matchingItems(items, DAIRY_KEYWORDS).map(i => i.name).join(', ');
      msgs.push({
        text: `Dairy detected (${dairyItems}) – remember to take lactase supplement if you're sensitive. Consider plant-based alternatives.`,
        priority: 90,
        condition: 'Lactose Intolerance',
        type: 'warning',
        icon: '🥛',
      });
    }

    return msgs;
  },

  'gluten-free': (items) => {
    const msgs: ConditionMessage[] = [];

    if (anyItemMatches(items, WHEAT_GLUTEN_KEYWORDS)) {
      const glutenItems = matchingItems(items, WHEAT_GLUTEN_KEYWORDS).map(i => i.name).join(', ');
      msgs.push({
        text: `Potential gluten detected (${glutenItems}). Try alternatives: ragi roti, rice, or gluten-free options.`,
        priority: 90,
        condition: 'Gluten Sensitivity',
        type: 'warning',
        icon: '🌾',
      });
    }

    return msgs;
  },

  pregnancy: (items, totalCarbs, totalProtein, totalFat, totalCal) => {
    const msgs: ConditionMessage[] = [];

    // Folate check
    if (anyItemMatches(items, FOLATE_RICH_KEYWORDS)) {
      msgs.push({
        text: 'Folate-rich foods are crucial for fetal development – excellent choice!',
        priority: 25,
        condition: 'Pregnancy',
        type: 'positive',
        icon: '🤰',
      });
    }

    // Calcium
    if (anyItemMatches(items, DAIRY_KEYWORDS)) {
      msgs.push({
        text: 'Calcium from dairy supports baby\'s bone development – keep it up!',
        priority: 20,
        condition: 'Pregnancy',
        type: 'positive',
        icon: '🦴',
      });
    }

    // Caffeine warning
    const hasCaffeine = items.some(item => {
      const n = item.name.toLowerCase();
      return ['coffee', 'tea', 'chai', 'espresso', 'cola', 'energy drink'].some(kw => n.includes(kw));
    });
    if (hasCaffeine) {
      msgs.push({
        text: 'Limit caffeine to 200mg/day during pregnancy (about 1 cup of coffee).',
        priority: 60,
        condition: 'Pregnancy',
        type: 'caution',
        icon: '☕',
      });
    }

    // Low protein
    if (totalProtein < 20) {
      msgs.push({
        text: `Protein is important during pregnancy – this meal has only ${Math.round(totalProtein)}g. Aim for 25g+ per meal.`,
        priority: 65,
        condition: 'Pregnancy',
        type: 'caution',
        icon: '🥚',
      });
    }

    return msgs;
  },

  'high cholesterol': (items, _tc, _tp, totalFat) => {
    const msgs: ConditionMessage[] = [];

    if (totalFat > 25) {
      msgs.push({
        text: `High fat meal (${Math.round(totalFat)}g). For cholesterol management, aim for heart-healthy fats from nuts, seeds, and fish.`,
        priority: 70,
        condition: 'High Cholesterol',
        type: 'caution',
        icon: '❤️',
      });
    }

    const friedKeywords = ['fried', 'pakora', 'bhajia', 'samosa', 'puri', 'paratha', 'chips', 'deep fried'];
    if (anyItemMatches(items, friedKeywords)) {
      msgs.push({
        text: 'Fried foods raise LDL cholesterol. Try baked, grilled, or steamed alternatives.',
        priority: 75,
        condition: 'High Cholesterol',
        type: 'warning',
        icon: '🍳',
      });
    }

    return msgs;
  },
};

// ── Normalize condition names from profile ──

function normalizeCondition(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('diabetes') || lower.includes('sugar') || lower.includes('diabetic')) return 'diabetes';
  if (lower.includes('pcos') || lower.includes('polycystic')) return 'pcos';
  if (lower.includes('hypertension') || lower.includes('blood pressure') || lower.includes('bp')) return 'hypertension';
  if (lower.includes('thyroid') || lower.includes('hypothyroid') || lower.includes('hyperthyroid')) return 'thyroid';
  if (lower.includes('lactose')) return 'lactose intolerance';
  if (lower.includes('gluten') || lower.includes('celiac')) return 'gluten-free';
  if (lower.includes('pregnan')) return 'pregnancy';
  if (lower.includes('cholesterol')) return 'high cholesterol';
  return lower;
}

// ── Main evaluation ──

export function evaluateConditions(
  items: FoodItem[],
  totalCarbs: number,
  totalProtein: number,
  totalFat: number,
  totalCal: number,
  profile: UserProfile | null,
): ConditionFeedback {
  const allMessages: ConditionMessage[] = [];

  if (!profile) return { messages: [], overallColor: 'green', score: 10 };

  // Collect conditions from profile
  const conditions = new Set<string>();

  // From healthConditions array
  profile.healthConditions?.forEach(c => conditions.add(normalizeCondition(c)));

  // From womenHealth array
  profile.womenHealth?.forEach(c => {
    const normalized = normalizeCondition(c);
    if (normalized === 'pcos' || normalized === 'pregnancy') conditions.add(normalized);
  });

  // From dietaryPrefs (gluten-free, lactose)
  profile.dietaryPrefs?.forEach(p => {
    const lower = p.toLowerCase();
    if (lower.includes('gluten')) conditions.add('gluten-free');
    if (lower.includes('lactose')) conditions.add('lactose intolerance');
  });

  if (conditions.size === 0) return { messages: [], overallColor: 'green', score: 10 };

  // Evaluate each condition's rules
  for (const condition of conditions) {
    const evaluator = conditionRules[condition];
    if (evaluator) {
      const msgs = evaluator(items, totalCarbs, totalProtein, totalFat, totalCal, profile);
      allMessages.push(...msgs);
    }
  }

  // Sort by priority descending
  allMessages.sort((a, b) => b.priority - a.priority);

  // Determine overall color
  let overallColor: ConditionFeedback['overallColor'] = 'green';
  if (allMessages.length > 0) {
    const topPriority = allMessages[0].priority;
    if (topPriority >= 80) overallColor = 'red';
    else if (topPriority >= 50) overallColor = 'yellow';
  }

  // Compute score adjustment (10 = perfect, lower = more issues)
  const warnings = allMessages.filter(m => m.type === 'warning').length;
  const cautions = allMessages.filter(m => m.type === 'caution').length;
  const positives = allMessages.filter(m => m.type === 'positive').length;
  const score = Math.max(1, Math.min(10, 10 - warnings * 2 - cautions * 1 + positives * 0.5));

  return { messages: allMessages, overallColor, score };
}

// ── Get user's active conditions for display ──

export function getUserConditions(profile: UserProfile | null): string[] {
  if (!profile) return [];
  const conditions = new Set<string>();
  profile.healthConditions?.forEach(c => conditions.add(normalizeCondition(c)));
  profile.womenHealth?.forEach(c => {
    const n = normalizeCondition(c);
    if (n === 'pcos' || n === 'pregnancy') conditions.add(n);
  });
  profile.dietaryPrefs?.forEach(p => {
    const l = p.toLowerCase();
    if (l.includes('gluten')) conditions.add('gluten-free');
    if (l.includes('lactose')) conditions.add('lactose intolerance');
  });
  return Array.from(conditions);
}
