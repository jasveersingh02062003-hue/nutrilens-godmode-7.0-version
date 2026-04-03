import { scopedGet, scopedSet, scopedRemove } from "./scoped-storage";
// Onboarding data persistence – new nested structure + legacy compat

import { saveProfile, type UserProfile, toLocalDateKey } from './store';
import { calculateBMR } from './nutrition';
import { getActivityMultiplier, calculateTDEEFromWorkExercise } from './nutrition';
import { saveBudgetSettings } from './expense-store';
import type { OnboardingGoalResult } from './goal-engine';

const PROGRESS_KEY = 'nutrilens_onboarding_progress';
const USER_KEY = 'nutrilens_user';

export interface OnboardingData {
  basic: { name: string; gender: string; age: number; heightCm: number; weightKg: number };
  health: {
    conditions: string[];
    allergens?: string[];
    skin: string;
    genderSpecific: {
      pcos: boolean;
      pcosSeverity: number | null;
      pregnancy: boolean;
      breastfeeding: boolean;
      menstrualPhase: string | null;
      prostate: boolean;
      testosterone: boolean;
    };
  };
  activity: { work: string; exercise: string };
  goals: {
    type: string;
    speed: string;
    targetWeight: number | null;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
    expectedRate: string;
    weeksMin: number | null;
    weeksMax: number | null;
  };
  lifestyle: {
    diet: string;
    water: number;
    supplements: string[];
    cooking: { skill: string; time: number; equipment: string[] };
    budget: { enabled: boolean; amount: number; period: string; mealSplit: { breakfast: number; lunch: number; dinner: number; snacks: number } };
  };
  meta: {
    createdAt: string;
    lastUpdated: string;
    adherenceScore: number;
    adherenceLabel: string;
    expectedAdaptation: boolean;
    plateauCounter: number;
    lastWeightEntry: string | null;
    weeklyAdjustments: any[];
  };
}

export function saveOnboardingProgress(phase: number, data: any) {
  scopedSet(PROGRESS_KEY, JSON.stringify({ phase, data, savedAt: new Date().toISOString() }));
}

export function getOnboardingProgress(): { phase: number; data: any } | null {
  const raw = scopedGet(PROGRESS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearOnboardingProgress() {
  scopedRemove(PROGRESS_KEY);
}

export function saveOnboardingData(data: OnboardingData) {
  // Save new nested structure
  scopedSet(USER_KEY, JSON.stringify(data));

  // Compute ACTUAL TDEE (not goal calories) for profile
  const bmr = calculateBMR(data.basic.weightKg, data.basic.heightCm, data.basic.age, data.basic.gender);
  const tdee = Math.round(calculateTDEEFromWorkExercise(bmr, data.activity.work, data.activity.exercise));

  // Save legacy profile for backward compat with rest of app
  const profile: UserProfile = {
    name: data.basic.name,
    gender: data.basic.gender,
    age: data.basic.age,
    heightCm: data.basic.heightCm,
    weightKg: data.basic.weightKg,
    occupation: '',
    jobType: '',
    workActivity: data.activity.work,
    exerciseRoutine: data.activity.exercise,
    sleepHours: '',
    stressLevel: '',
    cookingHabits: data.lifestyle.cooking.skill,
    eatingOut: '',
    caffeine: '',
    alcohol: '',
    activityLevel: 'moderate',
    dob: '',
    goal: data.goals.type,
    targetWeight: data.goals.targetWeight ?? data.basic.weightKg,
    goalSpeed: data.goals.speed === 'aggressive' ? 1.0 : 0.5,
    dietaryPrefs: data.lifestyle.diet !== 'noRestrictions' ? [data.lifestyle.diet] : [],
    healthConditions: data.health.conditions.filter(c => c !== 'pcos'),
    womenHealth: data.health.conditions.includes('pcos') ? ['pcos'] : [],
    menHealth: {
      prostateConcerns: data.health.genderSpecific?.prostate ?? false,
      testosteroneConcerns: data.health.genderSpecific?.testosterone ?? false,
    },
    medications: '',
    mealTimes: { breakfast: '08:00', lunch: '13:00', dinner: '19:00', snacks: '16:00' },
    waterGoal: Math.round(data.lifestyle.water * 1000),
    onboardingComplete: true,
    dailyCalories: data.goals.calories,
    originalDailyCalories: data.goals.calories,
    dailyProtein: data.goals.macros.protein,
    dailyCarbs: data.goals.macros.carbs,
    dailyFat: data.goals.macros.fat,
    bmi: +(data.basic.weightKg / ((data.basic.heightCm / 100) ** 2)).toFixed(1),
    bmr,
    tdee, // ← ACTUAL TDEE, not goal calories
    skinConcerns: data.health.skin !== 'none' ? { [data.health.skin]: true } : undefined,
    allergens: data.health.allergens || [],
    joinDate: toLocalDateKey(new Date()),
  };
  saveProfile(profile);

  // Wire budget settings to expense-store if user enabled budget
  if (data.lifestyle.budget.enabled && data.lifestyle.budget.amount > 0) {
    const dailyAmount = data.lifestyle.budget.amount;
    saveBudgetSettings({
      weeklyBudget: Math.round(dailyAmount * 7),
      monthlyBudget: Math.round(dailyAmount * 30),
      period: 'week',
      currency: '₹',
    });
  }
}
