// ============================================
// NutriLens AI – Food Tagging System
// ============================================
// Tags foods as hydrating, heavy, light, and skin-friendly.

export interface FoodTags {
  isHydrating?: boolean;
  isHeavy?: boolean;
  isLight?: boolean;
}

export interface SkinTags {
  goodForAcne?: boolean;
  goodForOilySkin?: boolean;
  goodForDrySkin?: boolean;
  goodForGlow?: boolean;
  goodForPigmentation?: boolean;
  goodForSensitive?: boolean;
}

// Keyword-based tagging for common Indian foods
const HYDRATING_KEYWORDS = [
  'buttermilk', 'chaas', 'lassi', 'coconut water', 'nimbu pani', 'lemonade',
  'watermelon', 'tarbooz', 'cucumber', 'kheera', 'curd', 'dahi', 'yoghurt', 'yogurt',
  'raita', 'jaljeera', 'aam panna', 'shikanji', 'sol kadhi', 'kokum',
  'muskmelon', 'kharbuja', 'orange', 'mosambi', 'sweet lime', 'sugarcane',
  'tender coconut', 'nariyal pani', 'mint', 'pudina', 'soup', 'rasam',
  'sambhar', 'dal', 'milk', 'dudh', 'juice', 'sharbat', 'smoothie',
  'ice cream', 'kulfi', 'sherbet', 'thandai', 'sattu',
];

const HEAVY_KEYWORDS = [
  'biryani', 'fried', 'pakora', 'samosa', 'puri', 'bhatura', 'chole bhature',
  'paratha', 'stuffed paratha', 'aloo paratha', 'halwa', 'ladoo', 'laddu',
  'gulab jamun', 'jalebi', 'butter chicken', 'paneer butter masala',
  'cream', 'malai', 'cheese', 'pizza', 'burger', 'naan', 'kulcha',
  'mutton', 'lamb', 'kebab', 'tikka', 'tandoori chicken', 'korma',
  'kheer', 'payasam', 'rabri', 'cake', 'pastry', 'sweet', 'mithai',
  'pulao', 'dum', 'nihari', 'paya', 'rogan josh',
];

const LIGHT_KEYWORDS = [
  'salad', 'steamed', 'boiled', 'poha', 'upma', 'idli', 'dosa',
  'khichdi', 'dal soup', 'clear soup', 'sprouts', 'moong', 'chana',
  'fruit', 'apple', 'banana', 'papaya', 'grapes', 'berries',
  'oats', 'muesli', 'roti', 'chapati', 'plain rice', 'curd rice',
  'sandwich', 'dhokla', 'uttapam', 'appam', 'stew',
  'grilled', 'baked', 'sauteed', 'stir fry', 'roasted',
  'egg white', 'tofu', 'paneer tikka', 'tandoori', 'fish',
  'ragi', 'bajra', 'jowar', 'dalia', 'brown rice',
];

// ── Skin-Friendly Keywords ──

const ACNE_FRIENDLY_KEYWORDS = [
  'whole grain', 'whole wheat', 'brown rice', 'oats', 'bajra', 'jowar', 'ragi',
  'pumpkin seeds', 'chickpeas', 'chana', 'flaxseed', 'alsi',
  'berries', 'blueberries', 'strawberries', 'green tea',
  'spinach', 'palak', 'sprouts', 'moong', 'turmeric', 'haldi',
  'walnuts', 'akhrot', 'fish', 'salmon', 'sardine',
];

const OILY_SKIN_KEYWORDS = [
  'pumpkin seeds', 'chickpeas', 'chana', 'banana', 'potato',
  'whole grain', 'brown rice', 'oats', 'bajra', 'ragi',
  'cucumber', 'kheera', 'watermelon', 'citrus', 'lemon', 'nimbu',
];

const DRY_SKIN_KEYWORDS = [
  'avocado', 'almond', 'badam', 'walnut', 'akhrot', 'cashew', 'kaju',
  'olive oil', 'ghee', 'coconut', 'nariyal', 'flaxseed', 'alsi',
  'sunflower seeds', 'peanut', 'mungfali',
  'sweet potato', 'shakarkandi', 'spinach', 'palak',
  'egg', 'salmon', 'fish',
];

