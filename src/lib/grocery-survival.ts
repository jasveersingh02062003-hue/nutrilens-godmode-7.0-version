// ─── Grocery Survival Kit Engine ───
// Generates an optimized shopping list maximizing protein efficiency (PES)
// within the user's remaining budget.

import { foodDatabase, getPESColor, computePES, type PESFood, type PESColor } from './pes-engine';
import { getProfile } from './store';
import { getBudgetSettings } from './expense-store';

// ─── Types ───

export interface SurvivalItem {
  id: string;
  name: string;
  quantity: number;     // number of servings
  unit: string;
  cost: number;         // total cost for quantity
  protein: number;      // total protein for quantity
  calories: number;     // total calories for quantity
  pes: number;
  pesColor: PESColor;
  category: string;
}

export type SurvivalMode = 'survival' | 'standard' | 'comfort';

export interface SurvivalKitResult {
  items: SurvivalItem[];
  totalCost: number;
  totalProtein: number;
  totalCalories: number;
  proteinCoverage: number; // percentage of protein target covered
  proteinTarget: number;
  savings: number;
  mode: SurvivalMode;
  budget: number;
}

// ─── Helpers ───

function getMode(budget: number): SurvivalMode {
  if (budget < 300) return 'survival';
  if (budget > 1500) return 'comfort';
  return 'standard';
}

function getCategoryFromTags(tags: string[]): string {
  if (tags.includes('non_veg')) return 'Non-Veg';
  if (tags.includes('vegan')) return 'Vegan';
  if (tags.includes('supplement')) return 'Supplement';
  if (tags.includes('junk')) return 'Snack';
  if (tags.includes('high_protein')) return 'High Protein';
  if (tags.includes('budget')) return 'Budget Staple';
  return 'Other';
}

const SURVIVAL_IDS = ['F02', 'F01', 'F06', 'F35', 'F10']; // soya, egg, masoor, rice, peanuts

// ─── Core Engine ───

