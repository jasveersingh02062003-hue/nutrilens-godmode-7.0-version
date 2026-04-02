// Event Plan Service — plan catalog, target calculation, active plan state

export type PlanType = 'celebrity_transformation' | 'sugar_cut' | 'gym_fat_loss' | 'gym_muscle_gain';
export type PlanCategory = 'weight_loss' | 'sugar_free' | 'muscle' | 'all';

export interface PlanMeta {
  id: PlanType;
  name: string;
  emoji: string;
  description: string;
  shortBenefit: string;
  price: number;
  durationOptions: number[];
  defaultDuration: number;
  category: PlanCategory;
  rating: number;
  reviewCount: number;
  rules: string[];
  includes: string[];
}

export interface ActivePlan {
  planId: PlanType;
  startDate: string; // YYYY-MM-DD
  duration: number; // days
  targetWeight: number;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyDeficit: number;
  activatedAt: string;
}

export interface PlanTargets {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyDeficit: number;
  weeklyLoss: number;
  feasible: boolean;
  warning?: string;
}

const STORAGE_KEY = 'nutrilens_active_plan';
const KCAL_PER_KG = 7700;
const MIN_CALORIES = 1200;
const MAX_WEEKLY_LOSS = 1; // kg

export const PLAN_CATALOG: PlanMeta[] = [
  {
    id: 'celebrity_transformation',
    name: '21-Day Celebrity Transformation',
    emoji: '✨',
    description: 'The exact protocol used by Bollywood trainers. Aggressive but safe fat loss with lean muscle retention.',
    shortBenefit: 'Rapid visible results',
    price: 999,
    durationOptions: [14, 21, 30],
    defaultDuration: 21,
    category: 'weight_loss',
    rating: 4.8,
    reviewCount: 1247,
    rules: ['High protein', 'Low carb evenings', 'No processed sugar', 'Intermittent fasting optional'],
    includes: ['Custom meal plan', 'Daily calorie targets', 'Grocery list', 'Progress tracking', 'Sugar detection alerts', 'PDF export'],
  },
  {
    id: 'sugar_cut',
    name: 'Sugar Cut Challenge',
    emoji: '🚫🍬',
    description: 'Eliminate added sugar completely. Reduce cravings, improve skin, stabilize energy levels.',
    shortBenefit: 'Beat sugar cravings',
    price: 499,
    durationOptions: [7, 14, 21],
    defaultDuration: 14,
    category: 'sugar_free',
    rating: 4.6,
    reviewCount: 832,
    rules: ['Zero added sugar', 'No artificial sweeteners', 'Natural fruit allowed (limited)', 'Focus on whole foods'],
    includes: ['Sugar-free meal plan', 'Sugar detection in food scans', 'Warning alerts', 'Craving alternatives', 'Progress tracking'],
  },
  {
    id: 'gym_fat_loss',
    name: 'Gym Lover — Fat Loss',
    emoji: '🏋️‍♂️🔥',
    description: 'High protein, moderate deficit. Preserve muscle while cutting fat. Perfect for gym-goers.',
    shortBenefit: 'Cut fat, keep muscle',
    price: 699,
    durationOptions: [14, 21, 30],
    defaultDuration: 21,
    category: 'weight_loss',
    rating: 4.7,
    reviewCount: 956,
    rules: ['2g protein/kg bodyweight', 'Moderate carbs around workouts', 'Low fat', 'Pre & post workout meals'],
    includes: ['Gym-optimized meal plan', 'Pre/post workout meals', 'Protein tracking', 'Supplement suggestions', 'Progress photos'],
  },
  {
    id: 'gym_muscle_gain',
    name: 'Gym Lover — Muscle Gain',
    emoji: '💪📈',
    description: 'Lean bulk with clean surplus. Gain muscle with minimal fat. Structured around your training.',
    shortBenefit: 'Clean muscle gain',
    price: 699,
    durationOptions: [21, 30, 60],
    defaultDuration: 30,
    category: 'muscle',
    rating: 4.5,
    reviewCount: 678,
    rules: ['Caloric surplus 300-500 kcal', '2g protein/kg', 'High carb on training days', 'Moderate fat'],
    includes: ['Bulking meal plan', 'Training day / rest day splits', 'Calorie cycling', 'Progress tracking', 'Weekly adjustments'],
  },
];

