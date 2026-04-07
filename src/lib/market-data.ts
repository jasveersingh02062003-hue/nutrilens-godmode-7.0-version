// ═══════════════════════════════════════════════════════════
// Real Indian Market Items — Static database with actual market prices
// Separated from foodDatabase (which is for cooked dishes / PES scanner)
// FIRECRAWL_HOOK: Replace static prices with live scraped data when enabled
// ═══════════════════════════════════════════════════════════

export type MarketSubcategory =
  // Meat & Seafood
  | 'chicken' | 'fish' | 'mutton' | 'prawns'
  // Eggs
  | 'white_egg' | 'brown_egg' | 'desi_egg'
  // Vegetables
  | 'leafy_greens' | 'root_vegs' | 'everyday_vegs' | 'exotic_vegs'
  // Dals
  | 'dals_lentils' | 'legumes'
  // Dairy
  | 'milk_curd' | 'paneer_cheese' | 'ghee_butter'
  // Grains
  | 'rice' | 'flour_atta' | 'millets' | 'oats_cereal'
  // Fruits
  | 'everyday_fruits' | 'seasonal_fruits'
  // Packed
  | 'protein_drinks' | 'protein_bars' | 'ready_to_eat' | 'snacks' | 'frozen' | 'spreads';

export type MarketTopCategory =
  | 'meat_seafood' | 'eggs' | 'vegetables' | 'dals_pulses'
  | 'dairy' | 'grains_millets' | 'fruits' | 'packed_foods' | 'supplements';

export interface RawMarketItem {
  id: string;
  name: string;
  emoji: string;
  topCategory: MarketTopCategory;
  subcategory: MarketSubcategory;
  /** National average price */
  basePrice: number;
  /** Standard unit: 'kg', 'piece', 'dozen', 'liter', 'packet' */
  unit: string;
  /** Per serving (100g or 1 piece etc.) */
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Serving description for nutrition context */
  servingDesc: string;
  isVeg: boolean;
  tags: string[];
}

// ─── City Price Multipliers ───
// Base = national average. Multiply for city-specific estimates.
// FIRECRAWL_HOOK: Replace with live city-specific prices
export const CITY_MULTIPLIERS: Record<string, number> = {
  hyderabad: 0.95,
  bangalore: 1.10,
  mumbai: 1.15,
  delhi: 1.05,
  chennai: 1.00,
  pune: 1.05,
  kolkata: 0.90,
  ahmedabad: 0.95,
  jaipur: 0.95,
  lucknow: 0.90,
};

export const TOP_CATEGORIES: { key: MarketTopCategory; label: string; emoji: string; color: string }[] = [
  { key: 'meat_seafood', label: 'Meat & Seafood', emoji: '🥩', color: 'from-red-500/15 to-red-500/5' },
  { key: 'eggs', label: 'Eggs', emoji: '🥚', color: 'from-amber-500/15 to-amber-500/5' },
  { key: 'vegetables', label: 'Vegetables', emoji: '🥬', color: 'from-green-500/15 to-green-500/5' },
  { key: 'dals_pulses', label: 'Dals & Pulses', emoji: '🫘', color: 'from-orange-500/15 to-orange-500/5' },
  { key: 'dairy', label: 'Dairy', emoji: '🥛', color: 'from-blue-500/15 to-blue-500/5' },
  { key: 'grains_millets', label: 'Grains & Millets', emoji: '🌾', color: 'from-yellow-500/15 to-yellow-500/5' },
  { key: 'fruits', label: 'Fruits', emoji: '🍌', color: 'from-pink-500/15 to-pink-500/5' },
  { key: 'packed_foods', label: 'Packed Foods', emoji: '📦', color: 'from-purple-500/15 to-purple-500/5' },
  { key: 'supplements', label: 'Supplements', emoji: '💊', color: 'from-teal-500/15 to-teal-500/5' },
];

