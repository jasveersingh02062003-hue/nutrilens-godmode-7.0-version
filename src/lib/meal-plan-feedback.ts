// ─── Meal Plan Feedback & Learning Loop ───

const FEEDBACK_KEY = 'nutrilens_meal_plan_feedback';

export interface MealPlanFeedbackEntry {
  recipeId: string;
  eaten: boolean;
  liked: boolean;
  swapped: boolean;
  date: string;
}

interface FeedbackStore {
  entries: MealPlanFeedbackEntry[];
}

function getStore(): FeedbackStore {
  const data = scopedGet(FEEDBACK_KEY);
  return data ? JSON.parse(data) : { entries: [] };
}

function saveStore(store: FeedbackStore) {
  // Keep last 200 entries
  store.entries = store.entries.slice(-200);
  scopedSet(FEEDBACK_KEY, JSON.stringify(store));
}

export function saveMealPlanFeedback(recipeId: string, feedback: { eaten: boolean; liked: boolean; swapped: boolean }) {
  const store = getStore();
  store.entries.push({
    recipeId,
    ...feedback,
    date: new Date().toISOString().split('T')[0], // timestamp-style date, not date-key critical
  });
  saveStore(store);
}

export interface MealPreferences {
  likedRecipeIds: string[];
  dislikedRecipeIds: string[];
  skippedRecipeIds: string[];
}

export function getMealPreferences(): MealPreferences {
  const store = getStore();
  const counts: Record<string, { liked: number; disliked: number; skipped: number }> = {};

  for (const entry of store.entries) {
    if (!counts[entry.recipeId]) counts[entry.recipeId] = { liked: 0, disliked: 0, skipped: 0 };
    if (entry.liked) counts[entry.recipeId].liked++;
    if (!entry.eaten && !entry.swapped) counts[entry.recipeId].skipped++;
    if (entry.eaten && !entry.liked) counts[entry.recipeId].disliked++;
  }

  const likedRecipeIds: string[] = [];
  const dislikedRecipeIds: string[] = [];
  const skippedRecipeIds: string[] = [];

  for (const [id, c] of Object.entries(counts)) {
    if (c.liked >= 2) likedRecipeIds.push(id);
    if (c.disliked >= 2) dislikedRecipeIds.push(id);
    if (c.skipped >= 3) skippedRecipeIds.push(id);
  }

  return { likedRecipeIds, dislikedRecipeIds, skippedRecipeIds };
}

/**
 * Get a score modifier for a recipe based on user feedback history.
 * Positive = boost, Negative = penalize.
 */
export function getFeedbackScoreModifier(recipeId: string): number {
  const prefs = getMealPreferences();
  if (prefs.likedRecipeIds.includes(recipeId)) return 0.15;
  if (prefs.dislikedRecipeIds.includes(recipeId)) return -0.3;
  if (prefs.skippedRecipeIds.includes(recipeId)) return -0.15;
  return 0;
}
