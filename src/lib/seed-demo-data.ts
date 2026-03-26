// Seed 30 days of realistic stress-test data for calorie engine validation
// Dataset: Riya Sharma — messy real-world behavior (binges, recovery, weekends)
import type { UserProfile, DailyLog, MealEntry, FoodItem, BurnedData } from './store';
import type { WeekPlan, DayPlan, PlannedMeal, MealPlannerProfile } from './meal-planner-store';
import type { WeightEntry } from './weight-history';
import type { ProgressPhoto } from './store';
import { computeAdjustedTarget, type DailyBalanceEntry } from './calorie-correction';

const PROFILE_KEY = 'nutrilens_profile';
const LOG_KEY_PREFIX = 'nutrilens_log_';
const BANK_KEY = 'nutrilens_calorie_bank';
const WEIGHT_HISTORY_KEY = 'nutrilens_weight_history';
const STREAKS_KEY = 'nutrilens_streaks';
const PLANNER_PROFILE_KEY = 'nutrilens_meal_planner_profile';
const WEEK_PLAN_KEY_PREFIX = 'nutrilens_week_plan_';
const USER_KEY = 'nutrilens_user';
const PHOTOS_KEY = 'nutrilens_progress_photos';

// ─── Stress-test dataset (Feb 25 → Mar 25, 2026) ───
const STRESS_DATASET: Array<{ date: string; actualCalories: number }> = [
  { date: '2026-02-25', actualCalories: 1750 },
  { date: '2026-02-26', actualCalories: 1820 },
  { date: '2026-02-27', actualCalories: 2100 },
  { date: '2026-02-28', actualCalories: 2400 },
  { date: '2026-03-01', actualCalories: 1600 },
  { date: '2026-03-02', actualCalories: 1700 },
  { date: '2026-03-03', actualCalories: 1900 },
  { date: '2026-03-04', actualCalories: 2500 },
  { date: '2026-03-05', actualCalories: 1500 },
  { date: '2026-03-06', actualCalories: 1650 },
  { date: '2026-03-07', actualCalories: 2200 },
  { date: '2026-03-08', actualCalories: 2600 },
  { date: '2026-03-09', actualCalories: 1550 },
  { date: '2026-03-10', actualCalories: 1700 },
  { date: '2026-03-11', actualCalories: 1850 },
  { date: '2026-03-12', actualCalories: 2300 },
  { date: '2026-03-13', actualCalories: 1400 },
  { date: '2026-03-14', actualCalories: 2000 },
  { date: '2026-03-15', actualCalories: 2700 },
  { date: '2026-03-16', actualCalories: 1500 },
  { date: '2026-03-17', actualCalories: 1600 },
  { date: '2026-03-18', actualCalories: 1750 },
  { date: '2026-03-19', actualCalories: 2400 },
  { date: '2026-03-20', actualCalories: 1550 },
  { date: '2026-03-21', actualCalories: 2100 },
  { date: '2026-03-22', actualCalories: 2800 },
  { date: '2026-03-23', actualCalories: 1600 },
  { date: '2026-03-24', actualCalories: 1700 },
  { date: '2026-03-25', actualCalories: 2200 },
];

const BASE_TARGET = 1800;

// ─── Food photos by meal type ───
const MEAL_PHOTOS: Record<string, string[]> = {
  breakfast: [
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
  ],
  lunch: [
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  ],
  dinner: [
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
  ],
  snack: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&h=300&fit=crop',
  ],
};

