// ─── Budget + Health + Plan + Weather-Aware Meal Suggestion Engine ───

import { recipes, getEnrichedRecipe, type Recipe, type EnrichedRecipe } from './recipes';
import { getEffectiveRestrictions } from './logic-engine';
import { getDailyLog, getTodayKey, type UserProfile } from './store';
import { computePES } from './pes-engine';
import { getUnifiedBudget, getUnifiedRemainingMealBudget } from './budget-engine';
import { getPantryItems, type PantryItem } from './pantry-store';
import { getActivePlan } from './event-plan-service';
import { detectSugar, isSugarDetectionActive } from './sugar-detector';
import { getWeather } from './weather-service';
import { getTagsForFood } from './food-tags';

export interface SuggestedRecipe extends EnrichedRecipe {
  matchReason?: string;
  rankScore: number;
  pantryMatchRatio?: number;
  pantryMatchCount?: number;
  totalIngredientCount?: number;
  planCompliant?: boolean;
  weatherBoost?: boolean;
  workoutTiming?: 'pre' | 'post' | 'rest';
  contextBadge?: string;
}

/**
 * Get the remaining budget for a specific meal slot today.
 */
export function getRemainingMealBudget(mealType: string): number {
  return getUnifiedRemainingMealBudget(mealType);
}

/**
 * Check how many recipe ingredients are available in the pantry.
 */
function computePantryMatch(recipe: EnrichedRecipe, pantryItems: PantryItem[]): { ratio: number; matched: number; total: number } {
  if (!recipe.ingredients || recipe.ingredients.length === 0) return { ratio: 0, matched: 0, total: 0 };
  
  const pantryNames = pantryItems
    .filter(p => p.quantity > 0)
    .map(p => p.name.toLowerCase());
  
  let matched = 0;
  for (const ing of recipe.ingredients) {
    const ingName = ing.name.toLowerCase();
    const found = pantryNames.some(pn => 
      pn.includes(ingName) || ingName.includes(pn) ||
      ingName.split(/\s+/).some(w => w.length > 2 && pantryNames.some(pn2 => pn2.includes(w)))
    );
    if (found) matched++;
  }
  
  return {
    ratio: recipe.ingredients.length > 0 ? matched / recipe.ingredients.length : 0,
    matched,
    total: recipe.ingredients.length,
  };
}

/**
 * Get recipe suggestions for a meal slot, ranked by satiety + budget + health + pantry.
 */
