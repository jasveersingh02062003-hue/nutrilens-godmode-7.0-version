// Event Plan Service — plan catalog, target calculation, active plan state

export type PlanType = 'celebrity_transformation' | 'sugar_cut' | 'gym_fat_loss' | 'gym_muscle_gain' | 'madhavan_21_day' | 'event_based';
export type PlanCategory = 'weight_loss' | 'sugar_free' | 'muscle' | 'circadian' | 'event' | 'all';

export type EventGoalType = 'lose' | 'gain' | 'tummy' | 'shape';
export type ExerciseTime = 'none' | '10min' | '30min' | '1hour';
export type CookingTime = 'none' | 'limited' | 'plenty';
export type BudgetTier = 'tight' | 'moderate' | 'flexible';

export interface EventPlanSettings {
  eventType: string;
  eventDate: string; // YYYY-MM-DD
  goalType: EventGoalType;
  targetWeight: number;
  exerciseTime: ExerciseTime;
  cookingTime: CookingTime;
  budgetTier: BudgetTier;
  fastingWindow: 0 | 12 | 14 | 16;
  boosters: string[];
}

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

export interface MadhavanSettings {
  eatingWindowStart: string; // HH:MM
  eatingWindowEnd: string;
  stepsTarget: number;
  waterMultiplier: number; // ml per kg
  chewCount: number;
  sleepTime: string;
  noRawFoodAfter: string; // HH:MM (15:00)
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
  status?: 'active' | 'paused';
  pausedAt?: string;
  cancelledAt?: string;
  customSettings?: MadhavanSettings;
  eventSettings?: EventPlanSettings;
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
const HISTORY_KEY = 'nutrilens_plan_history';
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
  {
    id: 'madhavan_21_day',
    name: 'Madhavan 21-Day Metabolic Reset',
    emoji: '🧘',
    description: 'Align with circadian rhythms, mindful eating, and low-intensity movement. No gym required.',
    shortBenefit: 'Circadian reset & fat loss',
    price: 599,
    durationOptions: [21],
    defaultDuration: 21,
    category: 'circadian',
    rating: 4.9,
    reviewCount: 1583,
    rules: [
      'Intermittent fasting 12h',
      'Chew 50 times per bite',
      'Home-cooked only',
      'No junk food',
      'Leafy greens daily',
      'No raw food after 3 PM',
      'Hydration 40ml/kg',
      'Sleep by 10 PM',
    ],
    includes: [
      'Circadian meal plan',
      'Chewing timer',
      'Body awareness journal',
      'Eating window guard',
      'Reverse diet transition',
      'Progress tracking',
      'PDF export',
    ],
  },
  {
    id: 'event_based' as PlanType,
    name: 'Transform for Your Event',
    emoji: '🎯',
    description: 'Deadline-driven plan for weddings, vacations, meetings — personalized to your constraints and budget.',
    shortBenefit: 'Event-ready transformation',
    price: 399,
    durationOptions: [7, 14, 21, 30, 45, 60],
    defaultDuration: 30,
    category: 'event' as PlanCategory,
    rating: 4.7,
    reviewCount: 2134,
    rules: ['Deadline-driven targets', 'Budget-aware meals', 'Constraint-fit recipes', 'Daily boosters', 'Walking goals'],
    includes: ['Custom event plan', 'Daily boosters checklist', 'Activity tracker', 'Budget-fit meals', 'Post-event feedback', 'Progress tracking'],
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

// Calculate event-based plan targets
export function calculateEventTargets(
  currentWeight: number,
  targetWeight: number,
  duration: number,
  tdee: number,
  goalType: EventGoalType,
): PlanTargets {
  const isGain = goalType === 'gain';
  if (isGain) {
    const surplus = 350;
    const dailyCalories = Math.round(tdee + surplus);
    const dailyProtein = Math.round(currentWeight * 1.8);
    const proteinCals = dailyProtein * 4;
    const fatCals = dailyCalories * 0.25;
    const dailyFat = Math.round(fatCals / 9);
    const dailyCarbs = Math.round((dailyCalories - proteinCals - fatCals) / 4);
    return { dailyCalories, dailyProtein, dailyCarbs, dailyFat, dailyDeficit: -surplus, weeklyLoss: -(surplus * 7) / KCAL_PER_KG, feasible: true };
  }

  // Loss / tummy / shape
  const weightDiff = currentWeight - targetWeight;
  const totalDeficit = weightDiff * KCAL_PER_KG;
  const dailyDeficit = Math.round(totalDeficit / duration);
  const weeklyLoss = (dailyDeficit * 7) / KCAL_PER_KG;
  let dailyCalories = Math.round(tdee - dailyDeficit);
  let warning: string | undefined;
  let feasible = true;

  if (dailyCalories < MIN_CALORIES) {
    dailyCalories = MIN_CALORIES;
    warning = `Clamped to ${MIN_CALORIES} kcal/day for safety.`;
  }
  if (weeklyLoss > MAX_WEEKLY_LOSS) {
    feasible = false;
    warning = `Requires ${weeklyLoss.toFixed(1)} kg/week loss — exceeds safe limit. Consider a longer duration.`;
  }

  // Tummy: higher protein, lower carbs; Shape: moderate
  const proteinPerKg = goalType === 'tummy' ? 2.0 : goalType === 'shape' ? 1.8 : 1.6;
  const dailyProtein = Math.round(currentWeight * proteinPerKg);
  const proteinCals = dailyProtein * 4;
  const carbRatio = goalType === 'tummy' ? 0.35 : 0.45;
  const remaining = Math.max(0, dailyCalories - proteinCals);
  const dailyCarbs = Math.round((remaining * carbRatio) / 4);
  const dailyFat = Math.round((remaining * (1 - carbRatio)) / 9);

  return { dailyCalories, dailyProtein, dailyCarbs, dailyFat, dailyDeficit, weeklyLoss, feasible, warning };
}

// Check if expired plan exists for post-event feedback
export function getExpiredEventPlan(): ActivePlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const plan = JSON.parse(raw) as ActivePlan;
    if (plan.planId !== 'event_based') return null;
    const endDate = new Date(plan.startDate);
    endDate.setDate(endDate.getDate() + plan.duration);
    if (new Date() > endDate) {
      // Don't remove yet — let feedback modal handle it
      return plan;
    }
    return null;
  } catch {
    return null;
  }
}

