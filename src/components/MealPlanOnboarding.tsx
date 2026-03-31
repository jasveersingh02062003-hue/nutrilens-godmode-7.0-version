import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Sparkles, Apple, ChefHat, Heart, Activity, Scale, Flame, Droplets, Shield, Wallet, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { MealPlannerProfile, saveMealPlannerProfile } from '@/lib/meal-planner-store';
import { calculateBMI, calculateBMR, calculateTDEE, getBMICategory } from '@/lib/nutrition';
import { determineGoalAndTargets } from '@/lib/goal-engine';
import { getProfile } from '@/lib/store';
import { getUnifiedBudget, validateBudgetVsGoals } from '@/lib/budget-engine';
import { validatePlanFeasibility, FeasibilityResult } from '@/lib/plan-validator';
import { getAdherenceHistory, getComplexityRecommendation, getAdherenceTrend } from '@/lib/adherence-service';
import MonikaGuide, { MEAL_PLANNER_MONIKA } from '@/components/onboarding/MonikaGuide';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';

const STEPS = ['dataSync', 'dietary', 'allergies', 'cuisines', 'cooking', 'cookTime', 'summary'];

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  exit: (dir: number) => ({ x: dir < 0 ? 60 : -60, opacity: 0, transition: { duration: 0.15 } }),
};

const stagger = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, type: 'spring' as const, stiffness: 400, damping: 30 } }),
};

interface Props {
  onComplete: (profile: MealPlannerProfile) => void;
}

type FormData = Record<string, any>;

