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
  // Dry Fruits & Seeds
  | 'nuts' | 'seeds' | 'dried_fruits'
  // Superfoods
  | 'adaptogens' | 'green_powders'
  // Packed
  | 'protein_drinks' | 'protein_bars' | 'ready_to_eat' | 'snacks' | 'frozen' | 'spreads'
  // Supplements
  | 'protein_powders' | 'vitamins' | 'health_supplements';

export type MarketTopCategory =
  | 'meat_seafood' | 'eggs' | 'vegetables' | 'dals_pulses'
  | 'dairy' | 'grains_millets' | 'fruits' | 'packed_foods' | 'supplements'
  | 'dry_fruits' | 'superfoods';

export type MarketViewMode = 'fresh' | 'packed';

export interface Micronutrients {
  iron?: number;       // mg per 100g
  calcium?: number;    // mg per 100g
  vitB12?: number;     // mcg per 100g
  zinc?: number;       // mg per 100g
  vitD?: number;       // IU per 100g
  vitC?: number;       // mg per 100g
  omega3?: number;     // mg per 100g
  selenium?: number;   // mcg per 100g
  folate?: number;     // mcg per 100g
  vitA?: number;       // mcg RAE per 100g
}

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
  /** Micronutrients per 100g (IFCT-sourced) */
  micro?: Micronutrients;
  /** Health benefits bullet points */
  healthBenefits?: string[];
  /** Cooking tips */
  cookingTips?: string[];
  /** Allergen tags for fresh items */
  allergenTags?: string[];
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

// Which categories belong to Fresh vs Packed view
export const FRESH_CATEGORIES: MarketTopCategory[] = ['meat_seafood', 'eggs', 'vegetables', 'dals_pulses', 'dairy', 'grains_millets', 'fruits', 'dry_fruits', 'superfoods'];
export const PACKED_CATEGORIES: MarketTopCategory[] = ['packed_foods', 'supplements'];

export const TOP_CATEGORIES: { key: MarketTopCategory; label: string; emoji: string; color: string }[] = [
  { key: 'meat_seafood', label: 'Meat & Seafood', emoji: '🥩', color: 'from-red-500/15 to-red-500/5' },
  { key: 'eggs', label: 'Eggs', emoji: '🥚', color: 'from-amber-500/15 to-amber-500/5' },
  { key: 'vegetables', label: 'Vegetables', emoji: '🥬', color: 'from-green-500/15 to-green-500/5' },
  { key: 'dals_pulses', label: 'Dals & Pulses', emoji: '🫘', color: 'from-orange-500/15 to-orange-500/5' },
  { key: 'dairy', label: 'Dairy', emoji: '🥛', color: 'from-blue-500/15 to-blue-500/5' },
  { key: 'grains_millets', label: 'Grains & Millets', emoji: '🌾', color: 'from-yellow-500/15 to-yellow-500/5' },
  { key: 'fruits', label: 'Fruits', emoji: '🍌', color: 'from-pink-500/15 to-pink-500/5' },
  { key: 'dry_fruits', label: 'Dry Fruits & Seeds', emoji: '🌰', color: 'from-amber-600/15 to-amber-600/5' },
  { key: 'superfoods', label: 'Superfoods', emoji: '🌿', color: 'from-emerald-500/15 to-emerald-500/5' },
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
  dry_fruits: [
    { key: 'nuts', label: 'Nuts' },
    { key: 'seeds', label: 'Seeds' },
    { key: 'dried_fruits', label: 'Dried Fruits' },
  ],
  superfoods: [
    { key: 'adaptogens', label: 'Adaptogens' },
    { key: 'green_powders', label: 'Green Powders' },
  ],
  packed_foods: [
    { key: 'protein_drinks', label: 'Protein Drinks' },
    { key: 'protein_bars', label: 'Protein Bars' },
    { key: 'ready_to_eat', label: 'Ready to Eat' },
    { key: 'snacks', label: 'Snacks' },
    { key: 'frozen', label: 'Frozen' },
    { key: 'spreads', label: 'Spreads' },
  ],
  supplements: [
    { key: 'protein_powders', label: 'Protein Powders' },
    { key: 'vitamins', label: 'Vitamins' },
    { key: 'health_supplements', label: 'Health Supplements' },
  ],
};

// ═══════════════════════════════════════════════════════════
// REAL MARKET ITEMS — Researched Indian market prices (2025-2026)
// Prices are national averages in INR
// Protein/calories are per 100g unless otherwise noted
// ═══════════════════════════════════════════════════════════

