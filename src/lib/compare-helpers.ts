import { type IndianFood } from '@/lib/indian-foods';
import { type FoodItem } from '@/lib/store';
import { type Recipe, getEnrichedRecipe } from '@/lib/recipes';
import { getRecipeCost } from '@/lib/recipe-cost';
import { getRecipeImage } from '@/lib/recipe-images';
import { computePES } from '@/lib/pes-engine';
import { estimateCost } from '@/lib/price-database';
import { getPantryItems } from '@/lib/pantry-store';

export interface CompareItem {
  type: 'food' | 'recipe' | 'scanned';
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  iron: number;
  calcium: number;
  vitC: number;
  cost: number;
  pes: number;
  image?: string;
  pantryMatch?: { available: number; total: number };
}

export function buildFromFood(food: IndianFood): CompareItem {
  const servingFactor = food.defaultServing / 100;
  const cal = Math.round(food.calories * servingFactor);
  const pro = +(food.protein * servingFactor).toFixed(1);
  const carb = +(food.carbs * servingFactor).toFixed(1);
  const fat = +(food.fat * servingFactor).toFixed(1);
  const fib = +(food.fiber * servingFactor).toFixed(1);
  const iron = +(food.iron * servingFactor).toFixed(1);
  const calcium = +((food.calcium ?? 0) * servingFactor).toFixed(1);
  const vitC = +((food.vitC ?? 0) * servingFactor).toFixed(1);
  const cost = estimateCost([{ name: food.name, quantity: food.defaultServing, unit: 'g' }]) ?? Math.round(cal * 0.04);
  const pes = computePES({ protein: pro, calories: cal, cost }, {});
  return { type: 'food', id: `food-${food.id}`, name: food.name, calories: cal, protein: pro, carbs: carb, fat, fiber: fib, iron, calcium, vitC, cost, pes };
}

export function buildFromFoodItem(food: FoodItem): CompareItem {
  const cost = food.itemCost || estimateCost([{ name: food.name, quantity: food.quantity, unit: food.unit }]) || Math.round(food.calories * 0.04);
  const pes = computePES({ protein: food.protein, calories: food.calories, cost }, {});
  return {
    type: 'food',
    id: `food-${food.id}`,
    name: food.name,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber || 0,
    iron: 0,
    calcium: 0,
    vitC: 0,
    cost,
    pes,
  };
}

export function buildFromRecipe(recipe: Recipe): CompareItem {
  const enriched = getEnrichedRecipe(recipe);
  const cost = getRecipeCost(recipe);
  const pes = computePES(enriched, {});
  const pantryItems = getPantryItems();

  let available = 0;
  const total = recipe.ingredients.length;
  for (const ing of recipe.ingredients) {
    const ingName = ing.name.toLowerCase();
    if (pantryItems.some(p => p.name.toLowerCase().includes(ingName) || ingName.includes(p.name.toLowerCase()))) {
      available++;
    }
  }

  return {
    type: 'recipe',
    id: `recipe-${recipe.id}`,
    name: recipe.name,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    fiber: recipe.fiber,
    iron: 0,
    calcium: 0,
    vitC: 0,
    cost,
    pes,
    image: getRecipeImage(recipe.id, recipe.mealType[0]),
    pantryMatch: { available, total },
  };
}

/** Build a CompareItem from AI-analyzed food data (camera scan) */
export function buildFromAnalyzed(item: {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}): CompareItem {
  const cost = Math.round(item.calories * 0.04);
  const pes = computePES({ protein: item.protein, calories: item.calories, cost }, {});
  return {
    type: 'scanned',
    id: `scanned-${Date.now()}`,
    name: item.name,
    calories: Math.round(item.calories),
    protein: +item.protein.toFixed(1),
    carbs: +item.carbs.toFixed(1),
    fat: +item.fat.toFixed(1),
    fiber: +(item.fiber || 0).toFixed(1),
    iron: 0,
    calcium: 0,
    vitC: 0,
    cost,
    pes,
  };
}

export interface CompareMetric {
  label: string;
  key: keyof Pick<CompareItem, 'cost' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'iron' | 'calcium' | 'vitC'>;
  unit: string;
  lowerIsBetter?: boolean;
  section?: 'macro' | 'micro';
}

export const COMPARE_METRICS: CompareMetric[] = [
  { label: 'Price', key: 'cost', unit: '₹', lowerIsBetter: true, section: 'macro' },
  { label: 'Calories', key: 'calories', unit: '', lowerIsBetter: true, section: 'macro' },
  { label: 'Protein', key: 'protein', unit: 'g', section: 'macro' },
  { label: 'Carbs', key: 'carbs', unit: 'g', lowerIsBetter: true, section: 'macro' },
  { label: 'Fat', key: 'fat', unit: 'g', lowerIsBetter: true, section: 'macro' },
  { label: 'Fiber', key: 'fiber', unit: 'g', section: 'macro' },
  { label: 'Iron', key: 'iron', unit: 'mg', section: 'micro' },
  { label: 'Calcium', key: 'calcium', unit: 'mg', section: 'micro' },
  { label: 'Vitamin C', key: 'vitC', unit: 'mg', section: 'micro' },
];

/** Given an array of values, returns the index of the "winner" (or -1 if tied) */
export function getWinnerIndex(values: number[], lowerIsBetter?: boolean): number {
  if (values.length < 2) return -1;
  const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
  const winners = values.reduce<number[]>((acc, v, i) => { if (v === best) acc.push(i); return acc; }, []);
  return winners.length === 1 ? winners[0] : -1;
}
