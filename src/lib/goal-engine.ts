// ============================================
// NutriLens AI – Intelligent Goal Decision Engine
// ============================================

import { calculateBMI, calculateBMR, calculateTDEE, calculateDailyTargets, getActivityMultiplier, calculateTDEEFromWorkExercise } from './nutrition';
import { getWeightEntries } from './weight-history';
import { getRecentLogs, getDailyTotals, type UserProfile } from './store';

// ── Types ──

export interface GoalDecision {
  originalGoal: string;
  effectiveGoal: 'lose' | 'maintain' | 'gain';
  wasOverridden: boolean;
  overrideReason: string | null;
  deficitPercent: number;
  surplusPercent: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  bmi: number;
  bmiCategory: string;
  expectedWeeklyChange: string;
  safetyNote: string | null;
  tdee: number;
  bmr: number;
}

export interface OnboardingGoalInput {
  gender: string;
  age: number;
  heightCm: number;
  weightKg: number;
  work: string;
  exercise: string;
  goalType: 'lose' | 'maintain' | 'gain';
  goalSpeed: 'balanced' | 'aggressive';
  healthConditions: string[];
  targetWeight?: number | null;
  diet?: string;
  cookingTime?: number;
  genderSpecific?: {
    pregnancy?: boolean;
    breastfeeding?: boolean;
    pcos?: boolean;
    pcosSeverity?: number | null;
    menstrualPhase?: string | null;
    prostate?: boolean;
    testosterone?: boolean;
  };
}

export interface OnboardingGoalResult {
  bmi: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  expectedRate: string;
  weeklyRate: number;
  goalType: 'lose' | 'maintain' | 'gain';
  safetyWarnings: string[];
  thyroidNote: string | null;
  weeksMin: number | null;
  weeksMax: number | null;
  adherenceScore: number;
  adherenceLabel: 'easy' | 'moderate' | 'hard';
  calorieCue: 'sustainable' | 'moderate' | 'aggressive';
  goalInsight: string | null;
}

// ── BMI Categories (WHO Asian thresholds) ──
function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 23) return 'normal';
  if (bmi < 27.5) return 'overweight';
  return 'obese';
}

// ── Adherence Score ──
function calculateAdherence(input: {
  protein: number;
  weightKg: number;
  diet?: string;
  goalType: string;
  cookingTime?: number;
  targetCalories: number;
  tdee: number;
  weeklyRate: number;
}): { score: number; label: 'easy' | 'moderate' | 'hard' } {
  let score = 100;
  if (input.protein > 130) score -= 10;
  if ((input.diet === 'veg' || input.diet === 'vegan') && input.protein > 110) score -= 15;
  if (input.goalType === 'gain' && (input.cookingTime ?? 30) < 20) score -= 10;
  if (input.goalType === 'lose' && input.protein > input.weightKg * 2.0) score -= 5;
  if (input.goalType === 'lose' && input.targetCalories < input.tdee * 0.75) score -= 10;
  if (input.targetCalories < 1400) score -= 10;
  if (input.goalType === 'lose' && input.weeklyRate > 0.75) score -= 10;
  score = Math.max(0, Math.min(100, score));
  const label: 'easy' | 'moderate' | 'hard' = score >= 80 ? 'easy' : score >= 60 ? 'moderate' : 'hard';
  return { score, label };
}

// ── Water with activity bonus ──
export function calculateWaterGoal(weightKg: number, multiplier: number): number {
  let water = weightKg * 0.035;
  if (multiplier >= 1.725) water += 1.0;
  else if (multiplier >= 1.55) water += 0.5;
  return Math.min(5.0, Math.max(0.5, +water.toFixed(1)));
}

// ── New Onboarding Goal Engine ──

