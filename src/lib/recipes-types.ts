// ============================================
// NutriLens AI – Recipe Type Definitions
// ============================================
// Shared types used by both recipes.ts (helpers) and recipes-data.ts (data).
// Kept separate to avoid circular imports.

export interface Recipe {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  mealType: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  prepTime: number; // minutes
  cookTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  servings: number;
  tags: string[];
  ingredients: { name: string; quantity: string; category: string }[];
  steps: string[];
  tips?: string;
  emoji: string;
  // Extended metadata
  estimatedCost?: number;
  suitableFor?: string[];
  avoidFor?: string[];
  nutritionScore?: number;
  volumeFactor?: number; // 1-5 (1=low volume like chips, 5=high volume like soup)
}

export interface EnrichedRecipe extends Recipe {
  estimatedCost: number;
  nutritionScore: number;
  satietyScore: number;
  proteinPerRupee: number;
}