export function generateSurvivalKit(weeklyBudget: number): SurvivalKitResult {
  const profile = getProfile();
  const mode = getMode(weeklyBudget);

  // Determine protein target (weekly)
  const dailyProtein = profile?.dailyProtein || 75;
  const proteinTarget = dailyProtein * 7;

  // Filter foods based on user preferences
  const dietaryPrefs: string[] = (profile?.dietaryPrefs as string[]) || [];
  const healthConditions: string[] = (profile?.healthConditions as string[]) || [];
  const isVeg = dietaryPrefs.some(p =>
    ['vegetarian', 'veg', 'lacto-vegetarian'].includes(p.toLowerCase())
  );
  const isVegan = dietaryPrefs.some(p => p.toLowerCase() === 'vegan');
  const allergies = dietaryPrefs
    .filter(p => p.toLowerCase().includes('allergy'))
    .map(a => a.toLowerCase());

  // Health-based avoidance
  const avoidTags: string[] = [];
  const condLower = healthConditions.map(c => c.toLowerCase());
  if (condLower.some(c => c.includes('diabetes'))) avoidTags.push('high_sugar');
  if (condLower.some(c => c.includes('cholesterol'))) avoidTags.push('high_fat');

  let eligible = foodDatabase.filter(f => {
    // Exclude junk
    if (f.tags.includes('junk')) return false;
    // Exclude supplements (whey etc)
    if (f.tags.includes('supplement')) return false;
    // Diet filter
    if (isVegan && !f.tags.includes('vegan')) return false;
    if (isVeg && f.tags.includes('non_veg')) return false;
    // Allergy filter (simple name match)
    if (allergies.some(a => f.name.toLowerCase().includes(a))) return false;
    // Health avoidance
    if (avoidTags.some(t => f.tags.includes(t))) return false;
    return true;
  });

  // In survival mode, restrict to top-5 staples only
  if (mode === 'survival') {
    const survivalFoods = eligible.filter(f => SURVIVAL_IDS.includes(f.id));
    if (survivalFoods.length >= 3) eligible = survivalFoods;
  }

  // Sort by PES descending
  eligible.sort((a, b) =>
    computePES(b, { targetCalories: 500 }) - computePES(a, { targetCalories: 500 })
  );

  // In comfort mode, also allow moderate-PES items for variety
  if (mode === 'comfort') {
    // Keep all eligible, already sorted by PES
  } else if (mode === 'standard') {
    // Take top 15 for efficiency
    eligible = eligible.slice(0, 15);
  }

  // Greedy selection: fill budget with highest-PES items first
  const items: SurvivalItem[] = [];
  let remainingBudget = weeklyBudget;
  let totalProtein = 0;
  let totalCalories = 0;
  let totalCost = 0;

  // Each food gets up to X servings per week (variety control)
  const maxServingsPerItem = mode === 'survival' ? 14 : mode === 'standard' ? 7 : 5;

  for (const food of eligible) {
    if (remainingBudget < food.price) continue;

    const maxAffordable = Math.floor(remainingBudget / food.price);
    const servings = Math.min(maxAffordable, maxServingsPerItem);
    if (servings <= 0) continue;

    const itemCost = servings * food.price;
    const itemProtein = servings * food.protein;
    const itemCalories = servings * food.calories;

    items.push({
      id: food.id,
      name: food.name,
      quantity: servings,
      unit: 'servings',
      cost: itemCost,
      protein: itemProtein,
      calories: itemCalories,
      pes: food.proteinPerRupee,
      pesColor: getPESColor(food.proteinPerRupee),
      category: getCategoryFromTags(food.tags),
    });

    totalCost += itemCost;
    totalProtein += itemProtein;
    totalCalories += itemCalories;
    remainingBudget -= itemCost;

    // Stop if we've hit protein target and have good variety
    if (totalProtein >= proteinTarget && items.length >= 5) break;
  }

  // Post-optimization: if protein coverage < 80%, try adding more soya/eggs
  const coverage = (totalProtein / proteinTarget) * 100;
  if (coverage < 80 && remainingBudget > 0) {
    const boosters = eligible.filter(f => ['F02', 'F01'].includes(f.id));
    for (const booster of boosters) {
      const existing = items.find(i => i.id === booster.id);
      const maxMore = Math.floor(remainingBudget / booster.price);
      const extra = Math.min(maxMore, 7);
      if (extra <= 0) continue;

      if (existing) {
        existing.quantity += extra;
        existing.cost += extra * booster.price;
        existing.protein += extra * booster.protein;
        existing.calories += extra * booster.calories;
      } else {
        items.push({
          id: booster.id,
          name: booster.name,
          quantity: extra,
          unit: 'servings',
          cost: extra * booster.price,
          protein: extra * booster.protein,
          calories: extra * booster.calories,
          pes: booster.proteinPerRupee,
          pesColor: getPESColor(booster.proteinPerRupee),
          category: getCategoryFromTags(booster.tags),
        });
      }
      totalCost += extra * booster.price;
      totalProtein += extra * booster.protein;
      totalCalories += extra * booster.calories;
      remainingBudget -= extra * booster.price;

      if ((totalProtein / proteinTarget) * 100 >= 80) break;
    }
  }

  // Estimate savings vs worst-case (lowest PES foods for same protein)
  const worstPES = [...foodDatabase]
    .filter(f => !f.tags.includes('junk') && !f.tags.includes('supplement') && f.proteinPerRupee > 0)
    .sort((a, b) => a.proteinPerRupee - b.proteinPerRupee);

  let worstCost = 0;
  let accProt = 0;
  for (const f of worstPES) {
    if (accProt >= totalProtein) break;
    const needed = Math.ceil((totalProtein - accProt) / f.protein);
    worstCost += needed * f.price;
    accProt += needed * f.protein;
  }
  const savings = Math.max(0, worstCost - totalCost);

  return {
    items: items.sort((a, b) => b.protein - a.protein), // show highest protein first
    totalCost: Math.round(totalCost),
    totalProtein: Math.round(totalProtein),
    totalCalories: Math.round(totalCalories),
    proteinCoverage: Math.round((totalProtein / proteinTarget) * 100),
    proteinTarget: Math.round(proteinTarget),
    savings: Math.round(savings),
    mode,
    budget: weeklyBudget,
  };
}

// ─── Persistence ───

const STORAGE_KEY = 'nutrilens_survival_kit';

export function saveSurvivalKit(kit: SurvivalKitResult) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...kit, lockedAt: Date.now() }));
}

export function getSavedSurvivalKit(): (SurvivalKitResult & { lockedAt: number }) | null {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export function clearSurvivalKit() {
  localStorage.removeItem(STORAGE_KEY);
}