export function calculateOnboardingGoals(input: OnboardingGoalInput): OnboardingGoalResult {
  const { gender, age, heightCm, weightKg, work, exercise, goalType, goalSpeed, healthConditions, targetWeight, diet, cookingTime } = input;

  const warnings: string[] = [];

  // 1. BMI
  const heightM = heightCm / 100;
  const bmi = +(weightKg / (heightM * heightM)).toFixed(1);

  // 2. BMR
  const bmr = Math.round(calculateBMR(weightKg, heightCm, age, gender));

  // 3. TDEE
  const multiplier = getActivityMultiplier(work, exercise);
  const tdee = Math.round(bmr * multiplier);

  // 4. Goal calories
  let target: number;
  if (goalType === 'lose') {
    target = Math.round(tdee * (goalSpeed === 'aggressive' ? 0.70 : 0.80));
  } else if (goalType === 'gain') {
    target = Math.round(tdee * (goalSpeed === 'aggressive' ? 1.20 : 1.10));
  } else {
    target = tdee;
  }

  // 4a. Gender-specific calorie adjustments (pregnancy/breastfeeding)
  const gs = input.genderSpecific;
  if (gs?.pregnancy) {
    target += 350;
    warnings.push('Added +350 kcal for pregnancy. Never go below 1800 kcal during pregnancy.');
  }
  if (gs?.breastfeeding) {
    target += 500;
    warnings.push('Added +500 kcal for breastfeeding. Stay well-hydrated (+1L water recommended).');
  }

  // Safety floor (pregnancy has higher minimum)
  const safetyFloor = gs?.pregnancy ? 1800 : 1200;
  target = Math.max(safetyFloor, Math.min(target, Math.round(tdee * 1.3)));
  if (target === safetyFloor && goalType === 'lose') {
    warnings.push(`Calorie target capped at ${safetyFloor} kcal for safety. Never go below this.`);
  }

  // 5. Protein (weight-based with goal-specific caps)
  let proteinFactor: number;
  let maxProteinFactor: number;
  if (goalType === 'lose') {
    proteinFactor = 1.8;
    maxProteinFactor = weightKg < 50 ? 1.8 : 2.0;
  } else if (goalType === 'gain') {
    proteinFactor = 1.6;
    maxProteinFactor = 2.2;
  } else {
    proteinFactor = 1.4;
    maxProteinFactor = 1.8;
  }

  // Activity bonus
  if (multiplier >= 1.725) proteinFactor += 0.4;
  else if (multiplier >= 1.55) proteinFactor += 0.2;
  proteinFactor = Math.min(proteinFactor, maxProteinFactor);

  let protein = Math.round(weightKg * proteinFactor);

  // 6. Fat = 25% of target
  let fat = Math.round((target * 0.25) / 9);

  // 7. Health adjustments (non-stacking carb reduction)
  const hasPcos = healthConditions.includes('pcos');
  const hasDiabetes = healthConditions.includes('diabetes');
  const hasThyroid = healthConditions.includes('thyroid');

  let carbFactor = 1.0;
  if (hasPcos && hasDiabetes) carbFactor = 0.75;
  else if (hasPcos) carbFactor = 0.85;
  else if (hasDiabetes) carbFactor = 0.80;

  let fatFactor = hasPcos ? 1.10 : 1.0;

  // 8. Base carbs
  let baseCarbs = Math.round(((target - (protein * 4) - (fat * 9)) / 4));
  let adjCarbs = Math.round(baseCarbs * carbFactor);
  let adjFat = Math.round(fat * fatFactor);

  // 9. Scale macros to match target calories exactly
  const totalCal = protein * 4 + adjFat * 9 + adjCarbs * 4;
  if (totalCal > 0 && Math.abs(totalCal - target) > 5) {
    const scale = target / totalCal;
    protein = Math.round(protein * scale);
    adjFat = Math.round(adjFat * scale);
    adjCarbs = Math.round(adjCarbs * scale);
  }

  // 10. Constraint order: protein cap → fat min → carbs floor
  // Cap protein
  const maxProtein = Math.round(weightKg * maxProteinFactor);
  if (protein > maxProtein) protein = maxProtein;

  // Remaining after protein
  let remaining = target - (protein * 4);

  // Fat minimum = 20% of target
  const minFatCal = target * 0.20;
  if (adjFat * 9 < minFatCal) {
    adjFat = Math.round(minFatCal / 9);
  }
  if (adjFat * 9 > remaining) {
    adjFat = Math.floor(remaining / 9);
  }

  // Carbs from remaining
  remaining = target - (protein * 4) - (adjFat * 9);
  adjCarbs = Math.round(remaining / 4);

  // Carbs floor at 50g
  if (adjCarbs < 50) {
    warnings.push('Carbs were below 50g minimum. Fat reduced slightly to maintain calorie target.');
    const deficit = (50 - adjCarbs) * 4;
    adjFat = Math.max(0, adjFat - Math.ceil(deficit / 9));
    remaining = target - (protein * 4) - (adjFat * 9);
    adjCarbs = Math.max(50, Math.round(remaining / 4));
  }

  // 11. Expected weight change + timeline
  let weeklyRate = 0;
  let expectedRate = 'stable';
  let weeksMin: number | null = null;
  let weeksMax: number | null = null;

  if (goalType === 'lose') {
    const deficit = tdee - target;
    weeklyRate = Math.min((deficit * 7) / 7700, 1.0);
    expectedRate = `${weeklyRate.toFixed(1)} kg per week`;
  } else if (goalType === 'gain') {
    const surplus = target - tdee;
    weeklyRate = Math.min((surplus * 7) / 7700, 0.5);
    expectedRate = `${weeklyRate.toFixed(1)} kg per week`;
  }

  if ((goalType === 'lose' || goalType === 'gain') && targetWeight != null && weeklyRate > 0) {
    const weightDiff = Math.abs(weightKg - targetWeight);
    weeksMin = Math.floor(weightDiff / weeklyRate);
    weeksMax = Math.ceil(weightDiff / (weeklyRate * 0.8));
  }

  // 12. Calorie cue
  const ratio = target / tdee;
  const calorieCue: 'sustainable' | 'moderate' | 'aggressive' =
    ratio >= 0.95 ? 'sustainable' : ratio >= 0.80 ? 'moderate' : 'aggressive';

  // 13. Adherence
  const adherence = calculateAdherence({
    protein, weightKg, diet, goalType, cookingTime, targetCalories: target, tdee, weeklyRate,
  });

  // 14. Goal insight
  let goalInsight: string | null = null;
  if (goalType === 'lose' && protein > 100) {
    goalInsight = 'Your plan will prioritize lean proteins like chicken breast, tofu, and low-fat dairy.';
  } else if (goalType === 'gain' && protein > 120) {
    goalInsight = 'Your plan will prioritize calorie-dense proteins like eggs, full-fat dairy, and protein shakes.';
  }
  if ((diet === 'veg' || diet === 'vegan') && protein > 90) {
    goalInsight = 'Your plan will use lentils, paneer, tofu, and protein powder to meet your protein goal.';
  }

  const thyroidNote = hasThyroid
    ? "Your metabolism may respond differently due to thyroid condition. We'll monitor and adjust."
    : null;

  return {
    bmi, bmr, tdee, targetCalories: target,
    protein, carbs: adjCarbs, fat: adjFat,
    expectedRate, weeklyRate, goalType,
    safetyWarnings: warnings, thyroidNote,
    weeksMin, weeksMax,
    adherenceScore: adherence.score, adherenceLabel: adherence.label,
    calorieCue, goalInsight,
  };
}

