import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Sparkles, Target, Dumbbell, Heart, Apple, ChefHat, UtensilsCrossed, Scale, User, IndianRupee } from 'lucide-react';
import { MealPlannerProfile, saveMealPlannerProfile } from '@/lib/meal-planner-store';
import { calculateBMI, calculateBMR, calculateTDEE, getBMICategory } from '@/lib/nutrition';
import { determineGoalAndTargets } from '@/lib/goal-engine';
import { getProfile } from '@/lib/store';
import { saveBudgetSettings } from '@/lib/expense-store';
import { saveEnhancedBudgetSettings } from '@/lib/budget-alerts';
import MonikaGuide, { MEAL_PLANNER_MONIKA } from '@/components/onboarding/MonikaGuide';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';

const STEPS = [
  'welcome', 'goal', 'motivations', 'pace', 'experience', 'challenges',
  'activity', 'exercise', 'sleep', 'stress',
  'dietary', 'medical', 'allergies', 'cuisines',
  'cooking', 'cookTime', 'equipment', 'eatingOut', 'snacking',
  'mealsPerDay', 'budget', 'summary',
];

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

type FormData = Partial<MealPlannerProfile> & Record<string, any>;

export default function MealPlanOnboarding({ onComplete }: Props) {
  const mainProfile = getProfile();
  const [stepIdx, setStepIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: mainProfile?.name || '',
    gender: mainProfile?.gender || '',
    age: mainProfile?.age || 25,
    currentWeight: mainProfile?.weightKg || 70,
    goalWeight: mainProfile?.targetWeight || 65,
    heightCm: mainProfile?.heightCm || 170,
    weightUnit: 'kg',
    mainGoal: '',
    motivations: [],
    weeklyPace: 0.5,
    experienceLevel: '',
    challenges: [],
    activityLevel: mainProfile?.activityLevel || '',
    exerciseFrequency: mainProfile?.exerciseRoutine || '',
    exerciseTypes: [],
    sleepHours: mainProfile?.sleepHours || '',
    stressLevel: mainProfile?.stressLevel || '',
    dietaryPrefs: mainProfile?.dietaryPrefs || [],
    medicalRestrictions: mainProfile?.healthConditions || [],
    allergies: [],
    dislikedFoods: '',
    religiousRestrictions: [],
    cuisinePrefs: [],
    cookingSkill: '',
    cookingTime: '',
    equipment: [],
    eatingOutFrequency: mainProfile?.eatingOut || '',
    mealPrep: '',
    snackingHabits: [],
    mealsPerDay: 3,
    dailyBudget: 0,
    currency: 'INR',
    monthlyBudget: 15000,
    mealSplitBreakfast: 100,
    mealSplitLunch: 150,
    mealSplitDinner: 200,
    mealSplitSnacks: 50,
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
      case 'welcome': return true;
      case 'goal': return !!form.mainGoal;
      case 'pace': return true;
      case 'experience': return !!form.experienceLevel;
      case 'activity': return !!form.activityLevel;
      case 'exercise': return !!form.exerciseFrequency;
      case 'sleep': return !!form.sleepHours;
      case 'stress': return !!form.stressLevel;
      case 'cooking': return !!form.cookingSkill;
      case 'cookTime': return !!form.cookingTime;
      case 'mealsPerDay': return true;
      case 'budget': return true;
      default: return true;
    }
  };

  const finish = () => {
    const gender = form.gender || 'male';
    const goal = form.mainGoal === 'lose_weight' ? 'lose' : form.mainGoal === 'build_muscle' ? 'gain' : 'maintain';
    const decision = determineGoalAndTargets(
      form.currentWeight!, form.heightCm!, form.age!, gender,
      form.activityLevel || 'moderate', goal, form.medicalRestrictions
    );

    const profile: MealPlannerProfile = {
      name: form.name || '',
      gender,
      age: form.age || 25,
      currentWeight: form.currentWeight || 70,
      goalWeight: form.goalWeight || 65,
      heightCm: form.heightCm || 170,
      weightUnit: 'kg',
      bmi: decision.bmi,
      mainGoal: form.mainGoal || '',
      motivations: form.motivations || [],
      weeklyPace: form.weeklyPace || 0.5,
      experienceLevel: form.experienceLevel || '',
      challenges: form.challenges || [],
      activityLevel: form.activityLevel || '',
      exerciseFrequency: form.exerciseFrequency || '',
      exerciseTypes: form.exerciseTypes || [],
      sleepHours: form.sleepHours || '',
      stressLevel: form.stressLevel || '',
      dietaryPrefs: form.dietaryPrefs || [],
      medicalRestrictions: form.medicalRestrictions || [],
      allergies: form.allergies || [],
      dislikedFoods: form.dislikedFoods || '',
      religiousRestrictions: form.religiousRestrictions || [],
      cuisinePrefs: form.cuisinePrefs || [],
      cookingSkill: form.cookingSkill || '',
      cookingTime: form.cookingTime || '',
      equipment: form.equipment || [],
      eatingOutFrequency: form.eatingOutFrequency || '',
      mealPrep: form.mealPrep || '',
      snackingHabits: form.snackingHabits || [],
      mealsPerDay: form.mealsPerDay || 3,
      dailyBudget: form.dailyBudget || 0,
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

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-2 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <ChefHat className="w-12 h-12 text-primary" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h1 className="text-2xl font-extrabold text-foreground">Let's build your<br/>perfect meal plan</h1>
              <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">Answer a few questions and we'll create a personalized weekly meal plan just for you.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex gap-4 mt-8 text-muted-foreground">
              {[{ icon: Apple, l: 'Personalized' }, { icon: Sparkles, l: 'AI-Powered' }, { icon: Heart, l: 'Healthy' }].map(({ icon: I, l }) => (
                <div key={l} className="flex items-center gap-1.5 text-[11px] font-medium"><I className="w-3.5 h-3.5" /> {l}</div>
              ))}
            </motion.div>
          </div>
        );

      case 'goal':
        return (
          <div className="space-y-4">
            <Header icon={Target} title="What's your main goal?" sub="This helps us tailor your meal plan." />
            <div className="space-y-2.5">
              {[
                { v: 'lose_weight', l: 'Lose Weight', s: 'Create a calorie deficit plan' },
                { v: 'eat_healthier', l: 'Eat Healthier', s: 'Balanced, nutritious meals' },
                { v: 'build_muscle', l: 'Build Muscle', s: 'High-protein meal plan' },
                { v: 'save_time', l: 'Save Time', s: 'Quick & easy recipes' },
                { v: 'learn_cooking', l: 'Learn to Cook', s: 'Step-by-step beginner recipes' },
                { v: 'try_recipes', l: 'Try New Recipes', s: 'Explore diverse cuisines' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.mainGoal} label={o.l} sub={o.s} onSelect={(v: string) => set('mainGoal', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'motivations':
        return (
          <div className="space-y-4">
            <Header icon={Heart} title="Why do you want this?" sub="Select all that apply." />
            <Chips field="motivations" selected={form.motivations || []} options={[
              { value: 'feel_better', label: 'Feel Better' }, { value: 'confidence', label: 'Boost Confidence' },
              { value: 'health', label: 'Improve Health' }, { value: 'fitness', label: 'Get Fit' },
              { value: 'family', label: 'For Family' }, { value: 'medical', label: 'Medical Reasons' },
            ]} />
          </div>
        );

      case 'pace':
        return (
          <div className="space-y-4">
            <Header icon={Scale} title="Preferred pace?" sub="How aggressively do you want to reach your goal?" />
            <div className="space-y-2.5">
              {[
                { v: 0.25, l: 'Gentle', s: '0.25 kg/week – Sustainable and easy' },
                { v: 0.5, l: 'Moderate', s: '0.5 kg/week – Recommended' },
                { v: 1, l: 'Aggressive', s: '1 kg/week – Requires discipline' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.weeklyPace} label={o.l} sub={o.s} onSelect={(v: number) => set('weeklyPace', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-4">
            <Header title="Your nutrition experience?" sub="Helps us decide how detailed to make your plan." />
            <div className="space-y-2.5">
              {[
                { v: 'beginner', l: 'Beginner', s: 'New to tracking and meal planning' },
                { v: 'intermediate', l: 'Intermediate', s: 'I know the basics' },
                { v: 'advanced', l: 'Advanced', s: 'Experienced with macros and meal prep' },
              ].map((o, i) => <Option key={o.v} value={o.v} current={form.experienceLevel} label={o.l} sub={o.s} onSelect={(v: string) => set('experienceLevel', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'challenges':
        return (
          <div className="space-y-4">
            <Header title="What makes healthy eating hard?" sub="Select all that apply." />
            <Chips field="challenges" selected={form.challenges || []} options={[
              { value: 'motivation', label: 'Lack of Motivation' }, { value: 'cravings', label: 'Cravings' },
              { value: 'busy', label: 'Busy Schedule' }, { value: 'eating_out', label: 'Eating Out' },
              { value: 'emotional', label: 'Emotional Eating' }, { value: 'cooking', label: "Don't Know What to Cook" },
            ]} />
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-4">
            <Header icon={Dumbbell} title="How active are you?" sub="Your daily activity level." />
            <div className="space-y-2.5">
              {[
                { v: 'sedentary', l: 'Sedentary', s: 'Desk job, minimal movement' },
                { v: 'light', l: 'Lightly Active', s: 'Light exercise 1-3 days/week' },
                { v: 'moderate', l: 'Moderately Active', s: 'Moderate exercise 3-5 days' },
                { v: 'active', l: 'Very Active', s: 'Hard exercise 6-7 days' },
                { v: 'athlete', l: 'Athlete', s: 'Intense training daily' },
              ].map((o, i) => <Option key={o.v} value={o.v} current={form.activityLevel} label={o.l} sub={o.s} onSelect={(v: string) => set('activityLevel', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'exercise':
        return (
          <div className="space-y-4">
            <Header title="How often do you exercise?" sub="" />
            <div className="space-y-2.5">
              {[
                { v: 'none', l: 'No Exercise' }, { v: '1_2_week', l: '1-2 times/week' },
                { v: '3_4_week', l: '3-4 times/week' }, { v: '5_plus', l: '5+ times/week' },
              ].map((o, i) => <Option key={o.v} value={o.v} current={form.exerciseFrequency} label={o.l} onSelect={(v: string) => set('exerciseFrequency', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'sleep':
        return (
          <div className="space-y-4">
            <Header title="Average sleep hours?" sub="" />
            <div className="space-y-2.5">
              {[
                { v: 'less_5', l: 'Less than 5 hours' }, { v: '5_6', l: '5-6 hours' },
                { v: '7_8', l: '7-8 hours' }, { v: '9_plus', l: '9+ hours' },
              ].map((o, i) => <Option key={o.v} value={o.v} current={form.sleepHours} label={o.l} onSelect={(v: string) => set('sleepHours', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'stress':
        return (
          <div className="space-y-4">
            <Header title="Your typical stress level?" sub="" />
            <div className="space-y-2.5">
              {[{ v: 'low', l: 'Low' }, { v: 'moderate', l: 'Moderate' }, { v: 'high', l: 'High' }].map((o, i) =>
                <Option key={o.v} value={o.v} current={form.stressLevel} label={o.l} onSelect={(v: string) => set('stressLevel', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'dietary':
        return (
          <div className="space-y-4">
            <Header icon={Apple} title="Dietary preferences?" sub="Select all that apply." />
            <Chips field="dietaryPrefs" selected={form.dietaryPrefs || []} options={[
              { value: 'vegetarian', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' },
              { value: 'pescatarian', label: 'Pescatarian' }, { value: 'keto', label: 'Keto' },
              { value: 'low_carb', label: 'Low Carb' }, { value: 'paleo', label: 'Paleo' },
              { value: 'mediterranean', label: 'Mediterranean' }, { value: 'balanced', label: 'Balanced' },
              { value: 'intermittent_fasting', label: 'Intermittent Fasting' },
            ]} />
          </div>
        );

      case 'medical':
        return (
          <div className="space-y-4">
            <Header title="Any medical restrictions?" sub="Select all that apply." />
            <Chips field="medicalRestrictions" selected={form.medicalRestrictions || []} options={[
              { value: 'diabetes', label: 'Diabetes' }, { value: 'bp', label: 'High BP' },
              { value: 'cholesterol', label: 'Cholesterol' }, { value: 'pcos', label: 'PCOS' },
              { value: 'thyroid', label: 'Thyroid' }, { value: 'gerd', label: 'GERD' },
              { value: 'celiac', label: 'Celiac' }, { value: 'lactose', label: 'Lactose Intolerance' },
              { value: 'none', label: 'None' },
            ]} />
          </div>
        );

      case 'allergies':
        return (
          <div className="space-y-4">
            <Header title="Food allergies?" sub="Select all that apply." />
            <Chips field="allergies" selected={form.allergies || []} options={[
              { value: 'nuts', label: 'Nuts' }, { value: 'dairy', label: 'Dairy' },
              { value: 'eggs', label: 'Eggs' }, { value: 'soy', label: 'Soy' },
              { value: 'wheat', label: 'Wheat/Gluten' }, { value: 'shellfish', label: 'Shellfish' },
              { value: 'none', label: 'None' },
            ]} />
          </div>
        );

      case 'cuisines':
        return (
          <div className="space-y-4">
            <Header title="Cuisines you enjoy?" sub="We'll prioritize these in your plan." />
            <Chips field="cuisinePrefs" selected={form.cuisinePrefs || []} options={[
              { value: 'indian', label: '🇮🇳 Indian' }, { value: 'chinese', label: '🇨🇳 Chinese' },
              { value: 'italian', label: '🇮🇹 Italian' }, { value: 'mexican', label: '🇲🇽 Mexican' },
              { value: 'thai', label: '🇹🇭 Thai' }, { value: 'japanese', label: '🇯🇵 Japanese' },
              { value: 'mediterranean', label: '🫒 Mediterranean' }, { value: 'american', label: '🇺🇸 American' },
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
                { v: '15min', l: '15 minutes', s: 'Quick and easy' },
                { v: '30min', l: '30 minutes', s: 'Most recipes' },
                { v: '45min', l: '45 minutes', s: 'More elaborate dishes' },
                { v: '60min', l: '1 hour+', s: 'I enjoy cooking' },
              ].map((o, i) => <Option key={o.v} value={o.v} current={form.cookingTime} label={o.l} sub={o.s} onSelect={(v: string) => set('cookingTime', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'equipment':
        return (
          <div className="space-y-4">
            <Header title="Kitchen equipment?" sub="Select what you have." />
            <Chips field="equipment" selected={form.equipment || []} options={[
              { value: 'stove', label: 'Stove' }, { value: 'oven', label: 'Oven' },
              { value: 'microwave', label: 'Microwave' }, { value: 'air_fryer', label: 'Air Fryer' },
              { value: 'blender', label: 'Blender' }, { value: 'pressure_cooker', label: 'Pressure Cooker' },
              { value: 'instant_pot', label: 'Instant Pot' },
            ]} />
          </div>
        );

      case 'eatingOut':
        return (
          <div className="space-y-4">
            <Header icon={UtensilsCrossed} title="How often do you eat out?" sub="" />
            <div className="space-y-2.5">
              {[
                { v: 'rarely', l: 'Rarely' }, { v: '1_2_week', l: '1-2 times/week' },
                { v: '3_4_week', l: '3-4 times/week' }, { v: 'daily', l: 'Almost Daily' },
              ].map((o, i) => <Option key={o.v} value={o.v} current={form.eatingOutFrequency} label={o.l} onSelect={(v: string) => set('eatingOutFrequency', v)} idx={i} />)}
            </div>
          </div>
        );

      case 'snacking':
        return (
          <div className="space-y-4">
            <Header title="When do you snack?" sub="Select all that apply." />
            <Chips field="snackingHabits" selected={form.snackingHabits || []} options={[
              { value: 'hungry', label: 'When Hungry' }, { value: 'stressed', label: 'When Stressed' },
              { value: 'bored', label: 'When Bored' }, { value: 'late_night', label: 'Late Night' },
              { value: 'tv', label: 'While Watching TV' }, { value: 'none', label: "I Don't Snack" },
            ]} />
          </div>
        );

      case 'mealsPerDay':
        return (
          <div className="space-y-4">
            <Header title="Meals per day?" sub="Including snacks." />
            <div className="flex gap-3 justify-center mt-4">
              {[3, 4, 5, 6].map(n => (
                <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => set('mealsPerDay', n)}
                  className={`w-16 h-16 rounded-2xl text-lg font-bold border transition-all ${form.mealsPerDay === n ? 'bg-primary text-primary-foreground border-primary shadow-fab' : 'bg-card border-border'}`}>
                  {n}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 'summary':
        const bmi = calculateBMI(form.currentWeight!, form.heightCm!);
        const cat = getBMICategory(bmi);
        return (
          <div className="space-y-4">
            <Header icon={Sparkles} title="Your Plan Summary" sub="Here's what we'll build for you." />
            <div className="card-elevated p-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Goal</span><span className="font-semibold text-foreground capitalize">{(form.mainGoal || '').replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">BMI</span><span className="font-semibold text-foreground">{bmi.toFixed(1)} ({cat})</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Weekly Pace</span><span className="font-semibold text-foreground">{form.weeklyPace} kg/week</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Meals/Day</span><span className="font-semibold text-foreground">{form.mealsPerDay}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cooking Skill</span><span className="font-semibold text-foreground capitalize">{form.cookingSkill}</span></div>
              {form.dietaryPrefs?.length > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Diet</span><span className="font-semibold text-foreground capitalize">{form.dietaryPrefs.join(', ')}</span></div>}
              {form.cuisinePrefs?.length > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cuisines</span><span className="font-semibold text-foreground capitalize">{form.cuisinePrefs.join(', ')}</span></div>}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const monikaMsg = MEAL_PLANNER_MONIKA[step] || { message: "You're doing great! Keep going 💪", mood: 'happy' as const };
  const stepNames: Record<string, string> = {
    welcome: 'Welcome', goal: 'Goal', motivations: 'Motivation', pace: 'Pace', experience: 'Experience',
    challenges: 'Challenges', activity: 'Activity', exercise: 'Exercise', sleep: 'Sleep', stress: 'Stress',
    dietary: 'Diet', medical: 'Medical', allergies: 'Allergies', cuisines: 'Cuisines',
    cooking: 'Cooking', cookTime: 'Cook Time', equipment: 'Equipment', eatingOut: 'Eating Out',
    snacking: 'Snacking', mealsPerDay: 'Meals/Day', summary: 'Summary',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress */}
      {step !== 'welcome' && (
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
        {/* Monika Guide */}
        <div className="pt-3">
          <MonikaGuide message={monikaMsg.message} mood={monikaMsg.mood} compact={step !== 'welcome'} />
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
          {step === 'summary' ? <><Sparkles className="w-4 h-4" /> Generate My Meal Plan</> : step === 'welcome' ? <><Sparkles className="w-4 h-4" /> Get Started</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