// ─── Indian food items for meal generation ───
const FOOD_POOL = {
  breakfast: [
    { name: 'Poha', cal: 250, p: 5, c: 40, f: 8, emoji: '🍚' },
    { name: 'Paratha', cal: 300, p: 7, c: 35, f: 15, emoji: '🫓' },
    { name: 'Idli', cal: 150, p: 4, c: 28, f: 1, emoji: '🫓' },
    { name: 'Upma', cal: 220, p: 5, c: 32, f: 8, emoji: '🍚' },
    { name: 'Oats', cal: 200, p: 7, c: 35, f: 4, emoji: '🥣' },
    { name: 'Moong Dal Chilla', cal: 180, p: 12, c: 22, f: 4, emoji: '🫓' },
    { name: 'Chai', cal: 60, p: 2, c: 8, f: 2, emoji: '☕' },
    { name: 'Coffee', cal: 80, p: 2, c: 10, f: 3, emoji: '☕' },
    { name: 'Curd', cal: 80, p: 4, c: 5, f: 4, emoji: '🥛' },
    { name: 'Lassi', cal: 180, p: 6, c: 22, f: 7, emoji: '🥛' },
  ],
  lunch: [
    { name: 'Dal Rice', cal: 400, p: 15, c: 55, f: 10, emoji: '🍛' },
    { name: 'Rajma Rice', cal: 420, p: 16, c: 58, f: 10, emoji: '🍛' },
    { name: 'Biryani', cal: 550, p: 20, c: 65, f: 18, emoji: '🍚' },
    { name: 'Chole Bhature', cal: 520, p: 16, c: 55, f: 24, emoji: '🍛' },
    { name: 'Chicken Rice Bowl', cal: 480, p: 32, c: 50, f: 12, emoji: '🍗' },
    { name: 'Butter Chicken + Naan', cal: 710, p: 37, c: 52, f: 38, emoji: '🍗' },
    { name: 'Sabzi', cal: 120, p: 4, c: 12, f: 6, emoji: '🥗' },
    { name: 'Raita', cal: 60, p: 3, c: 4, f: 3, emoji: '🥛' },
    { name: 'Salad Bowl', cal: 280, p: 12, c: 20, f: 14, emoji: '🥗' },
  ],
  dinner: [
    { name: 'Roti + Paneer Sabzi', cal: 340, p: 18, c: 28, f: 19, emoji: '🧀' },
    { name: 'Roti + Chicken Curry', cal: 470, p: 32, c: 30, f: 25, emoji: '🍗' },
    { name: 'Khichdi', cal: 320, p: 12, c: 45, f: 8, emoji: '🍚' },
    { name: 'Dosa + Sambar', cal: 310, p: 10, c: 46, f: 9, emoji: '🫓' },
    { name: 'Fish Curry + Rice', cal: 460, p: 27, c: 46, f: 19, emoji: '🐟' },
    { name: 'Paneer Tikka + Roti', cal: 440, p: 24, c: 28, f: 27, emoji: '🧀' },
    { name: 'Egg Bhurji + Roti', cal: 320, p: 18, c: 24, f: 17, emoji: '🥚' },
    { name: 'Curd Rice', cal: 280, p: 8, c: 45, f: 6, emoji: '🍚' },
  ],
  snack: [
    { name: 'Apple + Peanuts', cal: 250, p: 7, c: 26, f: 14, emoji: '🍎' },
    { name: 'Samosa', cal: 250, p: 4, c: 25, f: 15, emoji: '🥟' },
    { name: 'Sprouts Chaat', cal: 150, p: 8, c: 18, f: 4, emoji: '🌱' },
    { name: 'Banana + Almonds', cal: 185, p: 4, c: 30, f: 7, emoji: '🍌' },
    { name: 'Makhana', cal: 100, p: 3, c: 18, f: 1, emoji: '🌸' },
    { name: 'Gulab Jamun', cal: 180, p: 2, c: 28, f: 7, emoji: '🍩' },
    { name: 'Protein Shake', cal: 150, p: 25, c: 8, f: 2, emoji: '🥤' },
    { name: 'Green Tea', cal: 5, p: 0, c: 1, f: 0, emoji: '🍵' },
  ],
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function food(item: typeof FOOD_POOL.breakfast[0], qty = 1): FoodItem {
  return {
    id: uid(), name: item.name, calories: item.cal, protein: item.p,
    carbs: item.c, fat: item.f, quantity: qty, unit: 'serving',
    emoji: item.emoji, confidenceScore: 0.9,
  };
}

/**
 * Generate meals that sum to the target calorie total.
 * Distributes: ~20% breakfast, ~35% lunch, ~10% snack, ~35% dinner.
 */
function generateMealsForCalories(totalCal: number, dayIndex: number): MealEntry[] {
  const bCal = Math.round(totalCal * 0.20);
  const lCal = Math.round(totalCal * 0.35);
  const sCal = Math.round(totalCal * 0.10);
  const dCal = totalCal - bCal - lCal - sCal;

  const pickItems = (pool: typeof FOOD_POOL.breakfast, targetCal: number): FoodItem[] => {
    const items: FoodItem[] = [];
    let remaining = targetCal;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const item of shuffled) {
      if (remaining <= 0) break;
      if (item.cal <= remaining + 50) {
        items.push(food(item));
        remaining -= item.cal;
      }
    }
    // If still short, adjust last item quantity
    if (items.length > 0 && Math.abs(remaining) > 30) {
      const last = items[items.length - 1];
      const scale = (last.calories + remaining) / last.calories;
      if (scale > 0.3) {
        last.quantity = Math.round(scale * 100) / 100;
      }
    }
    return items;
  };

  const makeMeal = (type: MealEntry['type'], items: FoodItem[], hour: number): MealEntry => {
    const totalCalories = items.reduce((s, i) => s + i.calories * i.quantity, 0);
    const totalProtein = items.reduce((s, i) => s + i.protein * i.quantity, 0);
    const totalCarbs = items.reduce((s, i) => s + i.carbs * i.quantity, 0);
    const totalFat = items.reduce((s, i) => s + i.fat * i.quantity, 0);
    const photos = MEAL_PHOTOS[type] || MEAL_PHOTOS.lunch;
    return {
      id: uid(), type, items,
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      time: `${hour.toString().padStart(2, '0')}:00`,
      photo: photos[dayIndex % photos.length],
      cost: { amount: Math.round(Math.random() * 80 + 20), currency: '₹' },
      source: { category: dayIndex % 3 === 0 ? 'restaurant' : 'home' },
    };
  };

  return [
    makeMeal('breakfast', pickItems(FOOD_POOL.breakfast, bCal), 8),
    makeMeal('lunch', pickItems(FOOD_POOL.lunch, lCal), 13),
    makeMeal('snack', pickItems(FOOD_POOL.snack, sCal), 16),
    makeMeal('dinner', pickItems(FOOD_POOL.dinner, dCal), 20),
  ];
}