export const MARKET_ITEMS: RawMarketItem[] = [
  // ─── MEAT & SEAFOOD — CHICKEN ───
  { id: 'mk_chicken_whole', name: 'Chicken (Whole)', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 220, unit: 'kg', protein: 25, calories: 239, carbs: 0, fat: 14, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 1.3, calcium: 15, vitB12: 0.3, zinc: 2.8, selenium: 22, folate: 6 }, healthBenefits: ['Complete protein with all essential amino acids', 'Rich in selenium for thyroid health', 'Good source of niacin (B3) for energy'], cookingTips: ['Marinate for 2+ hours for tender meat', 'Pressure cooking retains more nutrients', 'Remove skin to cut fat by 50%'], allergenTags: ['poultry'] },
  { id: 'mk_chicken_breast', name: 'Chicken Breast', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 320, unit: 'kg', protein: 31, calories: 165, carbs: 0, fat: 3.6, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'lean'], micro: { iron: 1.0, calcium: 11, vitB12: 0.3, zinc: 1.0, selenium: 27, folate: 4 }, healthBenefits: ['Leanest chicken cut — only 3.6g fat per 100g', '31g protein per 100g — highest among chicken cuts', 'Low calorie at 165 kcal — ideal for fat loss'], cookingTips: ['Don\'t overcook — use thermometer (74°C)', 'Grilling retains more protein than deep frying', 'Butterfly cut for even, fast cooking'], allergenTags: ['poultry'] },
  { id: 'mk_chicken_thigh', name: 'Chicken Thigh', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 250, unit: 'kg', protein: 26, calories: 209, carbs: 0, fat: 11, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 1.3, calcium: 12, vitB12: 0.3, zinc: 2.4, selenium: 22 }, healthBenefits: ['More flavourful than breast due to higher fat', 'Rich in iron and zinc', 'Better for slow-cooking curries'] },
  { id: 'mk_chicken_leg', name: 'Chicken Leg', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 240, unit: 'kg', protein: 24, calories: 215, carbs: 0, fat: 12, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 1.3, calcium: 15, vitB12: 0.3, zinc: 2.8, selenium: 22 } },
  { id: 'mk_chicken_keema', name: 'Chicken Keema', emoji: '🍗', topCategory: 'meat_seafood', subcategory: 'chicken', basePrice: 300, unit: 'kg', protein: 27, calories: 190, carbs: 0, fat: 9, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 1.5, calcium: 14, vitB12: 0.3, zinc: 3.0, selenium: 24 } },

  // ─── FISH ───
  { id: 'mk_rohu', name: 'Rohu', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 220, unit: 'kg', protein: 17, calories: 97, carbs: 0, fat: 1.4, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'omega3'], micro: { iron: 0.7, calcium: 650, vitB12: 2.2, zinc: 0.5, omega3: 500, selenium: 12 }, healthBenefits: ['Exceptionally high calcium (650mg) from soft bones', 'Rich in Vitamin B12 for nerve health', 'Omega-3 fatty acids support heart health'], cookingTips: ['Steam or curry — retains omega-3 better than frying', 'Marinate with turmeric + salt for 20 min before cooking'], allergenTags: ['fish'] },
  { id: 'mk_pomfret', name: 'Pomfret', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 600, unit: 'kg', protein: 20, calories: 96, carbs: 0, fat: 1.2, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'premium'], micro: { iron: 0.5, calcium: 25, vitB12: 2.0, zinc: 0.4, omega3: 300, selenium: 36 }, allergenTags: ['fish'] },
  { id: 'mk_surmai', name: 'Surmai (Kingfish)', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 500, unit: 'kg', protein: 24, calories: 118, carbs: 0, fat: 2, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 0.6, calcium: 20, vitB12: 8.9, zinc: 0.5, omega3: 900, selenium: 44 }, healthBenefits: ['Very high B12 (8.9mcg) — 370% of daily need', 'Rich in omega-3 (900mg per 100g)', 'Selenium-rich for antioxidant defense'], allergenTags: ['fish'] },
  { id: 'mk_hilsa', name: 'Hilsa (Ilish)', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 800, unit: 'kg', protein: 22, calories: 310, carbs: 0, fat: 25, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['non_veg', 'premium', 'omega3'], micro: { iron: 1.0, calcium: 30, vitB12: 6.0, omega3: 2200 }, healthBenefits: ['Highest omega-3 among Indian fish (2200mg)', 'Exceptional B12 content'], allergenTags: ['fish'] },
  { id: 'mk_katla', name: 'Katla', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 250, unit: 'kg', protein: 18, calories: 105, carbs: 0, fat: 2.4, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 0.8, calcium: 500, vitB12: 2.0, omega3: 400 }, allergenTags: ['fish'] },
  { id: 'mk_bangda', name: 'Bangda (Mackerel)', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 200, unit: 'kg', protein: 19, calories: 176, carbs: 0, fat: 11, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'omega3'], micro: { iron: 1.6, calcium: 12, vitB12: 8.7, zinc: 0.6, omega3: 1800, selenium: 44, vitD: 360 }, healthBenefits: ['One of the best sources of Vitamin D (360 IU)', 'Very high omega-3 (1800mg) and B12', 'Affordable brain food'], cookingTips: ['Best fried or grilled with masala coating', 'Small bones are edible — adds calcium'], allergenTags: ['fish'] },
  { id: 'mk_basa', name: 'Basa Fish', emoji: '🐟', topCategory: 'meat_seafood', subcategory: 'fish', basePrice: 280, unit: 'kg', protein: 15, calories: 90, carbs: 0, fat: 2.5, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['non_veg', 'lean'], micro: { iron: 0.3, calcium: 10, vitB12: 1.0, selenium: 12 }, allergenTags: ['fish'] },

  // ─── MUTTON ───
  { id: 'mk_mutton_leg', name: 'Mutton Leg', emoji: '🥩', topCategory: 'meat_seafood', subcategory: 'mutton', basePrice: 750, unit: 'kg', protein: 25, calories: 258, carbs: 0, fat: 18, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'premium'], micro: { iron: 3.5, calcium: 12, vitB12: 2.6, zinc: 4.5, selenium: 8 }, healthBenefits: ['Very high iron (3.5mg) — great for anaemia', 'Rich in zinc for immunity', 'High B12 for nerve health'], cookingTips: ['Slow cook for 2+ hours for tender meat', 'Pressure cook with whole spices for best flavour'] },
  { id: 'mk_mutton_keema', name: 'Mutton Keema', emoji: '🥩', topCategory: 'meat_seafood', subcategory: 'mutton', basePrice: 700, unit: 'kg', protein: 24, calories: 250, carbs: 0, fat: 17, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 3.2, calcium: 10, vitB12: 2.4, zinc: 4.2 } },
  { id: 'mk_mutton_ribs', name: 'Mutton Ribs', emoji: '🥩', topCategory: 'meat_seafood', subcategory: 'mutton', basePrice: 780, unit: 'kg', protein: 22, calories: 280, carbs: 0, fat: 21, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['non_veg', 'premium'], micro: { iron: 2.8, calcium: 15, vitB12: 2.0, zinc: 3.8 } },
  { id: 'mk_mutton_liver', name: 'Mutton Liver', emoji: '🥩', topCategory: 'meat_seafood', subcategory: 'mutton', basePrice: 500, unit: 'kg', protein: 20, calories: 135, carbs: 4, fat: 4, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'iron_rich'], micro: { iron: 6.5, calcium: 7, vitB12: 85, zinc: 4.0, vitA: 6500, folate: 290, selenium: 40 }, healthBenefits: ['Richest source of B12 (85mcg — 3500% daily need)', 'Extremely high iron (6.5mg) and Vitamin A', 'Nature\'s multivitamin — folate, selenium, zinc'], cookingTips: ['Don\'t overcook — turns rubbery', 'Soak in milk for 30 min to reduce gamey taste'] },

  // ─── PRAWNS ───
  { id: 'mk_prawns_small', name: 'Prawns (Small)', emoji: '🦐', topCategory: 'meat_seafood', subcategory: 'prawns', basePrice: 350, unit: 'kg', protein: 20, calories: 99, carbs: 0.2, fat: 1.7, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 2.4, calcium: 52, vitB12: 1.1, zinc: 1.3, selenium: 38 }, allergenTags: ['shellfish'] },
  { id: 'mk_prawns_medium', name: 'Prawns (Medium)', emoji: '🦐', topCategory: 'meat_seafood', subcategory: 'prawns', basePrice: 500, unit: 'kg', protein: 21, calories: 106, carbs: 0.2, fat: 1.7, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg'], micro: { iron: 2.4, calcium: 52, vitB12: 1.1, zinc: 1.3, selenium: 38 }, allergenTags: ['shellfish'] },
  { id: 'mk_prawns_jumbo', name: 'Prawns (Jumbo)', emoji: '🦐', topCategory: 'meat_seafood', subcategory: 'prawns', basePrice: 800, unit: 'kg', protein: 22, calories: 110, carbs: 0, fat: 2, fiber: 0, servingDesc: 'per 100g', isVeg: false, tags: ['high_protein', 'non_veg', 'premium'], micro: { iron: 2.6, calcium: 55, vitB12: 1.2, zinc: 1.5, selenium: 40 }, allergenTags: ['shellfish'] },

  // ─── EGGS ───
  { id: 'mk_egg_white', name: 'White Eggs', emoji: '🥚', topCategory: 'eggs', subcategory: 'white_egg', basePrice: 6, unit: 'piece', protein: 6.3, calories: 72, carbs: 0.4, fat: 4.8, fiber: 0, servingDesc: 'per egg (~50g)', isVeg: false, tags: ['high_protein', 'budget'], micro: { iron: 1.2, calcium: 28, vitB12: 0.9, zinc: 0.6, vitD: 41, selenium: 15, folate: 24, vitA: 80 }, healthBenefits: ['Complete protein — contains all 9 essential amino acids', 'One of few natural Vitamin D sources (41 IU)', 'Choline in yolk supports brain health'], cookingTips: ['Boiled eggs retain the most nutrients', 'Don\'t discard yolk — it has most vitamins', 'Hard boil for 10 min, soft boil for 6 min'] },
  { id: 'mk_egg_brown', name: 'Brown Eggs', emoji: '🥚', topCategory: 'eggs', subcategory: 'brown_egg', basePrice: 8, unit: 'piece', protein: 6.5, calories: 78, carbs: 0.6, fat: 5.3, fiber: 0, servingDesc: 'per egg (~55g)', isVeg: false, tags: ['high_protein'], micro: { iron: 1.2, calcium: 28, vitB12: 0.9, zinc: 0.7, vitD: 41, selenium: 16, folate: 25, vitA: 80 } },
  { id: 'mk_egg_desi', name: 'Desi / Country Eggs', emoji: '🥚', topCategory: 'eggs', subcategory: 'desi_egg', basePrice: 12, unit: 'piece', protein: 7, calories: 80, carbs: 0.5, fat: 5.5, fiber: 0, servingDesc: 'per egg (~55g)', isVeg: false, tags: ['high_protein', 'premium', 'free_range'], micro: { iron: 1.5, calcium: 30, vitB12: 1.1, zinc: 0.8, vitD: 50, selenium: 18, vitA: 98 }, healthBenefits: ['Higher omega-3 than regular eggs (free-range diet)', 'Richer yolk colour = more carotenoids', 'Slightly higher vitamin D and B12'] },

  // ─── VEGETABLES — LEAFY GREENS ───
  { id: 'mk_spinach', name: 'Spinach (Palak)', emoji: '🥬', topCategory: 'vegetables', subcategory: 'leafy_greens', basePrice: 40, unit: 'kg', protein: 2.9, calories: 23, carbs: 3.6, fat: 0.4, fiber: 2.2, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich', 'low_calorie'], micro: { iron: 2.7, calcium: 99, vitC: 28, vitA: 469, folate: 194, zinc: 0.5 }, healthBenefits: ['Very high folate (194mcg) — critical during pregnancy', 'Rich in Vitamin A for eye health', 'Iron + Vitamin C combo improves absorption'], cookingTips: ['Light cooking increases iron bioavailability', 'Add lemon juice to boost iron absorption', 'Blanch briefly to retain vitamins'] },
  { id: 'mk_methi', name: 'Methi (Fenugreek)', emoji: '🌿', topCategory: 'vegetables', subcategory: 'leafy_greens', basePrice: 50, unit: 'kg', protein: 4.4, calories: 49, carbs: 6, fat: 0.9, fiber: 4.2, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich'], micro: { iron: 6.5, calcium: 176, vitC: 12, folate: 84, vitA: 67 }, healthBenefits: ['Exceptional iron content (6.5mg per 100g)', 'Helps regulate blood sugar levels', 'Traditional galactagogue (aids lactation)'] },
  { id: 'mk_amaranth', name: 'Amaranth Leaves', emoji: '🥬', topCategory: 'vegetables', subcategory: 'leafy_greens', basePrice: 30, unit: 'kg', protein: 2.5, calories: 23, carbs: 4, fat: 0.3, fiber: 2, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich', 'budget'], micro: { iron: 3.5, calcium: 215, vitC: 43, vitA: 292, folate: 85 }, healthBenefits: ['Very high calcium (215mg) — great for bones', 'Budget-friendly iron source'] },

  // ─── ROOT VEGETABLES ───
  { id: 'mk_potato', name: 'Potato', emoji: '🥔', topCategory: 'vegetables', subcategory: 'root_vegs', basePrice: 25, unit: 'kg', protein: 2, calories: 77, carbs: 17, fat: 0.1, fiber: 2.2, servingDesc: 'per 100g', isVeg: true, tags: ['staple', 'budget'], micro: { iron: 0.8, calcium: 12, vitC: 20, vitB12: 0, zinc: 0.3, folate: 15 }, healthBenefits: ['Good source of Vitamin C (20mg) and potassium', 'Resistant starch when cooled — feeds gut bacteria'], cookingTips: ['Boiling with skin retains more nutrients', 'Cool after cooking to increase resistant starch'] },
  { id: 'mk_sweet_potato', name: 'Sweet Potato', emoji: '🍠', topCategory: 'vegetables', subcategory: 'root_vegs', basePrice: 40, unit: 'kg', protein: 1.6, calories: 86, carbs: 20, fat: 0.1, fiber: 3, servingDesc: 'per 100g', isVeg: true, tags: ['fiber_rich'], micro: { iron: 0.6, calcium: 30, vitA: 709, vitC: 2.4, folate: 11 }, healthBenefits: ['Extremely high Vitamin A (709mcg) — 100% daily need', 'Natural sweetness — good sugar substitute', 'Slow-release carbs for sustained energy'] },
  { id: 'mk_beetroot', name: 'Beetroot', emoji: '🟣', topCategory: 'vegetables', subcategory: 'root_vegs', basePrice: 35, unit: 'kg', protein: 1.6, calories: 43, carbs: 10, fat: 0.2, fiber: 2.8, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich'], micro: { iron: 0.8, calcium: 16, vitC: 4.9, folate: 109 }, healthBenefits: ['High folate (109mcg) supports cell growth', 'Natural nitrates improve blood flow and exercise performance'] },
  { id: 'mk_carrot', name: 'Carrot', emoji: '🥕', topCategory: 'vegetables', subcategory: 'root_vegs', basePrice: 35, unit: 'kg', protein: 0.9, calories: 41, carbs: 10, fat: 0.2, fiber: 2.8, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_a'], micro: { iron: 0.3, calcium: 33, vitA: 835, vitC: 5.9, folate: 19 }, healthBenefits: ['Highest Vitamin A among common vegetables', 'Beta-carotene supports eye health and skin'] },

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
  { id: 'mk_peas', name: 'Green Peas', emoji: '🫛', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 60, unit: 'kg', protein: 5.4, calories: 81, carbs: 14, fat: 0.4, fiber: 5.1, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'fiber_rich'] },
  { id: 'mk_bhindi', name: 'Lady Finger (Bhindi)', emoji: '🥒', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 40, unit: 'kg', protein: 1.9, calories: 33, carbs: 7, fat: 0.2, fiber: 3.2, servingDesc: 'per 100g', isVeg: true, tags: ['fiber_rich'] },
  { id: 'mk_bitter_gourd', name: 'Bitter Gourd (Karela)', emoji: '🥒', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 50, unit: 'kg', protein: 1, calories: 17, carbs: 3.7, fat: 0.2, fiber: 2.8, servingDesc: 'per 100g', isVeg: true, tags: ['low_calorie', 'diabetic_friendly'] },
  { id: 'mk_ridge_gourd', name: 'Ridge Gourd (Turai)', emoji: '🥒', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 35, unit: 'kg', protein: 0.5, calories: 18, carbs: 3.3, fat: 0.2, fiber: 1.6, servingDesc: 'per 100g', isVeg: true, tags: ['low_calorie', 'budget'] },
  { id: 'mk_bottle_gourd', name: 'Bottle Gourd (Lauki)', emoji: '🥒', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 30, unit: 'kg', protein: 0.2, calories: 14, carbs: 3.4, fat: 0.02, fiber: 0.5, servingDesc: 'per 100g', isVeg: true, tags: ['low_calorie', 'budget'] },
  { id: 'mk_pumpkin', name: 'Pumpkin (Kaddu)', emoji: '🎃', topCategory: 'vegetables', subcategory: 'everyday_vegs', basePrice: 25, unit: 'kg', protein: 1, calories: 26, carbs: 6.5, fat: 0.1, fiber: 0.5, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_a', 'budget'] },

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
  { id: 'mk_paneer', name: 'Paneer', emoji: '🧀', topCategory: 'dairy', subcategory: 'paneer_cheese', basePrice: 360, unit: 'kg', protein: 18, calories: 265, carbs: 1.2, fat: 20, fiber: 0, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'calcium_rich'], micro: { iron: 0.2, calcium: 208, vitB12: 0.8, zinc: 2.7, vitD: 20, vitA: 82, folate: 37 }, healthBenefits: ['High calcium (208mg) — strengthens bones & teeth', 'Good B12 source for vegetarians', 'Complete protein with all essential amino acids'], cookingTips: ['Soak in warm water before cooking for softer texture', 'Grill or air-fry instead of deep frying to save fat', 'Add to curries at the end — overheating makes it rubbery'] },

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

  // ─── DRY FRUITS — NUTS ───
  { id: 'mk_almonds', name: 'Almonds (Badam)', emoji: '🌰', topCategory: 'dry_fruits', subcategory: 'nuts', basePrice: 700, unit: 'kg', protein: 21, calories: 579, carbs: 22, fat: 49, fiber: 12, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'premium', 'vitamin_e'] },
  { id: 'mk_cashews', name: 'Cashews (Kaju)', emoji: '🥜', topCategory: 'dry_fruits', subcategory: 'nuts', basePrice: 900, unit: 'kg', protein: 18, calories: 553, carbs: 30, fat: 44, fiber: 3, servingDesc: 'per 100g', isVeg: true, tags: ['premium'] },
  { id: 'mk_walnuts', name: 'Walnuts (Akhrot)', emoji: '🌰', topCategory: 'dry_fruits', subcategory: 'nuts', basePrice: 1200, unit: 'kg', protein: 15, calories: 654, carbs: 14, fat: 65, fiber: 7, servingDesc: 'per 100g', isVeg: true, tags: ['omega3', 'premium'] },
  { id: 'mk_pistachios', name: 'Pistachios (Pista)', emoji: '🥜', topCategory: 'dry_fruits', subcategory: 'nuts', basePrice: 1500, unit: 'kg', protein: 20, calories: 560, carbs: 28, fat: 45, fiber: 10, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'premium'] },
  { id: 'mk_peanuts', name: 'Peanuts (Moongfali)', emoji: '🥜', topCategory: 'dry_fruits', subcategory: 'nuts', basePrice: 120, unit: 'kg', protein: 26, calories: 567, carbs: 16, fat: 49, fiber: 8, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'budget', 'best_value'] },

  // ─── DRY FRUITS — SEEDS ───
  { id: 'mk_pumpkin_seeds', name: 'Pumpkin Seeds', emoji: '🌱', topCategory: 'dry_fruits', subcategory: 'seeds', basePrice: 600, unit: 'kg', protein: 30, calories: 559, carbs: 11, fat: 49, fiber: 6, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'zinc_rich'] },
  { id: 'mk_flax_seeds', name: 'Flax Seeds (Alsi)', emoji: '🌱', topCategory: 'dry_fruits', subcategory: 'seeds', basePrice: 200, unit: 'kg', protein: 18, calories: 534, carbs: 29, fat: 42, fiber: 27, servingDesc: 'per 100g', isVeg: true, tags: ['omega3', 'fiber_rich'] },
  { id: 'mk_sunflower_seeds', name: 'Sunflower Seeds', emoji: '🌻', topCategory: 'dry_fruits', subcategory: 'seeds', basePrice: 300, unit: 'kg', protein: 21, calories: 584, carbs: 20, fat: 51, fiber: 9, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'vitamin_e'] },
  { id: 'mk_chia_seeds', name: 'Chia Seeds', emoji: '🌱', topCategory: 'dry_fruits', subcategory: 'seeds', basePrice: 500, unit: 'kg', protein: 17, calories: 486, carbs: 42, fat: 31, fiber: 34, servingDesc: 'per 100g', isVeg: true, tags: ['omega3', 'fiber_rich'] },
  { id: 'mk_melon_seeds', name: 'Melon Seeds (Magaz)', emoji: '🌱', topCategory: 'dry_fruits', subcategory: 'seeds', basePrice: 400, unit: 'kg', protein: 28, calories: 557, carbs: 15, fat: 47, fiber: 4, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein'] },

  // ─── DRY FRUITS — DRIED FRUITS ───
  { id: 'mk_dates', name: 'Dates (Khajoor)', emoji: '🌴', topCategory: 'dry_fruits', subcategory: 'dried_fruits', basePrice: 300, unit: 'kg', protein: 2.5, calories: 277, carbs: 75, fat: 0.4, fiber: 7, servingDesc: 'per 100g', isVeg: true, tags: ['energy', 'iron_rich'] },
  { id: 'mk_figs', name: 'Figs (Anjeer)', emoji: '🫐', topCategory: 'dry_fruits', subcategory: 'dried_fruits', basePrice: 800, unit: 'kg', protein: 3.3, calories: 249, carbs: 64, fat: 1, fiber: 10, servingDesc: 'per 100g', isVeg: true, tags: ['fiber_rich', 'premium'] },
  { id: 'mk_raisins', name: 'Raisins (Kishmish)', emoji: '🍇', topCategory: 'dry_fruits', subcategory: 'dried_fruits', basePrice: 250, unit: 'kg', protein: 3.1, calories: 299, carbs: 79, fat: 0.5, fiber: 4, servingDesc: 'per 100g', isVeg: true, tags: ['iron_rich'] },

  // ─── SUPERFOODS — ADAPTOGENS ───
  { id: 'mk_ashwagandha', name: 'Ashwagandha Powder', emoji: '🌿', topCategory: 'superfoods', subcategory: 'adaptogens', basePrice: 300, unit: '100g', protein: 3.9, calories: 245, carbs: 49, fat: 0.3, fiber: 32, servingDesc: 'per 100g', isVeg: true, tags: ['adaptogen', 'stress_relief'] },
  { id: 'mk_shatavari', name: 'Shatavari Powder', emoji: '🌿', topCategory: 'superfoods', subcategory: 'adaptogens', basePrice: 400, unit: '100g', protein: 5.8, calories: 230, carbs: 42, fat: 1, fiber: 20, servingDesc: 'per 100g', isVeg: true, tags: ['adaptogen', 'women_health'] },
  { id: 'mk_triphala', name: 'Triphala Powder', emoji: '🌿', topCategory: 'superfoods', subcategory: 'adaptogens', basePrice: 250, unit: '100g', protein: 1, calories: 210, carbs: 50, fat: 0.2, fiber: 15, servingDesc: 'per 100g', isVeg: true, tags: ['digestive', 'detox'] },
  { id: 'mk_turmeric', name: 'Turmeric Powder (Haldi)', emoji: '🟡', topCategory: 'superfoods', subcategory: 'adaptogens', basePrice: 150, unit: 'kg', protein: 7.8, calories: 354, carbs: 65, fat: 10, fiber: 21, servingDesc: 'per 100g', isVeg: true, tags: ['anti_inflammatory', 'immunity'] },

  // ─── SUPERFOODS — GREEN POWDERS ───
  { id: 'mk_spirulina', name: 'Spirulina Powder', emoji: '🌊', topCategory: 'superfoods', subcategory: 'green_powders', basePrice: 450, unit: '100g', protein: 57, calories: 290, carbs: 24, fat: 8, fiber: 4, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'superfood', 'iron_rich'] },
  { id: 'mk_moringa', name: 'Moringa Powder', emoji: '🌿', topCategory: 'superfoods', subcategory: 'green_powders', basePrice: 250, unit: '100g', protein: 27, calories: 205, carbs: 38, fat: 2.3, fiber: 19, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein', 'calcium_rich', 'iron_rich'] },
  { id: 'mk_wheatgrass', name: 'Wheatgrass Powder', emoji: '🌱', topCategory: 'superfoods', subcategory: 'green_powders', basePrice: 350, unit: '100g', protein: 24, calories: 198, carbs: 33, fat: 2, fiber: 18, servingDesc: 'per 100g', isVeg: true, tags: ['detox', 'iron_rich'] },
  { id: 'mk_amla_powder', name: 'Amla Powder', emoji: '🟢', topCategory: 'superfoods', subcategory: 'green_powders', basePrice: 200, unit: '100g', protein: 0.9, calories: 44, carbs: 10, fat: 0.6, fiber: 4.3, servingDesc: 'per 100g', isVeg: true, tags: ['vitamin_c', 'immunity'] },

  // ─── PACKED FOODS — PROTEIN DRINKS ───
  { id: 'mk_amul_protein_bm', name: 'Amul Protein Buttermilk', emoji: '🥤', topCategory: 'packed_foods', subcategory: 'protein_drinks', basePrice: 30, unit: '200ml', protein: 10, calories: 60, carbs: 4, fat: 1, fiber: 0, servingDesc: 'per 200ml pack', isVeg: true, tags: ['high_protein', 'budget'] },
  { id: 'mk_amul_protein_lassi', name: 'Amul Protein Lassi', emoji: '🥤', topCategory: 'packed_foods', subcategory: 'protein_drinks', basePrice: 45, unit: '200ml', protein: 15, calories: 90, carbs: 6, fat: 1.5, fiber: 0, servingDesc: 'per 200ml pack', isVeg: true, tags: ['high_protein'] },

  // ─── PACKED FOODS — PROTEIN BARS ───
  { id: 'mk_yoga_bar', name: 'Yoga Bar Protein Bar', emoji: '🍫', topCategory: 'packed_foods', subcategory: 'protein_bars', basePrice: 170, unit: 'bar', protein: 20, calories: 260, carbs: 25, fat: 9, fiber: 4, servingDesc: 'per 60g bar', isVeg: true, tags: ['high_protein', 'snack'] },
  { id: 'mk_ritebite', name: 'RiteBite Max Protein Bar', emoji: '🍫', topCategory: 'packed_foods', subcategory: 'protein_bars', basePrice: 150, unit: 'bar', protein: 20, calories: 240, carbs: 22, fat: 8, fiber: 3, servingDesc: 'per 60g bar', isVeg: true, tags: ['high_protein', 'snack'] },

  // ─── PACKED FOODS — READY TO EAT ───
  { id: 'mk_mtr_dal_fry', name: 'MTR Dal Fry (RTE)', emoji: '🍛', topCategory: 'packed_foods', subcategory: 'ready_to_eat', basePrice: 85, unit: '300g', protein: 7, calories: 120, carbs: 16, fat: 3, fiber: 4, servingDesc: 'per 300g pack', isVeg: true, tags: ['convenient'] },
  { id: 'mk_saffola_oats', name: 'Saffola Masala Oats', emoji: '🥣', topCategory: 'packed_foods', subcategory: 'ready_to_eat', basePrice: 120, unit: '500g', protein: 12, calories: 370, carbs: 64, fat: 8, fiber: 10, servingDesc: 'per 100g', isVeg: true, tags: ['fiber_rich', 'convenient'] },

  // ─── PACKED FOODS — SNACKS ───
  { id: 'mk_too_yumm', name: 'Too Yumm Protein Chips', emoji: '🍿', topCategory: 'packed_foods', subcategory: 'snacks', basePrice: 40, unit: '30g', protein: 5, calories: 130, carbs: 16, fat: 5, fiber: 2, servingDesc: 'per 30g pack', isVeg: true, tags: ['snack'] },
  { id: 'mk_makhana', name: 'Roasted Makhana', emoji: '🍿', topCategory: 'packed_foods', subcategory: 'snacks', basePrice: 150, unit: '100g', protein: 9.7, calories: 332, carbs: 76, fat: 0.1, fiber: 14, servingDesc: 'per 100g', isVeg: true, tags: ['low_fat', 'snack'] },

  // ─── PACKED FOODS — SPREADS ───
  { id: 'mk_myfitness_pb', name: 'MyFitness Peanut Butter', emoji: '🥜', topCategory: 'packed_foods', subcategory: 'spreads', basePrice: 450, unit: '510g', protein: 30, calories: 590, carbs: 18, fat: 47, fiber: 6, servingDesc: 'per 100g', isVeg: true, tags: ['high_protein'] },

  // ─── SUPPLEMENTS — PROTEIN POWDERS ───
  { id: 'mk_muscleblaze_whey', name: 'MuscleBlaze Whey Protein', emoji: '💪', topCategory: 'supplements', subcategory: 'protein_powders', basePrice: 2200, unit: 'kg', protein: 25, calories: 130, carbs: 4, fat: 2, fiber: 0, servingDesc: 'per 30g scoop', isVeg: true, tags: ['high_protein', 'supplement'] },
  { id: 'mk_asitis_whey', name: 'AS-IT-IS Raw Whey', emoji: '💪', topCategory: 'supplements', subcategory: 'protein_powders', basePrice: 1400, unit: 'kg', protein: 24, calories: 120, carbs: 3, fat: 2, fiber: 0, servingDesc: 'per 30g scoop', isVeg: true, tags: ['high_protein', 'budget', 'best_value'] },
  { id: 'mk_oziva_plant', name: 'OZiva Plant Protein', emoji: '🌱', topCategory: 'supplements', subcategory: 'protein_powders', basePrice: 1800, unit: 'kg', protein: 25, calories: 125, carbs: 5, fat: 2, fiber: 3, servingDesc: 'per 35g scoop', isVeg: true, tags: ['high_protein', 'vegan'] },
  { id: 'mk_myprotein_whey', name: 'MyProtein Impact Whey', emoji: '💪', topCategory: 'supplements', subcategory: 'protein_powders', basePrice: 3000, unit: 'kg', protein: 21, calories: 103, carbs: 1, fat: 1.9, fiber: 0, servingDesc: 'per 25g scoop', isVeg: true, tags: ['high_protein', 'premium'] },

  // ─── SUPPLEMENTS — VITAMINS ───
  { id: 'mk_fish_oil', name: 'Fish Oil Capsules', emoji: '💊', topCategory: 'supplements', subcategory: 'vitamins', basePrice: 400, unit: '60 caps', protein: 0, calories: 10, carbs: 0, fat: 1, fiber: 0, servingDesc: 'per capsule', isVeg: false, tags: ['omega3', 'supplement'] },
  { id: 'mk_multivitamin', name: 'Multivitamin Tablets', emoji: '💊', topCategory: 'supplements', subcategory: 'vitamins', basePrice: 350, unit: '60 tabs', protein: 0, calories: 5, carbs: 1, fat: 0, fiber: 0, servingDesc: 'per tablet', isVeg: true, tags: ['supplement'] },
  { id: 'mk_vitamin_d3', name: 'Vitamin D3 Capsules', emoji: '☀️', topCategory: 'supplements', subcategory: 'vitamins', basePrice: 300, unit: '60 caps', protein: 0, calories: 5, carbs: 0, fat: 0.5, fiber: 0, servingDesc: 'per capsule', isVeg: true, tags: ['supplement', 'bone_health'] },

  // ─── SUPPLEMENTS — HEALTH SUPPLEMENTS ───
  { id: 'mk_creatine', name: 'Creatine Monohydrate', emoji: '⚡', topCategory: 'supplements', subcategory: 'health_supplements', basePrice: 800, unit: '250g', protein: 0, calories: 0, carbs: 0, fat: 0, fiber: 0, servingDesc: 'per 5g scoop', isVeg: true, tags: ['performance', 'supplement'] },
];