export default function MealPlanOnboarding({ onComplete }: Props) {
  const mainProfile = getProfile();
  const unifiedBudget = getUnifiedBudget();
  const [stepIdx, setStepIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<FormData>({
    dietaryPrefs: mainProfile?.dietaryPrefs || [],
    allergies: [],
    cuisinePrefs: [],
    cookingSkill: '',
    cookingTime: '',
  });

  const step = STEPS[stepIdx];
  const progress = (stepIdx / (STEPS.length - 1)) * 100;
  const set = useCallback((k: string, v: any) => setForm(p => ({ ...p, [k]: v })), []);
  const toggleArr = useCallback((k: string, v: string) => {
    setForm(p => {
      const arr = (p[k] as string[]) || [];
      return { ...p, [k]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] };
    });
  }, []);

  const goNext = () => { setDir(1); if (stepIdx < STEPS.length - 1) setStepIdx(i => i + 1); else finish(); };
  const goBack = () => { setDir(-1); setStepIdx(i => Math.max(0, i - 1)); };

  const canContinue = (): boolean => {
    switch (step) {
      case 'dataSync': return true;
      case 'cooking': return !!form.cookingSkill;
      case 'cookTime': return !!form.cookingTime;
      default: return true;
    }
  };

  // Pull all data from profile + budget for generation
  const finish = () => {
    const p = mainProfile;
    const gender = p?.gender || 'male';
    const goal = p?.goal === 'lose' ? 'lose' : p?.goal === 'gain' ? 'gain' : 'maintain';
    const weight = p?.weightKg || 70;
    const height = p?.heightCm || 170;
    const age = p?.age || 25;
    const activityLevel = p?.activityLevel || 'moderate';
    const healthConditions = p?.healthConditions || [];

    const decision = determineGoalAndTargets(weight, height, age, gender, activityLevel, goal, healthConditions);

    const perMeal = unifiedBudget.perMeal;
    const dailyBudget = unifiedBudget.daily;

    const profile: MealPlannerProfile = {
      name: p?.name || '',
      gender,
      age,
      currentWeight: weight,
      goalWeight: p?.targetWeight || 65,
      heightCm: height,
      weightUnit: 'kg',
      bmi: decision.bmi,
      mainGoal: p?.goal || 'maintain',
      motivations: [],
      weeklyPace: p?.goalSpeed || 0.5,
      experienceLevel: '',
      challenges: [],
      activityLevel,
      exerciseFrequency: p?.exerciseRoutine || '',
      exerciseTypes: [],
      sleepHours: p?.sleepHours || '',
      stressLevel: p?.stressLevel || '',
      dietaryPrefs: form.dietaryPrefs || [],
      medicalRestrictions: healthConditions,
      allergies: form.allergies || [],
      dislikedFoods: '',
      religiousRestrictions: [],
      cuisinePrefs: form.cuisinePrefs || [],
      cookingSkill: form.cookingSkill || '',
      cookingTime: form.cookingTime || '',
      equipment: [],
      eatingOutFrequency: p?.eatingOut || '',
      mealPrep: '',
      snackingHabits: [],
      mealsPerDay: 3,
      staplePreference: form.staplePreference || 'mixed',
      dailyBudget,
      currency: 'INR',
      dailyCalories: decision.targetCalories,
      dailyProtein: decision.targetProtein,
      dailyCarbs: decision.targetCarbs,
      dailyFat: decision.targetFat,
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    };
    saveMealPlannerProfile(profile);
    onComplete(profile);
  };

  const Option = ({ value, current, label, sub, onSelect, idx }: any) => (
    <motion.button custom={idx || 0} variants={stagger} initial="hidden" animate="visible" onClick={() => onSelect(value)} whileTap={{ scale: 0.97 }}
      className={`w-full px-4 py-3.5 rounded-2xl text-left transition-all border ${current === value ? 'bg-primary text-primary-foreground border-primary shadow-fab' : 'bg-card border-border hover:border-primary/40'}`}>
      <span className="text-sm font-semibold">{label}</span>
      {sub && <p className={`text-[11px] mt-0.5 ${current === value ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{sub}</p>}
    </motion.button>
  );

  const Chips = ({ options, selected, field }: { options: { value: string; label: string }[]; selected: string[]; field: string }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o, i) => (
        <motion.button key={o.value} custom={i} variants={stagger} initial="hidden" animate="visible" whileTap={{ scale: 0.93 }}
          onClick={() => toggleArr(field, o.value)}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${selected.includes(o.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/30'}`}>
          {o.label}
        </motion.button>
      ))}
    </div>
  );

  const Header = ({ icon: Icon, title, sub }: { icon?: any; title: string; sub: string }) => (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      {Icon && <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-primary" /></div>}
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </motion.div>
  );

  // ─── Data Sync Animation Screen ───
  const DataSyncScreen = () => {
    const p = mainProfile;
    const name = p?.name || 'there';
    const weight = p?.weightKg || 70;
    const height = p?.heightCm || 170;
    const age = p?.age || 25;
    const bmi = p?.bmi || calculateBMI(weight, height);
    const bmiCat = getBMICategory(bmi);
    const bmr = p?.bmr || 0;
    const tdee = p?.tdee || 0;
    const targetCal = p?.dailyCalories || 0;
    const protein = p?.dailyProtein || 0;
    const carbs = p?.dailyCarbs || 0;
    const fat = p?.dailyFat || 0;
    const health = p?.healthConditions || [];
    const skin = p?.skinConcerns;
    const skinLabels: string[] = [];
    if (skin?.acne) skinLabels.push('Acne');
    if (skin?.oily) skinLabels.push('Oily');
    if (skin?.dry) skinLabels.push('Dry');
    if (skin?.dull) skinLabels.push('Dull');
    if (skin?.pigmentation) skinLabels.push('Pigmentation');
    if (skin?.sensitive) skinLabels.push('Sensitive');

    const perMeal = unifiedBudget.perMeal;
    const daily = unifiedBudget.daily;
    const weekly = daily * 7;
    const monthly = unifiedBudget.monthly;

    const cards = [
      {
        icon: Scale, label: 'Body', delay: 0.1,
        rows: [`${height}cm · ${weight}kg · Age ${age}`, `BMI: ${bmi.toFixed(1)} (${bmiCat})`],
      },
      {
        icon: Flame, label: 'Metabolism', delay: 0.2,
        rows: [`BMR: ${bmr} kcal`, `TDEE: ${tdee} kcal`, `Target: ${targetCal} kcal/day`],
      },
      {
        icon: Activity, label: 'Macros', delay: 0.3,
        rows: [`Protein: ${protein}g · Carbs: ${carbs}g · Fat: ${fat}g`],
      },
      {
        icon: Shield, label: 'Health', delay: 0.4,
        rows: [
          health.length > 0 ? health.join(', ') : 'No conditions',
          skinLabels.length > 0 ? `Skin: ${skinLabels.join(', ')}` : 'No skin concerns',
        ],
      },
      {
        icon: Wallet, label: 'Budget', delay: 0.5,
        rows: [
          `₹${monthly}/month · ₹${daily}/day · ₹${weekly}/week`,
          `BF: ₹${perMeal.breakfast} · L: ₹${perMeal.lunch} · D: ₹${perMeal.dinner} · S: ₹${perMeal.snacks}`,
        ],
      },
    ];

    return (
      <div className="space-y-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
          <h1 className="text-xl font-extrabold text-foreground">Hi {name}! 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your profile data</p>
        </motion.div>

        {cards.map((card, ci) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: card.delay, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-card border border-border rounded-2xl p-3.5"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <card.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground">{card.label}</span>
            </div>
            {card.rows.map((row, ri) => (
              <p key={ri} className="text-xs text-muted-foreground leading-relaxed">{row}</p>
            ))}
          </motion.div>
        ))}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-[10px] text-muted-foreground text-center pt-2"
        >
          All data from your onboarding & budget setup
        </motion.p>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'dataSync':
        return <DataSyncScreen />;

      case 'dietary':
        return (
          <div className="space-y-4">
            <Header icon={Apple} title="Dietary preferences?" sub="Select all that apply." />
            <Chips field="dietaryPrefs" selected={form.dietaryPrefs || []} options={[
              { value: 'vegetarian', label: 'Vegetarian' }, { value: 'non_vegetarian', label: 'Non-Vegetarian' },
              { value: 'vegan', label: 'Vegan' }, { value: 'eggetarian', label: 'Eggetarian' },
              { value: 'pescatarian', label: 'Pescatarian' }, { value: 'keto', label: 'Keto' },
              { value: 'low_carb', label: 'Low Carb' }, { value: 'balanced', label: 'Balanced' },
            ]} />
            <div className="pt-2">
              <p className="text-sm font-semibold text-foreground mb-2">What's your daily staple?</p>
              <div className="flex gap-2">
                {[
                  { v: 'rice', l: '🍚 Rice' },
                  { v: 'roti', l: '🫓 Roti' },
                  { v: 'mixed', l: '🔄 Mixed' },
                ].map(o => (
                  <button key={o.v} onClick={() => set('staplePreference', o.v)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${form.staplePreference === o.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/30'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'allergies':
        return (
          <div className="space-y-4">
            <Header title="Food allergies?" sub="Select all that apply." />
            <Chips field="allergies" selected={form.allergies || []} options={[
              { value: 'milk', label: '🥛 Milk' }, { value: 'eggs', label: '🥚 Eggs' },
              { value: 'nuts', label: '🥜 Nuts' }, { value: 'gluten', label: '🌾 Gluten' },
              { value: 'soy', label: 'Soy' }, { value: 'shellfish', label: '🦐 Shellfish' },
              { value: 'chicken', label: '🍗 Chicken' }, { value: 'fish', label: '🐟 Fish' },
              { value: 'none', label: '✅ None' },
            ]} />
          </div>
        );

      case 'cuisines':
        return (
          <div className="space-y-4">
            <Header title="Cuisines you enjoy?" sub="We'll prioritize these." />
            <Chips field="cuisinePrefs" selected={form.cuisinePrefs || []} options={[
              { value: 'north_indian', label: '🇮🇳 North Indian' }, { value: 'south_indian', label: '🇮🇳 South Indian' },
              { value: 'chinese', label: '🇨🇳 Chinese' }, { value: 'italian', label: '🇮🇹 Italian' },
              { value: 'quick_meals', label: '⚡ Quick Meals' }, { value: 'street_food', label: '🍜 Street Food' },
              { value: 'continental', label: '🍽️ Continental' }, { value: 'thai', label: '🇹🇭 Thai' },
            ]} />
          </div>
        );

      case 'cooking':
        return (
          <div className="space-y-4">
            <Header icon={ChefHat} title="Cooking skill level?" sub="" />
            <div className="space-y-2.5">
              {[
                { v: 'beginner', l: 'Beginner', s: 'Can make basic meals' },
                { v: 'intermediate', l: 'Intermediate', s: 'Follow recipes confidently' },
                { v: 'advanced', l: 'Advanced', s: 'Cook without recipes' },
                { v: 'none', l: "I Don't Cook", s: 'Need very simple options' },
              ].map((o, i) => <Option key={o.v} value={o.v} current={form.cookingSkill} label={o.l} sub={o.s} onSelect={(v: string) => set('cookingSkill', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'cookTime':
        return (
          <div className="space-y-4">
            <Header title="Time for cooking per meal?" sub="" />
            <div className="space-y-2.5">
              {[
                { v: '15min', l: '< 15 minutes', s: 'Quick and easy' },
                { v: '30min', l: '15-30 minutes', s: 'Most recipes' },
                { v: '45min', l: '30+ minutes', s: 'Elaborate dishes' },
              ].map((o, i) => <Option key={o.v} value={o.v} current={form.cookingTime} label={o.l} sub={o.s} onSelect={(v: string) => set('cookingTime', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'summary': {
        const p = mainProfile;
        const bmi = p?.bmi || calculateBMI(p?.weightKg || 70, p?.heightCm || 170);
        const cat = getBMICategory(bmi);
        const perMeal = unifiedBudget.perMeal;
        const budgetDaily = unifiedBudget.daily;
        const health = p?.healthConditions || [];

        // Run feasibility check
        const tempProfile: MealPlannerProfile = {
          name: p?.name || '', gender: p?.gender || 'male', age: p?.age || 25,
          currentWeight: p?.weightKg || 70, goalWeight: p?.targetWeight || 65, heightCm: p?.heightCm || 170,
          weightUnit: 'kg', bmi, mainGoal: p?.goal || 'maintain', motivations: [], weeklyPace: 0.5,
          experienceLevel: '', challenges: [], activityLevel: p?.activityLevel || 'moderate',
          exerciseFrequency: '', exerciseTypes: [], sleepHours: '', stressLevel: '',
          dietaryPrefs: form.dietaryPrefs || [], medicalRestrictions: health, allergies: form.allergies || [],
          dislikedFoods: '', religiousRestrictions: [], cuisinePrefs: form.cuisinePrefs || [],
          cookingSkill: form.cookingSkill || '', cookingTime: form.cookingTime || '', equipment: [],
          eatingOutFrequency: '', mealPrep: '', snackingHabits: [], mealsPerDay: 3,
          dailyBudget: budgetDaily, currency: 'INR',
          dailyCalories: p?.dailyCalories || 2000, dailyProtein: p?.dailyProtein || 80,
          dailyCarbs: p?.dailyCarbs || 250, dailyFat: p?.dailyFat || 55,
          onboardingComplete: true, createdAt: new Date().toISOString(),
        };
        const feasibility = validatePlanFeasibility(tempProfile, { perMeal: unifiedBudget.perMeal } as any);

        // Adherence-based complexity
        const adherenceHist = getAdherenceHistory();
        const lastScore = adherenceHist.length > 0 ? adherenceHist[adherenceHist.length - 1].score : undefined;
        const complexity = getComplexityRecommendation(lastScore);
        const trend = getAdherenceTrend();
        const hasAdherenceData = adherenceHist.length > 0;

        return (
          <div className="space-y-4">
            <Header icon={Sparkles} title="Ready to generate!" sub="Your complete plan profile." />

            {/* Adherence-based complexity info */}
            {hasAdherenceData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 flex gap-3"
              >
                <BarChart3 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Based on your history, we'll suggest {complexity.description} meals
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Adherence: {Math.round((lastScore || 0) * 100)}% · Trend: {trend.direction === 'rising' ? '📈 improving' : trend.direction === 'falling' ? '📉 declining' : '➡️ steady'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Feasibility warning */}
            {!feasibility.feasible && feasibility.warning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{feasibility.warning}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => set('budgetChoice', 'stay_budget')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${form.budgetChoice === 'stay_budget' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
                    >
                      Stay in budget
                    </button>
                    <button
                      onClick={() => set('budgetChoice', 'hit_nutrition')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${form.budgetChoice === 'hit_nutrition' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
                    >
                      Hit nutrition targets
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="card-elevated p-4 space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Goal</span><span className="font-semibold text-foreground capitalize">{(p?.goal || 'maintain').replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">BMI</span><span className="font-semibold text-foreground">{bmi.toFixed(1)} ({cat})</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Calories</span><span className="font-semibold text-foreground">{p?.dailyCalories || 0} kcal/day</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Protein</span><span className="font-semibold text-foreground">{p?.dailyProtein || 0}g</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Budget</span><span className="font-semibold text-foreground">₹{budgetDaily}/day</span></div>
              {health.length > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Health</span><span className="font-semibold text-foreground capitalize">{health.join(', ')}</span></div>}
              {form.dietaryPrefs?.length > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Diet</span><span className="font-semibold text-foreground capitalize">{form.dietaryPrefs.join(', ')}</span></div>}
              {form.allergies?.length > 0 && form.allergies[0] !== 'none' && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Allergies</span><span className="font-semibold text-foreground capitalize">{form.allergies.join(', ')}</span></div>}
              {form.cuisinePrefs?.length > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cuisines</span><span className="font-semibold text-foreground capitalize">{form.cuisinePrefs.join(', ')}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cooking</span><span className="font-semibold text-foreground capitalize">{form.cookingSkill} · {form.cookingTime}</span></div>
              {hasAdherenceData && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Complexity</span><span className="font-semibold text-foreground capitalize">{complexity.level}</span></div>}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Budget from Budget tab · Health from onboarding</p>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const monikaMsg = MEAL_PLANNER_MONIKA[step] || { message: "You're doing great! Keep going 💪", mood: 'happy' as const };
  const stepNames: Record<string, string> = {
    dataSync: 'Your Data', dietary: 'Diet', allergies: 'Allergies', cuisines: 'Cuisines',
    cooking: 'Cooking', cookTime: 'Cook Time', summary: 'Summary',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress */}
      {step !== 'dataSync' && (
        <div className="px-4 pt-4 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={goBack} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <div className="flex-1">
              <OnboardingProgress current={stepIdx} total={STEPS.length - 1} stepName={stepNames[step] || step} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="pt-3">
          <MonikaGuide message={monikaMsg.message} mood={monikaMsg.mood} compact={step !== 'dataSync'} />
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" className="py-2">
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
        <button onClick={goNext} disabled={!canContinue()}
          className={`w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all ${canContinue() ? 'btn-primary' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
          {step === 'summary' ? <><Sparkles className="w-4 h-4" /> Generate My Meal Plan</> : step === 'dataSync' ? <>Looks Good! Continue <ArrowRight className="w-4 h-4" /></> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
