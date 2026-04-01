// Allergen keyword mapping for Indian food database
// Maps allergen categories to keywords found in food names

export const COMMON_ALLERGENS = [
  { value: 'nuts', label: '🥜 Nuts', description: 'Peanuts, almonds, cashews, walnuts' },
  { value: 'dairy', label: '🥛 Dairy', description: 'Milk, cheese, paneer, ghee, curd' },
  { value: 'gluten', label: '🌾 Gluten', description: 'Wheat, roti, naan, bread, maida' },
  { value: 'soy', label: '🫘 Soy', description: 'Soya chunks, tofu, soy sauce' },
  { value: 'eggs', label: '🥚 Eggs', description: 'Eggs, omelette, mayonnaise' },
  { value: 'shellfish', label: '🦐 Shellfish', description: 'Prawns, shrimp, crab, lobster' },
  { value: 'mustard', label: '🟡 Mustard', description: 'Sarson oil, rai seeds, pickles' },
  { value: 'peanuts', label: '🥜 Peanuts', description: 'Groundnuts, peanut oil, chutney' },
  { value: 'sesame', label: '⚪ Sesame', description: 'Til, sesame oil, tahini' },
  { value: 'fish', label: '🐟 Fish', description: 'Fish curry, fish fry, surimi' },
];

// Severe allergens that trigger double confirmation
export const SEVERE_ALLERGENS = ['nuts', 'peanuts', 'shellfish'];

// Keywords that indicate the presence of an allergen
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  dairy: [
    'paneer', 'ghee', 'curd', 'dahi', 'lassi', 'kheer', 'cheese', 'cream',
    'milk', 'raita', 'butter', 'malai', 'makhani', 'shrikhand', 'rabri',
    'basundi', 'kulfi', 'barfi', 'burfi', 'peda', 'gulab jamun', 'rasmalai',
    'chaas', 'buttermilk', 'whey', 'yogurt', 'yoghurt', 'cream cheese',
    'cottage cheese', 'ricotta', 'mozzarella', 'cheddar', 'dulce',
    'doodh', 'khoya', 'paal', 'thayir', 'nei', 'perugu', 'haalu',
    'kadhi', 'rabdi',
    // Regional expansions
    'mawa', 'makkhan', 'paal aadai', 'paal kova', 'meegada', 'venna',
    'benne', 'doode', 'toop', 'loni', 'chakka', 'mosaru',
  ],
  gluten: [
    'wheat', 'roti', 'chapati', 'chapatti', 'naan', 'paratha', 'bread',
    'pasta', 'maida', 'suji', 'semolina', 'bhatura', 'puri', 'poori',
    'kulcha', 'thepla', 'phulka', 'rumali', 'tandoori roti', 'biscuit',
    'cookie', 'cake', 'pastry', 'pizza', 'burger bun', 'toast', 'crouton',
    'seitan', 'couscous', 'barley', 'rye', 'atta', 'dalia', 'upma',
    'rava', 'sooji', 'hing', 'asafoetida', 'heeng',
    'godumai', 'pindi', 'godhi', 'haleem', 'jalebi', 'sev',
    // Regional expansions
    'godhuma maavu', 'perungayam', 'godhuma pindi', 'inguva',
    'godhi hittu', 'hingu', 'gahu pith', 'seviyan',
  ],
  nuts: [
    'peanut', 'almond', 'cashew', 'kaju', 'badam', 'walnut', 'pistachio',
    'pista', 'groundnut', 'akhrot', 'mungfali', 'chironji', 'pine nut',
    'hazelnut', 'pecan', 'macadamia', 'brazil nut', 'mixed nuts',
    'dry fruit', 'trail mix', 'badami',
    // Regional expansions
    'mundhiri', 'jeedi pappu', 'geru', 'chilgoza',
  ],
  peanuts: [
    'peanut', 'groundnut', 'moongphali', 'singdana', 'mungfali',
    'verkadalai', 'pallilu', 'sheng dane',
    // Regional expansions
    'nilakkadalai', 'veru senaga pappu', 'palli', 'kadale kai beeja',
  ],
  soy: [
    'soya', 'tofu', 'soy', 'edamame', 'tempeh', 'miso', 'soy sauce',
    'soy milk', 'soy chunk', 'nutrela', 'meal maker',
  ],
  eggs: [
    'egg', 'anda', 'omelette', 'omelet', 'scrambled', 'boiled egg',
    'fried egg', 'poached egg', 'egg curry', 'egg bhurji', 'meringue',
    'mayonnaise', 'mayo', 'muttai', 'guddu', 'motte', 'baida',
    // Regional expansions
    'ande',
  ],
  shellfish: [
    'prawn', 'shrimp', 'crab', 'lobster', 'crayfish', 'mussel',
    'oyster', 'clam', 'scallop', 'squid', 'calamari', 'jhinga', 'kekda',
    // Regional expansions
    'yera', 'nandu', 'royyalu', 'peeta', 'sigadi', 'kurli', 'kolambi',
  ],
  mustard: [
    'mustard', 'sarson', 'rai', 'kachi ghani', 'kadugu', 'avalu', 'sasive',
    // Regional expansions
    'mohri',
  ],
  sesame: [
    'sesame', 'til', 'gingelly', 'tahini', 'til ladoo',
    // Regional expansions
    'ellu', 'nuvvulu', 'teel',
  ],
  fish: [
    'fish', 'machli', 'meen', 'surimi', 'anchovy', 'sardine', 'tuna',
    'salmon', 'pomfret', 'hilsa', 'rohu', 'katla', 'bangda',
    // Regional expansions
    'machchhi', 'chepa', 'meenu', 'maasa',
  ],
};
