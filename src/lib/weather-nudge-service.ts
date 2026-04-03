// ============================================
// NutriLens AI – Context-Aware Nutrition Engine
// ============================================
// Combines weather, personal context, time, meal composition,
// and skin health to produce actionable, non-judgmental suggestions.
// Priority: protein gap > calorie gap > weather+meal > skin concern

import { getWeather, type WeatherData } from './weather-service';
import { getMealTags, getMealSkinTags } from './food-tags';
import { getDailyLog, getDailyTotals, getProfile, type FoodItem } from './store';
import { getMealTarget } from './meal-targets';

const NUDGE_FEEDBACK_KEY = 'nutrilens_nudge_feedback';

export interface WeatherNudge {
  id: string;
  message: string;
  icon: string;
  priority: number;              // 1 = highest
  type: 'hydration' | 'meal_suggestion' | 'weather_tip' | 'comfort' | 'protein_gap' | 'calorie_gap' | 'skin_tip';
  suggestedFoods?: Array<{ name: string; emoji: string; calories: number }>;
}

export interface NudgeFeedback {
  nudgeId: string;
  vote: 'up' | 'down';
  timestamp: number;
}

// ── Feedback Storage ──

export function getNudgeFeedback(): NudgeFeedback[] {
  try {
    const data = scopedGet(NUDGE_FEEDBACK_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveNudgeFeedback(nudgeId: string, vote: 'up' | 'down') {
  const feedback = getNudgeFeedback();
  const baseId = nudgeId.replace(/_\d+$/, '');
  const existing = feedback.findIndex(f => f.nudgeId.replace(/_\d+$/, '') === baseId);
  const entry: NudgeFeedback = { nudgeId, vote, timestamp: Date.now() };
  if (existing >= 0) feedback[existing] = entry;
  else feedback.push(entry);
  scopedSet(NUDGE_FEEDBACK_KEY, JSON.stringify(feedback.slice(-50)));
}

function isNudgeTypeDisliked(type: string): boolean {
  const feedback = getNudgeFeedback();
  const downvotes = feedback.filter(f => f.nudgeId.includes(type) && f.vote === 'down');
  return downvotes.length >= 3;
}

// ── Weather Classification ──
type WeatherClass = 'HOT' | 'COLD' | 'NORMAL';

function classifyWeather(feelsLike: number): WeatherClass {
  if (feelsLike > 34) return 'HOT';
  if (feelsLike < 18) return 'COLD';
  return 'NORMAL';
}

// ── Meal Classification ──
type MealClass = 'HEAVY' | 'LIGHT' | 'NORMAL';

function classifyMeal(loggedCal: number, targetCal: number): MealClass {
  if (targetCal <= 0) return 'NORMAL';
  if (loggedCal > targetCal * 1.3) return 'HEAVY';
  if (loggedCal < targetCal * 0.5) return 'LIGHT';
  return 'NORMAL';
}

// ── Main Engine ──

export function getWeatherNudge(mealItems?: FoodItem[]): WeatherNudge | null {
  const weather = getWeather();
  const profile = getProfile();
  const log = getDailyLog();
  const totals = getDailyTotals(log);
  const goal = profile?.goal || 'maintain';
  const dailyCalTarget = profile?.dailyCalories || 2000;
  const dailyProteinTarget = profile?.dailyProtein || 60;
  const remainingCal = dailyCalTarget - totals.eaten;
  const remainingProtein = dailyProteinTarget - totals.protein;

  const weatherClass = classifyWeather(weather.feelsLike);
  const nudges: WeatherNudge[] = [];

  // If we have meal items, compute meal-level gaps
  let mealCalGap = 0;
  let mealProteinGap = 0;
  let mealClass: MealClass = 'NORMAL';

  if (mealItems && mealItems.length > 0) {
    const mealCal = mealItems.reduce((s, f) => s + f.calories * f.quantity, 0);
    const mealProtein = mealItems.reduce((s, f) => s + f.protein * f.quantity, 0);

    // Determine meal type from time
    const h = new Date().getHours();
    const mealType = h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
    const target = profile ? getMealTarget(profile, mealType) : { calories: 500, protein: 25, carbs: 60, fat: 18 };

    mealCalGap = target.calories - mealCal;
    mealProteinGap = target.protein - mealProtein;
    mealClass = classifyMeal(mealCal, target.calories);
  }

  // ── Priority 1: Protein gap > 15g ──
  if (mealItems && mealProteinGap > 15 && !isNudgeTypeDisliked('protein_gap')) {
    const foods = weatherClass === 'HOT'
      ? [
          { name: 'Curd + Roasted Chana', emoji: '🥛', calories: 120 },
          { name: 'Lassi', emoji: '🥤', calories: 100 },
          { name: 'Paneer Salad', emoji: '🧀', calories: 150 },
        ]
      : weatherClass === 'COLD'
      ? [
          { name: 'Egg Bhurji', emoji: '🥚', calories: 180 },
          { name: 'Dal Tadka', emoji: '🍲', calories: 180 },
          { name: 'Chicken Soup', emoji: '🥣', calories: 120 },
        ]
      : [
          { name: 'Boiled Eggs (2)', emoji: '🥚', calories: 140 },
          { name: 'Greek Yogurt', emoji: '🥛', calories: 100 },
          { name: 'Soya Chunks', emoji: '🫘', calories: 170 },
        ];

    const msg = weatherClass === 'HOT'
      ? `You're low on protein (${Math.round(mealProteinGap)}g short). In this heat, try lighter options:`
      : weatherClass === 'COLD'
      ? `You need ${Math.round(mealProteinGap)}g more protein. Warm, protein-rich foods are perfect right now:`
      : `You're ${Math.round(mealProteinGap)}g short on protein. Try adding:`;

    nudges.push({
      id: `protein_gap_${Date.now()}`,
      message: msg,
      icon: '🎯',
      priority: 1,
      type: 'protein_gap',
      suggestedFoods: foods,
    });
  }

  // ── Priority 2: Calorie gap > 300 ──
  if (mealItems && mealCalGap > 300 && !isNudgeTypeDisliked('calorie_gap')) {
    const foods = weatherClass === 'COLD'
      ? [
          { name: 'Dal + Rice', emoji: '🍚', calories: 350 },
          { name: 'Vegetable Soup', emoji: '🥣', calories: 90 },
          { name: 'Paratha', emoji: '🫓', calories: 200 },
        ]
      : weatherClass === 'HOT'
      ? [
          { name: 'Curd Rice', emoji: '🍚', calories: 180 },
          { name: 'Fruit Bowl', emoji: '🍇', calories: 120 },
          { name: 'Buttermilk + Nuts', emoji: '🥛', calories: 150 },
        ]
      : [
          { name: 'Khichdi', emoji: '🍲', calories: 180 },
          { name: 'Peanut Butter Toast', emoji: '🍞', calories: 190 },
          { name: 'Banana + Nuts', emoji: '🍌', calories: 200 },
        ];

    nudges.push({
      id: `calorie_gap_${Date.now()}`,
      message: weatherClass === 'COLD'
        ? `You're under your energy target by ${Math.round(mealCalGap)} kcal. Warm foods can help:`
        : `You still need ${Math.round(mealCalGap)} kcal. Consider adding:`,
      icon: '⚡',
      priority: 2,
      type: 'calorie_gap',
      suggestedFoods: foods,
    });
  }

  // ── Priority 3: Weather + meal composition ──

  // HOT + HEAVY meal
  if (weatherClass === 'HOT' && mealItems && mealClass === 'HEAVY' && !isNudgeTypeDisliked('hot_heavy')) {
    nudges.push({
      id: `hot_heavy_${Date.now()}`,
      message: `That's a filling meal. Since it's hot (${weather.temperature}°C), adding something cooling may help:`,
      icon: '🌡️',
      priority: 3,
      type: 'meal_suggestion',
      suggestedFoods: [
        { name: 'Buttermilk', emoji: '🥛', calories: 40 },
        { name: 'Cucumber Salad', emoji: '🥗', calories: 45 },
      ],
    });
  }

  // HOT + no hydrating food in meal
  if (weatherClass === 'HOT' && mealItems && mealItems.length > 0) {
    const tags = getMealTags(mealItems);
    if (!tags.hasHydrating && !isNudgeTypeDisliked('hot_hydration')) {
      nudges.push({
        id: `hot_hydration_${Date.now()}`,
        message: `It's ${weather.temperature}°C today. Adding a hydrating item can help you stay cool:`,
        icon: '💧',
        priority: 3,
        type: 'hydration',
        suggestedFoods: [
          { name: 'Buttermilk', emoji: '🥛', calories: 40 },
          { name: 'Coconut Water', emoji: '🥥', calories: 45 },
          { name: 'Cucumber Raita', emoji: '🥒', calories: 65 },
        ],
      });
    }
  }

  // Missed meal + HOT
  if (mealItems && mealItems.length === 0 && weatherClass === 'HOT' && !isNudgeTypeDisliked('missed_hot')) {
    nudges.push({
      id: `missed_hot_${Date.now()}`,
      message: `You missed a meal. In this heat, try something light:`,
      icon: '☀️',
      priority: 3,
      type: 'meal_suggestion',
      suggestedFoods: [
        { name: 'Fruit Bowl', emoji: '🍇', calories: 120 },
        { name: 'Buttermilk', emoji: '🥛', calories: 40 },
      ],
    });
  }

  // COLD weather comfort (dashboard)
  if (weatherClass === 'COLD' && !mealItems && !isNudgeTypeDisliked('cold_comfort')) {
    nudges.push({
      id: `cold_comfort_${Date.now()}`,
      message: `It's chilly at ${weather.temperature}°C. Warm soups or dal can keep you nourished and cozy.`,
      icon: '🥣',
      priority: 3,
      type: 'comfort',
      suggestedFoods: [
        { name: 'Mixed Veg Soup', emoji: '🥣', calories: 90 },
        { name: 'Dal Tadka', emoji: '🍲', calories: 180 },
      ],
    });
  }

  // General hydration (hot afternoon, dashboard)
  if (weather.temperature > 30 && weather.timeOfDay === 'afternoon' && !mealItems && !isNudgeTypeDisliked('afternoon_water')) {
    const waterGap = (profile?.waterGoal || 8) - log.waterCups;
    if (waterGap > 3) {
      nudges.push({
        id: `afternoon_water_${Date.now()}`,
        message: `${weather.temperature}°C today. You've had ${log.waterCups} glasses – aim for ${waterGap} more to stay hydrated.`,
        icon: '💧',
        priority: 3,
        type: 'hydration',
      });
    }
  }

  // Light dinner suggestion (hot evening, dashboard)
  if (weather.temperature > 30 && weather.timeOfDay === 'evening' && remainingCal > 400 && (goal === 'lose' || goal === 'maintain') && !mealItems && !isNudgeTypeDisliked('light_dinner')) {
    nudges.push({
      id: `light_dinner_${Date.now()}`,
      message: `You have ${remainingCal} kcal left. A light dinner like khichdi or salad pairs well with tonight's warmth.`,
      icon: '🌙',
      priority: 3,
      type: 'meal_suggestion',
    });
  }

  // Monsoon immunity (dashboard)
  if (weather.season === 'monsoon' && !mealItems && !isNudgeTypeDisliked('monsoon_immunity')) {
    nudges.push({
      id: `monsoon_immunity_${Date.now()}`,
      message: `Rainy weather calls for warm, immunity-boosting foods. Try ginger tea or turmeric milk today.`,
      icon: '🌧️',
      priority: 3,
      type: 'weather_tip',
    });
  }

  // ── Priority 4: Skin-aware nudge ──
  const skinConcerns = (profile as any)?.skinConcerns;
  if (mealItems && mealItems.length > 0 && skinConcerns && !isNudgeTypeDisliked('skin_tip')) {
    const skinTags = getMealSkinTags(mealItems);
    const skinNudge = getSkinNudge(skinConcerns, skinTags, weatherClass);
    if (skinNudge) {
      nudges.push({ ...skinNudge, priority: 4 });
    }
  }

  // Return highest priority nudge
  if (nudges.length === 0) return null;
  nudges.sort((a, b) => a.priority - b.priority);
  return nudges[0];
}

// ── Skin Nudge Generator (Weather + Season Aware) ──
function getSkinNudge(
  concerns: Record<string, boolean | number | string[] | undefined>,
  mealSkinTags: Record<string, boolean>,
  weatherClass: WeatherClass
): WeatherNudge | null {
  const weather = getWeather();

  // Seasonal skin combos (higher specificity)
  if (concerns.acne && concerns.summerOily && weather.season === 'summer' && !mealSkinTags.goodForAcne) {
    return {
      id: `skin_summer_acne_${Date.now()}`,
      message: 'Summer heat worsens acne. Low-GI + cooling foods help:',
      icon: '☀️✨', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Cucumber Raita', emoji: '🥒', calories: 65 },
        { name: 'Green Tea (iced)', emoji: '🍵', calories: 5 },
        { name: 'Watermelon', emoji: '🍉', calories: 30 },
      ],
    };
  }

  if (concerns.dry && concerns.winterDry && weather.season === 'winter' && !mealSkinTags.goodForDrySkin) {
    return {
      id: `skin_winter_dry_${Date.now()}`,
      message: 'Winter dries skin. Healthy fats + vitamin E foods restore moisture:',
      icon: '❄️🧴', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Ghee + Bajra Roti', emoji: '🫓', calories: 200 },
        { name: 'Almonds', emoji: '🥜', calories: 80 },
        { name: 'Sweet Potato', emoji: '🍠', calories: 90 },
      ],
    };
  }

  // Weather-combined skin nudges
  if (concerns.oily && weatherClass === 'HOT' && !mealSkinTags.goodForOilySkin) {
    return {
      id: `skin_hot_oily_${Date.now()}`,
      message: 'Heat increases oil production. Zinc + hydrating foods help:',
      icon: '💧', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Pumpkin Seeds', emoji: '🎃', calories: 50 },
        { name: 'Coconut Water', emoji: '🥥', calories: 45 },
        { name: 'Cucumber', emoji: '🥒', calories: 15 },
      ],
    };
  }

  if (concerns.sensitive && weatherClass === 'HOT' && !mealSkinTags.goodForSensitive) {
    return {
      id: `skin_hot_sensitive_${Date.now()}`,
      message: 'Heat can irritate sensitive skin. Anti-inflammatory foods soothe:',
      icon: '🌸', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Coconut Water', emoji: '🥥', calories: 45 },
        { name: 'Curd', emoji: '🥛', calories: 60 },
        { name: 'Chamomile Tea', emoji: '🍵', calories: 2 },
      ],
    };
  }

  // Standard skin nudges (no weather combo)
  if (concerns.acne && !mealSkinTags.goodForAcne) {
    return {
      id: `skin_acne_${Date.now()}`,
      message: 'For clearer skin, zinc & antioxidant-rich foods reduce breakouts:',
      icon: '✨', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Pumpkin Seeds', emoji: '🎃', calories: 50 },
        { name: 'Amla', emoji: '🟢', calories: 15 },
        { name: 'Green Tea', emoji: '🍵', calories: 5 },
      ],
    };
  }
  if (concerns.oily && !mealSkinTags.goodForOilySkin) {
    return {
      id: `skin_oily_${Date.now()}`,
      message: 'Zinc-rich foods help control oil production naturally:',
      icon: '💧', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Chickpeas', emoji: '🫘', calories: 120 },
        { name: 'Cucumber', emoji: '🥒', calories: 15 },
        { name: 'Whole Grain Roti', emoji: '🫓', calories: 120 },
      ],
    };
  }
  if (concerns.dry && !mealSkinTags.goodForDrySkin) {
    const foods = weatherClass === 'COLD'
      ? [{ name: 'Ghee + Roti', emoji: '🫓', calories: 180 }, { name: 'Almonds', emoji: '🥜', calories: 80 }, { name: 'Til Ladoo', emoji: '🟤', calories: 110 }]
      : [{ name: 'Avocado', emoji: '🥑', calories: 80 }, { name: 'Flaxseeds', emoji: '🌾', calories: 40 }, { name: 'Coconut', emoji: '🥥', calories: 70 }];
    return {
      id: `skin_dry_${Date.now()}`,
      message: 'Omega-3 & vitamin E restore skin\'s moisture barrier:',
      icon: '🧴', type: 'skin_tip', priority: 4,
      suggestedFoods: foods,
    };
  }
  if (concerns.dull && !mealSkinTags.goodForGlow) {
    return {
      id: `skin_glow_${Date.now()}`,
      message: 'Vitamin C stimulates collagen for natural radiance:',
      icon: '✨', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Amla', emoji: '🟢', calories: 15 },
        { name: 'Orange', emoji: '🍊', calories: 45 },
        { name: 'Bell Pepper', emoji: '🫑', calories: 20 },
      ],
    };
  }
  if (concerns.pigmentation && !mealSkinTags.goodForPigmentation) {
    return {
      id: `skin_pigmentation_${Date.now()}`,
      message: 'Lycopene & antioxidants reduce melanin overproduction:',
      icon: '🌿', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Tomatoes', emoji: '🍅', calories: 20 },
        { name: 'Turmeric Milk', emoji: '🥛', calories: 80 },
        { name: 'Beetroot', emoji: '🟣', calories: 35 },
      ],
    };
  }
  if (concerns.sensitive && !mealSkinTags.goodForSensitive) {
    return {
      id: `skin_sensitive_${Date.now()}`,
      message: 'Anti-inflammatory foods calm reactive, irritated skin:',
      icon: '🌸', type: 'skin_tip', priority: 4,
      suggestedFoods: [
        { name: 'Turmeric', emoji: '🟡', calories: 10 },
        { name: 'Ginger Tea', emoji: '🫖', calories: 5 },
        { name: 'Oats', emoji: '🥣', calories: 120 },
      ],
    };
  }
  return null;
}

