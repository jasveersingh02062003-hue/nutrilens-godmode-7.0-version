// ============================================
// NutriLens AI – Unified Profile Mapper
// ============================================
// Single source of truth for converting between
// UserProfile (client) ↔ DB row (Supabase profiles table).
// Used by both AuthContext and UserProfileContext.

import type { UserProfile } from '@/lib/store';
import { getBudgetSettings, saveBudgetSettings } from '@/lib/expense-store';
import { getEnhancedBudgetSettings, saveEnhancedBudgetSettings } from '@/lib/budget-alerts';
import { getMealPlannerProfile, saveMealPlannerProfile } from '@/lib/meal-planner-store';

/**
 * Convert a UserProfile + separate localStorage settings into a
 * flat DB row for the `profiles` table.
 */
export function profileToDbRow(profile: UserProfile, userId: string): Record<string, unknown> {
  // Pack budget settings from separate localStorage keys
  const budgetPayload = {
    settings: getBudgetSettings(),
    enhanced: getEnhancedBudgetSettings(),
    mealPlannerProfile: getMealPlannerProfile(),
  };

  const profileAny = profile as unknown as Record<string, unknown>;

  return {
    id: userId,
    name: profile.name,
    gender: profile.gender,
    occupation: profile.occupation,
    job_type: profile.jobType,
    work_activity: profile.workActivity,
    exercise_routine: profile.exerciseRoutine,
    sleep_hours: profile.sleepHours,
    stress_level: profile.stressLevel,
    cooking_habits: profile.cookingHabits,
    eating_out: profile.eatingOut,
    caffeine: profile.caffeine,
    alcohol: profile.alcohol,
    activity_level: profile.activityLevel,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    dob: profile.dob,
    age: profile.age,
    goal: profile.goal,
    target_weight: profile.targetWeight,
    goal_speed: profile.goalSpeed,
    dietary_prefs: profile.dietaryPrefs,
    health_conditions: profile.healthConditions,
    women_health: profile.womenHealth,
    men_health: profile.menHealth,
    medications: profile.medications,
    meal_times: profile.mealTimes,
    water_goal: profile.waterGoal,
    onboarding_complete: profile.onboardingComplete,
    daily_calories: profile.dailyCalories,
    daily_protein: profile.dailyProtein,
    daily_carbs: profile.dailyCarbs,
    daily_fat: profile.dailyFat,
    bmi: profile.bmi,
    bmr: profile.bmr,
    tdee: profile.tdee,
    join_date: profile.joinDate || null,
    budget: budgetPayload,
    conditions: {
      ...((profileAny.conditions as Record<string, unknown>) || {}),
      allergens: profile.allergens || [],
      skinConcerns: profile.skinConcerns || undefined,
      travelFrequency: profile.travelFrequency || undefined,
      kitchenAppliances: profile.kitchenAppliances || undefined,
      workplaceFacilities: profile.workplaceFacilities || undefined,
      carriesFood: profile.carriesFood || undefined,
      livingSituation: profile.livingSituation || undefined,
      gym: profile.gym || undefined,
    },
    coach_settings: profileAny.coachSettings ?? null,
    learning: profileAny.learning ?? null,
    notification_settings: profileAny.notificationSettings ?? null,
  };
}

/**
 * Convert a DB row from the `profiles` table back into a UserProfile.
 * Also restores budget/planner data to their separate localStorage keys.
 */
export function dbRowToProfile(row: Record<string, unknown>): UserProfile {
  const budget = row.budget as Record<string, unknown> | null;
  const conditions = row.conditions as Record<string, unknown> | null;
  const mealTimes = row.meal_times as Record<string, string> | null;

  // Restore budget settings from cloud to their separate localStorage keys
  if (budget) {
    if (budget.settings) saveBudgetSettings(budget.settings as Parameters<typeof saveBudgetSettings>[0]);
    if (budget.enhanced) saveEnhancedBudgetSettings(budget.enhanced as Parameters<typeof saveEnhancedBudgetSettings>[0]);
    if (budget.mealPlannerProfile) saveMealPlannerProfile(budget.mealPlannerProfile as Parameters<typeof saveMealPlannerProfile>[0]);
  }

  return {
    name: (row.name as string) || '',
    gender: (row.gender as string) || '',
    occupation: (row.occupation as string) || '',
    jobType: (row.job_type as string) || '',
    workActivity: (row.work_activity as string) || '',
    exerciseRoutine: (row.exercise_routine as string) || '',
    sleepHours: (row.sleep_hours as string) || '',
    stressLevel: (row.stress_level as string) || '',
    cookingHabits: (row.cooking_habits as string) || '',
    eatingOut: (row.eating_out as string) || '',
    caffeine: (row.caffeine as string) || '',
    alcohol: (row.alcohol as string) || '',
    activityLevel: (row.activity_level as string) || 'moderate',
    heightCm: Number(row.height_cm) || 170,
    weightKg: Number(row.weight_kg) || 70,
    dob: (row.dob as string) || '',
    age: Number(row.age) || 25,
    goal: (row.goal as string) || 'lose',
    targetWeight: Number(row.target_weight) || 65,
    goalSpeed: Number(row.goal_speed) || 0.5,
    dietaryPrefs: (row.dietary_prefs as string[]) || [],
    healthConditions: (row.health_conditions as string[]) || [],
    womenHealth: (row.women_health as string[]) || [],
    menHealth: (row.men_health as Record<string, unknown>) || {},
    medications: (row.medications as string) || '',
    mealTimes: mealTimes || { breakfast: '08:00', lunch: '13:00', dinner: '20:00', snacks: '16:00' },
    waterGoal: Number(row.water_goal) || 8,
    onboardingComplete: Boolean(row.onboarding_complete),
    dailyCalories: Number(row.daily_calories) || 2000,
    dailyProtein: Number(row.daily_protein) || 75,
    dailyCarbs: Number(row.daily_carbs) || 250,
    dailyFat: Number(row.daily_fat) || 65,
    bmi: Number(row.bmi) || 24,
    bmr: Number(row.bmr) || 1500,
    tdee: Number(row.tdee) || 2000,
    joinDate: (row.join_date as string) || undefined,
    // Restore all lifestyle fields from conditions JSON
    skinConcerns: conditions?.skinConcerns as UserProfile['skinConcerns'],
    allergens: (conditions?.allergens as string[]) || [],
    travelFrequency: conditions?.travelFrequency as UserProfile['travelFrequency'],
    kitchenAppliances: conditions?.kitchenAppliances as string[],
    workplaceFacilities: conditions?.workplaceFacilities as string[],
    carriesFood: conditions?.carriesFood as UserProfile['carriesFood'],
    livingSituation: conditions?.livingSituation as UserProfile['livingSituation'],
    gym: conditions?.gym as UserProfile['gym'],
  } as UserProfile;
}