const GLOW_KEYWORDS = [
  'amla', 'gooseberry', 'orange', 'mosambi', 'lemon', 'nimbu',
  'bell pepper', 'shimla mirch', 'guava', 'amrud',
  'berries', 'blueberries', 'strawberries', 'pomegranate', 'anaar',
  'coconut water', 'papaya', 'mango', 'kiwi',
  'carrot', 'gajar', 'tomato', 'tamatar', 'beetroot', 'chukandar',
];

const PIGMENTATION_KEYWORDS = [
  'tomato', 'tamatar', 'citrus', 'orange', 'lemon', 'nimbu',
  'amla', 'gooseberry', 'bell pepper', 'shimla mirch',
  'spinach', 'palak', 'kale', 'methi', 'fenugreek',
  'turmeric', 'haldi', 'green tea',
  'sweet potato', 'shakarkandi', 'carrot', 'gajar',
  'pomegranate', 'anaar', 'beetroot', 'chukandar',
];

const SENSITIVE_SKIN_KEYWORDS = [
  'turmeric', 'haldi', 'ginger', 'adrak',
  'oats', 'oatmeal', 'flaxseed', 'alsi', 'chia seeds',
  'walnuts', 'akhrot', 'salmon', 'fish',
  'cucumber', 'kheera', 'chamomile', 'green tea',
  'coconut oil', 'coconut', 'nariyal',
  'banana', 'papaya', 'sweet potato',
];

function matchesKeywords(name: string, keywords: string[]): boolean {
  return keywords.some(kw => name.includes(kw));
}

export function getTagsForFood(foodName: string): FoodTags {
  const name = foodName.toLowerCase();
  return {
    isHydrating: matchesKeywords(name, HYDRATING_KEYWORDS),
    isHeavy: matchesKeywords(name, HEAVY_KEYWORDS),
    isLight: matchesKeywords(name, LIGHT_KEYWORDS),
  };
}

export function getSkinTagsForFood(foodName: string): SkinTags {
  const name = foodName.toLowerCase();
  return {
    goodForAcne: matchesKeywords(name, ACNE_FRIENDLY_KEYWORDS),
    goodForOilySkin: matchesKeywords(name, OILY_SKIN_KEYWORDS),
    goodForDrySkin: matchesKeywords(name, DRY_SKIN_KEYWORDS),
    goodForGlow: matchesKeywords(name, GLOW_KEYWORDS),
    goodForPigmentation: matchesKeywords(name, PIGMENTATION_KEYWORDS),
    goodForSensitive: matchesKeywords(name, SENSITIVE_SKIN_KEYWORDS),
  };
}

export function getMealTags(items: Array<{ name: string }>): {
  hasHydrating: boolean;
  hasHeavy: boolean;
  hasLight: boolean;
  heavyCount: number;
  hydratingCount: number;
} {
  let hasHydrating = false, hasHeavy = false, hasLight = false;
  let heavyCount = 0, hydratingCount = 0;

  for (const item of items) {
    const tags = getTagsForFood(item.name);
    if (tags.isHydrating) { hasHydrating = true; hydratingCount++; }
    if (tags.isHeavy) { hasHeavy = true; heavyCount++; }
    if (tags.isLight) hasLight = true;
  }

  return { hasHydrating, hasHeavy, hasLight, heavyCount, hydratingCount };
}

export function getMealSkinTags(items: Array<{ name: string }>): Record<keyof SkinTags, boolean> {
  const result: Record<keyof SkinTags, boolean> = {
    goodForAcne: false,
    goodForOilySkin: false,
    goodForDrySkin: false,
    goodForGlow: false,
    goodForPigmentation: false,
    goodForSensitive: false,
  };

  for (const item of items) {
    const tags = getSkinTagsForFood(item.name);
    if (tags.goodForAcne) result.goodForAcne = true;
    if (tags.goodForOilySkin) result.goodForOilySkin = true;
    if (tags.goodForDrySkin) result.goodForDrySkin = true;
    if (tags.goodForGlow) result.goodForGlow = true;
    if (tags.goodForPigmentation) result.goodForPigmentation = true;
    if (tags.goodForSensitive) result.goodForSensitive = true;
  }

  return result;
}

