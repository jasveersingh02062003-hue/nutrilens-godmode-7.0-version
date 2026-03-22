// ═══════════════════════════════════════════════════
// IFCT 2017 Reference Data
// ═══════════════════════════════════════════════════
// Official nutritional data from Indian Food Composition Tables 2017
// Published by National Institute of Nutrition (ICMR), Hyderabad
// Citation: Longvah, T., Ananthan, R., Bhaskarachary, K. and Venkaiah, K. (2017)
//
// This module serves as a REFERENCE layer — not the primary database.
// It cross-validates our food database entries against official IFCT values.
// All values are per 100g edible portion.

export interface IFCTEntry {
  code: string;           // IFCT code e.g. A005
  name: string;           // Official name
  category: IFCTCategory;
  moisture: number;       // g
  protein: number;        // g
  ash: number;            // g
  totalFat: number;       // g
  totalDietaryFibre: number; // g
  carbohydrate: number;   // g (by difference)
  energyKJ: number;       // kJ
  energyKcal: number;     // kcal (calculated: kJ / 4.18)
  // Mapping to our database
  matchNames: string[];   // lowercase names that map to this entry
}

export type IFCTCategory =
  | 'cereals_millets'
  | 'grain_legumes'
  | 'green_leafy_vegetables'
  | 'other_vegetables'
  | 'roots_tubers'
  | 'fruits'
  | 'nuts_oilseeds'
  | 'condiments_spices'
  | 'milk_products'
  | 'egg_poultry'
  | 'meat_organ'
  | 'fish_seafood'
  | 'fats_oils'
  | 'sugars';

// ─── IFCT 2017 Official Data (key foods) ───
// Energy in kcal is calculated from kJ ÷ 4.18
// Carbohydrate = by difference (100 - moisture - protein - ash - fat - fibre)