function generateProfile(): UserProfile {
  return {
    name: 'Riya Sharma',
    gender: 'female',
    occupation: 'Product Manager',
    jobType: 'desk',
    workActivity: 'sedentary',
    exerciseRoutine: 'moderate',
    sleepHours: '7',
    stressLevel: 'moderate',
    cookingHabits: 'regular',
    eatingOut: 'sometimes',
    caffeine: '2 cups',
    alcohol: 'none',
    activityLevel: 'moderate',
    heightCm: 162,
    weightKg: 62,
    dob: '1998-05-10',
    age: 28,
    goal: 'lose',
    targetWeight: 52,
    goalSpeed: 0.5,
    dietaryPrefs: [],
    healthConditions: [],
    womenHealth: [],
    menHealth: {},
    medications: '',
    mealTimes: { breakfast: '08:00', lunch: '13:00', dinner: '20:00', snacks: '16:00' },
    waterGoal: 2500,
    onboardingComplete: true,
    dailyCalories: BASE_TARGET,
    trackingMode: 'flex',
    dailyProtein: 110,
    dailyCarbs: 200,
    dailyFat: 60,
    bmi: 23.6,
    bmr: 1400,
    tdee: 1950,
  };
}

function generateDailyLog(entry: { date: string; actualCalories: number }, dayIndex: number): DailyLog {
  const meals = generateMealsForCalories(entry.actualCalories, dayIndex);
  // Weight: gradual trend from 62.0 with fluctuations
  const baseWeight = 62.0 - (dayIndex * 0.04);
  const fluctuation = Math.sin(dayIndex * 1.3) * 0.3;
  const weight = Math.round((baseWeight + fluctuation) * 10) / 10;

  const waterCups = [6, 8, 5, 7, 8, 6, 4, 7, 8, 6, 7, 5, 8, 7, 6];
  const burned: BurnedData = {
    steps: Math.floor(Math.random() * 150 + 50),
    stepsCount: Math.floor(Math.random() * 5000 + 3000),
    activities: dayIndex % 3 === 0 ? [{
      id: uid(), type: 'Walking', duration: 30, intensity: 'moderate' as const,
      calories: 120, met: 3.5, source: 'manual' as const, time: '07:00',
    }] : [],
    total: Math.floor(Math.random() * 150 + 50),
  };
  if (burned.activities.length) {
    burned.total += burned.activities.reduce((s, a) => s + a.calories, 0);
  }

  return {
    date: entry.date,
    meals,
    supplements: dayIndex % 2 === 0 ? [{
      id: uid(), name: 'Vitamin D', brand: 'HealthKart', dosage: 1000,
      unit: 'IU', time: '08:00', calories: 0, protein: 0, carbs: 0, fat: 0,
      icon: '☀️', category: 'vitamin',
    }] : [],
    waterCups: waterCups[dayIndex % waterCups.length],
    caloriesBurned: burned.total,
    burned,
    weight,
    weightUnit: 'kg',
    progressPhotoIds: [],
  };
}

