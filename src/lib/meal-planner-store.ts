export interface MealPlannerProfile {
  // Personal
  name: string;
  gender: string;
  age: number;
  currentWeight: number;
  goalWeight: number;
  heightCm: number;
  weightUnit: 'kg' | 'lbs';
  bmi: number;

  // Goals
  mainGoal: string;
  motivations: string[];
  weeklyPace: number; // kg per week
  experienceLevel: string;
  challenges: string[];

  // Activity
  activityLevel: string;
  exerciseFrequency: string;
  exerciseTypes: string[];
  sleepHours: string;
  stressLevel: string;

  // Dietary
  dietaryPrefs: string[];
  medicalRestrictions: string[];
  allergies: string[];
  dislikedFoods: string;
  religiousRestrictions: string[];
  cuisinePrefs: string[];

  // Cooking
  cookingSkill: string;
  cookingTime: string;
  equipment: string[];
  eatingOutFrequency: string;
  mealPrep: string;
  snackingHabits: string[];

  // Structure
  mealsPerDay: number;
  dailyBudget: number;
  currency: string;

  // Calculated
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;

  onboardingComplete: boolean;
  createdAt: string;
}

export interface PlannedMeal {
  recipeId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  cooked: boolean;
  logged: boolean;
  portionScale?: number;
  batchGroup?: string;
}

export interface DayPlan {
  date: string;
  meals: PlannedMeal[];
}

export interface WeekPlan {
  weekStart: string;
  days: DayPlan[];
  generatedAt: string;
}

const PLANNER_PROFILE_KEY = 'nutrilens_meal_planner_profile';
const WEEK_PLAN_KEY_PREFIX = 'nutrilens_week_plan_';

export function getMealPlannerProfile(): MealPlannerProfile | null {
  const data = localStorage.getItem(PLANNER_PROFILE_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveMealPlannerProfile(profile: MealPlannerProfile) {
  localStorage.setItem(PLANNER_PROFILE_KEY, JSON.stringify(profile));
}

export function getWeekPlan(weekStart: string): WeekPlan | null {
  const data = localStorage.getItem(WEEK_PLAN_KEY_PREFIX + weekStart);
  return data ? JSON.parse(data) : null;
}

export function saveWeekPlan(plan: WeekPlan) {
  localStorage.setItem(WEEK_PLAN_KEY_PREFIX + plan.weekStart, JSON.stringify(plan));
}

export function getCurrentWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function markMealCooked(weekStart: string, date: string, recipeId: string) {
  const plan = getWeekPlan(weekStart);
  if (!plan) return;
  const day = plan.days.find(d => d.date === date);
  if (!day) return;
  const meal = day.meals.find(m => m.recipeId === recipeId);
  if (meal) {
    meal.cooked = true;
    meal.logged = true;
  }
  saveWeekPlan(plan);
}
