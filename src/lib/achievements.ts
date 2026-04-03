import { getRecentLogs, getDailyTotals, getProfile, DailyLog } from './store';
import { getWeightEntries, getWeightStreak } from './weight-history';
import { scopedGetJSON, scopedSetJSON } from '@/lib/scoped-storage';

const UNLOCKED_KEY = 'nutrilens_unlocked_badges';

export interface AchievementStats {
  totalMealsLogged: number;
  totalPhotoLogs: number;
  totalSupplementLogs: number;
  loggingStreak: number;
  waterGoalDays: number;
  proteinGoalDays: number;
  calorieGoalDays: number;
  totalWeightLogs: number;
  weightStreak: number;
  totalPhotos: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (stats: AchievementStats) => boolean;
  progress: (stats: AchievementStats) => { current: number; target: number };
}

export const BADGES: Badge[] = [
  {
    id: 'first_meal',
    name: 'First Meal',
    description: 'Log your first meal',
    icon: '🍽️',
    check: (s) => s.totalMealsLogged >= 1,
    progress: (s) => ({ current: Math.min(s.totalMealsLogged, 1), target: 1 }),
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: '3 consecutive days of logging',
    icon: '🔥',
    check: (s) => s.loggingStreak >= 3,
    progress: (s) => ({ current: Math.min(s.loggingStreak, 3), target: 3 }),
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day logging streak',
    icon: '⚡',
    check: (s) => s.loggingStreak >= 7,
    progress: (s) => ({ current: Math.min(s.loggingStreak, 7), target: 7 }),
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day logging streak',
    icon: '👑',
    check: (s) => s.loggingStreak >= 30,
    progress: (s) => ({ current: Math.min(s.loggingStreak, 30), target: 30 }),
  },
  {
    id: 'protein_pro',
    name: 'Protein Pro',
    description: 'Hit your protein goal',
    icon: '💪',
    check: (s) => s.proteinGoalDays >= 1,
    progress: (s) => ({ current: Math.min(s.proteinGoalDays, 1), target: 1 }),
  },
  {
    id: 'hydrated',
    name: 'Hydration Hero',
    description: 'Meet your water goal',
    icon: '💧',
    check: (s) => s.waterGoalDays >= 1,
    progress: (s) => ({ current: Math.min(s.waterGoalDays, 1), target: 1 }),
  },
  {
    id: 'calorie_master',
    name: 'Calorie Master',
    description: 'Hit calorie goal 7 days',
    icon: '🎯',
    check: (s) => s.calorieGoalDays >= 7,
    progress: (s) => ({ current: Math.min(s.calorieGoalDays, 7), target: 7 }),
  },
  {
    id: 'first_weight',
    name: 'First Weigh-in',
    description: 'Log a verified weight',
    icon: '⚖️',
    check: (s) => s.totalWeightLogs >= 1,
    progress: (s) => ({ current: Math.min(s.totalWeightLogs, 1), target: 1 }),
  },
  {
    id: 'weight_4',
    name: '4-Week Streak',
    description: '4 weeks of weigh-ins',
    icon: '📊',
    check: (s) => s.weightStreak >= 4,
    progress: (s) => ({ current: Math.min(s.weightStreak, 4), target: 4 }),
  },
  {
    id: 'supplement_starter',
    name: 'Supplement Pro',
    description: 'Log a supplement',
    icon: '💊',
    check: (s) => s.totalSupplementLogs >= 1,
    progress: (s) => ({ current: Math.min(s.totalSupplementLogs, 1), target: 1 }),
  },
  {
    id: 'photo_10',
    name: 'Photo Diary',
    description: '10 progress photos',
    icon: '📸',
    check: (s) => s.totalPhotos >= 10,
    progress: (s) => ({ current: Math.min(s.totalPhotos, 10), target: 10 }),
  },
  {
    id: 'century_meals',
    name: 'Century Club',
    description: 'Log 100 meals',
    icon: '💯',
    check: (s) => s.totalMealsLogged >= 100,
    progress: (s) => ({ current: Math.min(s.totalMealsLogged, 100), target: 100 }),
  },
];

export function computeAchievementStats(): AchievementStats {
  const profile = getProfile();
  const logs = getRecentLogs(90);
  const weightEntries = getWeightEntries();

  const dailyCalorieGoal = profile?.dailyCalories || 2000;
  const dailyProteinGoal = profile?.dailyProtein || 50;
  const waterGoal = profile?.waterGoal || 8;

  let totalMealsLogged = 0;
  let totalSupplementLogs = 0;
  let totalPhotoLogs = 0;
  let waterGoalDays = 0;
  let proteinGoalDays = 0;
  let calorieGoalDays = 0;

  for (const log of logs) {
    totalMealsLogged += log.meals.length;
    totalSupplementLogs += (log.supplements || []).length;
    totalPhotoLogs += (log.progressPhotoIds || []).length;

    const totals = getDailyTotals(log);
    if (totals.eaten > 0) {
      if (log.waterCups >= waterGoal) waterGoalDays++;
      if (totals.protein >= dailyProteinGoal) proteinGoalDays++;
      if (Math.abs(totals.eaten - dailyCalorieGoal) / dailyCalorieGoal <= 0.1) calorieGoalDays++;
    }
  }

  // Compute logging streak (consecutive days from today with eaten > 0)
  let loggingStreak = 0;
  for (const log of logs) {
    const totals = getDailyTotals(log);
    if (totals.eaten > 0) {
      loggingStreak++;
    } else {
      break;
    }
  }

  return {
    totalMealsLogged,
    totalPhotoLogs,
    totalSupplementLogs,
    loggingStreak,
    waterGoalDays,
    proteinGoalDays,
    calorieGoalDays,
    totalWeightLogs: weightEntries.length,
    weightStreak: getWeightStreak(),
    totalPhotos: totalPhotoLogs,
  };
}

export function getUnlockedBadges(): string[] {
  const data = localStorage.getItem(UNLOCKED_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveUnlockedBadges(ids: string[]) {
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify(ids));
}

export function checkAndUnlockBadges(stats: AchievementStats): string[] {
  const previously = getUnlockedBadges();
  const previousSet = new Set(previously);
  const newlyUnlocked: string[] = [];

  for (const badge of BADGES) {
    if (!previousSet.has(badge.id) && badge.check(stats)) {
      newlyUnlocked.push(badge.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedBadges([...previously, ...newlyUnlocked]);
  }

  return newlyUnlocked;
}