// Seasonal food suggestions
export interface SeasonalPick {
  name: string;
  emoji: string;
  reason: string;
  calories: number;
  tags: FoodTags;
}

export function getSeasonalPicks(season: string, temperature: number): SeasonalPick[] {
  if (temperature > 30 || season === 'summer') {
    return [
      { name: 'Buttermilk (Chaas)', emoji: '🥛', reason: 'Cools & hydrates in heat', calories: 40, tags: { isHydrating: true, isLight: true } },
      { name: 'Watermelon', emoji: '🍉', reason: '92% water, perfect for summer', calories: 30, tags: { isHydrating: true, isLight: true } },
      { name: 'Cucumber Raita', emoji: '🥒', reason: 'Cooling probiotic side dish', calories: 65, tags: { isHydrating: true, isLight: true } },
      { name: 'Sattu Drink', emoji: '🥤', reason: 'Traditional summer coolant', calories: 80, tags: { isHydrating: true, isLight: true } },
      { name: 'Curd Rice', emoji: '🍚', reason: 'Light & cooling comfort food', calories: 180, tags: { isHydrating: true, isLight: true } },
    ];
  }

  if (season === 'monsoon') {
    return [
      { name: 'Ginger Tea', emoji: '🫖', reason: 'Boosts immunity in rainy season', calories: 25, tags: { isHydrating: true } },
      { name: 'Moong Dal Soup', emoji: '🍲', reason: 'Easy to digest, warm comfort', calories: 120, tags: { isLight: true, isHydrating: true } },
      { name: 'Corn on the Cob', emoji: '🌽', reason: 'Classic monsoon snack', calories: 90, tags: { isLight: true } },
      { name: 'Pakora (Baked)', emoji: '🥙', reason: 'Lighter version of monsoon fave', calories: 140, tags: { isLight: true } },
      { name: 'Turmeric Milk', emoji: '🥛', reason: 'Anti-inflammatory immunity boost', calories: 60, tags: { isHydrating: true } },
    ];
  }

  if (season === 'winter' || temperature < 18) {
    return [
      { name: 'Bajra Roti + Sarson Saag', emoji: '🫓', reason: 'Warming winter staple', calories: 280, tags: { isHeavy: false, isLight: false } },
      { name: 'Gajar Ka Halwa', emoji: '🥕', reason: 'Seasonal carrot dessert', calories: 220, tags: { isHeavy: true } },
      { name: 'Mixed Vegetable Soup', emoji: '🥣', reason: 'Warm & nutrient-dense', calories: 90, tags: { isLight: true, isHydrating: true } },
      { name: 'Methi Thepla', emoji: '🫓', reason: 'Iron-rich winter flatbread', calories: 150, tags: { isLight: true } },
      { name: 'Dry Fruit Ladoo', emoji: '🟤', reason: 'Natural energy in cold weather', calories: 120, tags: { } },
    ];
  }

  // Default autumn/spring
  return [
    { name: 'Sprout Salad', emoji: '🥗', reason: 'Fresh & protein-rich', calories: 120, tags: { isLight: true } },
    { name: 'Fresh Fruit Bowl', emoji: '🍇', reason: 'Seasonal fruits at their best', calories: 100, tags: { isLight: true, isHydrating: true } },
    { name: 'Poha', emoji: '🍛', reason: 'Light & balanced breakfast', calories: 155, tags: { isLight: true } },
    { name: 'Khichdi', emoji: '🍲', reason: 'Gentle on digestion', calories: 120, tags: { isLight: true } },
    { name: 'Nimbu Pani', emoji: '🍋', reason: 'Refreshing vitamin C boost', calories: 25, tags: { isHydrating: true, isLight: true } },
  ];
}