export const SUBCATEGORIES: Record<MarketTopCategory, { key: MarketSubcategory; label: string }[]> = {
  meat_seafood: [
    { key: 'chicken', label: 'Chicken' },
    { key: 'fish', label: 'Fish' },
    { key: 'mutton', label: 'Mutton' },
    { key: 'prawns', label: 'Prawns' },
  ],
  eggs: [
    { key: 'white_egg', label: 'White Eggs' },
    { key: 'brown_egg', label: 'Brown Eggs' },
    { key: 'desi_egg', label: 'Desi/Country' },
  ],
  vegetables: [
    { key: 'leafy_greens', label: 'Leafy Greens' },
    { key: 'root_vegs', label: 'Root Vegetables' },
    { key: 'everyday_vegs', label: 'Everyday' },
    { key: 'exotic_vegs', label: 'Exotic' },
  ],
  dals_pulses: [
    { key: 'dals_lentils', label: 'Dals & Lentils' },
    { key: 'legumes', label: 'Legumes' },
  ],
  dairy: [
    { key: 'milk_curd', label: 'Milk & Curd' },
    { key: 'paneer_cheese', label: 'Paneer & Cheese' },
    { key: 'ghee_butter', label: 'Ghee & Butter' },
  ],
  grains_millets: [
    { key: 'rice', label: 'Rice' },
    { key: 'flour_atta', label: 'Flour & Atta' },
    { key: 'millets', label: 'Millets' },
    { key: 'oats_cereal', label: 'Oats & Cereal' },
  ],
  fruits: [
    { key: 'everyday_fruits', label: 'Everyday' },
    { key: 'seasonal_fruits', label: 'Seasonal' },
  ],
  packed_foods: [
    { key: 'protein_drinks', label: 'Protein Drinks' },
    { key: 'protein_bars', label: 'Protein Bars' },
    { key: 'ready_to_eat', label: 'Ready to Eat' },
    { key: 'snacks', label: 'Snacks' },
    { key: 'frozen', label: 'Frozen' },
    { key: 'spreads', label: 'Spreads' },
  ],
  supplements: [],
};

// ═══════════════════════════════════════════════════════════
// REAL MARKET ITEMS — Researched Indian market prices (2025-2026)
// Prices are national averages in INR
// Protein/calories are per 100g unless otherwise noted
// ═══════════════════════════════════════════════════════════

