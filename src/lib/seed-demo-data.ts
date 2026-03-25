// Seed 14 days of realistic demo data for testing
import type { UserProfile, DailyLog, MealEntry, FoodItem, BurnedData } from './store';

const PROFILE_KEY = 'nutrilens_profile';
const LOG_KEY_PREFIX = 'nutrilens_log_';
const BANK_KEY = 'nutrilens_calorie_bank';

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function food(name: string, cal: number, p: number, c: number, f: number, qty = 1, emoji = '🍽️'): FoodItem {
  return { id: uid(), name, calories: cal, protein: p, carbs: c, fat: f, quantity: qty, unit: 'serving', emoji, confidenceScore: 0.9 };
}

function meal(type: MealEntry['type'], items: FoodItem[], hour: number): MealEntry {
  const totalCalories = items.reduce((s, i) => s + i.calories * i.quantity, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein * i.quantity, 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbs * i.quantity, 0);
  const totalFat = items.reduce((s, i) => s + i.fat * i.quantity, 0);
  return {
    id: uid(), type, items, totalCalories, totalProtein, totalCarbs, totalFat,
    time: `${hour.toString().padStart(2, '0')}:00`,
  };
}

// 14 days of varied meal patterns
function generateDayMeals(dayIndex: number): MealEntry[] {
  const patterns: MealEntry[][] = [
    // Day pattern 0: On target (~1500)
    [
      meal('breakfast', [food('Poha', 250, 5, 40, 8, 1, '🍚'), food('Chai', 60, 2, 8, 2, 1, '☕')], 8),
      meal('lunch', [food('Dal Rice', 400, 15, 55, 10, 1, '🍛'), food('Sabzi', 120, 4, 12, 6, 1, '🥗')], 13),
      meal('snack', [food('Apple', 80, 0, 20, 0, 1, '🍎'), food('Peanuts', 170, 7, 6, 14, 1, '🥜')], 16),
      meal('dinner', [food('Roti', 120, 4, 20, 3, 2, '🫓'), food('Paneer Sabzi', 220, 14, 8, 16, 1, '🧀')], 20),
    ],
    // Day pattern 1: Surplus (~1900)
    [
      meal('breakfast', [food('Paratha', 300, 7, 35, 15, 2, '🫓'), food('Curd', 80, 4, 5, 4, 1, '🥛')], 9),
      meal('lunch', [food('Biryani', 550, 20, 65, 18, 1, '🍚'), food('Raita', 60, 3, 4, 3, 1, '🥗')], 13),
      meal('snack', [food('Samosa', 250, 4, 25, 15, 2, '🥟')], 17),
      meal('dinner', [food('Roti', 120, 4, 20, 3, 2, '🫓'), food('Chicken Curry', 350, 28, 10, 22, 1, '🍗')], 21),
    ],
    // Day pattern 2: Deficit (~1200)
    [
      meal('breakfast', [food('Idli', 150, 4, 28, 1, 3, '🫓'), food('Chutney', 30, 1, 5, 1, 1, '🌿')], 8),
      meal('lunch', [food('Salad Bowl', 280, 12, 20, 14, 1, '🥗'), food('Buttermilk', 40, 2, 3, 2, 1, '🥛')], 13),
      meal('snack', [food('Green Tea', 5, 0, 1, 0, 1, '🍵')], 16),
      meal('dinner', [food('Khichdi', 320, 12, 45, 8, 1, '🍚'), food('Pickle', 15, 0, 2, 1, 1, '🫙')], 19),
    ],
    // Day pattern 3: Slightly over (~1700)
    [
      meal('breakfast', [food('Upma', 220, 5, 32, 8, 1, '🍚'), food('Coffee', 80, 2, 10, 3, 1, '☕')], 8),
      meal('lunch', [food('Chole Bhature', 520, 16, 55, 24, 1, '🍛')], 13),
      meal('snack', [food('Banana', 105, 1, 27, 0, 1, '🍌'), food('Almonds', 160, 6, 6, 14, 1, '🌰')], 16),
      meal('dinner', [food('Dosa', 180, 4, 28, 6, 2, '🫓'), food('Sambar', 130, 6, 18, 3, 1, '🥣')], 20),
    ],
    // Day pattern 4: Big surplus (~2200) - weekend feast
    [
      meal('breakfast', [food('Aloo Paratha', 350, 8, 40, 16, 2, '🫓'), food('Lassi', 180, 6, 22, 7, 1, '🥛')], 10),
      meal('lunch', [food('Butter Chicken', 450, 30, 12, 30, 1, '🍗'), food('Naan', 260, 7, 40, 8, 2, '🫓')], 14),
      meal('snack', [food('Gulab Jamun', 180, 2, 28, 7, 2, '🍩'), food('Chai', 60, 2, 8, 2, 1, '☕')], 17),
      meal('dinner', [food('Paneer Tikka', 320, 20, 8, 24, 1, '🧀'), food('Roti', 120, 4, 20, 3, 1, '🫓')], 21),
    ],
    // Day pattern 5: On target (~1480)
    [
      meal('breakfast', [food('Oats', 200, 7, 35, 4, 1, '🥣'), food('Milk', 80, 4, 6, 4, 1, '🥛')], 7),
      meal('lunch', [food('Rajma Rice', 420, 16, 58, 10, 1, '🍛'), food('Onion Salad', 30, 1, 6, 0, 1, '🧅')], 13),
      meal('snack', [food('Sprouts Chaat', 150, 8, 18, 4, 1, '🌱')], 16),
      meal('dinner', [food('Roti', 120, 4, 20, 3, 2, '🫓'), food('Egg Bhurji', 200, 14, 4, 14, 1, '🥚')], 20),
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
  const weights = [65.5, 65.4, 65.3, 65.5, 65.2, 65.1, 65.0, 65.2, 64.9, 64.8, 65.0, 64.7, 64.8, 64.8];
  const waterCups = [6, 8, 5, 7, 8, 6, 4, 7, 8, 6, 7, 5, 8, 7];
  const burned: BurnedData = {
    steps: Math.floor(Math.random() * 150 + 50),
    stepsCount: Math.floor(Math.random() * 5000 + 3000),
    activities: [],
    total: Math.floor(Math.random() * 150 + 50),
  };

  return {
    date,
    meals,
    supplements: [],
    waterCups: waterCups[daysAgo % waterCups.length],
    caloriesBurned: burned.total,
    burned,
    weight: weights[daysAgo % weights.length],
    weightUnit: 'kg',
    progressPhotoIds: [],
  };
}

function generateCalorieBank() {
  const today = dateStr(0);
  const balances: Array<{ date: string; target: number; actual: number; diff: number; bankAfter: number }> = [];
  let bank = 0;

  for (let i = 13; i >= 0; i--) {
    const log = generateDailyLog(i);
    const actual = log.meals.reduce((s, m) => s + m.items.reduce((ms, item) => ms + item.calories * item.quantity, 0), 0);
    const target = 1500;
    const diff = actual - target;
    bank += diff;
    bank = Math.max(-500, Math.min(1000, bank)); // clamp
    balances.push({ date: dateStr(i), target, actual, diff, bankAfter: Math.round(bank) });
  }

  // Create adjustment plan for remaining bank
  const adjustmentPlan: Array<{ date: string; adjust: number }> = [];
  if (bank > 100) {
    const days = 4;
    const perDay = Math.round(bank / days);
    for (let i = 1; i <= days; i++) {
      adjustmentPlan.push({ date: dateStr(-i), adjust: -perDay });
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
    balanceStreak: 3,
    adherenceLog: [] as any[],
    lastProcessedDate: dateStr(0),
  };
}

export function seedDemoData() {
  // 1. Save profile
  const profile = generateProfile();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // 2. Save 14 days of logs
  for (let i = 0; i < 14; i++) {
    const log = generateDailyLog(i);
    localStorage.setItem(LOG_KEY_PREFIX + log.date, JSON.stringify(log));
  }

  // 3. Save calorie bank state
  const bankState = generateCalorieBank();
  localStorage.setItem(BANK_KEY, JSON.stringify(bankState));

  // 4. Save onboarding data
  localStorage.setItem('nutrilens_user', JSON.stringify({
    basic: { name: 'Priya', gender: 'female', age: 28, heightCm: 160, weightKg: 65 },
    health: { conditions: [], skin: 'none', genderSpecific: { pcos: false, pcosSeverity: null, pregnancy: false, breastfeeding: false, menstrualPhase: null, prostate: false, testosterone: false } },
    activity: { work: 'sedentary', exercise: 'moderate' },
    goals: { type: 'lose', speed: 'balanced', targetWeight: 58, calories: 1500, macros: { protein: 75, carbs: 190, fat: 50 }, expectedRate: '0.5 kg/week', weeksMin: 10, weeksMax: 14 },
    lifestyle: { diet: 'noRestrictions', water: 2.5, supplements: [], cooking: { skill: 'intermediate', time: 30, equipment: [] }, budget: { enabled: false, amount: 0, period: 'monthly', mealSplit: { breakfast: 25, lunch: 35, dinner: 30, snacks: 10 } } },
    meta: { createdAt: dateStr(14), lastUpdated: dateStr(0), adherenceScore: 72, adherenceLabel: 'Good', expectedAdaptation: false, plateauCounter: 0, lastWeightEntry: dateStr(0), weeklyAdjustments: [] },
  }));

  return profile;
}
