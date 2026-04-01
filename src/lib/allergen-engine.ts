import { ALLERGEN_KEYWORDS, SEVERE_ALLERGENS } from './allergen-tags';

export interface AllergenCheckResult {
  hasConflict: boolean;
  matched: string[]; // e.g. ["dairy", "gluten"]
}

/**
 * Check if a food name (and optional explicit allergens) contains any of the user's declared allergens.
 * Checks explicit tags first, then falls back to keyword-based detection.
 */
export function checkAllergens(
  foodName: string,
  userAllergens: string[],
  explicitAllergens?: string[]
): AllergenCheckResult {
  if (!userAllergens || userAllergens.length === 0) {
    return { hasConflict: false, matched: [] };
  }

  const matched: string[] = [];

  // 1. Check explicit allergen tags first
  if (explicitAllergens && explicitAllergens.length > 0) {
    for (const allergen of explicitAllergens) {
      if (userAllergens.includes(allergen) && !matched.includes(allergen)) {
        matched.push(allergen);
      }
    }
  }

  // 2. Keyword fallback on food name
  if (foodName) {
    const nameLower = foodName.toLowerCase();
    for (const allergen of userAllergens) {
      if (matched.includes(allergen)) continue;
      const keywords = ALLERGEN_KEYWORDS[allergen];
      if (!keywords) continue;

      for (const keyword of keywords) {
        if (nameLower.includes(keyword.toLowerCase())) {
          matched.push(allergen);
          break;
        }
      }
    }
  }

  return {
    hasConflict: matched.length > 0,
    matched: [...new Set(matched)],
  };
}

/**
 * Check if any matched allergens are severe (life-threatening).
 */
export function hasSevereAllergen(matched: string[]): boolean {
  return matched.some(a => SEVERE_ALLERGENS.includes(a));
}

/**
 * Get a user-friendly label for an allergen category.
 */
export function getAllergenLabel(allergen: string): string {
  const labels: Record<string, string> = {
    dairy: 'DAIRY',
    gluten: 'GLUTEN',
    nuts: 'NUTS',
    peanuts: 'PEANUTS',
    soy: 'SOY',
    eggs: 'EGGS',
    shellfish: 'SHELLFISH',
    mustard: 'MUSTARD',
    sesame: 'SESAME',
    fish: 'FISH',
  };
  return labels[allergen] || allergen.toUpperCase();
}

/**
 * Get emoji for allergen.
 */
export function getAllergenEmoji(allergen: string): string {
  const emojis: Record<string, string> = {
    dairy: '🥛',
    gluten: '🌾',
    nuts: '🥜',
    peanuts: '🥜',
    soy: '🫘',
    eggs: '🥚',
    shellfish: '🦐',
    mustard: '🟡',
    sesame: '⚪',
    fish: '🐟',
  };
  return emojis[allergen] || '⚠️';
}