export const MARKET_ITEMS: RawMarketItem[] = [
  // ─── MEAT & SEAFOOD — CHICKEN ───
  { id: 'mk_chicken_whole', name: 'Chicken (Whole)', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 220, unit: 'kg', protein: 25, calories: 239, carbs: 0, fat: 14, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },
  { id: 'mk_chicken_breast', name: 'Chicken Breast', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 320, unit: 'kg', protein: 31, calories: 165, carbs: 0, fat: 3.6, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'lean'] },
  { id: 'mk_chicken_thigh', name: 'Chicken Thigh', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 250, unit: 'kg', protein: 26, calories: 209, carbs: 0, fat: 11, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },
  { id: 'mk_chicken_leg', name: 'Chicken Leg', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 240, unit: 'kg', protein: 24, calories: 215, carbs: 0, fat: 12, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },
  { id: 'mk_chicken_keema', name: 'Chicken Keema', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 300, unit: 'kg', protein: 27, calories: 190, carbs: 0, fat: 9, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },

  // ─── FISH ───
  { id: 'mk_rohu', name: 'Rohu', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 220, unit: 'kg', protein: 17, calories: 97, carbs: 0, fat: 1.4, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'omega3'] },
  { id: 'mk_pomfret', name: 'Pomfret', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 600, unit: 'kg', protein: 20, calories: 96, carbs: 0, fat: 1.2, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'premium'] },
  { id: 'mk_surmai', name: 'Surmai (Kingfish)', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 500, unit: 'kg', protein: 24, calories: 118, carbs: 0, fat: 2, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },
  { id: 'mk_hilsa', name: 'Hilsa (Ilish)', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 800, unit: 'kg', protein: 22, calories: 310, carbs: 0, fat: 25, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['non_veg', 'premium', 'omega3'] },
  { id: 'mk_katla', name: 'Katla', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 250, unit: 'kg', protein: 18, calories: 105, carbs: 0, fat: 2.4, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },
  { id: 'mk_bangda', name: 'Bangda (Mackerel)', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 200, unit: 'kg', protein: 19, calories: 176, carbs: 0, fat: 11, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'omega3'] },

  // ─── MUTTON ───
  { id: 'mk_mutton_leg', name: 'Mutton Leg', emoji: '🥩', topCategory: 'meat_seafood', subcategory: 'mutton', basePrice: 750, unit: 'kg', protein: 25, calories: 258, carbs: 0, fat: 18, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'premium'] },
  { id: 'mk_mutton_keema', name: 'Mutton Keema', emoji: '🥩', topCategory: 'meat_seafood', subcategory: 'mutton', basePrice: 700, unit: 'kg', protein: 24, calories: 250, carbs: 0, fat: 17, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },
  { id: 'mk_mutton_ribs', name: 'Mutton Ribs', emoji: '🥩', topCategory: 'meat_seafood', subcategory: 'mutton', basePrice: 780, unit: 'kg', protein: 22, calories: 280, carbs: 0, fat: 21, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['non_veg', 'premium'] },
  { id: 'mk_mutton_liver', name: 'Mutton Liver', emoji: '🥩', topCategory: 'meat_seafood', subcategory: 'mutton', basePrice: 500, unit: 'kg', protein: 20, calories: 135, carbs: 4, fat: 4, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'iron_rich'] },

  // ─── PRAWNS ───
  { id: 'mk_prawns_small', name: 'Prawns (Small)', emoji: '🦐', topCategory: 'meat_seafood', subcategory: 'prawns', basePrice: 350, unit: 'kg', protein: 20, calories: 99, carbs: 0.2, fat: 1.7, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },
  { id: 'mk_prawns_medium', name: 'Prawns (Medium)', emoji: '🦐', topCategory: 'meat_seafood', subcategory: 'prawns', basePrice: 500, unit: 'kg', protein: 21, calories: 106, carbs: 0.2, fat: 1.7, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'] },
  { id: 'mk_prawns_jumbo', name: 'Prawns (Jumbo)', emoji: '🦐', topCategory: 'meat_seafood', subcategory: 'prawns', basePrice: 800, unit: 'kg', protein: 22, calories: 110, carbs: 0, fat: 2, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'premium'] },

  // ─── EGGS ───
  { id: 'mk_egg_white', name: 'White Eggs', emoji: '🥚', topCategory: 'eggs', subcategory: 'white_egg', basePrice: 6, unit: 'piece', protein: 6.3, calories: 72, carbs: 0.4, fat: 4.8, fiber: 0, servingDesc: 'per egg (~50g)', isVeg: false, tags: ['high_protein', 'budget'] },
  { id: 'mk_egg_brown', name: 'Brown Eggs', emoji: '🥚', topCategory: 'eggs', subcategory: 'brown_egg', basePrice: 8, unit: 'piece', protein: 6.5, calories: 78, carbs: 0.6, fat: 5.3, fiber: 0, servingDesc: 'per egg (~55g)', isVeg: false, tags: ['high_protein'] },
  { id: 'mk_egg_desi', name: 'Desi / Country Eggs', emoji: '🥚', topCategory: 'eggs', subcategory: 'desi_egg', basePrice: 12, unit: 'piece', protein: 7, calories: 80, carbs: 0.5, fat: 5.5, fiber: 0, servingDesc: 'per egg (~55g)', isVeg: false, tags: ['high_protein', 'premium', 'free_range'] },

  // ─── VEGETABLES — LEAFY GREENS ───
  { id: 'mk_spinach', name: 'Spinach (Palak)', emoji: '🥬', topCategory: 'vegetables', subcategory: 'leafy_greens', basePrice: 40, unit: 'kg', protein: 2.9, calories: 23, carbs: 3.6, fat: 0.4, fiber: 2.2, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich', 'low_calorie'] },
  { id: 'mk_methi', name: 'Methi (Fenugreek)', emoji: '🌿', topCategory: 'vegetables', subcategory: 'leafy_greens', basePrice: 50, unit: 'kg', protein: 4.4, calories: 49, carbs: 6, fat: 0.9, fiber: 4.2, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich'] },
  { id: 'mk_amaranth', name: 'Amaranth Leaves', emoji: '🥬', topCategory: 'vegetables', subcategory: 'leafy_greens', basePrice: 30, unit: 'kg', protein: 2.5, calories: 23, carbs: 4, fat: 0.3, fiber: 2, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich', 'budget'] },

  // ─── ROOT VEGETABLES ───
  { id: 'mk_potato', name: 'Potato', emoji: '🥔', topCategory: 'vegetables', subcategory: 'root_vegs', basePrice: 25, unit: 'kg', protein: 2, calories: 77, carbs: 17, fat: 0.1, fiber: 2.2, servingDesc: 'per 100g', isVeg: true, tags: ['staple', 'budget'] },
  { id: 'mk_sweet_potato', name: 'Sweet Potato', emoji: '🍠', topCategory: 'vegetables', subcategory: 'root_vegs', basePrice: 40, unit: 'kg', protein: 1.6, calories: 86, carbs: 20, fat: 0.1, fiber: 3, servingDesc: 'per 100g', isVeg: true, tags: ['fiber_rich'] },
  { id: 'mk_beetroot', name: 'Beetroot', emoji: '🟣', topCategory: 'vegetables', subcategory: 'root_vegs', basePrice: 35, unit: 'kg', protein: 1.6, calories: 43, carbs: 10, fat: 0.2, fiber: 2.8, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich'] },
  { id: 'mk_carrot', name: 'Carrot', emoji: '🥕', topCategory: 'vegetables', subcategory: 'root_vegs', basePrice: 35, unit: 'kg', protein: 0.9, calories: 41, carbs: 10, fat: 0.2, fiber: 2.8, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_a'] },

  // ─── EVERYDAY VEGETABLES ───
  { id: 'mk_tomato', name: 'Tomato', emoji: '🍅', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 30, unit: 'kg', protein: 0.9, calories: 18, carbs: 3.9, fat: 0.2, fiber: 1.2, servingDesc: 'per 100g', isVeg: true, tags: ['staple', 'volatile_price'] },
  { id: 'mk_onion', name: 'Onion', emoji: '🧅', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 30, unit: 'kg', protein: 1.1, calories: 40, carbs: 9.3, fat: 0.1, fiber: 1.7, servingDesc: 'per 100g', isVeg: true, tags: ['staple', 'volatile_price'] },
  { id: 'mk_green_chilli', name: 'Green Chilli', emoji: '🌶️', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 60, unit: 'kg', protein: 1.9, calories: 40, carbs: 8.8, fat: 0.4, fiber: 1.5, servingDesc: 'per 100g', isVeg: true, tags: [] },
  { id: 'mk_ginger', name: 'Ginger', emoji: '🫚', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 120, unit: 'kg', protein: 1.8, calories: 80, carbs: 18, fat: 0.8, fiber: 2, servingDesc: 'per 100g', isVeg: true, tags: ['immunity'] },
  { id: 'mk_garlic', name: 'Garlic', emoji: '🧄', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 160, unit: 'kg', protein: 6.4, calories: 149, carbs: 33, fat: 0.5, fiber: 2.1, servingDesc: 'per 100g', isVeg: true, tags: ['immunity'] },
  { id: 'mk_coriander', name: 'Coriander', emoji: '🌿', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 80, unit: 'kg', protein: 2.1, calories: 23, carbs: 3.7, fat: 0.5, fiber: 2.8, servingDesc: 'per 100g', isVeg: true, tags: [] },
  { id: 'mk_curry_leaves', name: 'Curry Leaves', emoji: '🌿', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 200, unit: 'kg', protein: 6.1, calories: 108, carbs: 18.7, fat: 1, fiber: 6.4, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich'] },
  { id: 'mk_cabbage', name: 'Cabbage', emoji: '🥬', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 20, unit: 'kg', protein: 1.3, calories: 25, carbs: 5.8, fat: 0.1, fiber: 2.5, servingDesc: 'per 100g', isVeg: true, tags: ['budget', 'low_calorie'] },
  { id: 'mk_cauliflower', name: 'Cauliflower', emoji: '🥦', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 30, unit: 'kg', protein: 1.9, calories: 25, carbs: 5, fat: 0.3, fiber: 2, servingDesc: 'per 100g', isVeg: true, tags: ['low_calorie'] },
  { id: 'mk_capsicum', name: 'Capsicum', emoji: '🫑', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 60, unit: 'kg', protein: 0.9, calories: 20, carbs: 4.6, fat: 0.2, fiber: 1.7, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_c'] },

  // ─── EXOTIC VEGETABLES ───
  { id: 'mk_broccoli', name: 'Broccoli', emoji: '🥦', topCategory: 'vegetables', subcategory: 'exotic_vegs', basePrice: 120, unit: 'kg', protein: 2.8, calories: 34, carbs: 7, fat: 0.4, fiber: 2.6, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_c', 'fiber_rich'] },
  { id: 'mk_mushroom', name: 'Button Mushroom', emoji: '🍄', topCategory: 'vegetables', subcategory: 'exotic_vegs', basePrice: 150, unit: 'kg', protein: 3.1, calories: 22, carbs: 3.3, fat: 0.3, fiber: 1, servingDesc: 'per 100g', isVeg: true, tags: ['low_calorie'] },
  { id: 'mk_zucchini', name: 'Zucchini', emoji: '🥒', topCategory: 'vegetables', subcategory: 'exotic_vegs', basePrice: 80, unit: 'kg', protein: 1.2, calories: 17, carbs: 3.1, fat: 0.3, fiber: 1, servingDesc: 'per 100g', isVeg: true, tags: ['low_calorie'] },
  { id: 'mk_drumstick', name: 'Drumstick (Moringa)', emoji: '🥬', topCategory: 'vegetables', subcategory: 'exotic_vegs', basePrice: 60, unit: 'kg', protein: 2, calories: 37, carbs: 8.5, fat: 0.2, fiber: 3.2, servingDesc: 'per 100g', isVeg: true, tags: ['calcium_rich'] },

  // ─── DALS & LENTILS ───
  { id: 'mk_moong_dal', name: 'Moong Dal', emoji: '🫘', topCategory: 'dals_pulses', subcategory: 'dals_lentils', basePrice: 130, unit: 'kg', protein: 24, calories: 347, carbs: 60, fat: 1.2, fiber: 16, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['high_protein', 'vegetarian'] },
  { id: 'mk_toor_dal', name: 'Toor Dal (Arhar)', emoji: '🫘', topCategory: 'dals_pulses', subcategory: 'dals_lentils', basePrice: 140, unit: 'kg', protein: 22, calories: 343, carbs: 63, fat: 1.5, fiber: 15, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['high_protein', 'staple'] },
  { id: 'mk_masoor_dal', name: 'Masoor Dal', emoji: '🫘', topCategory: 'dals_pulses', subcategory: 'dals_lentils', basePrice: 110, unit: 'kg', protein: 25, calories: 352, carbs: 60, fat: 1, fiber: 11, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['high_protein', 'budget'] },
  { id: 'mk_chana_dal', name: 'Chana Dal', emoji: '🫘', topCategory: 'dals_pulses', subcategory: 'dals_lentils', basePrice: 100, unit: 'kg', protein: 21, calories: 360, carbs: 64, fat: 5, fiber: 11, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['high_protein', 'budget'] },
  { id: 'mk_urad_dal', name: 'Black Urad Dal', emoji: '🫘', topCategory: 'dals_pulses', subcategory: 'dals_lentils', basePrice: 120, unit: 'kg', protein: 25, calories: 347, carbs: 59, fat: 1.4, fiber: 18, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['high_protein'] },

  // ─── LEGUMES ───
  { id: 'mk_rajma', name: 'Rajma (Kidney Beans)', emoji: '🫘', topCategory: 'dals_pulses', subcategory: 'legumes', basePrice: 120, unit: 'kg', protein: 24, calories: 333, carbs: 60, fat: 0.8, fiber: 15, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['high_protein'] },
  { id: 'mk_chole', name: 'Chole (Chickpeas)', emoji: '🫘', topCategory: 'dals_pulses', subcategory: 'legumes', basePrice: 90, unit: 'kg', protein: 19, calories: 364, carbs: 61, fat: 6, fiber: 17, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['high_protein', 'budget'] },
  { id: 'mk_soya_chunks', name: 'Soya Chunks', emoji: '🫘', topCategory: 'dals_pulses', subcategory: 'legumes', basePrice: 85, unit: '200g', protein: 52, calories: 336, carbs: 33, fat: 0.5, fiber: 13, servingDesc: 'per 100g (dry)', isVeg: true, tags: ['high_protein', 'budget', 'best_value'] },
  { id: 'mk_moong_sprouts', name: 'Moong Sprouts', emoji: '🌱', topCategory: 'dals_pulses', subcategory: 'legumes', basePrice: 60, unit: 'kg', protein: 7, calories: 30, carbs: 4.1, fat: 0.2, fiber: 2, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'budget'] },
  { id: 'mk_chana_sprouts', name: 'Chana Sprouts', emoji: '🌱', topCategory: 'dals_pulses', subcategory: 'legumes', basePrice: 70, unit: 'kg', protein: 9, calories: 47, carbs: 5, fat: 0.7, fiber: 3, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein'] },
  { id: 'mk_tofu', name: 'Tofu', emoji: '🧈', topCategory: 'dals_pulses', subcategory: 'legumes', basePrice: 80, unit: '200g', protein: 8, calories: 76, carbs: 1.9, fat: 4.8, fiber: 0.3, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'vegan'] },

  // ─── DAIRY — MILK & CURD ───
  { id: 'mk_milk_full', name: 'Full Cream Milk', emoji: '🥛', topCategory: 'dairy', subcategory: 'milk_curd', basePrice: 60, unit: 'liter', protein: 3.2, calories: 62, carbs: 4.8, fat: 3.3, fiber: 0, servingDesc: 'per 100ml', isVeg: true, tags: ['calcium_rich'] },
  { id: 'mk_milk_toned', name: 'Toned Milk', emoji: '🥛', topCategory: 'dairy', subcategory: 'milk_curd', basePrice: 52, unit: 'liter', protein: 3, calories: 46, carbs: 4.7, fat: 1.5, fiber: 0, servingDesc: 'per 100ml', isVeg: true, tags: ['calcium_rich', 'low_fat'] },
  { id: 'mk_curd', name: 'Curd / Dahi', emoji: '🥛', topCategory: 'dairy', subcategory: 'milk_curd', basePrice: 50, unit: 'kg', protein: 3.5, calories: 60, carbs: 4.7, fat: 3.1, fiber: 0, servingDesc: 'per 100g', isVeg: true, tags: ['probiotic'] },
  { id: 'mk_buttermilk', name: 'Buttermilk / Chaas', emoji: '🥛', topCategory: 'dairy', subcategory: 'milk_curd', basePrice: 20, unit: 'liter', protein: 1.5, calories: 25, carbs: 3, fat: 0.5, fiber: 0, servingDesc: 'per 100ml', isVeg: true, tags: ['probiotic', 'budget'] },

  // ─── PANEER & CHEESE ───
  { id: 'mk_paneer', name: 'Paneer', emoji: '🧀', topCategory: 'dairy', subcategory: 'paneer_cheese', basePrice: 360, unit: 'kg', protein: 18, calories: 265, carbs: 1.2, fat: 20, fiber: 0, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'calcium_rich'] },

  // ─── GHEE & BUTTER ───
  { id: 'mk_ghee', name: 'Desi Ghee', emoji: '🧈', topCategory: 'dairy', subcategory: 'ghee_butter', basePrice: 600, unit: 'kg', protein: 0, calories: 900, carbs: 0, fat: 100, fiber: 0, servingDesc: 'per 100g', isVeg: true, tags: ['cooking_fat'] },
  { id: 'mk_butter', name: 'Butter (Amul)', emoji: '🧈', topCategory: 'dairy', subcategory: 'ghee_butter', basePrice: 520, unit: 'kg', protein: 0.1, calories: 717, carbs: 0.1, fat: 81, fiber: 0, servingDesc: 'per 100g', isVeg: true, tags: [] },

  // ─── GRAINS — RICE ───
  { id: 'mk_rice_regular', name: 'Rice (Regular)', emoji: '🍚', topCategory: 'grains_millets', subcategory: 'rice', basePrice: 45, unit: 'kg', protein: 6.8, calories: 365, carbs: 80, fat: 0.6, fiber: 1.3, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['staple', 'budget'] },
  { id: 'mk_rice_basmati', name: 'Basmati Rice', emoji: '🍚', topCategory: 'grains_millets', subcategory: 'rice', basePrice: 90, unit: 'kg', protein: 7, calories: 360, carbs: 78, fat: 0.5, fiber: 1.5, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['staple'] },
  { id: 'mk_rice_brown', name: 'Brown Rice', emoji: '🍚', topCategory: 'grains_millets', subcategory: 'rice', basePrice: 110, unit: 'kg', protein: 7.5, calories: 370, carbs: 77, fat: 2.7, fiber: 3.5, servingDesc: 'per 100g (raw)', isVeg: true, tags: ['fiber_rich'] },

  // ─── FLOUR & ATTA ───
  { id: 'mk_wheat_atta', name: 'Wheat Atta', emoji: '🌾', topCategory: 'grains_millets', subcategory: 'flour_atta', basePrice: 40, unit: 'kg', protein: 12, calories: 340, carbs: 72, fat: 1.7, fiber: 11, servingDesc: 'per 100g', isVeg: true, tags: ['staple', 'budget'] },
  { id: 'mk_besan', name: 'Besan (Gram Flour)', emoji: '🌾', topCategory: 'grains_millets', subcategory: 'flour_atta', basePrice: 80, unit: 'kg', protein: 22, calories: 387, carbs: 58, fat: 7, fiber: 11, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein'] },

  // ─── MILLETS ───
  { id: 'mk_ragi', name: 'Ragi (Finger Millet)', emoji: '🌾', topCategory: 'grains_millets', subcategory: 'millets', basePrice: 55, unit: 'kg', protein: 7.3, calories: 328, carbs: 72, fat: 1.3, fiber: 11.5, servingDesc: 'per 100g', isVeg: true, tags: ['calcium_rich', 'fiber_rich'] },
  { id: 'mk_jowar', name: 'Jowar (Sorghum)', emoji: '🌾', topCategory: 'grains_millets', subcategory: 'millets', basePrice: 50, unit: 'kg', protein: 10.4, calories: 349, carbs: 73, fat: 1.9, fiber: 9.7, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'gluten_free'] },
  { id: 'mk_bajra', name: 'Bajra (Pearl Millet)', emoji: '🌾', topCategory: 'grains_millets', subcategory: 'millets', basePrice: 45, unit: 'kg', protein: 11.6, calories: 361, carbs: 67, fat: 5, fiber: 11.3, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'iron_rich'] },

  // ─── OATS & CEREAL ───
  { id: 'mk_oats', name: 'Rolled Oats', emoji: '🌾', topCategory: 'grains_millets', subcategory: 'oats_cereal', basePrice: 180, unit: 'kg', protein: 13, calories: 389, carbs: 66, fat: 7, fiber: 11, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'fiber_rich'] },

  // ─── FRUITS — EVERYDAY ───
  { id: 'mk_banana', name: 'Banana', emoji: '🍌', topCategory: 'fruits', subcategory: 'everyday_fruits', basePrice: 40, unit: 'dozen', protein: 1.1, calories: 89, carbs: 23, fat: 0.3, fiber: 2.6, servingDesc: 'per 100g (~1 banana)', isVeg: true, tags: ['energy', 'budget'] },
  { id: 'mk_apple', name: 'Apple', emoji: '🍎', topCategory: 'fruits', subcategory: 'everyday_fruits', basePrice: 150, unit: 'kg', protein: 0.3, calories: 52, carbs: 14, fat: 0.2, fiber: 2.4, servingDesc: 'per 100g', isVeg: true, tags: ['fiber_rich'] },
  { id: 'mk_papaya', name: 'Papaya', emoji: '🍈', topCategory: 'fruits', subcategory: 'everyday_fruits', basePrice: 40, unit: 'kg', protein: 0.5, calories: 43, carbs: 11, fat: 0.3, fiber: 1.7, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_c', 'budget'] },
  { id: 'mk_guava', name: 'Guava', emoji: '🍐', topCategory: 'fruits', subcategory: 'everyday_fruits', basePrice: 60, unit: 'kg', protein: 2.6, calories: 68, carbs: 14, fat: 1, fiber: 5.4, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_c', 'fiber_rich'] },
  { id: 'mk_orange', name: 'Orange / Mosambi', emoji: '🍊', topCategory: 'fruits', subcategory: 'everyday_fruits', basePrice: 60, unit: 'kg', protein: 0.9, calories: 47, carbs: 12, fat: 0.1, fiber: 2.4, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_c'] },

  // ─── SEASONAL FRUITS ───
  { id: 'mk_mango', name: 'Mango', emoji: '🥭', topCategory: 'fruits', subcategory: 'seasonal_fruits', basePrice: 100, unit: 'kg', protein: 0.8, calories: 60, carbs: 15, fat: 0.4, fiber: 1.6, servingDesc: 'per 100g', isVeg: true, tags: ['seasonal', 'vitamin_a'] },
  { id: 'mk_watermelon', name: 'Watermelon', emoji: '🍉', topCategory: 'fruits', subcategory: 'seasonal_fruits', basePrice: 20, unit: 'kg', protein: 0.6, calories: 30, carbs: 7.6, fat: 0.2, fiber: 0.4, servingDesc: 'per 100g', isVeg: true, tags: ['hydrating', 'budget'] },
  { id: 'mk_pomegranate', name: 'Pomegranate', emoji: '🔴', topCategory: 'fruits', subcategory: 'seasonal_fruits', basePrice: 120, unit: 'kg', protein: 1.7, calories: 83, carbs: 19, fat: 1.2, fiber: 4, servingDesc: 'per 100g', isVeg: true, tags: ['antioxidant'] },
  { id: 'mk_pineapple', name: 'Pineapple', emoji: '🍍', topCategory: 'fruits', subcategory: 'seasonal_fruits', basePrice: 40, unit: 'piece', protein: 0.5, calories: 50, carbs: 13, fat: 0.1, fiber: 1.4, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_c', 'budget'] },
];

// ─── Helper: Get city-adjusted price ───
export function getCityPrice(basePrice: number, city: string): number {
  const multiplier = CITY_MULTIPLIERS[city.toLowerCase()] || 1;
  return Math.round(basePrice * multiplier);
}

// ─── Helper: Calculate PES for a market item ───
export function calculateMarketPES(protein: number, price: number): number {
  if (protein <= 0 || price <= 0) return 0;
  const pes = protein / price;
  return Math.round(pes * 100) / 100;
}

export function getMarketPESColor(pes: number): 'green' | 'yellow' | 'red' {
  if (pes >= 0.15) return 'green';
  if (pes >= 0.05) return 'yellow';
  return 'red';
}