export function getRecipesForMeal(
  mealType: string,
  maxCost: number,
  profile: UserProfile | null,
  remainingCalories?: number,
  remainingProtein?: number,
): SuggestedRecipe[] {
  const restrictions = getEffectiveRestrictions(profile);
  const dietPrefs = profile?.dietaryPrefs || [];
  const pantryItems = getPantryItems();
  const activePlan = getActivePlan();
  const sugarActive = isSugarDetectionActive();
  const weather = getWeather();

  const enriched = recipes
    .filter(r => r.mealType.includes(mealType as any))
    .map(r => getEnrichedRecipe(r));

  let filtered = enriched.filter(r => {
    if (maxCost > 0 && r.estimatedCost > maxCost) return false;

    const allText = [r.name.toLowerCase(), ...r.tags.map(t => t.toLowerCase()), ...r.ingredients.map(i => i.name.toLowerCase())].join(' ');
    if (restrictions.avoid.some(kw => allText.includes(kw.toLowerCase()))) return false;

    // Plan-specific filters
    if (sugarActive) {
      const sugarCheck = detectSugar(r.name);
      if (sugarCheck.hasSugar && sugarCheck.severity === 'high') return false;
    }
    if (activePlan?.planId === 'gym_fat_loss') {
      if (r.carbs > 40) return false;
    }
    // Celebrity plan: low-carb evenings
    if (activePlan?.planId === 'celebrity_transformation' && mealType === 'dinner') {
      if (r.carbs > 25) return false;
    }

    // Madhavan plan filters
    if (activePlan?.planId === 'madhavan_21_day') {
      // Home-cooked only — exclude restaurant/junk/fast_food/processed
      const junkTags = ['restaurant', 'junk', 'processed', 'fast_food'];
      if (r.tags.some(t => junkTags.includes(t.toLowerCase()))) return false;
      // No raw food after 3 PM for dinner/snack slots
      const isAfternoonSlot = mealType === 'dinner' || mealType === 'snack';
      if (isAfternoonSlot && r.tags.some(t => t.toLowerCase() === 'raw')) return false;
    }

    // Event-based plan filters
    const eventSettings = (activePlan as unknown as Record<string, unknown>)?.eventSettings as Record<string, string> | undefined;
    if (activePlan?.planId === 'event_based' && eventSettings) {
      const es = eventSettings;
      if (es.cookingTime === 'none' && r.difficulty !== 'beginner') return false;
      if (es.cookingTime === 'limited' && r.difficulty === 'advanced') return false;
      if (es.budgetTier === 'tight' && r.estimatedCost > 80) return false;
      if (es.goalType === 'tummy') {
        const gasFoods = ['rajma', 'chole', 'chickpea', 'kidney bean', 'cabbage'];
        if (gasFoods.some(g => r.name.toLowerCase().includes(g))) return false;
      }
    }

    if (dietPrefs.includes('vegetarian') || dietPrefs.includes('veg')) {
      if (!r.tags.some(t => ['vegetarian', 'veg'].includes(t.toLowerCase()))) return false;
    }
    if (dietPrefs.includes('vegan')) {
      if (!r.tags.some(t => t.toLowerCase() === 'vegan')) return false;
    }
    if (dietPrefs.includes('keto')) {
      if (r.carbs > 20) return false;
    }

    if (profile?.cookingHabits === 'none' || profile?.cookingHabits === 'minimal') {
      if (r.difficulty === 'advanced') return false;
    }

    return true;
  });

  // Check if today is a gym workout day (for protein boost)
  const todayLog = getDailyLog(getTodayKey());
  const isWorkoutDay = todayLog?.gym?.attended === true;

  // Account for supplement protein already logged today
  const supplementProteinLogged = (todayLog?.supplements || []).reduce((s, sup) => s + (sup.protein || 0), 0);
  const adjustedRemainingProtein = remainingProtein ? Math.max(0, remainingProtein - supplementProteinLogged) : remainingProtein;

  // Compute rank score using unified PES engine + pantry + plan + weather bonuses
  const scored: SuggestedRecipe[] = filtered.map(r => {
    const allText = [r.name.toLowerCase(), ...r.tags, ...r.ingredients.map(i => i.name.toLowerCase())].join(' ');
    const prefMatches = restrictions.prefer.filter(kw => allText.includes(kw.toLowerCase()));

    // Boost protein target by 10% on workout days
    const effectiveProtein = isWorkoutDay && adjustedRemainingProtein ? Math.round(adjustedRemainingProtein * 1.1) : adjustedRemainingProtein;

    const baseScore = computePES(r, {
      targetCalories: remainingCalories,
      budgetPerMeal: maxCost > 0 ? maxCost : undefined,
    });
    
    // Pantry match bonus
    const pantryMatch = computePantryMatch(r, pantryItems);
    const pantryBonus = pantryMatch.ratio * 30;

    // Plan-specific bonus + workout timing
    let planBonus = 0;
    let planCompliant = true;
    let workoutTiming: 'pre' | 'post' | 'rest' | undefined;
    if (activePlan) {
      if (activePlan.planId === 'gym_fat_loss' || activePlan.planId === 'celebrity_transformation') {
        if (r.protein >= 20) planBonus += 15;
        if (r.protein >= 30) planBonus += 10;
      }
      if (activePlan.planId === 'gym_muscle_gain') {
        if (r.calories >= 300 && r.protein >= 20) planBonus += 15;
      }
      // Gym nutrient timing nudges
      if (activePlan.planId === 'gym_fat_loss' || activePlan.planId === 'gym_muscle_gain') {
        const isPreSlot = mealType === 'breakfast' || mealType === 'lunch';
        const isPostSlot = mealType === 'snack' || mealType === 'dinner';
        if (isPreSlot && r.carbs >= 20 && r.protein >= 10) {
          workoutTiming = 'pre';
          planBonus += 10;
        } else if (isPostSlot && r.protein >= 20) {
          workoutTiming = 'post';
          planBonus += 12;
        }
      }
      // Celebrity low-carb evening compliance badge
      if (activePlan.planId === 'celebrity_transformation' && mealType === 'dinner' && r.carbs <= 25) {
        planBonus += 8;
      }
      // Madhavan plan boosts
      if (activePlan.planId === 'madhavan_21_day') {
        const madhavanBoostTags = ['leafy_greens', 'home_cooked', 'millet', 'fermented'];
        const hasBoostTag = r.tags.some(t => madhavanBoostTags.includes(t.toLowerCase()));
        if (hasBoostTag) planBonus += 15;
        // Boost healthy oils
        const healthyOils = ['coconut oil', 'sesame oil', 'til oil', 'nariyal tel'];
        const hasHealthyOil = r.ingredients.some(i => healthyOils.some(o => i.name.toLowerCase().includes(o)));
        if (hasHealthyOil) planBonus += 8;
        // Protein targets for Madhavan
        if (r.protein >= 15) planBonus += 10;
      }
      // Event-based plan boosts
      if (activePlan.planId === 'event_based' && activePlan.eventSettings) {
        const es = activePlan.eventSettings;
        if (r.protein >= 15) planBonus += 8;
        if (es.goalType === 'tummy' && r.tags.some(t => ['high_fiber', 'low_bloat'].includes(t.toLowerCase()))) planBonus += 12;
        if (es.budgetTier === 'tight') planBonus += (r.estimatedCost < 50 ? 10 : 0);
        // Boost superfoods
        const superfoods = ['makhana', 'sattu', 'chia', 'oats', 'sprout', 'moong'];
        if (superfoods.some(s => r.name.toLowerCase().includes(s))) planBonus += 10;
      }
      if (sugarActive) {
        const sugarCheck = detectSugar(r.name);
        if (sugarCheck.hasSugar) {
          planCompliant = false;
          planBonus -= 20;
        }
      }
    }

    // Gym workout day: boost high-protein recipes
    let gymBonus = 0;
    if (isWorkoutDay) {
      if (r.protein >= 20) { gymBonus += 15; }
      if (r.protein >= 30) { gymBonus += 5; }
    }

    // Weather-based scoring
    let weatherBonus = 0;
    let weatherBoost = false;
    const foodTags = getTagsForFood(r.name);
    const temp = weather.temperature;
    const season = weather.season;

    if (temp > 34 || season === 'summer') {
      if (foodTags.isHydrating || foodTags.isLight) { weatherBonus += 15; weatherBoost = true; }
      if (foodTags.isHeavy) weatherBonus -= 10;
    } else if (temp < 18 || season === 'winter') {
      if (foodTags.isHeavy || !foodTags.isLight) weatherBonus += 10;
      if (foodTags.isHydrating && foodTags.isLight) weatherBonus -= 5;
      weatherBoost = weatherBonus > 0;
    } else if (season === 'monsoon') {
      // Boost immunity foods, warn raw salads
      const immunityKeywords = ['turmeric', 'ginger', 'adrak', 'haldi', 'soup', 'dal'];
      const hasImmunity = immunityKeywords.some(k => r.name.toLowerCase().includes(k));
      if (hasImmunity) { weatherBonus += 12; weatherBoost = true; }
      if (r.name.toLowerCase().includes('salad') && r.tags.some(t => t.toLowerCase() === 'raw')) {
        weatherBonus -= 15;
      }
    }

    // ── Context-aware scoring (occupation/lifestyle) ──
    let contextBonus = 0;
    let contextBadge: string | undefined;

    if (profile) {
      const travelFreq = profile.travelFrequency || '';
      const workFacilities: string[] = profile.workplaceFacilities || [];
      const cooking = (profile.cookingHabits || '').toLowerCase();

      // Travelers get boost for portable meals
      if (travelFreq === 'often' && r.tags.some(t => ['portable', 'no_cook', 'wrap', 'roll'].includes(t.toLowerCase()))) {
        contextBonus += 15;
        if (!contextBadge) contextBadge = '🚗 Travel-friendly';
      }

      // No microwave at work — boost no-reheat
      if (workFacilities.length > 0 && !workFacilities.includes('microwave') && !r.tags.some(t => t.toLowerCase() === 'needs_reheat')) {
        contextBonus += 8;
        if (!contextBadge) contextBadge = '❄️ No reheat needed';
      }

      // No-cook preference
      if ((cooking === 'none' || cooking === 'minimal') && r.tags.some(t => ['no_cook', 'no-cook', 'quick', 'instant'].includes(t.toLowerCase()))) {
        contextBonus += 20;
        if (!contextBadge) contextBadge = '⚡ Zero-cook';
      }

      // #11 — Kitchen appliance filtering
      const kitchenApps: string[] = profile.kitchenAppliances || [];
      if (kitchenApps.length > 0) {
        // Boost air fryer recipes if user has one
        if (kitchenApps.includes('air_fryer') && r.tags.some(t => ['grilled', 'roasted', 'air-fried'].includes(t.toLowerCase()))) {
          contextBonus += 8;
        }
        // If no oven, penalize oven-required recipes
        if (!kitchenApps.includes('oven') && r.tags.some(t => t.toLowerCase() === 'baked')) {
          contextBonus -= 10;
        }
      }

      // Weather badges
      if ((temp > 34 || season === 'summer') && (foodTags.isHydrating || foodTags.isLight)) {
        if (!contextBadge) contextBadge = '🌡️ Cooling';
      }
      if ((temp < 18 || season === 'winter') && (foodTags.isHeavy || r.tags.some(t => ['soup', 'warm', 'hot'].includes(t.toLowerCase())))) {
        if (!contextBadge) contextBadge = '🧣 Warming';
      }
    }

    const rankScore = baseScore + (prefMatches.length * 0.05) + pantryBonus + planBonus + weatherBonus + contextBonus + gymBonus;

    // Build match reason
    let matchReason: string | undefined;
    if (pantryMatch.ratio > 0.5) {
      matchReason = `🏠 ${pantryMatch.matched}/${pantryMatch.total} ingredients at home`;
    } else if (workoutTiming === 'pre') {
      matchReason = `💪 Great pre-workout meal`;
    } else if (workoutTiming === 'post') {
      matchReason = `🏋️ Ideal post-workout recovery`;
    } else if (activePlan?.planId === 'celebrity_transformation' && mealType === 'dinner' && r.carbs <= 25) {
      matchReason = `🌙 Low-carb evening compliant`;
    } else if (contextBadge) {
      matchReason = contextBadge;
    } else if (weatherBoost) {
      matchReason = `${weather.icon} Great for ${weather.season} weather`;
    } else if (planCompliant && activePlan) {
      matchReason = `✅ Plan-compliant`;
    } else if (prefMatches.length > 0) {
      matchReason = `Has ${prefMatches.slice(0, 2).join(', ')}`;
    }

    return {
      ...r,
      nutritionScore: Math.min(10, r.nutritionScore + prefMatches.length),
      matchReason,
      rankScore,
      pantryMatchRatio: pantryMatch.ratio,
      pantryMatchCount: pantryMatch.matched,
      totalIngredientCount: pantryMatch.total,
      planCompliant,
      weatherBoost,
      workoutTiming,
      contextBadge,
    };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore);
  return scored.slice(0, 5);
}

/**
 * Get the current meal slot based on time of day.
 */
export function getCurrentMealSlot(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}

/**
 * Get upcoming meal slots that haven't been logged yet.
 */
export function getUpcomingMealSlots(): string[] {
  const current = getCurrentMealSlot();
  const order = ['breakfast', 'lunch', 'snack', 'dinner'];
  const idx = order.indexOf(current);
  const upcoming = order.slice(idx);

  const today = getTodayKey();
  const log = getDailyLog(today);

  return upcoming.filter(slot => {
    const logged = log.meals.filter(m => m.type === slot);
    return logged.length === 0;
  });
}