// ── Legacy Goal Decision Engine ──

export interface AdaptiveResult {
  shouldAdjust: boolean;
  newTargetCalories: number;
  reason: string;
  weeklyWeightChange: number;
  avgDailyIntake: number;
  consistencyScore: number;
}

export function determineGoalAndTargets(
  weightKg: number, heightCm: number, age: number, gender: string,
  activityLevel: string, userGoal: string,
  healthConditions?: string[], womenHealth?: string[]
): GoalDecision {
  const bmi = calculateBMI(weightKg, heightCm);
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const bmiCategory = getBmiCategory(bmi);

  let effectiveGoal: 'lose' | 'maintain' | 'gain' = userGoal as any;
  let wasOverridden = false;
  let overrideReason: string | null = null;
  let deficitPercent = 0;
  let surplusPercent = 0;
  let safetyNote: string | null = null;

  if (bmiCategory === 'obese') {
    if (userGoal !== 'lose') {
      effectiveGoal = 'lose'; wasOverridden = true;
      overrideReason = `Your BMI (${bmi.toFixed(1)}) indicates obesity. We've set your goal to fat loss for health safety.`;
    }
    deficitPercent = 25;
  } else if (bmiCategory === 'overweight') {
    if (userGoal === 'gain') {
      effectiveGoal = 'lose'; wasOverridden = true;
      overrideReason = `Your BMI (${bmi.toFixed(1)}) is in the overweight range. We recommend fat loss before gaining.`;
      deficitPercent = 20;
    } else if (userGoal === 'lose') { deficitPercent = 20; }
  } else if (bmiCategory === 'normal') {
    if (userGoal === 'lose') deficitPercent = 15;
    else if (userGoal === 'gain') surplusPercent = 10;
  } else if (bmiCategory === 'underweight') {
    if (userGoal !== 'gain') {
      effectiveGoal = 'gain'; wasOverridden = true;
      overrideReason = `Your BMI (${bmi.toFixed(1)}) is underweight. We've set your goal to healthy weight gain.`;
    }
    surplusPercent = 20;
  }

  let targetCalories = tdee;
  if (effectiveGoal === 'lose') {
    targetCalories = tdee * (1 - deficitPercent / 100);
    const minCalories = gender === 'female' ? 1200 : 1500;
    if (targetCalories < minCalories) { targetCalories = minCalories; safetyNote = `Calorie target capped at ${minCalories} kcal for safety.`; }
  } else if (effectiveGoal === 'gain') {
    targetCalories = tdee * (1 + surplusPercent / 100);
    if (targetCalories < tdee + 250) targetCalories = tdee + 250;
  }
  targetCalories = Math.round(targetCalories);

  const macros = calculateDailyTargets(tdee, effectiveGoal, healthConditions, womenHealth, targetCalories);

  const weeklyDeficit = (tdee - targetCalories) * 7;
  const weeklyChange = weeklyDeficit / 7700;
  let expectedWeeklyChange: string;
  if (effectiveGoal === 'lose') expectedWeeklyChange = `~${weeklyChange.toFixed(1)} kg/week loss`;
  else if (effectiveGoal === 'gain') {
    const weeklyGain = ((targetCalories - tdee) * 7) / 7700;
    expectedWeeklyChange = `~${weeklyGain.toFixed(1)} kg/week gain`;
  } else expectedWeeklyChange = 'Maintain current weight';

  return {
    originalGoal: userGoal, effectiveGoal, wasOverridden, overrideReason,
    deficitPercent, surplusPercent, targetCalories,
    targetProtein: macros.protein, targetCarbs: macros.carbs, targetFat: macros.fat,
    bmi, bmiCategory, expectedWeeklyChange, safetyNote, tdee, bmr,
  };
}

