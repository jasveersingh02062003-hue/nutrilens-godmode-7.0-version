// Static nutrition tips per item or category
// Format: short actionable insight about why to eat this food

const ITEM_TIPS: Record<string, string> = {
  mk_egg_white: 'Complete protein with all 9 essential amino acids — cheapest quality protein source in India',
  mk_egg_brown: 'Same nutrition as white eggs, slightly higher omega-3 from better feed',
  mk_egg_desi: 'Free-range eggs with richer yolk — more Vitamin D and omega-3 per egg',
  mk_chicken_breast: 'Leanest meat cut — 31g protein, only 3.6g fat per 100g. Ideal for muscle building',
  mk_chicken_whole: 'Balanced protein-to-fat ratio — great for curries and meal prep',
  mk_chicken_thigh: 'More flavor than breast, slightly higher fat — excellent for slow cooking',
  mk_chicken_leg: 'Rich in iron and B12 — the most affordable chicken cut',
  mk_chicken_keema: 'Versatile mince for kebabs, parathas — 27g protein per 100g',
  mk_rohu: 'Low-fat freshwater fish — rich in omega-3, great for heart health',
  mk_pomfret: 'Premium fish with mild taste — excellent protein-to-calorie ratio',
  mk_surmai: 'King of Indian fish — 24g protein, rich in omega-3 fatty acids',
  mk_bangda: 'Most affordable omega-3 source — 19g protein at just ₹200/kg',
  mk_paneer: 'Vegetarian protein powerhouse — also rich in calcium for bone health',
  mk_milk_toned: 'Daily calcium and protein in liquid form — 8g protein per glass',
  mk_milk_full: 'Full cream milk — higher Vitamin A and D, best for growing children',
  mk_curd: 'Probiotics for gut health — easier to digest than milk, same protein',
  mk_ghee: 'Healthy saturated fat — good for cooking at high temperatures, rich in butyrate',
  mk_spinach: 'Iron powerhouse — more iron per ₹ than any supplement. Only 23 cal/100g',
  mk_methi: 'Blood sugar regulator — high iron, excellent for PCOS management',
  mk_banana: 'Instant energy — perfect pre/post workout snack with potassium',
  mk_apple: 'Fiber-rich — keeps you full longer. "An apple a day" backed by science',
  mk_guava: '5x more Vitamin C than oranges at half the price — immunity booster',
  mk_soya_chunks: '52g protein per 100g — more than chicken at 1/4th the cost. Best budget protein',
  mk_moong_dal: 'Easiest to digest dal — 24g protein per 100g, excellent for daily meals',
  mk_toor_dal: 'India\'s staple dal — balanced amino acid profile, good fiber content',
  mk_rajma: 'Plant-based complete protein — pair with rice for all essential amino acids',
  mk_chickpeas: 'Fiber champion — keeps blood sugar stable, great protein for vegetarians',
  mk_peanuts: '26g protein at ₹120/kg — 6x cheaper than almonds per gram protein',
  mk_almonds: 'Brain health — rich in Vitamin E, healthy monounsaturated fats',
  mk_oats: 'Beta-glucan fiber lowers cholesterol — steady energy release for hours',
  mk_flaxseeds: 'Richest plant source of omega-3 — anti-inflammatory, hormone balancing',
  mk_chia_seeds: 'Expand 10x in water — incredible for satiety and hydration',
  mk_brown_rice: 'Whole grain with fiber intact — slower glucose absorption than white rice',
  mk_ragi: 'Highest calcium among cereals — essential for bone health, gluten-free',
  mk_bajra: '11.6g protein + high iron — best millet for muscle and blood health',
  mk_sweet_potato: 'Complex carbs + Vitamin A — steady energy without blood sugar spikes',
  mk_tomato: 'Lycopene antioxidant — cooking increases bioavailability by 35%',
  mk_broccoli: 'Sulforaphane compound — strongest anti-cancer vegetable, 3g protein/100g',
  mk_mushroom: 'Only plant source of Vitamin D — immune boosting, low calorie protein',
  mk_watermelon: 'Natural citrulline — improves blood flow, excellent post-workout hydration',
  mk_dates: 'Natural energy bars — iron + potassium + fiber in every bite',
  mk_creatine: 'Most researched supplement — proven to increase strength and muscle mass',
};

const CATEGORY_TIPS: Record<string, string> = {
  meat_seafood: 'Animal proteins provide all essential amino acids in one food',
  eggs: 'Most bioavailable protein source — your body absorbs 94% vs 78% from meat',
  vegetables: 'Micronutrient density — vitamins, minerals, and fiber at minimal calories',
  dals_pulses: 'India\'s protein backbone — affordable, shelf-stable, fiber-rich',
  dairy: 'Calcium + protein combo — essential for bone density and muscle recovery',
  grains_millets: 'Complex carbohydrates — sustained energy, B vitamins, and fiber',
  fruits: 'Natural vitamins and antioxidants — better absorbed than supplements',
  dry_fruits: 'Calorie-dense nutrition — healthy fats, minerals, and sustained energy',
  superfoods: 'Concentrated nutrition — small quantities, outsized health benefits',
  packed_foods: 'Convenience protein — check labels for protein per ₹ before buying',
  supplements: 'Fill nutritional gaps — not replacements for whole foods',
};

export function getItemTip(itemId: string): string | null {
  return ITEM_TIPS[itemId] || null;
}

export function getCategoryTip(category: string): string | null {
  return CATEGORY_TIPS[category] || null;
}
