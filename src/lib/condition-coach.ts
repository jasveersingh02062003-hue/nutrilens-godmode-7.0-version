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

// ── Per-item health condition check (lightweight, no totals needed) ──

export interface FoodConditionWarning {
  text: string;
  condition: string;
  severity: 'high' | 'medium' | 'low';
  icon: string;
}

function nameMatchesAny(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

const foodConditionRules: Record<string, { check: (name: string) => FoodConditionWarning[] }> = {
  diabetes: {
    check: (name) => {
      const warnings: FoodConditionWarning[] = [];
      if (nameMatchesAny(name, SUGAR_KEYWORDS)) {
        warnings.push({ text: 'Contains sugar – may spike blood glucose', condition: 'Diabetes', severity: 'high', icon: '🩸' });
      } else if (nameMatchesAny(name, HIGH_GI_KEYWORDS)) {
        warnings.push({ text: 'High-GI food – may raise blood sugar', condition: 'Diabetes', severity: 'medium', icon: '📈' });
      }
      return warnings;
    },
  },
  pcos: {
    check: (name) => {
      const warnings: FoodConditionWarning[] = [];
      if (nameMatchesAny(name, HIGH_GI_KEYWORDS)) {
        warnings.push({ text: 'High-GI – may worsen insulin resistance', condition: 'PCOS', severity: 'medium', icon: '⚠️' });
      }
      if (nameMatchesAny(name, DAIRY_KEYWORDS)) {
        warnings.push({ text: 'Dairy may affect PCOS hormones', condition: 'PCOS', severity: 'low', icon: '🥛' });
      }
      return warnings;
    },
  },
  hypertension: {
    check: (name) => {
      if (nameMatchesAny(name, HIGH_SODIUM_KEYWORDS)) {
        return [{ text: 'High sodium – may raise blood pressure', condition: 'Hypertension', severity: 'high', icon: '🧂' }];
      }
      return [];
    },
  },
  thyroid: {
    check: (name) => {
      if (nameMatchesAny(name, GOITROGENIC_RAW_KEYWORDS)) {
        return [{ text: 'May interfere with thyroid if raw', condition: 'Thyroid', severity: 'low', icon: '🥦' }];
      }
      return [];
    },
  },
  'lactose intolerance': {
    check: (name) => {
      if (nameMatchesAny(name, DAIRY_KEYWORDS)) {
        return [{ text: 'Contains dairy – take lactase if sensitive', condition: 'Lactose', severity: 'high', icon: '🥛' }];
      }
      return [];
    },
  },
  'gluten-free': {
    check: (name) => {
      if (nameMatchesAny(name, WHEAT_GLUTEN_KEYWORDS)) {
        return [{ text: 'Contains gluten', condition: 'Gluten', severity: 'high', icon: '🌾' }];
      }
      return [];
    },
  },
  'high cholesterol': {
    check: (name) => {
      const fried = ['fried', 'pakora', 'bhajia', 'samosa', 'puri', 'paratha', 'chips', 'deep fried'];
      if (nameMatchesAny(name, fried)) {
        return [{ text: 'Fried food raises LDL cholesterol', condition: 'Cholesterol', severity: 'medium', icon: '🍳' }];
      }
      return [];
    },
  },
  pregnancy: {
    check: (name) => {
      const caffeine = ['coffee', 'tea', 'chai', 'espresso', 'cola', 'energy drink'];
      if (nameMatchesAny(name, caffeine)) {
        return [{ text: 'Limit caffeine during pregnancy', condition: 'Pregnancy', severity: 'medium', icon: '☕' }];
      }
      return [];
    },
  },
};

export function checkFoodForConditions(
  foodName: string,
  userConditions: string[],
): FoodConditionWarning[] {
  const warnings: FoodConditionWarning[] = [];
  for (const raw of userConditions) {
    const normalized = normalizeCondition(raw);
    const rule = foodConditionRules[normalized];
    if (rule) {
      warnings.push(...rule.check(foodName));
    }
  }
  return warnings;
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

// ── Condition Guidance Builder (for AI context) ──
// Scans recent meals against keyword sets and returns deterministic
// per-condition advice that gets injected into Monika's prompt.

export interface ConditionGuidance {
  condition: string;
  recentlyAte: string[];
  shouldAvoid: string[];
  shouldPrefer: string[];
  notes: string[];
}

function findRecentMatches(recentItemNames: string[], keywords: string[]): string[] {
  const lower = recentItemNames.map(n => n.toLowerCase());
  const matched = new Set<string>();
  for (const kw of keywords) {
    for (let i = 0; i < lower.length; i++) {
      if (lower[i].includes(kw)) {
        matched.add(recentItemNames[i]);
        if (matched.size >= 5) return Array.from(matched);
      }
    }
  }
  return Array.from(matched);
}

export function buildConditionGuidance(
  profile: UserProfile | null,
  recentItemNames: string[],
): ConditionGuidance[] {
  if (!profile) return [];
  const conditions = getUserConditions(profile);
  if (conditions.length === 0) return [];

  const out: ConditionGuidance[] = [];

  for (const c of conditions) {
    switch (c) {
      case 'diabetes':
      case 'pre-diabetes':
        out.push({
          condition: c,
          recentlyAte: findRecentMatches(recentItemNames, HIGH_GI_KEYWORDS),
          shouldAvoid: ['white rice', 'maida/refined flour', 'sugary sweets (jalebi, gulab jamun)', 'fruit juices', 'instant noodles'],
          shouldPrefer: ['dal/lentils', 'brown rice', 'oats', 'millets (ragi, jowar)', 'sprouts', 'non-starchy veggies'],
          notes: ['Aim for 45–60g carbs per meal', 'Pair carbs with protein + fiber to slow GI'],
        });
        break;
      case 'pcos':
        out.push({
          condition: 'pcos',
          recentlyAte: [
            ...findRecentMatches(recentItemNames, HIGH_GI_KEYWORDS),
            ...findRecentMatches(recentItemNames, SUGAR_KEYWORDS),
          ],
          shouldAvoid: ['refined sugar', 'white bread/maida', 'sugary drinks', 'excess dairy if acne-prone'],
          shouldPrefer: ['high-protein meals (paneer, eggs, chicken, dal)', 'low-GI carbs (oats, quinoa)', 'anti-inflammatory foods (turmeric, flaxseed, berries)', 'omega-3 sources (walnuts, fatty fish)'],
          notes: ['Protein at every meal helps insulin sensitivity', 'Paneer is GENERALLY OK in moderation — high protein, low GI'],
        });
        break;
      case 'thyroid':
      case 'hypothyroid':
        out.push({
          condition: c,
          recentlyAte: findRecentMatches(recentItemNames, GOITROGENIC_RAW_KEYWORDS),
          shouldAvoid: ['raw cruciferous in excess (raw cabbage, raw cauliflower, raw broccoli)', 'excess soy/tofu'],
          shouldPrefer: ['iodine-rich foods (fish, eggs, dairy, iodized salt)', 'cooked cruciferous (cooking deactivates goitrogens)', 'selenium sources (brazil nuts, eggs)'],
          notes: ['Cooked cruciferous is fine — only RAW in large quantities is a concern'],
        });
        break;
      case 'hypertension':
      case 'high-bp':
        out.push({
          condition: c,
          recentlyAte: findRecentMatches(recentItemNames, HIGH_SODIUM_KEYWORDS),
          shouldAvoid: ['pickle', 'papad', 'chips/namkeen', 'instant noodles', 'processed cheese', 'soy sauce'],
          shouldPrefer: ['potassium-rich (banana, spinach, coconut water)', 'fresh home-cooked meals', 'unsalted nuts'],
          notes: ['Aim for <2300mg sodium/day (~1 tsp salt total)'],
        });
        break;
      case 'high-cholesterol':
        out.push({
          condition: c,
          recentlyAte: [],
          shouldAvoid: ['deep-fried foods', 'ghee/butter in excess', 'red meat', 'full-fat dairy'],
          shouldPrefer: ['oats', 'flaxseed', 'almonds/walnuts', 'fatty fish', 'leafy greens'],
          notes: ['Soluble fiber (oats, apples, dal) lowers LDL'],
        });
        break;
      case 'lactose intolerance':
        out.push({
          condition: c,
          recentlyAte: findRecentMatches(recentItemNames, DAIRY_KEYWORDS),
          shouldAvoid: ['milk', 'cream', 'ice cream', 'kheer/rabri', 'rasmalai'],
          shouldPrefer: ['curd/dahi (lower lactose)', 'paneer (very low lactose)', 'lactose-free milk', 'almond/soy milk'],
          notes: ['Hard cheeses + fermented dairy (curd) are usually well tolerated'],
        });
        break;
      case 'gluten-free':
      case 'celiac':
        out.push({
          condition: c,
          recentlyAte: findRecentMatches(recentItemNames, WHEAT_GLUTEN_KEYWORDS),
          shouldAvoid: ['wheat roti', 'maida', 'pasta', 'naan', 'samosa', 'bread'],
          shouldPrefer: ['rice', 'millet/jowar/ragi/bajra roti', 'dosa/idli', 'besan chilla'],
          notes: ['Indian gluten-free swaps are easy: jowar/ragi roti, rice, millets'],
        });
        break;
      case 'pregnancy':
        out.push({
          condition: c,
          recentlyAte: [],
          shouldAvoid: ['raw/undercooked eggs and meat', 'unpasteurized cheese', 'high-mercury fish', 'excess caffeine (>200mg)', 'papaya (raw)'],
          shouldPrefer: ['folate-rich (spinach, dal, beetroot)', 'iron-rich (jaggery, dates, spinach + vit C)', 'calcium (curd, paneer, milk)', 'omega-3 (walnut, flaxseed)'],
          notes: ['Take prenatal vitamins; eat small frequent meals'],
        });
        break;
      case 'anemia':
      case 'iron-deficiency':
        out.push({
          condition: c,
          recentlyAte: [],
          shouldAvoid: ['tea/coffee within 1h of meals (blocks iron absorption)'],
          shouldPrefer: ['spinach', 'jaggery', 'dates', 'rajma', 'chana', 'beetroot — pair with vitamin C (lemon/orange)'],
          notes: ['Vitamin C boosts iron absorption; tea/coffee blocks it'],
        });
        break;
    }
  }

  return out;
}