export function getPlanById(id: PlanType): PlanMeta | undefined {
  return PLAN_CATALOG.find(p => p.id === id);
}

export function getPlansByCategory(category: PlanCategory): PlanMeta[] {
  if (category === 'all') return PLAN_CATALOG;
  return PLAN_CATALOG.filter(p => p.category === category);
}

export function calculatePlanTargets(
  currentWeight: number,
  targetWeight: number,
  duration: number,
  tdee: number,
  planType: PlanType
): PlanTargets {
  const weightDiff = currentWeight - targetWeight; // positive = loss
  const isGain = planType === 'gym_muscle_gain';

  if (isGain) {
    // Surplus of 300-500 kcal
    const surplus = 400;
    const dailyCalories = Math.round(tdee + surplus);
    const proteinPerKg = 2;
    const dailyProtein = Math.round(currentWeight * proteinPerKg);
    const proteinCals = dailyProtein * 4;
    const fatCals = dailyCalories * 0.25;
    const dailyFat = Math.round(fatCals / 9);
    const carbCals = dailyCalories - proteinCals - fatCals;
    const dailyCarbs = Math.round(carbCals / 4);

    return {
      dailyCalories,
      dailyProtein,
      dailyCarbs,
      dailyFat,
      dailyDeficit: -surplus,
      weeklyLoss: -(surplus * 7) / KCAL_PER_KG,
      feasible: true,
    };
  }

  // Weight loss plans
  const totalDeficit = weightDiff * KCAL_PER_KG;
  const dailyDeficit = Math.round(totalDeficit / duration);
  const weeklyLoss = (dailyDeficit * 7) / KCAL_PER_KG;
  let dailyCalories = Math.round(tdee - dailyDeficit);

  let warning: string | undefined;
  let feasible = true;

  if (dailyCalories < MIN_CALORIES) {
    dailyCalories = MIN_CALORIES;
    warning = `Target requires very aggressive deficit. Clamped to ${MIN_CALORIES} kcal/day for safety.`;
  }

  if (weeklyLoss > MAX_WEEKLY_LOSS) {
    feasible = false;
    warning = `This target requires losing ${weeklyLoss.toFixed(1)} kg/week — exceeds safe limit of ${MAX_WEEKLY_LOSS} kg/week. Consider a longer duration.`;
  }

  const proteinPerKg = planType === 'gym_fat_loss' ? 2 : 1.6;
  const dailyProtein = Math.round(currentWeight * proteinPerKg);
  const proteinCals = dailyProtein * 4;
  const fatCals = dailyCalories * 0.22;
  const dailyFat = Math.round(fatCals / 9);
  const carbCals = Math.max(0, dailyCalories - proteinCals - fatCals);
  const dailyCarbs = Math.round(carbCals / 4);

  return {
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFat,
    dailyDeficit,
    weeklyLoss,
    feasible,
    warning,
  };
}

// Active plan CRUD
export function getActivePlan(): ActivePlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const plan = JSON.parse(raw) as ActivePlan;
    // Check if plan has expired
    const endDate = new Date(plan.startDate);
    endDate.setDate(endDate.getDate() + plan.duration);
    if (new Date() > endDate) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return plan;
  } catch {
    return null;
  }
}

export function setActivePlan(plan: ActivePlan): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function clearActivePlan(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isPlanActive(): boolean {
  return getActivePlan() !== null;
}

export function getPlanProgress(): { dayNumber: number; totalDays: number; daysLeft: number; percentComplete: number } | null {
  const plan = getActivePlan();
  if (!plan) return null;
  const start = new Date(plan.startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const dayNumber = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const daysLeft = Math.max(0, plan.duration - dayNumber);
  return {
    dayNumber: Math.min(dayNumber, plan.duration),
    totalDays: plan.duration,
    daysLeft,
    percentComplete: Math.round((Math.min(dayNumber, plan.duration) / plan.duration) * 100),
  };
}
