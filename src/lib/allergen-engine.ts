import { ALLERGEN_KEYWORDS } from './allergen-tags';

export interface AllergenCheckResult {
  hasConflict: boolean;
  matched: string[]; // e.g. ["dairy", "gluten"]
}

/**
 * Check if a food name contains any of the user's declared allergens.
 * Uses keyword-based detection (case-insensitive, multi-word).
 */
export function checkAllergens(
  foodName: string,
  userAllergens: string[]
): AllergenCheckResult {
  if (!foodName || !userAllergens || userAllergens.length === 0) {
    return { hasConflict: false, matched: [] };
  }

  const nameLower = foodName.toLowerCase();
  const matched: string[] = [];

  for (const allergen of userAllergens) {
    const keywords = ALLERGEN_KEYWORDS[allergen];
    if (!keywords) continue;

    for (const keyword of keywords) {
      if (nameLower.includes(keyword.toLowerCase())) {
        matched.push(allergen);
        break; // one match per allergen category is enough
      }
    }
  }

  return {
    hasConflict: matched.length > 0,
    matched: [...new Set(matched)],
  };
}

/**
 * Get a user-friendly label for an allergen category.
 */
export function getAllergenLabel(allergen: string): string {
  const labels: Record<string, string> = {
    dairy: 'DAIRY',
    gluten: 'GLUTEN',
    nuts: 'NUTS',
    soy: 'SOY',
    eggs: 'EGGS',
    shellfish: 'SHELLFISH',
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
    soy: '🫘',
    eggs: '🥚',
    shellfish: '🦐',
  };
  return emojis[allergen] || '⚠️';
}