// ── Fallback nudges for when no rule triggers ──
function getFallbackNudge(weather: WeatherData): WeatherNudge {
  const fallbacks: Record<string, WeatherNudge> = {
    summer: {
      id: `summer_tip_${Date.now()}`, 
      message: `It's ${weather.temperature}°C today. Stay hydrated – coconut water or buttermilk are great choices.`, 
      icon: '☀️', priority: 4, type: 'hydration',
      suggestedFoods: [
        { name: 'Coconut Water', emoji: '🥥', calories: 45 },
        { name: 'Watermelon', emoji: '🍉', calories: 30 },
        { name: 'Buttermilk', emoji: '🥛', calories: 40 },
      ],
    },
    monsoon: {
      id: `monsoon_tip_${Date.now()}`,
      message: `Monsoon season! Warm soups and immunity-boosting foods like turmeric milk are perfect today.`,
      icon: '🌧️', priority: 4, type: 'weather_tip',
      suggestedFoods: [
        { name: 'Ginger Tea', emoji: '🍵', calories: 25 },
        { name: 'Turmeric Milk', emoji: '🥛', calories: 80 },
      ],
    },
    winter: {
      id: `winter_tip_${Date.now()}`,
      message: `Chilly at ${weather.temperature}°C. Warm dal, soups, or masala chai can keep you cozy.`,
      icon: '❄️', priority: 4, type: 'comfort',
      suggestedFoods: [
        { name: 'Masala Chai', emoji: '☕', calories: 60 },
        { name: 'Dal Tadka', emoji: '🍲', calories: 180 },
      ],
    },
    autumn: {
      id: `autumn_tip_${Date.now()}`,
      message: `Pleasant weather at ${weather.temperature}°C. A balanced meal with seasonal fruits keeps you energized.`,
      icon: '🍂', priority: 4, type: 'weather_tip',
      suggestedFoods: [
        { name: 'Seasonal Fruits', emoji: '🍎', calories: 60 },
        { name: 'Mixed Nuts', emoji: '🥜', calories: 170 },
      ],
    },
    spring: {
      id: `spring_tip_${Date.now()}`,
      message: `Warm spring day at ${weather.temperature}°C. Light, fresh meals with salads and yoghurt are ideal.`,
      icon: '🌸', priority: 4, type: 'meal_suggestion',
      suggestedFoods: [
        { name: 'Curd', emoji: '🥛', calories: 60 },
        { name: 'Fresh Salad', emoji: '🥗', calories: 45 },
      ],
    },
  };
  return fallbacks[weather.season] || fallbacks.summer;
}

