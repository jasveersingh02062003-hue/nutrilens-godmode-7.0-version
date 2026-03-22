// Mifflin-St Jeor BMR calculation
export function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === 'female' ? base - 161 : base + 5;
}

export function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

// WHO Asian BMI thresholds
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 23) return 'Normal';
  if (bmi < 27.5) return 'Overweight';
  return 'Obese';
}

export function getBMIColor(bmi: number): string {
  if (bmi < 18.5) return 'text-accent';
  if (bmi < 23) return 'text-primary';
  if (bmi < 27.5) return 'text-coral';
  return 'text-destructive';
}

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export function calculateTDEE(bmr: number, activityLevel: string): number {
  return bmr * (activityMultipliers[activityLevel] || 1.55);
}

/**
 * Calculate macro targets for a given calorie budget.
 * NOTE: This function no longer applies deficit/surplus — that logic
 * lives in the Goal Engine (src/lib/goal-engine.ts). Pass the
 * already-adjusted calorie target here for correct macro splits.
 *
 * For backward-compat, if `calories` is omitted the function falls
 * back to using `tdee` directly (maintenance).
 */
export function calculateDailyTargets(
  tdee: number,
  goal: string,
  healthConditions?: string[],
  womenHealth?: string[],
  calories?: number
) {
  // Use provided calorie target; fall back to TDEE (maintenance)
  const cal = Math.round(calories ?? tdee);

  // Default macro split: 40% carbs, 30% protein, 30% fat
  let proteinPct = 0.3;
  let carbsPct = 0.4;
  let fatPct = 0.3;

  // PCOS adjustment: higher protein, lower carbs
  if (womenHealth?.includes('pcos')) {
    proteinPct = 0.35;
    carbsPct = 0.30;
    fatPct = 0.35;
  }

  // Diabetes adjustment: moderate carbs
  if (healthConditions?.includes('diabetes')) {
    proteinPct = 0.30;
    carbsPct = 0.35;
    fatPct = 0.35;
  }

  const protein = Math.round((cal * proteinPct) / 4);
  const carbs = Math.round((cal * carbsPct) / 4);
  const fat = Math.round((cal * fatPct) / 9);

  return { calories: cal, protein, carbs, fat };
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
