// Allergen keyword mapping for Indian food database
// Maps allergen categories to keywords found in food names

export const COMMON_ALLERGENS = [
  { value: 'nuts', label: '🥜 Nuts', description: 'Peanuts, almonds, cashews, walnuts' },
  { value: 'dairy', label: '🥛 Dairy', description: 'Milk, cheese, paneer, ghee, curd' },
  { value: 'gluten', label: '🌾 Gluten', description: 'Wheat, roti, naan, bread, maida' },
  { value: 'soy', label: '🫘 Soy', description: 'Soya chunks, tofu, soy sauce' },
  { value: 'eggs', label: '🥚 Eggs', description: 'Eggs, omelette, mayonnaise' },
  { value: 'shellfish', label: '🦐 Shellfish', description: 'Prawns, shrimp, crab, lobster' },
];

// Keywords that indicate the presence of an allergen
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  dairy: [
    'paneer', 'ghee', 'curd', 'dahi', 'lassi', 'kheer', 'cheese', 'cream',
    'milk', 'raita', 'butter', 'malai', 'makhani', 'shrikhand', 'rabri',
    'basundi', 'kulfi', 'barfi', 'burfi', 'peda', 'gulab jamun', 'rasmalai',
    'chaas', 'buttermilk', 'whey', 'yogurt', 'yoghurt', 'cream cheese',
    'cottage cheese', 'ricotta', 'mozzarella', 'cheddar', 'dulce',
  ],
  gluten: [
    'wheat', 'roti', 'chapati', 'chapatti', 'naan', 'paratha', 'bread',
    'pasta', 'maida', 'suji', 'semolina', 'bhatura', 'puri', 'poori',
    'kulcha', 'thepla', 'phulka', 'rumali', 'tandoori roti', 'biscuit',
    'cookie', 'cake', 'pastry', 'pizza', 'burger bun', 'toast', 'crouton',
    'seitan', 'couscous', 'barley', 'rye', 'atta', 'dalia', 'upma',
    'rava', 'sooji',
  ],
  nuts: [
    'peanut', 'almond', 'cashew', 'kaju', 'badam', 'walnut', 'pistachio',
    'pista', 'groundnut', 'akhrot', 'mungfali', 'chironji', 'pine nut',
    'hazelnut', 'pecan', 'macadamia', 'brazil nut', 'mixed nuts',
    'dry fruit', 'trail mix',
  ],
  soy: [
    'soya', 'tofu', 'soy', 'edamame', 'tempeh', 'miso', 'soy sauce',
    'soy milk', 'soy chunk', 'nutrela', 'meal maker',
  ],
  eggs: [
    'egg', 'anda', 'omelette', 'omelet', 'scrambled', 'boiled egg',
    'fried egg', 'poached egg', 'egg curry', 'egg bhurji', 'meringue',
    'mayonnaise', 'mayo',
  ],
  shellfish: [
    'prawn', 'shrimp', 'crab', 'lobster', 'crayfish', 'mussel',
    'oyster', 'clam', 'scallop', 'squid', 'calamari',
  ],
};
