export interface SupplementDef {
  name: string;
  brands: string[];
  defaultUnit: string;
  defaultDosage: number;
  caloriesPerUnit?: number;
  proteinPerUnit?: number;
  carbsPerUnit?: number;
  fatPerUnit?: number;
  icon: string;
  category: string;
}

export const SUPPLEMENT_CATEGORIES = ['Protein', 'Vitamins', 'Minerals', 'Herbs', 'Other'] as const;

export const SUPPLEMENT_UNITS = ['scoop', 'capsule', 'tablet', 'ml', 'g', 'mg'] as const;

export const SUPPLEMENTS_DB: SupplementDef[] = [
  {
    name: "Whey Protein",
    brands: ["MuscleBlaze", "Optimum Nutrition", "Dymatize", "Generic"],
    defaultUnit: "scoop",
    defaultDosage: 1,
    caloriesPerUnit: 120,
    proteinPerUnit: 24,
    carbsPerUnit: 3,
    fatPerUnit: 1,
    icon: "🥛",
    category: "Protein"
  },
  {
    name: "Casein Protein",
    brands: ["Optimum Nutrition", "Dymatize", "Generic"],
    defaultUnit: "scoop",
    defaultDosage: 1,
    caloriesPerUnit: 110,
    proteinPerUnit: 24,
    carbsPerUnit: 3,
    fatPerUnit: 0.5,
    icon: "🥛",
    category: "Protein"
  },
  {
    name: "Plant Protein",
    brands: ["Orgain", "Garden of Life", "Generic"],
    defaultUnit: "scoop",
    defaultDosage: 1,
    caloriesPerUnit: 150,
    proteinPerUnit: 21,
    carbsPerUnit: 6,
    fatPerUnit: 3,
    icon: "🌱",
    category: "Protein"
  },
  {
    name: "Creatine Monohydrate",
    brands: ["MuscleBlaze", "Optimum Nutrition", "Generic"],
    defaultUnit: "g",
    defaultDosage: 5,
    caloriesPerUnit: 0,
    icon: "💪",
    category: "Protein"
  },
  {
    name: "BCAA",
    brands: ["Scivation", "MuscleBlaze", "Generic"],
    defaultUnit: "scoop",
    defaultDosage: 1,
    caloriesPerUnit: 5,
    icon: "⚡",
    category: "Protein"
  },
  {
    name: "Fish Oil",
    brands: ["Nature's Bounty", "Nordic Naturals", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 2,
    caloriesPerUnit: 10,
    fatPerUnit: 1,
    icon: "🐟",
    category: "Vitamins"
  },
  {
    name: "Vitamin D3",
    brands: ["NOW Foods", "Solgar", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    icon: "☀️",
    category: "Vitamins"
  },
  {
    name: "Vitamin C",
    brands: ["NOW Foods", "Nature's Bounty", "Generic"],
    defaultUnit: "tablet",
    defaultDosage: 1,
    icon: "🍊",
    category: "Vitamins"
  },
  {
    name: "Vitamin B12",
    brands: ["Solgar", "NOW Foods", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    icon: "🔴",
    category: "Vitamins"
  },
  {
    name: "Multivitamin",
    brands: ["Centrum", "One A Day", "Generic"],
    defaultUnit: "tablet",
    defaultDosage: 1,
    icon: "💊",
    category: "Vitamins"
  },
  {
    name: "Omega-3",
    brands: ["Nordic Naturals", "Nature Made", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    caloriesPerUnit: 10,
    fatPerUnit: 1,
    icon: "🐟",
    category: "Vitamins"
  },
  {
    name: "Zinc",
    brands: ["NOW Foods", "Nature Made", "Generic"],
    defaultUnit: "tablet",
    defaultDosage: 1,
    icon: "🛡️",
    category: "Minerals"
  },
  {
    name: "Magnesium",
    brands: ["Doctor's Best", "NOW Foods", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    icon: "🧲",
    category: "Minerals"
  },
  {
    name: "Calcium",
    brands: ["Caltrate", "Nature Made", "Generic"],
    defaultUnit: "tablet",
    defaultDosage: 1,
    icon: "🦴",
    category: "Minerals"
  },
  {
    name: "Iron",
    brands: ["Nature Made", "Solgar", "Generic"],
    defaultUnit: "tablet",
    defaultDosage: 1,
    icon: "🩸",
    category: "Minerals"
  },
  {
    name: "Ashwagandha",
    brands: ["Himalaya", "Organic India", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    icon: "🌿",
    category: "Herbs"
  },
  {
    name: "Shilajit",
    brands: ["Patanjali", "Kapiva", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    icon: "🏔️",
    category: "Herbs"
  },
  {
    name: "Turmeric / Curcumin",
    brands: ["Himalaya", "NOW Foods", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    icon: "🟡",
    category: "Herbs"
  },
  {
    name: "Spirulina",
    brands: ["Organic India", "NOW Foods", "Generic"],
    defaultUnit: "tablet",
    defaultDosage: 2,
    caloriesPerUnit: 5,
    proteinPerUnit: 1,
    icon: "🟢",
    category: "Herbs"
  },
  {
    name: "Melatonin",
    brands: ["Natrol", "NOW Foods", "Generic"],
    defaultUnit: "tablet",
    defaultDosage: 1,
    icon: "🌙",
    category: "Other"
  },
  {
    name: "Biotin",
    brands: ["Natrol", "Nature's Bounty", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    icon: "💇",
    category: "Other"
  },
  {
    name: "Collagen Peptides",
    brands: ["Vital Proteins", "Great Lakes", "Generic"],
    defaultUnit: "scoop",
    defaultDosage: 1,
    caloriesPerUnit: 35,
    proteinPerUnit: 9,
    icon: "✨",
    category: "Other"
  },
  {
    name: "Probiotics",
    brands: ["Culturelle", "Align", "Generic"],
    defaultUnit: "capsule",
    defaultDosage: 1,
    icon: "🦠",
    category: "Other"
  },
  {
    name: "Glutamine",
    brands: ["MuscleBlaze", "Optimum Nutrition", "Generic"],
    defaultUnit: "g",
    defaultDosage: 5,
    caloriesPerUnit: 0,
    icon: "💪",
    category: "Protein"
  }
];