export const IFCT_DATA: IFCTEntry[] = [
  // ══════════════════════════════════════
  // A. CEREALS AND MILLETS (raw/dry)
  // ══════════════════════════════════════
  { code: 'A003', name: 'Bajra (Pearl millet)', category: 'cereals_millets', moisture: 8.97, protein: 10.96, ash: 1.37, totalFat: 5.43, totalDietaryFibre: 11.49, carbohydrate: 61.78, energyKJ: 1456, energyKcal: 348, matchNames: ['bajra', 'pearl millet', 'bajra roti', 'bajra khichdi'] },
  { code: 'A005', name: 'Jowar (Sorghum)', category: 'cereals_millets', moisture: 9.01, protein: 9.97, ash: 1.39, totalFat: 1.73, totalDietaryFibre: 10.22, carbohydrate: 67.68, energyKJ: 1398, energyKcal: 334, matchNames: ['jowar', 'sorghum', 'jowar roti', 'jowar bhakri'] },
  { code: 'A010', name: 'Ragi (Finger millet)', category: 'cereals_millets', moisture: 10.89, protein: 7.16, ash: 2.04, totalFat: 1.92, totalDietaryFibre: 11.18, carbohydrate: 66.82, energyKJ: 1342, energyKcal: 321, matchNames: ['ragi', 'finger millet', 'ragi roti', 'ragi dosa', 'ragi mudde'] },
  { code: 'A015', name: 'Rice, raw milled', category: 'cereals_millets', moisture: 9.93, protein: 7.94, ash: 0.56, totalFat: 0.52, totalDietaryFibre: 2.81, carbohydrate: 78.24, energyKJ: 1491, energyKcal: 357, matchNames: ['rice', 'white rice', 'chawal', 'steamed rice'] },
  { code: 'A013', name: 'Rice, raw, brown', category: 'cereals_millets', moisture: 9.33, protein: 9.16, ash: 1.04, totalFat: 1.24, totalDietaryFibre: 4.43, carbohydrate: 74.80, energyKJ: 1480, energyKcal: 354, matchNames: ['brown rice'] },
  { code: 'A019', name: 'Wheat flour, atta', category: 'cereals_millets', moisture: 11.10, protein: 10.57, ash: 1.28, totalFat: 1.53, totalDietaryFibre: 11.36, carbohydrate: 64.17, energyKJ: 1340, energyKcal: 321, matchNames: ['wheat', 'atta', 'wheat flour', 'wheat flour (atta, raw)'] },
  { code: 'A018', name: 'Wheat flour, refined (maida)', category: 'cereals_millets', moisture: 11.34, protein: 10.36, ash: 0.51, totalFat: 0.76, totalDietaryFibre: 2.76, carbohydrate: 74.27, energyKJ: 1472, energyKcal: 352, matchNames: ['maida', 'refined flour', 'white flour', 'naan', 'bhatura'] },
  { code: 'A022', name: 'Wheat, semolina (sooji/rava)', category: 'cereals_millets', moisture: 8.94, protein: 11.38, ash: 0.80, totalFat: 0.74, totalDietaryFibre: 9.72, carbohydrate: 68.43, energyKJ: 1396, energyKcal: 334, matchNames: ['semolina', 'sooji', 'rava', 'suji', 'upma'] },
  { code: 'A006', name: 'Maize, dry', category: 'cereals_millets', moisture: 9.26, protein: 8.80, ash: 1.17, totalFat: 3.77, totalDietaryFibre: 12.24, carbohydrate: 64.77, energyKJ: 1398, energyKcal: 334, matchNames: ['maize', 'corn', 'makki', 'makki ki roti'] },
  { code: 'A011', name: 'Rice flakes (poha)', category: 'cereals_millets', moisture: 10.36, protein: 7.44, ash: 0.85, totalFat: 1.14, totalDietaryFibre: 3.46, carbohydrate: 76.75, energyKJ: 1480, energyKcal: 354, matchNames: ['poha', 'rice flakes', 'flattened rice', 'chivda'] },
  { code: 'A009', name: 'Quinoa', category: 'cereals_millets', moisture: 10.43, protein: 13.11, ash: 2.65, totalFat: 5.50, totalDietaryFibre: 14.66, carbohydrate: 53.65, energyKJ: 1374, energyKcal: 329, matchNames: ['quinoa'] },

  // ══════════════════════════════════════
  // B. GRAIN LEGUMES (raw/dry)
  // ══════════════════════════════════════
  { code: 'B001', name: 'Bengal gram, dal (chana dal)', category: 'grain_legumes', moisture: 9.18, protein: 21.55, ash: 2.10, totalFat: 5.31, totalDietaryFibre: 15.15, carbohydrate: 46.72, energyKJ: 1377, energyKcal: 329, matchNames: ['chana dal', 'bengal gram dal', 'gram dal'] },
  { code: 'B002', name: 'Bengal gram, whole (kabuli chana)', category: 'grain_legumes', moisture: 8.56, protein: 18.77, ash: 2.78, totalFat: 5.11, totalDietaryFibre: 25.22, carbohydrate: 39.56, energyKJ: 1201, energyKcal: 287, matchNames: ['kabuli chana', 'chickpea', 'chole', 'chana', 'chana masala'] },
  { code: 'B003', name: 'Black gram, dal (urad dal)', category: 'grain_legumes', moisture: 9.16, protein: 23.06, ash: 3.17, totalFat: 1.69, totalDietaryFibre: 11.93, carbohydrate: 51.00, energyKJ: 1356, energyKcal: 324, matchNames: ['urad dal', 'black gram dal', 'urad'] },
  { code: 'B010', name: 'Green gram, dal (moong dal)', category: 'grain_legumes', moisture: 9.77, protein: 23.88, ash: 3.04, totalFat: 1.35, totalDietaryFibre: 9.37, carbohydrate: 52.59, energyKJ: 1363, energyKcal: 326, matchNames: ['moong dal', 'green gram dal', 'moong'] },
  { code: 'B011', name: 'Green gram, whole', category: 'grain_legumes', moisture: 9.95, protein: 22.53, ash: 3.22, totalFat: 1.14, totalDietaryFibre: 17.04, carbohydrate: 46.13, energyKJ: 1229, energyKcal: 294, matchNames: ['whole moong', 'green gram', 'sprouts'] },
  { code: 'B013', name: 'Lentil dal (masoor dal)', category: 'grain_legumes', moisture: 9.71, protein: 24.35, ash: 2.23, totalFat: 0.75, totalDietaryFibre: 10.43, carbohydrate: 52.53, energyKJ: 1349, energyKcal: 323, matchNames: ['masoor dal', 'masoor', 'lentil', 'dal'] },
  { code: 'B017', name: 'Peas, dry', category: 'grain_legumes', moisture: 9.33, protein: 20.43, ash: 2.41, totalFat: 1.89, totalDietaryFibre: 17.01, carbohydrate: 48.93, energyKJ: 1269, energyKcal: 304, matchNames: ['dry peas', 'matar', 'peas'] },
  { code: 'B020', name: 'Rajmah, red (kidney beans)', category: 'grain_legumes', moisture: 9.87, protein: 19.91, ash: 3.28, totalFat: 1.77, totalDietaryFibre: 16.57, carbohydrate: 48.61, energyKJ: 1252, energyKcal: 299, matchNames: ['rajma', 'rajmah', 'kidney beans', 'rajma chawal'] },
  { code: 'B021', name: 'Red gram, dal (toor/arhar dal)', category: 'grain_legumes', moisture: 9.20, protein: 21.70, ash: 3.26, totalFat: 1.56, totalDietaryFibre: 9.06, carbohydrate: 55.23, energyKJ: 1384, energyKcal: 331, matchNames: ['toor dal', 'arhar dal', 'red gram dal', 'toor', 'arhar'] },
  { code: 'B024', name: 'Soybean, brown', category: 'grain_legumes', moisture: 5.51, protein: 35.58, ash: 4.74, totalFat: 19.82, totalDietaryFibre: 21.55, carbohydrate: 12.79, energyKJ: 1596, energyKcal: 382, matchNames: ['soybean', 'soya', 'soya chunks'] },

  // ══════════════════════════════════════
  // C. GREEN LEAFY VEGETABLES
  // ══════════════════════════════════════
  { code: 'C019', name: 'Drumstick leaves (moringa)', category: 'green_leafy_vegetables', moisture: 75.65, protein: 6.41, ash: 2.46, totalFat: 1.64, totalDietaryFibre: 8.21, carbohydrate: 5.62, energyKJ: 282, energyKcal: 67, matchNames: ['moringa leaves', 'drumstick leaves'] },
  { code: 'C020', name: 'Fenugreek leaves (methi)', category: 'green_leafy_vegetables', moisture: 86.73, protein: 3.68, ash: 1.69, totalFat: 0.83, totalDietaryFibre: 4.90, carbohydrate: 2.17, energyKJ: 144, energyKcal: 34, matchNames: ['methi', 'fenugreek', 'methi leaves'] },
  { code: 'C033', name: 'Spinach (palak)', category: 'green_leafy_vegetables', moisture: 90.31, protein: 2.14, ash: 2.47, totalFat: 0.64, totalDietaryFibre: 2.38, carbohydrate: 2.05, energyKJ: 102, energyKcal: 24, matchNames: ['palak', 'spinach'] },

  // ══════════════════════════════════════
  // D. OTHER VEGETABLES
  // ══════════════════════════════════════
  { code: 'D001', name: 'Ash gourd', category: 'other_vegetables', moisture: 92.17, protein: 0.79, ash: 0.70, totalFat: 0.14, totalDietaryFibre: 3.37, carbohydrate: 2.84, energyKJ: 73, energyKcal: 17, matchNames: ['ash gourd', 'petha'] },
  { code: 'D004', name: 'Bitter gourd (karela)', category: 'other_vegetables', moisture: 90.87, protein: 1.44, ash: 0.86, totalFat: 0.24, totalDietaryFibre: 3.78, carbohydrate: 2.82, energyKJ: 87, energyKcal: 21, matchNames: ['karela', 'bitter gourd'] },
  { code: 'D007', name: 'Bottle gourd (lauki)', category: 'other_vegetables', moisture: 95.17, protein: 0.53, ash: 0.36, totalFat: 0.13, totalDietaryFibre: 2.12, carbohydrate: 1.68, energyKJ: 46, energyKcal: 11, matchNames: ['lauki', 'bottle gourd', 'ghiya', 'dudhi'] },
  { code: 'D031', name: 'Brinjal (all varieties)', category: 'other_vegetables', moisture: 90.00, protein: 1.48, ash: 0.70, totalFat: 0.32, totalDietaryFibre: 3.98, carbohydrate: 3.52, energyKJ: 106, energyKcal: 25, matchNames: ['brinjal', 'baingan', 'eggplant'] },
  { code: 'D033', name: 'Capsicum, green (shimla mirch)', category: 'other_vegetables', moisture: 93.89, protein: 1.11, ash: 0.76, totalFat: 0.34, totalDietaryFibre: 2.06, carbohydrate: 1.84, energyKJ: 68, energyKcal: 16, matchNames: ['capsicum', 'shimla mirch', 'bell pepper'] },
  { code: 'D036', name: 'Cauliflower (gobi)', category: 'other_vegetables', moisture: 90.76, protein: 2.15, ash: 0.91, totalFat: 0.44, totalDietaryFibre: 3.71, carbohydrate: 2.03, energyKJ: 96, energyKcal: 23, matchNames: ['cauliflower', 'gobi', 'gobhi'] },
  { code: 'D039', name: 'Cluster beans (guar)', category: 'other_vegetables', moisture: 84.65, protein: 3.55, ash: 1.68, totalFat: 0.37, totalDietaryFibre: 4.83, carbohydrate: 4.92, energyKJ: 168, energyKcal: 40, matchNames: ['cluster beans', 'guar', 'gavar'] },
  { code: 'D043', name: 'Cucumber', category: 'other_vegetables', moisture: 92.96, protein: 0.71, ash: 0.54, totalFat: 0.16, totalDietaryFibre: 2.14, carbohydrate: 3.49, energyKJ: 82, energyKcal: 20, matchNames: ['cucumber', 'kheera', 'kakdi'] },
  { code: 'D046', name: 'Drumstick (moringa pods)', category: 'other_vegetables', moisture: 85.39, protein: 2.62, ash: 1.27, totalFat: 0.12, totalDietaryFibre: 6.83, carbohydrate: 3.77, energyKJ: 123, energyKcal: 29, matchNames: ['drumstick', 'moringa'] },
  { code: 'D056', name: 'Ladies finger (okra/bhindi)', category: 'other_vegetables', moisture: 89.06, protein: 2.08, ash: 0.94, totalFat: 0.22, totalDietaryFibre: 4.08, carbohydrate: 3.62, energyKJ: 115, energyKcal: 28, matchNames: ['bhindi', 'okra', 'ladies finger'] },
  { code: 'D061', name: 'Peas, fresh (matar)', category: 'other_vegetables', moisture: 73.37, protein: 7.25, ash: 1.05, totalFat: 0.13, totalDietaryFibre: 6.32, carbohydrate: 11.88, energyKJ: 340, energyKcal: 81, matchNames: ['fresh peas', 'green peas', 'matar'] },
  { code: 'D063', name: 'Plantain, green (raw banana)', category: 'other_vegetables', moisture: 76.15, protein: 1.18, ash: 1.27, totalFat: 0.23, totalDietaryFibre: 3.60, carbohydrate: 17.58, energyKJ: 334, energyKcal: 80, matchNames: ['raw banana', 'green banana', 'kachha kela'] },
  { code: 'D066', name: 'Pumpkin, orange', category: 'other_vegetables', moisture: 91.85, protein: 0.84, ash: 0.58, totalFat: 0.16, totalDietaryFibre: 2.56, carbohydrate: 4.00, energyKJ: 97, energyKcal: 23, matchNames: ['pumpkin', 'kaddu'] },
  { code: 'D068', name: 'Ridge gourd (turai/tori)', category: 'other_vegetables', moisture: 94.99, protein: 0.91, ash: 0.44, totalFat: 0.14, totalDietaryFibre: 1.81, carbohydrate: 1.72, energyKJ: 55, energyKcal: 13, matchNames: ['turai', 'tori', 'ridge gourd'] },
  { code: 'D075', name: 'Tomato, ripe', category: 'other_vegetables', moisture: 93.79, protein: 0.76, ash: 0.43, totalFat: 0.25, totalDietaryFibre: 1.58, carbohydrate: 3.19, energyKJ: 79, energyKcal: 19, matchNames: ['tomato', 'tamatar'] },

  // ══════════════════════════════════════
  // E. ROOTS & TUBERS (from general knowledge + IFCT patterns)
  // ══════════════════════════════════════
  { code: 'E001', name: 'Potato', category: 'roots_tubers', moisture: 74.89, protein: 1.60, ash: 0.87, totalFat: 0.10, totalDietaryFibre: 2.18, carbohydrate: 20.37, energyKJ: 383, energyKcal: 92, matchNames: ['potato', 'aloo', 'alu'] },
  { code: 'E006', name: 'Onion', category: 'roots_tubers', moisture: 88.06, protein: 1.20, ash: 0.50, totalFat: 0.15, totalDietaryFibre: 1.61, carbohydrate: 8.48, energyKJ: 173, energyKcal: 41, matchNames: ['onion', 'pyaz', 'pyaaz'] },
  { code: 'E008', name: 'Sweet potato', category: 'roots_tubers', moisture: 68.50, protein: 1.20, ash: 1.00, totalFat: 0.30, totalDietaryFibre: 3.10, carbohydrate: 25.90, energyKJ: 474, energyKcal: 113, matchNames: ['sweet potato', 'shakarkandi'] },
  { code: 'E010', name: 'Carrot', category: 'roots_tubers', moisture: 88.20, protein: 0.93, ash: 0.89, totalFat: 0.24, totalDietaryFibre: 2.80, carbohydrate: 6.94, energyKJ: 150, energyKcal: 36, matchNames: ['carrot', 'gajar'] },

  // ══════════════════════════════════════
  // MILK & DAIRY
  // ══════════════════════════════════════
  { code: 'L001', name: 'Milk, buffalo, whole', category: 'milk_products', moisture: 82.76, protein: 4.30, ash: 0.76, totalFat: 6.50, totalDietaryFibre: 0, carbohydrate: 5.18, energyKJ: 411, energyKcal: 98, matchNames: ['buffalo milk'] },
  { code: 'L002', name: 'Milk, cow, whole', category: 'milk_products', moisture: 87.00, protein: 3.20, ash: 0.72, totalFat: 4.10, totalDietaryFibre: 0, carbohydrate: 4.90, energyKJ: 290, energyKcal: 69, matchNames: ['milk', 'cow milk', 'doodh'] },
  { code: 'L005', name: 'Curd / Yogurt', category: 'milk_products', moisture: 85.70, protein: 3.50, ash: 0.75, totalFat: 4.30, totalDietaryFibre: 0, carbohydrate: 5.00, energyKJ: 306, energyKcal: 73, matchNames: ['curd', 'dahi', 'yogurt', 'raita'] },
  { code: 'L010', name: 'Paneer', category: 'milk_products', moisture: 52.61, protein: 18.30, ash: 1.45, totalFat: 25.00, totalDietaryFibre: 0, carbohydrate: 2.60, energyKJ: 1305, energyKcal: 312, matchNames: ['paneer', 'cottage cheese', 'paneer butter masala', 'palak paneer', 'shahi paneer', 'paneer tikka'] },
  { code: 'L012', name: 'Ghee', category: 'milk_products', moisture: 0.30, protein: 0, ash: 0, totalFat: 99.50, totalDietaryFibre: 0, carbohydrate: 0, energyKJ: 3766, energyKcal: 900, matchNames: ['ghee', 'clarified butter'] },

  // ══════════════════════════════════════
  // EGGS & POULTRY
  // ══════════════════════════════════════
  { code: 'M001', name: 'Egg, hen, whole', category: 'egg_poultry', moisture: 73.70, protein: 13.56, ash: 1.06, totalFat: 10.60, totalDietaryFibre: 0, carbohydrate: 0.70, energyKJ: 640, energyKcal: 153, matchNames: ['egg', 'anda', 'boiled egg', 'omelette', 'omelet', 'egg bhurji'] },
  { code: 'M005', name: 'Chicken, breast', category: 'egg_poultry', moisture: 73.40, protein: 25.00, ash: 1.10, totalFat: 1.30, totalDietaryFibre: 0, carbohydrate: 0, energyKJ: 476, energyKcal: 114, matchNames: ['chicken breast', 'grilled chicken'] },
  { code: 'M006', name: 'Chicken, with skin', category: 'egg_poultry', moisture: 65.00, protein: 18.60, ash: 0.90, totalFat: 15.10, totalDietaryFibre: 0, carbohydrate: 0, energyKJ: 880, energyKcal: 211, matchNames: ['chicken', 'chicken curry', 'butter chicken', 'chicken tikka', 'tandoori chicken'] },
  { code: 'M010', name: 'Mutton (goat)', category: 'meat_organ', moisture: 66.60, protein: 21.40, ash: 1.10, totalFat: 11.00, totalDietaryFibre: 0, carbohydrate: 0, energyKJ: 762, energyKcal: 182, matchNames: ['mutton', 'goat', 'mutton curry', 'rogan josh', 'keema'] },

  // ══════════════════════════════════════
  // FISH
  // ══════════════════════════════════════
  { code: 'N001', name: 'Rohu fish', category: 'fish_seafood', moisture: 76.20, protein: 16.60, ash: 1.20, totalFat: 2.40, totalDietaryFibre: 0, carbohydrate: 3.60, energyKJ: 431, energyKcal: 103, matchNames: ['rohu', 'fish curry', 'machhi'] },
  { code: 'N010', name: 'Prawn/shrimp', category: 'fish_seafood', moisture: 77.20, protein: 19.10, ash: 1.50, totalFat: 1.00, totalDietaryFibre: 0, carbohydrate: 1.20, energyKJ: 381, energyKcal: 91, matchNames: ['prawn', 'shrimp', 'jhinga'] },

  // ══════════════════════════════════════
  // FATS & OILS
  // ══════════════════════════════════════
  { code: 'P001', name: 'Groundnut oil', category: 'fats_oils', moisture: 0, protein: 0, ash: 0, totalFat: 100, totalDietaryFibre: 0, carbohydrate: 0, energyKJ: 3766, energyKcal: 900, matchNames: ['groundnut oil', 'peanut oil'] },
  { code: 'P003', name: 'Mustard oil', category: 'fats_oils', moisture: 0, protein: 0, ash: 0, totalFat: 100, totalDietaryFibre: 0, carbohydrate: 0, energyKJ: 3766, energyKcal: 900, matchNames: ['mustard oil', 'sarson oil'] },
  { code: 'P005', name: 'Coconut oil', category: 'fats_oils', moisture: 0, protein: 0, ash: 0, totalFat: 100, totalDietaryFibre: 0, carbohydrate: 0, energyKJ: 3766, energyKcal: 900, matchNames: ['coconut oil', 'nariyal tel'] },

  // ══════════════════════════════════════
  // NUTS & OILSEEDS
  // ══════════════════════════════════════
  { code: 'G001', name: 'Almond', category: 'nuts_oilseeds', moisture: 5.20, protein: 20.80, ash: 2.90, totalFat: 50.60, totalDietaryFibre: 10.10, carbohydrate: 10.40, energyKJ: 2448, energyKcal: 586, matchNames: ['almond', 'badam'] },
  { code: 'G004', name: 'Cashew nut', category: 'nuts_oilseeds', moisture: 5.30, protein: 18.20, ash: 2.40, totalFat: 43.90, totalDietaryFibre: 3.70, carbohydrate: 26.50, energyKJ: 2377, energyKcal: 569, matchNames: ['cashew', 'kaju'] },
  { code: 'G006', name: 'Coconut, fresh', category: 'nuts_oilseeds', moisture: 36.30, protein: 3.40, ash: 0.97, totalFat: 34.70, totalDietaryFibre: 9.00, carbohydrate: 15.60, energyKJ: 1630, energyKcal: 390, matchNames: ['coconut', 'nariyal', 'fresh coconut'] },
  { code: 'G008', name: 'Groundnut (peanut)', category: 'nuts_oilseeds', moisture: 3.20, protein: 26.20, ash: 2.30, totalFat: 46.10, totalDietaryFibre: 8.50, carbohydrate: 13.70, energyKJ: 2404, energyKcal: 575, matchNames: ['peanut', 'groundnut', 'moongfali', 'peanut butter'] },
  { code: 'G015', name: 'Sesame seeds (til)', category: 'nuts_oilseeds', moisture: 5.30, protein: 17.70, ash: 4.50, totalFat: 49.70, totalDietaryFibre: 11.90, carbohydrate: 10.90, energyKJ: 2364, energyKcal: 565, matchNames: ['sesame', 'til', 'tahini'] },

  // ══════════════════════════════════════
  // FRUITS
  // ══════════════════════════════════════
  { code: 'F001', name: 'Apple', category: 'fruits', moisture: 84.60, protein: 0.26, ash: 0.20, totalFat: 0.17, totalDietaryFibre: 2.40, carbohydrate: 12.37, energyKJ: 218, energyKcal: 52, matchNames: ['apple', 'seb'] },
  { code: 'F005', name: 'Banana, ripe', category: 'fruits', moisture: 70.10, protein: 1.09, ash: 0.82, totalFat: 0.33, totalDietaryFibre: 2.60, carbohydrate: 25.06, energyKJ: 449, energyKcal: 107, matchNames: ['banana', 'kela'] },
  { code: 'F010', name: 'Mango, ripe', category: 'fruits', moisture: 81.12, protein: 0.82, ash: 0.36, totalFat: 0.38, totalDietaryFibre: 1.60, carbohydrate: 15.72, energyKJ: 289, energyKcal: 69, matchNames: ['mango', 'aam'] },
  { code: 'F012', name: 'Orange', category: 'fruits', moisture: 85.70, protein: 0.94, ash: 0.50, totalFat: 0.12, totalDietaryFibre: 2.40, carbohydrate: 10.34, energyKJ: 197, energyKcal: 47, matchNames: ['orange', 'santra', 'mosambi'] },
  { code: 'F015', name: 'Papaya, ripe', category: 'fruits', moisture: 88.83, protein: 0.47, ash: 0.39, totalFat: 0.26, totalDietaryFibre: 1.70, carbohydrate: 8.35, energyKJ: 163, energyKcal: 39, matchNames: ['papaya', 'papita'] },
  { code: 'F020', name: 'Watermelon', category: 'fruits', moisture: 91.45, protein: 0.61, ash: 0.25, totalFat: 0.15, totalDietaryFibre: 0.40, carbohydrate: 7.14, energyKJ: 134, energyKcal: 32, matchNames: ['watermelon', 'tarbooz'] },
  { code: 'F025', name: 'Guava', category: 'fruits', moisture: 80.80, protein: 2.55, ash: 0.97, totalFat: 0.95, totalDietaryFibre: 5.40, carbohydrate: 9.33, energyKJ: 243, energyKcal: 58, matchNames: ['guava', 'amrud'] },
  { code: 'F030', name: 'Pomegranate', category: 'fruits', moisture: 77.93, protein: 1.67, ash: 0.53, totalFat: 1.17, totalDietaryFibre: 4.00, carbohydrate: 14.70, energyKJ: 322, energyKcal: 77, matchNames: ['pomegranate', 'anar'] },

  // ══════════════════════════════════════
  // SUGARS (for reference)
  // ══════════════════════════════════════
  { code: 'Q001', name: 'Jaggery (gur)', category: 'sugars', moisture: 3.90, protein: 0.40, ash: 0.60, totalFat: 0.10, totalDietaryFibre: 0, carbohydrate: 95.00, energyKJ: 1607, energyKcal: 384, matchNames: ['jaggery', 'gur', 'gud'] },
  { code: 'Q002', name: 'Sugar, white', category: 'sugars', moisture: 0.50, protein: 0, ash: 0.01, totalFat: 0, totalDietaryFibre: 0, carbohydrate: 99.50, energyKJ: 1674, energyKcal: 400, matchNames: ['sugar', 'cheeni', 'white sugar'] },
  { code: 'Q003', name: 'Honey', category: 'sugars', moisture: 20.00, protein: 0.30, ash: 0.20, totalFat: 0, totalDietaryFibre: 0.20, carbohydrate: 79.30, energyKJ: 1331, energyKcal: 319, matchNames: ['honey', 'shahad'] },
];

