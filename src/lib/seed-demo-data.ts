// Seed 30 days of realistic demo data for comprehensive testing
import type { UserProfile, DailyLog, MealEntry, FoodItem, BurnedData } from './store';
import type { WeekPlan, DayPlan, PlannedMeal, MealPlannerProfile } from './meal-planner-store';
import type { WeightEntry } from './weight-history';
import type { ProgressPhoto } from './store';

const PROFILE_KEY = 'nutrilens_profile';
const LOG_KEY_PREFIX = 'nutrilens_log_';
const BANK_KEY = 'nutrilens_calorie_bank';
const WEIGHT_HISTORY_KEY = 'nutrilens_weight_history';
const STREAKS_KEY = 'nutrilens_streaks';
const PLANNER_PROFILE_KEY = 'nutrilens_meal_planner_profile';
const WEEK_PLAN_KEY_PREFIX = 'nutrilens_week_plan_';
const USER_KEY = 'nutrilens_user';
const PHOTOS_KEY = 'nutrilens_progress_photos';

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

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getMonday(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function food(name: string, cal: number, p: number, c: number, f: number, qty = 1, emoji = '🍽️'): FoodItem {
  return { id: uid(), name, calories: cal, protein: p, carbs: c, fat: f, quantity: qty, unit: 'serving', emoji, confidenceScore: 0.9 };
}

function meal(type: MealEntry['type'], items: FoodItem[], hour: number, dayIndex: number): MealEntry {
  const totalCalories = items.reduce((s, i) => s + i.calories * i.quantity, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein * i.quantity, 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbs * i.quantity, 0);
  const totalFat = items.reduce((s, i) => s + i.fat * i.quantity, 0);
  const photos = MEAL_PHOTOS[type] || MEAL_PHOTOS.lunch;
  return {
    id: uid(), type, items, totalCalories, totalProtein, totalCarbs, totalFat,
    time: `${hour.toString().padStart(2, '0')}:00`,
    photo: photos[dayIndex % photos.length],
    cost: { amount: Math.round(Math.random() * 80 + 20), currency: '₹' },
    source: { category: dayIndex % 3 === 0 ? 'restaurant' : 'home' },
  };
}

// 8 meal patterns for variety across 30 days
function generateDayMeals(dayIndex: number): MealEntry[] {
  const patterns: MealEntry[][] = [
    // Day 0: On target (~1500)
    [
      meal('breakfast', [food('Poha', 250, 5, 40, 8, 1, '🍚'), food('Chai', 60, 2, 8, 2, 1, '☕')], 8, dayIndex),
      meal('lunch', [food('Dal Rice', 400, 15, 55, 10, 1, '🍛'), food('Sabzi', 120, 4, 12, 6, 1, '🥗')], 13, dayIndex),
      meal('snack', [food('Apple', 80, 0, 20, 0, 1, '🍎'), food('Peanuts', 170, 7, 6, 14, 1, '🥜')], 16, dayIndex),
      meal('dinner', [food('Roti', 120, 4, 20, 3, 2, '🫓'), food('Paneer Sabzi', 220, 14, 8, 16, 1, '🧀')], 20, dayIndex),
    ],
    // Day 1: Surplus (~1900)
    [
      meal('breakfast', [food('Paratha', 300, 7, 35, 15, 2, '🫓'), food('Curd', 80, 4, 5, 4, 1, '🥛')], 9, dayIndex),
      meal('lunch', [food('Biryani', 550, 20, 65, 18, 1, '🍚'), food('Raita', 60, 3, 4, 3, 1, '🥗')], 13, dayIndex),
      meal('snack', [food('Samosa', 250, 4, 25, 15, 2, '🥟')], 17, dayIndex),
      meal('dinner', [food('Roti', 120, 4, 20, 3, 2, '🫓'), food('Chicken Curry', 350, 28, 10, 22, 1, '🍗')], 21, dayIndex),
    ],
    // Day 2: Deficit (~1200)
    [
      meal('breakfast', [food('Idli', 150, 4, 28, 1, 3, '🫓'), food('Chutney', 30, 1, 5, 1, 1, '🌿')], 8, dayIndex),
      meal('lunch', [food('Salad Bowl', 280, 12, 20, 14, 1, '🥗'), food('Buttermilk', 40, 2, 3, 2, 1, '🥛')], 13, dayIndex),
      meal('snack', [food('Green Tea', 5, 0, 1, 0, 1, '🍵')], 16, dayIndex),
      meal('dinner', [food('Khichdi', 320, 12, 45, 8, 1, '🍚'), food('Pickle', 15, 0, 2, 1, 1, '🫙')], 19, dayIndex),
    ],
    // Day 3: Slightly over (~1700)
    [
      meal('breakfast', [food('Upma', 220, 5, 32, 8, 1, '🍚'), food('Coffee', 80, 2, 10, 3, 1, '☕')], 8, dayIndex),
      meal('lunch', [food('Chole Bhature', 520, 16, 55, 24, 1, '🍛')], 13, dayIndex),
      meal('snack', [food('Banana', 105, 1, 27, 0, 1, '🍌'), food('Almonds', 160, 6, 6, 14, 1, '🌰')], 16, dayIndex),
      meal('dinner', [food('Dosa', 180, 4, 28, 6, 2, '🫓'), food('Sambar', 130, 6, 18, 3, 1, '🥣')], 20, dayIndex),
    ],
    // Day 4: Big surplus (~2200) — weekend feast
    [
      meal('breakfast', [food('Aloo Paratha', 350, 8, 40, 16, 2, '🫓'), food('Lassi', 180, 6, 22, 7, 1, '🥛')], 10, dayIndex),
      meal('lunch', [food('Butter Chicken', 450, 30, 12, 30, 1, '🍗'), food('Naan', 260, 7, 40, 8, 2, '🫓')], 14, dayIndex),
      meal('snack', [food('Gulab Jamun', 180, 2, 28, 7, 2, '🍩'), food('Chai', 60, 2, 8, 2, 1, '☕')], 17, dayIndex),
      meal('dinner', [food('Paneer Tikka', 320, 20, 8, 24, 1, '🧀'), food('Roti', 120, 4, 20, 3, 1, '🫓')], 21, dayIndex),
    ],
    // Day 5: On target (~1480)
    [
      meal('breakfast', [food('Oats', 200, 7, 35, 4, 1, '🥣'), food('Milk', 80, 4, 6, 4, 1, '🥛')], 7, dayIndex),
      meal('lunch', [food('Rajma Rice', 420, 16, 58, 10, 1, '🍛'), food('Onion Salad', 30, 1, 6, 0, 1, '🧅')], 13, dayIndex),
      meal('snack', [food('Sprouts Chaat', 150, 8, 18, 4, 1, '🌱')], 16, dayIndex),
      meal('dinner', [food('Roti', 120, 4, 20, 3, 2, '🫓'), food('Egg Bhurji', 200, 14, 4, 14, 1, '🥚')], 20, dayIndex),
    ],
    // Day 6: High protein (~1550)
    [
      meal('breakfast', [food('Moong Dal Chilla', 180, 12, 22, 4, 2, '🫓'), food('Green Chutney', 20, 1, 3, 0, 1, '🌿')], 8, dayIndex),
      meal('lunch', [food('Chicken Rice Bowl', 480, 32, 50, 12, 1, '🍗'), food('Raita', 60, 3, 4, 3, 1, '🥛')], 13, dayIndex),
      meal('snack', [food('Protein Shake', 150, 25, 8, 2, 1, '🥤'), food('Almonds', 80, 3, 3, 7, 1, '🌰')], 16, dayIndex),
      meal('dinner', [food('Fish Curry', 280, 24, 8, 18, 1, '🐟'), food('Rice', 180, 3, 38, 1, 1, '🍚')], 20, dayIndex),
    ],
    // Day 7: Light day (~1100)
    [
      meal('breakfast', [food('Fruit Bowl', 150, 2, 35, 1, 1, '🍇'), food('Green Tea', 5, 0, 1, 0, 1, '🍵')], 9, dayIndex),
      meal('lunch', [food('Soup', 120, 6, 15, 4, 1, '🥣'), food('Toast', 80, 3, 14, 1, 1, '🍞')], 13, dayIndex),
      meal('snack', [food('Makhana', 100, 3, 18, 1, 1, '🌸')], 16, dayIndex),
      meal('dinner', [food('Curd Rice', 280, 8, 45, 6, 1, '🍚'), food('Pickle', 15, 0, 2, 1, 1, '🫙')], 19, dayIndex),
    ],
  ];
  return patterns[dayIndex % patterns.length];
}

function generateProfile(): UserProfile {
  return {
    name: 'Priya',
    gender: 'female',
    occupation: 'Software Engineer',
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
    heightCm: 160,
    weightKg: 65,
    dob: '1998-03-15',
    age: 28,
    goal: 'lose',
    targetWeight: 58,
    goalSpeed: 0.5,
    dietaryPrefs: [],
    healthConditions: [],
    womenHealth: [],
    menHealth: {},
    medications: '',
    mealTimes: { breakfast: '08:00', lunch: '13:00', dinner: '20:00', snacks: '16:00' },
    waterGoal: 2500,
    onboardingComplete: true,
    dailyCalories: 1500,
    trackingMode: 'flex',
    dailyProtein: 75,
    dailyCarbs: 190,
    dailyFat: 50,
    bmi: 25.4,
    bmr: 1380,
    tdee: 1900,
  };
}

function generateDailyLog(daysAgo: number): DailyLog {
  const date = dateStr(daysAgo);
  const meals = generateDayMeals(daysAgo);
  const weights = [65.5,65.4,65.3,65.5,65.2,65.1,65.0,65.2,64.9,64.8,65.0,64.7,64.8,64.6,64.5,64.7,64.4,64.3,64.5,64.2,64.1,64.3,64.0,63.9,64.1,63.8,63.7,63.9,63.6,63.5];
  const waterCups = [6,8,5,7,8,6,4,7,8,6,7,5,8,7,6,8,7,5,6,8,7,6,5,8,7,6,8,5,7,6];
  const burned: BurnedData = {
    steps: Math.floor(Math.random() * 150 + 50),
    stepsCount: Math.floor(Math.random() * 5000 + 3000),
    activities: daysAgo % 3 === 0 ? [{
      id: uid(), type: 'Walking', duration: 30, intensity: 'moderate' as const,
      calories: 120, met: 3.5, source: 'manual' as const, time: '07:00'
    }] : [],
    total: Math.floor(Math.random() * 150 + 50),
  };
  if (burned.activities.length) {
    burned.total += burned.activities.reduce((s, a) => s + a.calories, 0);
  }

  return {
    date,
    meals,
    supplements: daysAgo % 2 === 0 ? [{
      id: uid(), name: 'Vitamin D', brand: 'HealthKart', dosage: 1000,
      unit: 'IU', time: '08:00', calories: 0, protein: 0, carbs: 0, fat: 0,
      icon: '☀️', category: 'vitamin',
    }] : [],
    waterCups: waterCups[daysAgo % waterCups.length],
    caloriesBurned: burned.total,
    burned,
    weight: weights[daysAgo % weights.length],
    weightUnit: 'kg',
    progressPhotoIds: [],
  };
}

function generateWeightHistory(): WeightEntry[] {
  const entries: WeightEntry[] = [];
  // 12 weeks = 84 days of weight data, one entry per week (on Mondays)
  const startWeight = 67.0;
  for (let week = 11; week >= 0; week--) {
    const daysAgo = week * 7;
    const date = dateStr(daysAgo);
    // Gradual downward trend with small fluctuations
    const loss = (11 - week) * 0.3;
    const fluctuation = (Math.sin(week * 1.7) * 0.3);
    const weight = Math.round((startWeight - loss + fluctuation) * 10) / 10;
    entries.push({
      id: uid(),
      date,
      weekStart: getMonday(daysAgo),
      weight,
      unit: 'kg',
      photo: null,
      verified: true,
      note: week % 4 === 0 ? 'Monthly check-in 📊' : week % 2 === 0 ? 'Weekly weigh-in' : 'Quick morning weigh-in',
      timestamp: new Date(date + 'T07:30:00').toISOString(),
    });
  }
  return entries;
}

function generateProgressPhotos(): ProgressPhoto[] {
  const photos: ProgressPhoto[] = [];
  const types: ProgressPhoto['type'][] = ['front', 'side', 'back', 'front', 'side', 'front'];
  const captions = ['Week 1 start 💪', 'Side view week 2', 'Back progress week 3', 'Week 5 front', 'Week 7 side check', 'Week 10 — feeling great! 🎉'];
  // Use placeholder SVG data URLs for demo (small colored rectangles)
  const colors = ['#E8D5B7', '#D4C4A8', '#C9B99A', '#BFB08E', '#B5A782', '#AB9E76'];
  for (let i = 0; i < 6; i++) {
    const daysAgo = (5 - i) * 14; // every 2 weeks
    const color = colors[i];
    // Create a tiny SVG data URL as placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect fill="${color}" width="200" height="300"/><text x="100" y="140" text-anchor="middle" fill="#555" font-size="14" font-family="sans-serif">Progress</text><text x="100" y="165" text-anchor="middle" fill="#555" font-size="12" font-family="sans-serif">${types[i]}</text><text x="100" y="190" text-anchor="middle" fill="#888" font-size="10" font-family="sans-serif">Week ${(i + 1) * 2}</text></svg>`;
    const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
    photos.push({
      id: `demo_photo_${uid()}`,
      dataUrl,
      type: types[i],
      caption: captions[i],
      date: dateStr(daysAgo),
    });
  }
  return photos;
}

function generateCalorieBank() {
  const balances: Array<{ date: string; target: number; actual: number; diff: number; bankAfter: number }> = [];
  let bank = 0;
  for (let i = 29; i >= 0; i--) {
    const log = generateDailyLog(i);
    const actual = log.meals.reduce((s, m) => s + m.items.reduce((ms, item) => ms + item.calories * item.quantity, 0), 0);
    const target = 1500;
    const diff = actual - target;
    bank += diff;
    bank = Math.max(-500, Math.min(1000, bank));
    balances.push({ date: dateStr(i), target, actual, diff, bankAfter: Math.round(bank) });
  }

  const adjustmentPlan: Array<{ date: string; adjust: number }> = [];
  if (bank > 100) {
    const days = 4;
    const perDay = Math.round(bank / days);
    for (let i = 1; i <= days; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      adjustmentPlan.push({ date: d.toISOString().split('T')[0], adjust: -perDay });
    }
  }

  return {
    calorieBank: Math.round(bank),
    maxBank: 1000,
    recoveryDays: 5,
    dailyBalances: balances,
    adjustmentPlan,
    correctionMode: 'balanced' as const,
    autoAdjustMeals: true,
    dayCutoffHour: 3,
    specialDays: {} as Record<string, string>,
    balanceStreak: 5,
    adherenceLog: balances.slice(-7).map(b => ({
      date: b.date, target: b.target, actual: b.actual, score: Math.max(0, 100 - Math.abs(b.diff) / 10),
    })),
    lastProcessedDate: dateStr(0),
  };
}

function generateStreaks() {
  return {
    nutrition: { current: 8, longest: 12, lastLogDate: dateStr(0), graceUsed: false },
    hydration: { current: 5, longest: 9, lastLogDate: dateStr(0), graceUsed: false },
  };
}

function generateMealPlannerProfile(): MealPlannerProfile {
  return {
    name: 'Priya', gender: 'female', age: 28,
    currentWeight: 64, goalWeight: 58, heightCm: 160, weightUnit: 'kg', bmi: 25.0,
    mainGoal: 'lose_weight', motivations: ['health', 'energy'], weeklyPace: 0.5,
    experienceLevel: 'intermediate', challenges: ['cravings', 'eating_out'],
    activityLevel: 'moderate', exerciseFrequency: '3-4x', exerciseTypes: ['walking', 'yoga'],
    sleepHours: '7-8', stressLevel: 'moderate',
    dietaryPrefs: [], medicalRestrictions: [], allergies: [], dislikedFoods: '',
    religiousRestrictions: [], cuisinePrefs: ['Indian', 'South Indian'],
    cookingSkill: 'intermediate', cookingTime: '30min', equipment: ['pressure_cooker', 'tawa'],
    eatingOutFrequency: '1-2x', mealPrep: 'sometimes', snackingHabits: ['fruits', 'nuts'],
    mealsPerDay: 4, dailyBudget: 300, currency: '₹',
    staplePreference: 'mixed', weekendStyle: 'relaxed',
    dailyCalories: 1500, dailyProtein: 75, dailyCarbs: 190, dailyFat: 50,
    onboardingComplete: true, createdAt: dateStr(14),
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
    const weekStart = getMonday(w * 7);
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
        { recipeId: recipeIds[bIdx].id, mealType: 'breakfast', cooked: w > 0 || d < new Date().getDay(), logged: w > 0 || d < new Date().getDay() },
        { recipeId: recipeIds[lIdx].id, mealType: 'lunch', cooked: w > 0 || d < new Date().getDay(), logged: w > 0 || d < new Date().getDay() },
        { recipeId: recipeIds[dIdx].id, mealType: 'dinner', cooked: w > 0 || d < new Date().getDay() - 1, logged: w > 0 || d < new Date().getDay() - 1 },
        { recipeId: recipeIds[sIdx].id, mealType: 'snack', cooked: w > 0, logged: w > 0 },
      ];
      days.push({ date: dayDate, meals });
    }
    plans.push({ weekStart, days, generatedAt: dateStr(w * 7), flexCaloriesPerDay: 200 });
  }
  return plans;
}