// ─── Helper: Get city-adjusted price ───
export function getCityPrice(basePrice: number, city: string): number {
  const multiplier = CITY_MULTIPLIERS[city.toLowerCase()] || 1;
  return Math.round(basePrice * multiplier);
}

// ─── Helper: Calculate PES for a market item ───
// Normalizes price to per-100g for kg items, per-piece for piece items
export function calculateMarketPES(protein: number, price: number, unit?: string): number {
  if (protein <= 0 || price <= 0) return 0;
  // For kg-priced items: nutrition is per 100g, price is per kg → divide by 10
  const pricePer100g = unit === 'kg' ? price / 10 : price;
  const pes = protein / pricePer100g;
  return Math.round(pes * 100) / 100;
}

// ─── Helper: DB search key mapping for price history ───
// Maps market item names to shorter DB-friendly search keys
export const PRICE_SEARCH_KEYS: Record<string, string> = {
  'Chicken (Whole)': 'chicken',
  'Chicken Breast': 'chicken',
  'Chicken Thigh': 'chicken',
  'Chicken Leg': 'chicken',
  'Chicken Keema': 'chicken',
  'Rohu': 'rohu',
  'Pomfret': 'pomfret',
  'Surmai (Kingfish)': 'surmai',
  'Hilsa (Ilish)': 'hilsa',
  'Katla': 'katla',
  'Bangda (Mackerel)': 'bangda',
  'Basa Fish': 'basa',
  'Mutton Leg': 'mutton',
  'Mutton Keema': 'mutton',
  'Mutton Ribs': 'mutton',
  'Mutton Liver': 'mutton',
  'Prawns (Small)': 'prawns',
  'Prawns (Medium)': 'prawns',
  'Prawns (Jumbo)': 'prawns',
  'White Eggs': 'eggs',
  'Brown Eggs': 'eggs',
  'Desi / Country Eggs': 'eggs',
  'Spinach (Palak)': 'spinach',
  'Methi (Fenugreek)': 'methi',
  'Paneer': 'paneer',
  'Toned Milk': 'milk',
  'Full Cream Milk': 'milk',
  'Curd (Dahi)': 'curd',
  'Toor Dal': 'toor dal',
  'Moong Dal': 'moong dal',
  'Masoor Dal': 'masoor dal',
  'Soya Chunks': 'soya chunks',
  'Potato': 'potato',
  'Tomato': 'tomato',
  'Onion': 'onion',
  'Banana': 'banana',
};

export function getMarketPESColor(pes: number): 'green' | 'yellow' | 'red' {
  if (pes >= 0.8) return 'green';
  if (pes >= 0.3) return 'yellow';
  return 'red';
}