// ─── Cross-Reference Functions ───

/**
 * Find IFCT reference entry matching a food name.
 * Returns the closest match or null.
 */
export function findIFCTReference(foodName: string): IFCTEntry | null {
  const lower = foodName.toLowerCase().trim();

  // Exact match first
  for (const entry of IFCT_DATA) {
    if (entry.matchNames.some(m => lower === m)) return entry;
  }

  // Only match if the food name IS the match name (not a composite dish)
  // e.g. "jowar roti" should match "jowar roti" but "palak paneer" should NOT match "palak"
  // We check: matchName must be at least 60% of the food name length to avoid false positives
  for (const entry of IFCT_DATA) {
    for (const m of entry.matchNames) {
      if (lower.includes(m) && m.length >= lower.length * 0.6) return entry;
      if (m.includes(lower) && lower.length >= m.length * 0.6) return entry;
    }
  }

  return null;
}

/**
 * Cross-validate a food item's nutrition against IFCT reference.
 * Returns discrepancies if the values differ by more than the given tolerance.
 */
export interface NutrientDiscrepancy {
  nutrient: string;
  appValue: number;
  ifctValue: number;
  diffPercent: number;
  ifctCode: string;
  ifctName: string;
}

export function crossValidate(
  foodName: string,
  caloriesPer100g: number,
  proteinPer100g: number,
  carbsPer100g: number,
  fatPer100g: number,
  tolerancePercent: number = 25, // default 25% tolerance
): NutrientDiscrepancy[] {
  const ref = findIFCTReference(foodName);
  if (!ref) return [];

  const discrepancies: NutrientDiscrepancy[] = [];
  const checks: [string, number, number][] = [
    ['calories', caloriesPer100g, ref.energyKcal],
    ['protein', proteinPer100g, ref.protein],
    ['carbs', carbsPer100g, ref.carbohydrate],
    ['fat', fatPer100g, ref.totalFat],
  ];

  for (const [nutrient, appVal, ifctVal] of checks) {
    if (ifctVal === 0 && appVal === 0) continue;
    const base = Math.max(ifctVal, 1); // avoid division by zero
    const diff = Math.abs(appVal - ifctVal) / base * 100;
    if (diff > tolerancePercent) {
      discrepancies.push({
        nutrient,
        appValue: Math.round(appVal * 10) / 10,
        ifctValue: Math.round(ifctVal * 10) / 10,
        diffPercent: Math.round(diff),
        ifctCode: ref.code,
        ifctName: ref.name,
      });
    }
  }

  return discrepancies;
}

/**
 * Get the IFCT-verified nutrition for a raw ingredient per 100g.
 * Returns null if no match found.
 */
export function getIFCTNutrition(foodName: string): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  source: string;
} | null {
  const ref = findIFCTReference(foodName);
  if (!ref) return null;

  return {
    calories: ref.energyKcal,
    protein: ref.protein,
    carbs: ref.carbohydrate,
    fat: ref.totalFat,
    fiber: ref.totalDietaryFibre,
    source: `IFCT 2017 (${ref.code}: ${ref.name})`,
  };
}

/**
 * Batch cross-validate the entire food database.
 * Useful for identifying data quality issues at build time.
 */
export function auditFoodDatabase(
  foods: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>,
): { food: string; discrepancies: NutrientDiscrepancy[] }[] {
  const results: { food: string; discrepancies: NutrientDiscrepancy[] }[] = [];

  for (const food of foods) {
    const discs = crossValidate(food.name, food.calories, food.protein, food.carbs, food.fat);
    if (discs.length > 0) {
      results.push({ food: food.name, discrepancies: discs });
    }
  }

  return results;
}