export function seedDemoData() {
  // 1. Profile
  const profile = generateProfile();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // 2. 30 days of daily logs
  for (let i = 0; i < 30; i++) {
    const log = generateDailyLog(i);
    localStorage.setItem(LOG_KEY_PREFIX + log.date, JSON.stringify(log));
  }

  // 3. Calorie bank
  localStorage.setItem(BANK_KEY, JSON.stringify(generateCalorieBank()));

  // 4. Weight history (12 weeks of verified weekly entries)
  localStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(generateWeightHistory()));

  // 4b. Progress photos (6 photos across 12 weeks)
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(generateProgressPhotos()));

  // 5. Streaks
  localStorage.setItem(STREAKS_KEY, JSON.stringify(generateStreaks()));

  // 6. Meal planner profile
  localStorage.setItem(PLANNER_PROFILE_KEY, JSON.stringify(generateMealPlannerProfile()));

  // 7. Week plans (4 weeks)
  const weekPlans = generateWeekPlans();
  weekPlans.forEach(plan => {
    localStorage.setItem(WEEK_PLAN_KEY_PREFIX + plan.weekStart, JSON.stringify(plan));
  });

  // 8. Onboarding data
  localStorage.setItem(USER_KEY, JSON.stringify({
    basic: { name: 'Priya', gender: 'female', age: 28, heightCm: 160, weightKg: 65 },
    health: { conditions: [], skin: 'none', genderSpecific: { pcos: false, pcosSeverity: null, pregnancy: false, breastfeeding: false, menstrualPhase: null, prostate: false, testosterone: false } },
    activity: { work: 'sedentary', exercise: 'moderate' },
    goals: { type: 'lose', speed: 'balanced', targetWeight: 58, calories: 1500, macros: { protein: 75, carbs: 190, fat: 50 }, expectedRate: '0.5 kg/week', weeksMin: 10, weeksMax: 14 },
    lifestyle: { diet: 'noRestrictions', water: 2.5, supplements: ['Vitamin D'], cooking: { skill: 'intermediate', time: 30, equipment: ['pressure_cooker', 'tawa'] }, budget: { enabled: true, amount: 300, period: 'daily', mealSplit: { breakfast: 25, lunch: 35, dinner: 30, snacks: 10 } } },
    meta: { createdAt: dateStr(30), lastUpdated: dateStr(0), adherenceScore: 78, adherenceLabel: 'Good', expectedAdaptation: false, plateauCounter: 0, lastWeightEntry: dateStr(0), weeklyAdjustments: [] },
  }));

  // 9. Tutorial & PES explanation already seen
  localStorage.setItem('tutorial_seen', 'true');
  localStorage.setItem('pes_explanation_seen', 'true');
  localStorage.setItem('planner_modal_dismissed', 'true');

  return profile;
}