// ── Weekly Adaptive Engine ──

const ADAPTATION_KEY = 'nutrilens_last_adaptation';
const ADAPTATION_LOG_KEY = 'nutrilens_adaptation_log';

export function getLastAdaptationDate(): string | null {
  return localStorage.getItem(ADAPTATION_KEY);
}

export function setLastAdaptationDate(date: string) {
  localStorage.setItem(ADAPTATION_KEY, date);
}

interface AdaptationLogEntry {
  date: string; oldTarget: number; newTarget: number; reason: string; weeklyWeightChange: number;
}

function getAdaptationLog(): AdaptationLogEntry[] {
  const data = localStorage.getItem(ADAPTATION_LOG_KEY);
  return data ? JSON.parse(data) : [];
}

function saveAdaptationEntry(entry: AdaptationLogEntry) {
  const log = getAdaptationLog();
  log.push(entry);
  if (log.length > 12) log.splice(0, log.length - 12);
  localStorage.setItem(ADAPTATION_LOG_KEY, JSON.stringify(log));
}

export function runWeeklyAdaptation(profile: UserProfile): AdaptiveResult | null {
  const lastAdaptation = getLastAdaptationDate();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (lastAdaptation) {
    const daysSince = (Date.now() - new Date(lastAdaptation).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return null;
  }

  const weightEntries = getWeightEntries();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recentWeights = weightEntries.filter(w => new Date(w.date) >= twoWeeksAgo);
  if (recentWeights.length < 2) return null;

  const recentLogs = getRecentLogs(14);
  const loggedDays = recentLogs.filter(l => l.meals.length > 0);
  const consistencyScore = loggedDays.length / 14;
  if (loggedDays.length < 5) return null;

  const totalIntake = loggedDays.reduce((sum, log) => {
    const totals = getDailyTotals(log);
    return sum + totals.eaten;
  }, 0);
  const avgDailyIntake = Math.round(totalIntake / loggedDays.length);

  const firstWeight = recentWeights[0].weight;
  const lastWeight = recentWeights[recentWeights.length - 1].weight;
  const daysBetween = (new Date(recentWeights[recentWeights.length - 1].date).getTime() -
    new Date(recentWeights[0].date).getTime()) / (1000 * 60 * 60 * 24);
  const weeklyWeightChange = daysBetween > 0 ? ((lastWeight - firstWeight) / daysBetween) * 7 : 0;

  const currentTarget = profile.dailyCalories;
  const goal = profile.goal;
  const minCalories = profile.gender === 'female' ? 1200 : 1500;

  let shouldAdjust = false;
  let newTarget = currentTarget;
  let reason = '';

  if (goal === 'lose') {
    const bodyWeightPercent = Math.abs(weeklyWeightChange) / profile.weightKg * 100;
    if (weeklyWeightChange >= 0) {
      const reduction = Math.round(currentTarget * 0.07);
      newTarget = Math.max(minCalories, currentTarget - reduction);
      shouldAdjust = newTarget !== currentTarget;
      reason = `Weight stalled (${weeklyWeightChange > 0 ? '+' : ''}${weeklyWeightChange.toFixed(2)} kg/wk). Reducing target by ${reduction} kcal.`;
    } else if (bodyWeightPercent > 1) {
      const increase = Math.round(currentTarget * 0.05);
      newTarget = currentTarget + increase;
      shouldAdjust = true;
      reason = `Losing too fast (${weeklyWeightChange.toFixed(2)} kg/wk). Increasing target by ${increase} kcal for safety.`;
    }
  } else if (goal === 'gain') {
    if (weeklyWeightChange <= 0) {
      const increase = Math.round(currentTarget * 0.07);
      newTarget = currentTarget + increase;
      shouldAdjust = true;
      reason = `Not gaining weight. Increasing target by ${increase} kcal.`;
    } else if (weeklyWeightChange > 0.5) {
      const reduction = Math.round(currentTarget * 0.05);
      newTarget = currentTarget - reduction;
      shouldAdjust = true;
      reason = `Gaining too fast. Reducing target by ${reduction} kcal.`;
    }
  }

  if (shouldAdjust) {
    setLastAdaptationDate(today);
    saveAdaptationEntry({ date: today, oldTarget: currentTarget, newTarget, reason, weeklyWeightChange });
  }

  return { shouldAdjust, newTargetCalories: Math.round(newTarget), reason, weeklyWeightChange, avgDailyIntake, consistencyScore };
}

export function applyAdaptation(profile: UserProfile, newCalories: number): Partial<UserProfile> {
  const ratio = newCalories / profile.dailyCalories;
  return {
    dailyCalories: newCalories,
    dailyProtein: Math.round(profile.dailyProtein * ratio),
    dailyCarbs: Math.round(profile.dailyCarbs * ratio),
    dailyFat: Math.round(profile.dailyFat * ratio),
  };
}

export function getAdaptationHistory(): AdaptationLogEntry[] {
  return getAdaptationLog();
}