// Dashboard-specific nudge — always returns a nudge
export function getDashboardWeatherNudge(): WeatherNudge {
  const nudge = getWeatherNudge();
  if (nudge) return nudge;
  return getFallbackNudge(getWeather());
}

// Camera/meal-specific nudge
export function getMealWeatherNudge(items: FoodItem[]): WeatherNudge | null {
  return getWeatherNudge(items);
}

// Meal detail nudge — uses meal-specific items and returns context-aware suggestion
export function getMealDetailNudge(mealItems: FoodItem[], mealType: string): WeatherNudge | null {
  if (mealItems.length === 0) return null;
  
  const weather = getWeather();
  const profile = getProfile();
  if (!profile) return null;

  const target = getMealTarget(profile, mealType);
  const loggedCal = mealItems.reduce((s, f) => s + f.calories * (f.quantity || 1), 0);
  const loggedProtein = mealItems.reduce((s, f) => s + f.protein * (f.quantity || 1), 0);
  const proteinGap = target.protein - loggedProtein;
  const calGap = target.calories - loggedCal;
  const weatherClass = classifyWeather(weather.feelsLike);
  const mealClass = classifyMeal(loggedCal, target.calories);

  // Priority 1: Protein gap
  if (proteinGap > 15) {
    const foods = weatherClass === 'HOT'
      ? [{ name: 'Curd + Chana', emoji: '🥛', calories: 120 }, { name: 'Paneer Salad', emoji: '🧀', calories: 150 }]
      : [{ name: 'Boiled Eggs', emoji: '🥚', calories: 140 }, { name: 'Dal', emoji: '🍲', calories: 180 }];
    return {
      id: `detail_protein_${Date.now()}`,
      message: `You're ${Math.round(proteinGap)}g short on protein.${weatherClass === 'HOT' ? ' Try lighter protein sources in this heat:' : ' Try adding:'}`,
      icon: '🎯', priority: 1, type: 'protein_gap', suggestedFoods: foods,
    };
  }

  // Priority 2: Calorie gap
  if (calGap > 300) {
    const foods = weatherClass === 'COLD'
      ? [{ name: 'Dal + Rice', emoji: '🍚', calories: 350 }, { name: 'Soup', emoji: '🥣', calories: 90 }]
      : [{ name: 'Khichdi', emoji: '🍲', calories: 180 }, { name: 'Fruit + Nuts', emoji: '🍌', calories: 200 }];
    return {
      id: `detail_calorie_${Date.now()}`,
      message: `You still need ${Math.round(calGap)} kcal for this meal.${weatherClass === 'COLD' ? ' Warm options work great:' : ''}`,
      icon: '⚡', priority: 2, type: 'calorie_gap', suggestedFoods: foods,
    };
  }

  // Priority 3: Weather context
  if (weatherClass === 'HOT' && mealClass === 'HEAVY') {
    return {
      id: `detail_hot_heavy_${Date.now()}`,
      message: `That's a filling meal. Since it's ${weather.temperature}°C, something cooling may help:`,
      icon: '🌡️', priority: 3, type: 'meal_suggestion',
      suggestedFoods: [{ name: 'Buttermilk', emoji: '🥛', calories: 40 }, { name: 'Cucumber', emoji: '🥒', calories: 15 }],
    };
  }

  if (weatherClass === 'HOT') {
    const tags = getMealTags(mealItems);
    if (!tags.hasHydrating) {
      return {
        id: `detail_hydration_${Date.now()}`,
        message: `It's ${weather.temperature}°C. Consider a hydrating addition:`,
        icon: '💧', priority: 3, type: 'hydration',
        suggestedFoods: [{ name: 'Buttermilk', emoji: '🥛', calories: 40 }, { name: 'Coconut Water', emoji: '🥥', calories: 45 }],
      };
    }
  }

  return null; // No nudge if nothing relevant
}