// Returns the raw plan regardless of status (for UI display)
export function getActivePlanRaw(): ActivePlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActivePlan;
  } catch {
    return null;
  }
}

// Active plan CRUD — returns null if paused or expired
export function getActivePlan(): ActivePlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const plan = JSON.parse(raw) as ActivePlan;
    // Paused plans are not "active" for calorie engine purposes
    if (plan.status === 'paused') return null;
    const endDate = new Date(plan.startDate);
    endDate.setDate(endDate.getDate() + plan.duration);
    if (new Date() > endDate) {
      if (plan.planId === 'event_based') {
        const feedbackKey = `nutrilens_event_feedback_${plan.startDate}`;
        if (!localStorage.getItem(feedbackKey)) return null;
      }
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
  window.dispatchEvent(new Event('nutrilens:plan_changed'));
}

export function clearActivePlan(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('nutrilens:plan_changed'));
}

export function isPlanActive(): boolean {
  return getActivePlan() !== null;
}

// Pause / Resume / Cancel
export function pauseActivePlan(): void {
  const raw = getActivePlanRaw();
  if (raw && (raw.status || 'active') === 'active') {
    raw.status = 'paused';
    raw.pausedAt = new Date().toISOString();
    setActivePlan(raw);
  }
}

export function resumeActivePlan(): void {
  const raw = getActivePlanRaw();
  if (raw && raw.status === 'paused') {
    raw.status = 'active';
    delete raw.pausedAt;
    setActivePlan(raw);
  }
}

export function cancelActivePlan(): void {
  const raw = getActivePlanRaw();
  if (raw) {
    const history: ActivePlan[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push({ ...raw, cancelledAt: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    clearActivePlan();
  }
}

export function getPlanHistory(): ActivePlan[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getPlanProgress(plan?: ActivePlan | null): { dayNumber: number; totalDays: number; daysLeft: number; percentComplete: number } | null {
  const p = plan ?? getActivePlanRaw();
  if (!p) return null;
  const start = new Date(p.startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const dayNumber = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const daysLeft = Math.max(0, p.duration - dayNumber);
  return {
    dayNumber: Math.min(dayNumber, p.duration),
    totalDays: p.duration,
    daysLeft,
    percentComplete: Math.round((Math.min(dayNumber, p.duration) / p.duration) * 100),
  };
}