function generateWeightHistory(): WeightEntry[] {
  const entries: WeightEntry[] = [];
  const startWeight = 63.5;
  for (let week = 11; week >= 0; week--) {
    const daysAgo = week * 7;
    const d = new Date('2026-03-25');
    d.setDate(d.getDate() - daysAgo);
    const date = d.toISOString().split('T')[0];
    const loss = (11 - week) * 0.15;
    const fluctuation = Math.sin(week * 1.7) * 0.2;
    const weight = Math.round((startWeight - loss + fluctuation) * 10) / 10;
    entries.push({
      id: uid(), date, weekStart: getMonday(date), weight, unit: 'kg',
      photo: null, verified: true,
      note: week % 4 === 0 ? 'Monthly check-in 📊' : 'Weekly weigh-in',
      timestamp: new Date(date + 'T07:30:00').toISOString(),
    });
  }
  return entries;
}

function generateProgressPhotos(): ProgressPhoto[] {
  const photos: ProgressPhoto[] = [];
  const types: ProgressPhoto['type'][] = ['front', 'side', 'back', 'front', 'side', 'front'];
  const captions = ['Week 1 start 💪', 'Side view week 2', 'Back progress week 3', 'Week 5 front', 'Week 7 side check', 'Week 10 — feeling great! 🎉'];
  const colors = ['#E8D5B7', '#D4C4A8', '#C9B99A', '#BFB08E', '#B5A782', '#AB9E76'];
  for (let i = 0; i < 6; i++) {
    const daysAgo = (5 - i) * 14;
    const d = new Date('2026-03-25');
    d.setDate(d.getDate() - daysAgo);
    const date = d.toISOString().split('T')[0];
    const color = colors[i];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect fill="${color}" width="200" height="300"/><text x="100" y="140" text-anchor="middle" fill="#555" font-size="14" font-family="sans-serif">Progress</text><text x="100" y="165" text-anchor="middle" fill="#555" font-size="12" font-family="sans-serif">${types[i]}</text><text x="100" y="190" text-anchor="middle" fill="#888" font-size="10" font-family="sans-serif">Week ${(i + 1) * 2}</text></svg>`;
    const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
    photos.push({ id: `demo_photo_${uid()}`, dataUrl, type: types[i], caption: captions[i], date });
  }
  return photos;
}

/**
 * Sequential freeze: compute adjustedTarget for each day in order,
 * using the engine's own computeAdjustedTarget with accumulated balances.
 */
function generateCalorieBankWithFreeze(): {
  balances: DailyBalanceEntry[];
  bankState: Record<string, unknown>;
} {
  const balances: DailyBalanceEntry[] = [];

  for (const entry of STRESS_DATASET) {
    // Compute adjustedTarget using all prior balances
    const adjustedTarget = computeAdjustedTarget(entry.date, BASE_TARGET, balances);
    // diff = actual - baseTarget (deterministic model)
    const diff = entry.actualCalories - BASE_TARGET;

    balances.push({
      date: entry.date,
      target: BASE_TARGET,
      actual: entry.actualCalories,
      diff,
      adjustedTarget,
    });
  }

  return {
    balances,
    bankState: {
      dailyBalances: balances,
      autoAdjustMeals: true,
      dayCutoffHour: 3,
      specialDays: {},
      balanceStreak: 3,
      lastProcessedDate: '2026-03-25',
    },
  };
}

function generateStreaks() {
  return {
    nutrition: { current: 5, longest: 9, lastLogDate: '2026-03-25', graceUsed: false },
    hydration: { current: 4, longest: 7, lastLogDate: '2026-03-25', graceUsed: false },
  };
}

function generateMealPlannerProfile(): MealPlannerProfile {
  return {
    name: 'Riya Sharma', gender: 'female', age: 28,
    currentWeight: 61, goalWeight: 52, heightCm: 162, weightUnit: 'kg', bmi: 23.2,
    mainGoal: 'lose_weight', motivations: ['health', 'confidence'], weeklyPace: 0.5,
    experienceLevel: 'intermediate', challenges: ['cravings', 'eating_out'],
    activityLevel: 'moderate', exerciseFrequency: '3-4x', exerciseTypes: ['walking', 'yoga'],
    sleepHours: '7-8', stressLevel: 'moderate',
    dietaryPrefs: [], medicalRestrictions: [], allergies: [], dislikedFoods: '',
    religiousRestrictions: [], cuisinePrefs: ['Indian', 'South Indian'],
    cookingSkill: 'intermediate', cookingTime: '30min', equipment: ['pressure_cooker', 'tawa'],
    eatingOutFrequency: '1-2x', mealPrep: 'sometimes', snackingHabits: ['fruits', 'nuts'],
    mealsPerDay: 4, dailyBudget: 300, currency: '₹',
    staplePreference: 'mixed', weekendStyle: 'relaxed',
    dailyCalories: BASE_TARGET, dailyProtein: 110, dailyCarbs: 200, dailyFat: 60,
    onboardingComplete: true, createdAt: '2026-02-25',
  };
}

function generateWeekPlans(): WeekPlan[] {
  const recipeIds = [
    { id: 'idli-sambar', type: 'breakfast' as const },
    { id: 'poha', type: 'breakfast' as const },
    { id: 'moong-dal-chilla', type: 'breakfast' as const },
    { id: 'masala-oats', type: 'breakfast' as const },
    { id: 'dal-rice', type: 'lunch' as const },
    { id: 'rajma-chawal', type: 'lunch' as const },
    { id: 'chicken-curry-rice', type: 'lunch' as const },
    { id: 'paneer-butter-masala', type: 'lunch' as const },
    { id: 'palak-dal-roti', type: 'dinner' as const },
    { id: 'egg-bhurji-roti', type: 'dinner' as const },
    { id: 'veg-biryani', type: 'dinner' as const },
    { id: 'grilled-chicken-salad', type: 'dinner' as const },
    { id: 'sprout-chaat', type: 'snack' as const },
    { id: 'banana-peanut-butter', type: 'snack' as const },
    { id: 'roasted-makhana', type: 'snack' as const },
    { id: 'fruit-yogurt', type: 'snack' as const },
  ];

  const plans: WeekPlan[] = [];
  for (let w = 0; w < 4; w++) {
    const weekStartDate = new Date('2026-03-25');
    weekStartDate.setDate(weekStartDate.getDate() - w * 7);
    const weekStart = getMonday(weekStartDate.toISOString().split('T')[0]);
    const days: DayPlan[] = [];
    for (let d = 0; d < 7; d++) {
      const dd = new Date(weekStart);
      dd.setDate(dd.getDate() + d);
      const dayDate = dd.toISOString().split('T')[0];
      const bIdx = (w * 7 + d) % 4;
      const lIdx = 4 + ((w * 7 + d) % 4);
      const dIdx = 8 + ((w * 7 + d) % 4);
      const sIdx = 12 + ((w * 7 + d) % 4);
      const meals: PlannedMeal[] = [
        { recipeId: recipeIds[bIdx].id, mealType: 'breakfast', cooked: w > 0, logged: w > 0 },
        { recipeId: recipeIds[lIdx].id, mealType: 'lunch', cooked: w > 0, logged: w > 0 },
        { recipeId: recipeIds[dIdx].id, mealType: 'dinner', cooked: w > 0, logged: w > 0 },
        { recipeId: recipeIds[sIdx].id, mealType: 'snack', cooked: w > 0, logged: w > 0 },
      ];
      days.push({ date: dayDate, meals });
    }
    plans.push({ weekStart, days, generatedAt: weekStart, flexCaloriesPerDay: 200 });
  }
  return plans;
}

export function seedDemoData() {
  // 1. Profile
  const profile = generateProfile();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // 2. Daily logs from stress-test dataset
  STRESS_DATASET.forEach((entry, i) => {
    const log = generateDailyLog(entry, i);
    localStorage.setItem(LOG_KEY_PREFIX + entry.date, JSON.stringify(log));
  });

  // 3. Calorie bank with sequential freeze (exercises the engine)
  const { bankState } = generateCalorieBankWithFreeze();
  localStorage.setItem(BANK_KEY, JSON.stringify(bankState));

  // 4. Weight history (12 weeks)
  localStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(generateWeightHistory()));

  // 4b. Progress photos
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(generateProgressPhotos()));

  // 5. Streaks
  localStorage.setItem(STREAKS_KEY, JSON.stringify(generateStreaks()));

  // 6. Meal planner profile
  localStorage.setItem(PLANNER_PROFILE_KEY, JSON.stringify(generateMealPlannerProfile()));

  // 7. Week plans
  const weekPlans = generateWeekPlans();
  weekPlans.forEach(plan => {
    localStorage.setItem(WEEK_PLAN_KEY_PREFIX + plan.weekStart, JSON.stringify(plan));
  });

  // 8. Onboarding data
  localStorage.setItem(USER_KEY, JSON.stringify({
    basic: { name: 'Riya Sharma', gender: 'female', age: 28, heightCm: 162, weightKg: 62 },
    health: { conditions: [], skin: 'none', genderSpecific: { pcos: false, pcosSeverity: null, pregnancy: false, breastfeeding: false, menstrualPhase: null, prostate: false, testosterone: false } },
    activity: { work: 'sedentary', exercise: 'moderate' },
    goals: { type: 'lose', speed: 'balanced', targetWeight: 52, calories: BASE_TARGET, macros: { protein: 110, carbs: 200, fat: 60 }, expectedRate: '0.5 kg/week', weeksMin: 16, weeksMax: 20 },
    lifestyle: { diet: 'noRestrictions', water: 2.5, supplements: ['Vitamin D'], cooking: { skill: 'intermediate', time: 30, equipment: ['pressure_cooker', 'tawa'] }, budget: { enabled: true, amount: 300, period: 'daily', mealSplit: { breakfast: 20, lunch: 35, dinner: 35, snacks: 10 } } },
    meta: { createdAt: '2026-02-25', lastUpdated: '2026-03-25', adherenceScore: 68, adherenceLabel: 'Fair', expectedAdaptation: false, plateauCounter: 0, lastWeightEntry: '2026-03-25', weeklyAdjustments: [] },
  }));

  // 9. Tutorial flags
  localStorage.setItem('tutorial_seen', 'true');
  localStorage.setItem('pes_explanation_seen', 'true');
  localStorage.setItem('planner_modal_dismissed', 'true');

  return profile;
}
