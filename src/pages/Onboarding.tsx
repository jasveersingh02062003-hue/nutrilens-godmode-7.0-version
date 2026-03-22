import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Mail, Sparkles, Leaf, Heart, Zap, Moon, Sun, User, Briefcase, Dumbbell, Coffee, ChefHat, UtensilsCrossed, Gauge, Ruler, Calendar, Target, TrendingDown, Scale, Apple, ShieldCheck, Clock, Droplets, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveProfile, UserProfile } from '@/lib/store';
import { calculateBMI, calculateBMR, calculateTDEE, calculateDailyTargets, getBMICategory } from '@/lib/nutrition';
import { determineGoalAndTargets, type GoalDecision } from '@/lib/goal-engine';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import heroImg from '@/assets/hero-nutrition.jpg';
import MonikaGuide, { MONIKA_MESSAGES } from '@/components/onboarding/MonikaGuide';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import ScannerOnboardingScreen from '@/components/onboarding/ScannerOnboardingScreen';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';
import CompletionScreen from '@/components/onboarding/CompletionScreen';
import ProfileSummaryScreen from '@/components/onboarding/ProfileSummaryScreen';
import CalculatingScreen from '@/components/onboarding/CalculatingScreen';
import MealBreakdownScreen, { type MealSplits } from '@/components/onboarding/MealBreakdownScreen';
import MotivationalScreen from '@/components/onboarding/MotivationalScreen';
import SubscriptionScreen from '@/components/SubscriptionScreen';
import RetentionOfferScreen from '@/components/RetentionOfferScreen';
import { getPlan } from '@/lib/subscription-service';

import { Pill, Baby } from 'lucide-react';

const ALL_STEPS = [
  'welcome', 'name', 'gender', 'occupation', 'jobType', 'workActivity',
  'exercise', 'sleep', 'stress', 'cooking', 'eatingOut', 'caffeine',
  'activity', 'measurements', 'dob', 'goal', 'targetWeight', 'goalSpeed',
  'dietary', 'health', 'diabetesDetails', 'womenHealth', 'pcosDetails',
  'hypertensionDetails', 'lactoseDetails', 'healthGoals', 'skinConcerns',
  'menHealth', 'medications', 'mealTimes', 'water'
];

const STEP_LABELS: Record<string, string> = {
  welcome: 'Welcome', name: 'Your Name', gender: 'Gender', occupation: 'Occupation',
  jobType: 'Job Type', workActivity: 'Work Activity', exercise: 'Exercise',
  sleep: 'Sleep', stress: 'Stress', cooking: 'Cooking', eatingOut: 'Eating Out',
  caffeine: 'Caffeine', activity: 'Activity', measurements: 'Body Stats',
  dob: 'Age', goal: 'Goal', targetWeight: 'Target', goalSpeed: 'Pace',
  dietary: 'Diet', health: 'Health', diabetesDetails: 'Diabetes',
  womenHealth: "Women's Health", pcosDetails: 'PCOS', hypertensionDetails: 'Blood Pressure',
  lactoseDetails: 'Lactose', healthGoals: 'Goals', skinConcerns: 'Skin Health',
  menHealth: "Men's Health",
  medications: 'Medications', mealTimes: 'Meal Times', water: 'Water', summary: 'Your Plan',
};

const STEP_ICONS: Record<string, any> = {
  name: User, gender: User, occupation: Briefcase, jobType: Briefcase,
  workActivity: Zap, exercise: Dumbbell, sleep: Moon, stress: Heart,
  cooking: ChefHat, eatingOut: UtensilsCrossed, caffeine: Coffee,
  activity: Gauge, measurements: Ruler, dob: Calendar, goal: Target,
  targetWeight: Scale, goalSpeed: TrendingDown, dietary: Apple,
  health: ShieldCheck, skinConcerns: Sparkles, womenHealth: Baby, menHealth: ShieldCheck,
  medications: Pill, mealTimes: Clock, water: Droplets, summary: Sparkles,
};

type FormData = Partial<UserProfile> & Record<string, any>;

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 35 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
    transition: { duration: 0.2 },
  }),
};

const stagger = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, type: 'spring' as const, stiffness: 500, damping: 35 },
  }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useUserProfile();
  const { syncProfileToCloud } = useAuth();
  const [phase, setPhase] = useState<'welcome' | 'scanner' | 'onboarding' | 'profileReview' | 'calculating' | 'mealBreakdown' | 'motivation' | 'complete' | 'subscription' | 'retention'>('welcome');
  const [calculatedTargets, setCalculatedTargets] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [goalDecision, setGoalDecision] = useState<GoalDecision | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: '', gender: '', occupation: '', jobType: '', workActivity: '',
    exerciseRoutine: '', sleepHours: '', stressLevel: '', cookingHabits: '',
    eatingOut: '', caffeine: '', alcohol: '', activityLevel: '', heightCm: 170,
    weightKg: 70, dob: '', age: 25, goal: '', targetWeight: 65, goalSpeed: 0.5,
    dietaryPrefs: [], healthConditions: [], womenHealth: [], menHealth: {},
    medications: '',
    mealTimes: { breakfast: '08:00', lunch: '13:00', dinner: '19:00', snacks: '16:00' },
    waterGoal: 2000,
  });

  const STEPS = ALL_STEPS.filter(s => {
    if (s === 'womenHealth') return form.gender === 'female';
    if (s === 'pcosDetails') return form.gender === 'female' && (form.womenHealth || []).includes('pcos');
    if (s === 'menHealth') return form.gender === 'male';
    if (s === 'diabetesDetails') return (form.healthConditions || []).includes('diabetes');
    if (s === 'hypertensionDetails') return (form.healthConditions || []).includes('hypertension');
    if (s === 'lactoseDetails') return (form.healthConditions || []).includes('lactose_intolerance');
    return true;
  });

  const step = STEPS[stepIdx];
  const progress = ((stepIdx) / (STEPS.length - 1)) * 100;
  const set = useCallback((key: string, val: any) => setForm(prev => ({ ...prev, [key]: val })), []);

  const canContinue = (): boolean => {
    switch (step) {
      case 'welcome': return true;
      case 'name': return (form.name || '').trim().length >= 2;
      case 'gender': return !!form.gender;
      case 'occupation': return !!form.occupation;
      case 'jobType': return !!form.jobType;
      case 'workActivity': return !!form.workActivity;
      case 'exercise': return !!form.exerciseRoutine;
      case 'sleep': return !!form.sleepHours;
      case 'stress': return !!form.stressLevel;
      case 'cooking': return !!form.cookingHabits;
      case 'eatingOut': return !!form.eatingOut;
      case 'caffeine': return !!form.caffeine;
      case 'activity': return !!form.activityLevel;
      case 'measurements': return form.heightCm! > 100 && form.weightKg! > 20;
      case 'dob': return !!form.dob;
      case 'goal': return !!form.goal;
      case 'targetWeight': return form.targetWeight! > 20;
      default: return true;
    }
  };

  const goNext = () => {
    setDirection(1);
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(i => i + 1);
    } else {
      setPhase('profileReview');
    }
  };
  const goBack = () => { setDirection(-1); setStepIdx(i => Math.max(0, i - 1)); };

  const handleEditSection = (section: string) => {
    const stepMap: Record<string, string> = {
      name: 'name', measurements: 'measurements', goal: 'goal',
      health: 'health', dietary: 'dietary', budget: 'water',
    };
    const targetStep = stepMap[section] || 'name';
    const idx = STEPS.indexOf(targetStep);
    if (idx >= 0) {
      setStepIdx(idx);
      setDirection(-1);
      setPhase('onboarding');
    }
  };

  const handleProfileReviewContinue = () => setPhase('calculating');

  const handleCalculationComplete = useCallback(() => {
    // Use the intelligent goal engine for BMI-based overrides and safety caps
    const decision = determineGoalAndTargets(
      form.weightKg!, form.heightCm!, form.age!, form.gender!,
      form.activityLevel!, form.goal!, form.healthConditions, form.womenHealth
    );
    setGoalDecision(decision);
    setCalculatedTargets({
      calories: decision.targetCalories,
      protein: decision.targetProtein,
      carbs: decision.targetCarbs,
      fat: decision.targetFat,
    });
    // If goal was overridden, update form so downstream screens reflect it
    if (decision.wasOverridden) {
      setForm(prev => ({ ...prev, goal: decision.effectiveGoal }));
    }
    setPhase('mealBreakdown');
  }, [form]);

  const handleMealBreakdownContinue = (_splits: MealSplits) => setPhase('motivation');

  const handleMotivationDismiss = async () => {
    // Use goal engine for final target calculation with BMI overrides
    const decision = goalDecision || determineGoalAndTargets(
      form.weightKg!, form.heightCm!, form.age!, form.gender!,
      form.activityLevel!, form.goal!, form.healthConditions, form.womenHealth
    );
    const targets = calculatedTargets || {
      calories: decision.targetCalories,
      protein: decision.targetProtein,
      carbs: decision.targetCarbs,
      fat: decision.targetFat,
    };

    const conditions: any = {};
    if ((form.womenHealth || []).includes('pcos')) {
      conditions.pcos = {
        has: true, type: form.pcosType || 'unknown',
        severity: form.pcosSeverity || 3, diagnosed: form.pcosDiagnosed ?? false,
      };
    }
    if ((form.healthConditions || []).includes('diabetes')) {
      conditions.diabetes = {
        has: true, type: form.diabetesType || 'type2',
        diagnosed: form.diabetesDiagnosed ?? true, hba1c: form.diabetesHba1c || undefined,
      };
    }
    if ((form.healthConditions || []).includes('hypertension')) {
      conditions.hypertension = { has: true, diagnosed: form.hypertensionDiagnosed ?? true };
    }
    if ((form.healthConditions || []).includes('lactose_intolerance')) {
      conditions.lactoseIntolerance = { has: true, severity: form.lactoseSeverity || 3 };
    }

    const profile: UserProfile = {
      ...form as any,
      goal: decision.effectiveGoal, // Use the engine's effective goal (may be overridden)
      conditions, healthGoals: form.healthGoals || [],
      onboardingComplete: true,
      bmi: decision.bmi,
      bmr: calculateBMR(form.weightKg!, form.heightCm!, form.age!, form.gender!),
      tdee: calculateTDEE(calculateBMR(form.weightKg!, form.heightCm!, form.age!, form.gender!), form.activityLevel!),
      dailyCalories: targets.calories, dailyProtein: targets.protein,
      dailyCarbs: targets.carbs, dailyFat: targets.fat,
    };

    saveProfile(profile);
    refreshProfile();

    try {
      await syncProfileToCloud(profile);
      setPhase('complete');
    } catch (e) {
      console.error('Failed to save onboarding profile to cloud:', e);
    }
  };

  const calcAge = (dobStr: string) => {
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const bmi = calculateBMI(form.weightKg!, form.heightCm!);

  // Premium option button
  const Option = ({ value, current, label, sub, onSelect, idx }: { value: string; current: string; label: string; sub?: string; onSelect: (v: string) => void; idx?: number }) => (
    <motion.button
      custom={idx || 0}
      variants={stagger}
      initial="hidden"
      animate="visible"
      onClick={() => onSelect(value)}
      whileTap={{ scale: 0.98 }}
      className={`w-full px-4 py-3.5 rounded-2xl text-left transition-all duration-200 border ${
        current === value
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card border-border hover:border-primary/20'
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      {sub && <p className={`text-[11px] mt-0.5 leading-snug ${current === value ? 'text-background/70' : 'text-muted-foreground'}`}>{sub}</p>}
    </motion.button>
  );

  // Premium chip select
  const ChipSelect = ({ options, selected, onToggle }: { options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }) => (
    <motion.div className="flex flex-wrap gap-2" initial="hidden" animate="visible">
      {options.map((o, i) => (
        <motion.button
          key={o.value}
          custom={i}
          variants={stagger}
          whileTap={{ scale: 0.95 }}
          onClick={() => onToggle(o.value)}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold transition-all border ${
            selected.includes(o.value)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border hover:border-primary/20'
          }`}
        >
          {o.label}
        </motion.button>
      ))}
    </motion.div>
  );

  const StepHeader = ({ title, subtitle }: { title: string; subtitle: string }) => {
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <h2 className="text-xl font-display font-bold text-foreground tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
      </motion.div>
    );
  };

  const monikaData = MONIKA_MESSAGES[step] || { message: "You're doing great! Keep going.", mood: 'happy' as const };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-2">
            <MonikaGuide message="Ready to begin your wellness journey?" mood="excited" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative mb-10"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-border">
                <img src={heroImg} alt="NutriLens" className="w-full h-full object-cover" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center mb-12"
            >
              <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">NutriLens AI</h1>
              <p className="text-sm text-muted-foreground mt-3 max-w-[260px] mx-auto leading-relaxed">
                Your intelligent nutrition companion. Snap, speak, or scan — we handle the rest.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-sm space-y-3"
            >
              <button
                onClick={goNext}
                className="w-full py-4 rounded-full bg-primary text-primary-foreground text-base font-semibold flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {}}
                className="w-full py-3.5 rounded-full bg-card border border-border text-sm font-semibold flex items-center justify-center gap-3 hover:bg-muted transition-all active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <button
                onClick={goNext}
                className="w-full py-3.5 rounded-full bg-card border border-border text-sm font-semibold flex items-center justify-center gap-3 hover:bg-muted transition-all active:scale-[0.98]"
              >
                <Mail className="w-4 h-4 text-muted-foreground" />
                Continue with Email
              </button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Already a user?{' '}
                <button onClick={goNext} className="text-foreground font-semibold hover:underline">Sign In</button>
              </p>
            </motion.div>
          </div>
        );

      case 'name':
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="What should we call you?" subtitle="We'll personalize your entire experience." />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Your name"
                autoFocus
                className="w-full px-5 py-4 rounded-2xl bg-card border border-border text-base font-medium outline-none focus:border-primary/30 transition-all placeholder:text-muted-foreground/40"
              />
            </motion.div>
            {form.name && form.name.length >= 2 && (
              <motion.p
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm text-muted-foreground font-medium text-center"
              >
                Hey {form.name} — let's build your plan
              </motion.p>
            )}
          </div>
        );

      case 'gender':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="What's your biological sex?" subtitle="Used for accurate metabolic calculations." />
            <div className="space-y-2.5">
              {[{ v: 'female', l: 'Female', e: '♀️' }, { v: 'male', l: 'Male', e: '♂️' }, { v: 'other', l: 'Other', e: '⚧️' }, { v: 'prefer_not', l: 'Prefer not to say', e: '—' }].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.gender!} label={`${o.e} ${o.l}`} onSelect={v => set('gender', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'occupation':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="What do you do?" subtitle="Your occupation type affects daily energy expenditure." />
            <div className="space-y-2.5">
              {[
                { v: 'student', l: '📚 Student', s: 'School, college, or university' },
                { v: 'employed', l: '💼 Working Professional', s: 'Full-time employment' },
                { v: 'self_employed', l: '🏢 Self-Employed', s: 'Own business or freelance' },
                { v: 'homemaker', l: '🏠 Homemaker', s: 'Managing household & family' },
                { v: 'retired', l: '🌅 Retired', s: 'No longer working' },
                { v: 'freelancer', l: '💻 Freelancer', s: 'Project-based work' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.occupation!} label={o.l} sub={o.s} onSelect={v => set('occupation', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'jobType':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="What type of work?" subtitle="Physical demands affect calorie calculations." />
            <div className="space-y-2.5">
              {[
                { v: 'desk_job', l: '🖥️ Desk / Office', s: 'Mostly sitting' },
                { v: 'field_work', l: '🚗 Field Work', s: 'Sales, delivery, site visits' },
                { v: 'manual_labor', l: '🏗️ Manual Labor', s: 'Construction, farming' },
                { v: 'healthcare', l: '🏥 Healthcare', s: 'Nursing, medical' },
                { v: 'teaching', l: '🎓 Teaching', s: 'Classroom or training' },
                { v: 'retail', l: '🛍️ Retail', s: 'Standing, walking' },
                { v: 'creative', l: '🎨 Creative', s: 'Art, writing, music' },
                { v: 'na', l: '➖ Not Applicable', s: 'Student or retired' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.jobType!} label={o.l} sub={o.s} onSelect={v => set('jobType', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'workActivity':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="How active is your workday?" subtitle="How physically demanding is a typical day?" />
            <div className="space-y-2.5">
              {[
                { v: 'mostly_sitting', l: '🪑 Mostly Sitting', s: 'Desk-bound, minimal movement' },
                { v: 'sitting_standing', l: '🔄 Mixed', s: 'Alternating throughout the day' },
                { v: 'mostly_standing', l: '🧍 On Your Feet', s: 'Walking and standing regularly' },
                { v: 'physically_demanding', l: '💪 Physically Demanding', s: 'Heavy lifting, manual work' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.workActivity!} label={o.l} sub={o.s} onSelect={v => set('workActivity', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'exercise':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="How often do you exercise?" subtitle="Gym, sports, running, yoga — any structured exercise." />
            <div className="space-y-2.5">
              {[
                { v: 'none', l: '🛋️ No Exercise', s: 'No structured workouts' },
                { v: 'light_walking', l: '🚶 Light Activity', s: 'Walking 15-30 min/day' },
                { v: '1_3_week', l: '🏃 1-3 Days/Week', s: 'Moderate gym or classes' },
                { v: '4_5_week', l: '🏋️ 4-5 Days/Week', s: 'Consistent training' },
                { v: 'daily', l: '⚡ Daily Training', s: 'Intense daily workouts' },
                { v: 'athlete', l: '🏆 Competitive Athlete', s: 'Multiple sessions per day' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.exerciseRoutine!} label={o.l} sub={o.s} onSelect={v => set('exerciseRoutine', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'sleep':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="How much do you sleep?" subtitle="Sleep quality affects metabolism and hunger." />
            <div className="space-y-2.5">
              {[
                { v: 'less_5', l: '😫 Under 5 Hours', s: 'Chronic sleep deprivation' },
                { v: '5_6', l: '😐 5-6 Hours', s: 'Below recommended' },
                { v: '7_8', l: '😊 7-8 Hours', s: 'Optimal range' },
                { v: '9_plus', l: '😴 9+ Hours', s: 'Extended rest' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.sleepHours!} label={o.l} sub={o.s} onSelect={v => set('sleepHours', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'stress':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="How's your stress level?" subtitle="Stress increases cortisol and affects appetite." />
            <div className="space-y-2.5">
              {[
                { v: 'low', l: '😌 Low', s: 'Generally relaxed and balanced' },
                { v: 'moderate', l: '😐 Moderate', s: 'Manageable stress from work/life' },
                { v: 'high', l: '😰 High', s: 'Frequent stress and anxiety' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.stressLevel!} label={o.l} sub={o.s} onSelect={v => set('stressLevel', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'cooking':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Do you cook at home?" subtitle="Home cooking gives better control over nutrition." />
            <div className="space-y-2.5">
              {[
                { v: 'rarely', l: '🍕 Rarely Cook', s: 'Mostly order or eat out' },
                { v: 'sometimes', l: '🍳 Sometimes', s: 'Cook a few times per week' },
                { v: 'most_days', l: '👨‍🍳 Most Days', s: 'Regular home cooking' },
                { v: 'always', l: '🏠 Always', s: 'Prepare all meals at home' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.cookingHabits!} label={o.l} sub={o.s} onSelect={v => set('cookingHabits', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'eatingOut':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="How often do you eat out?" subtitle="Restaurant meals typically have more calories." />
            <div className="space-y-2.5">
              {[
                { v: 'rarely', l: 'Rarely', s: 'A few times a month' },
                { v: '1_2_week', l: '1-2 Times/Week', s: 'Occasional dining out' },
                { v: '3_4_week', l: '3-4 Times/Week', s: 'Frequent dining out' },
                { v: 'daily', l: 'Almost Daily', s: 'Most meals from restaurants' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.eatingOut!} label={o.l} sub={o.s} onSelect={v => set('eatingOut', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'caffeine':
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Caffeine & Alcohol" subtitle="Both affect hydration and metabolism." />
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">☕ Daily Caffeine</p>
              <div className="space-y-2">
                {[
                  { v: 'none', l: 'None' },
                  { v: '1_2_cups', l: '1-2 Cups/Day' },
                  { v: '3_plus', l: '3+ Cups/Day' },
                ].map((o, i) => (
                  <Option key={o.v} value={o.v} current={form.caffeine!} label={o.l} onSelect={v => set('caffeine', v)} idx={i} />
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">🍷 Alcohol</p>
              <div className="space-y-2">
                {[
                  { v: 'never', l: 'Never' },
                  { v: 'occasionally', l: 'Occasionally' },
                  { v: '1_2_week', l: '1-2 Times/Week' },
                  { v: '3_plus_week', l: '3+ Times/Week' },
                ].map((o, i) => (
                  <Option key={o.v} value={o.v} current={form.alcohol || ''} label={o.l} onSelect={v => set('alcohol', v)} idx={i} />
                ))}
              </div>
            </motion.div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Overall activity level" subtitle="Combining work, exercise, and daily movement." />
            <div className="space-y-2.5">
              {[
                { v: 'sedentary', l: '🪑 Sedentary', s: 'Little to no exercise (1.2×)' },
                { v: 'light', l: '🚶 Lightly Active', s: 'Light exercise 1-3 days/week (1.375×)' },
                { v: 'moderate', l: '🏃 Moderately Active', s: 'Moderate exercise 3-5 days/week (1.55×)' },
                { v: 'active', l: '🏋️ Very Active', s: 'Hard exercise 6-7 days/week (1.725×)' },
                { v: 'athlete', l: '🏆 Athlete', s: 'Intense daily training (1.9×)' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.activityLevel!} label={o.l} sub={o.s} onSelect={v => set('activityLevel', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'measurements': {
        const liveBmr = form.heightCm! > 100 && form.weightKg! > 20 && form.age! > 0
          ? calculateBMR(form.weightKg!, form.heightCm!, form.age!, form.gender || 'male')
          : 0;
        const liveTdee = liveBmr > 0 ? calculateTDEE(liveBmr, form.activityLevel || 'moderate') : 0;
        const liveGoalCal = liveTdee > 0
          ? (form.goal === 'lose' ? liveTdee - 500 : form.goal === 'gain' ? liveTdee + 500 : liveTdee)
          : 0;
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Body measurements" subtitle="Used to calculate BMR and personalized targets." />
            <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Height (cm)</label>
                <div className="relative mt-1.5">
                  <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="number" value={form.heightCm} onChange={e => set('heightCm', Number(e.target.value))}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Weight (kg)</label>
                <div className="relative mt-1.5">
                  <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="number" value={form.weightKg} onChange={e => set('weightKg', Number(e.target.value))}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all" />
                </div>
              </div>
            </motion.div>
            {/* BMI Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Body Mass Index</span>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  bmi < 18.5 ? 'bg-muted text-muted-foreground' : bmi < 25 ? 'bg-primary/10 text-primary' : bmi < 30 ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                }`}>{getBMICategory(bmi)}</span>
              </div>
              <p className="text-4xl font-mono font-bold text-foreground tracking-tighter">{bmi.toFixed(1)}</p>
              <div className="mt-3 h-2 rounded-full overflow-hidden bg-muted relative">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 bg-muted-foreground/20 rounded-l-full" />
                  <div className="flex-1 bg-primary/40" />
                  <div className="flex-1 bg-accent/40" />
                  <div className="flex-1 bg-destructive/40 rounded-r-full" />
                </div>
                <motion.div
                  className="absolute top-0 w-0.5 h-full bg-primary rounded-full"
                  initial={{ left: '50%' }}
                  animate={{ left: `${Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100))}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground font-mono font-medium">
                <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
              </div>
            </motion.div>
            {/* Live Metabolic Stats */}
            {liveBmr > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="grid grid-cols-3 gap-2"
              >
                <div className="bg-card border border-border rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">BMR</p>
                  <motion.p
                    key={Math.round(liveBmr)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-lg font-mono font-bold text-foreground"
                  >{Math.round(liveBmr)}</motion.p>
                  <p className="text-[9px] text-muted-foreground">kcal/day</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">TDEE</p>
                  <motion.p
                    key={Math.round(liveTdee)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-lg font-mono font-bold text-foreground"
                  >{Math.round(liveTdee)}</motion.p>
                  <p className="text-[9px] text-muted-foreground">kcal/day</p>
                </div>
                <div className="bg-card border border-primary/20 rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Target</p>
                  <motion.p
                    key={Math.round(liveGoalCal)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-lg font-mono font-bold text-primary"
                  >{Math.round(liveGoalCal)}</motion.p>
                  <p className="text-[9px] text-muted-foreground">kcal/day</p>
                </div>
              </motion.div>
            )}
          </div>
        );
      }

      case 'dob':
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="When were you born?" subtitle="Age is a key factor in BMR calculation." />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={form.dob}
                  onChange={e => { set('dob', e.target.value); set('age', calcAge(e.target.value)); }}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all"
                />
              </div>
            </motion.div>
            {form.dob && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-2xl p-6 text-center"
              >
                <motion.p
                  key={form.dob}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-5xl font-mono font-bold text-foreground tracking-tighter"
                >
                  {calcAge(form.dob!)}
                </motion.p>
                <p className="text-sm text-muted-foreground mt-1 font-medium">years old</p>
              </motion.div>
            )}
          </div>
        );

      case 'goal':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="What's your goal?" subtitle="This determines your daily calorie target." />
            <div className="space-y-2.5">
              {[
                { v: 'lose', l: '🔥 Lose Weight', s: 'Calorie deficit of ~500 kcal/day' },
                { v: 'maintain', l: '⚖️ Maintain Weight', s: 'Eat at your TDEE level' },
                { v: 'gain', l: '💪 Build Muscle / Gain', s: 'Calorie surplus of ~500 kcal/day' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.goal!} label={o.l} sub={o.s} onSelect={v => set('goal', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'targetWeight': {
        const weightDiff = Math.abs(form.weightKg! - form.targetWeight!);
        const pctChange = (weightDiff / form.weightKg!) * 100;
        const weeksNeeded = form.goalSpeed! > 0 ? weightDiff / form.goalSpeed! : 0;
        const goalWarnings: string[] = [];
        if (pctChange > 25) goalWarnings.push(`This requires a ${pctChange.toFixed(0)}% change in body weight. Consider an intermediate goal.`);
        if (weeksNeeded > 52) goalWarnings.push(`This would take ~${Math.round(weeksNeeded / 4)} months. Consider breaking into phases.`);
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="What's your target weight?" subtitle={`Current weight: ${form.weightKg} kg`} />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="number" value={form.targetWeight} onChange={e => set('targetWeight', Number(e.target.value))}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }} className="bg-card border border-border rounded-2xl p-5 text-center">
              <p className="text-3xl font-mono font-bold text-foreground tracking-tighter">{form.targetWeight} kg</p>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                {form.targetWeight! < form.weightKg! ? `${(form.weightKg! - form.targetWeight!).toFixed(1)} kg to lose` :
                 form.targetWeight! > form.weightKg! ? `${(form.targetWeight! - form.weightKg!).toFixed(1)} kg to gain` : 'Maintain current weight'}
              </p>
              {weeksNeeded > 0 && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Est. {Math.round(weeksNeeded)} weeks at {form.goalSpeed} kg/week
                </p>
              )}
            </motion.div>
            {goalWarnings.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                {goalWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-xl p-3 mb-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-destructive/80">{w}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        );
      }

      case 'goalSpeed':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="How fast do you want results?" subtitle="Slower rates are more sustainable." />
            <div className="space-y-2.5">
              {[
                { v: 0.25, l: '🐢 Gentle — 0.25 kg/week', s: 'Most sustainable, minimal muscle loss' },
                { v: 0.5, l: '⚖️ Balanced — 0.5 kg/week', s: 'Recommended by nutritionists' },
                { v: 0.75, l: '🚀 Aggressive — 0.75 kg/week', s: 'Faster results, requires discipline' },
              ].map((o, i) => (
                <Option key={String(o.v)} value={String(o.v)} current={String(form.goalSpeed)} label={o.l} sub={o.s} onSelect={v => set('goalSpeed', Number(v))} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'dietary':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Dietary preferences" subtitle="Select all that apply, or skip." />
            <ChipSelect
              options={[
                { value: 'vegetarian', label: '🥬 Vegetarian' }, { value: 'vegan', label: '🌱 Vegan' },
                { value: 'keto', label: '🥑 Keto' }, { value: 'paleo', label: '🥩 Paleo' },
                { value: 'gluten_free', label: '🌾 Gluten-Free' }, { value: 'dairy_free', label: '🥛 Dairy-Free' },
                { value: 'mediterranean', label: '🫒 Mediterranean' }, { value: 'none', label: '✅ No restrictions' },
              ]}
              selected={form.dietaryPrefs || []}
              onToggle={v => {
                const curr = form.dietaryPrefs || [];
                if (v === 'none') {
                  set('dietaryPrefs', curr.includes('none') ? [] : ['none']);
                } else {
                  const without = curr.filter((x: string) => x !== 'none');
                  set('dietaryPrefs', without.includes(v) ? without.filter((x: string) => x !== v) : [...without, v]);
                }
              }}
            />
          </div>
        );

      case 'health':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Health conditions" subtitle="Select any conditions — we'll tailor your plan." />
            <ChipSelect
              options={[
                { value: 'diabetes', label: '🩸 Diabetes' },
                { value: 'hypertension', label: '🫀 Hypertension' },
                { value: 'thyroid', label: '🦋 Thyroid' },
                { value: 'cholesterol', label: '💊 High Cholesterol' },
                { value: 'lactose_intolerance', label: '🥛 Lactose Intolerance' },
                { value: 'none', label: '✅ None' },
              ]}
              selected={form.healthConditions || []}
              onToggle={v => {
                const curr = form.healthConditions || [];
                if (v === 'none') {
                  set('healthConditions', curr.includes('none') ? [] : ['none']);
                } else {
                  const without = curr.filter((x: string) => x !== 'none');
                  set('healthConditions', without.includes(v) ? without.filter((x: string) => x !== v) : [...without, v]);
                }
              }}
            />
          </div>
        );

      case 'diabetesDetails':
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Tell us about your diabetes" subtitle="Helps fine-tune carb limits and meal timing." />
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Type</p>
              <div className="flex gap-2.5">
                {[
                  { v: 'type1', l: 'Type 1' },
                  { v: 'type2', l: 'Type 2' },
                  { v: 'prediabetes', l: 'Pre-diabetes' },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => set('diabetesType', o.v)}
                    className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all border ${
                      form.diabetesType === o.v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Diagnosed by a doctor?</p>
              <div className="flex gap-2.5">
                {[
                  { v: true, l: 'Yes — Diagnosed' },
                  { v: false, l: 'No — Monitoring' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => set('diabetesDiagnosed', o.v)}
                    className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all border ${
                      form.diabetesDiagnosed === o.v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Latest HbA1c (optional)</p>
              <input
                type="number"
                step="0.1"
                value={form.diabetesHba1c || ''}
                onChange={e => set('diabetesHba1c', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 6.5"
                className="w-full px-5 py-3.5 rounded-2xl bg-card border border-border text-sm font-medium outline-none focus:border-primary/30 transition-all placeholder:text-muted-foreground/40"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Skip if you don't know</p>
            </motion.div>
          </div>
        );

      case 'hypertensionDetails':
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="About your blood pressure" subtitle="Helps us flag high-sodium foods." />
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Diagnosed by a doctor?</p>
              <div className="flex gap-2.5">
                {[
                  { v: true, l: 'Yes — Diagnosed' },
                  { v: false, l: 'No — Monitoring' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => set('hypertensionDiagnosed', o.v)}
                    className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all border ${
                      form.hypertensionDiagnosed === o.v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        );

      case 'lactoseDetails':
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Lactose intolerance" subtitle="We'll flag dairy and suggest alternatives." />
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Severity (1 = mild, 5 = severe)</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => set('lactoseSeverity', n)}
                    className={`flex-1 py-3 rounded-full text-sm font-bold transition-all border ${
                      form.lactoseSeverity === n
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        );

      case 'healthGoals':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Health & fitness goals" subtitle="Select what matters most." />
            <ChipSelect
              options={[
                { value: 'weight-loss', label: '🔥 Weight Loss' },
                { value: 'high-protein', label: '💪 High Protein' },
                { value: 'muscle-gain', label: '🏋️ Muscle Gain' },
                { value: 'gut-health', label: '🦠 Gut Health' },
                { value: 'hormone-balance', label: '⚖️ Hormone Balance' },
                { value: 'low-sodium', label: '🧂 Low Sodium' },
                { value: 'skin-health', label: '✨ Skin Health' },
                { value: 'energy', label: '⚡ More Energy' },
                { value: 'none', label: '✅ No specific goals' },
              ]}
              selected={form.healthGoals || []}
              onToggle={v => {
                const curr = form.healthGoals || [];
                if (v === 'none') {
                  set('healthGoals', curr.includes('none') ? [] : ['none']);
                } else {
                  const without = curr.filter((x: string) => x !== 'none');
                  set('healthGoals', without.includes(v) ? without.filter((x: string) => x !== v) : [...without, v]);
                }
              }}
            />
          </div>
        );

      case 'skinConcerns': {
        const SKIN_OPTIONS = [
          { value: 'acne', label: '🔴 Acne / Breakouts', sub: 'Zinc & low-GI foods reduce breakouts' },
          { value: 'oily', label: '💧 Oily Skin', sub: 'Zinc & vitamin B6 regulate sebum' },
          { value: 'dry', label: '🏜️ Dry Skin', sub: 'Omega-3 & vitamin E restore moisture' },
          { value: 'dull', label: '😶 Dullness', sub: 'Vitamin C boosts collagen & radiance' },
          { value: 'pigmentation', label: '🟤 Pigmentation', sub: 'Antioxidants reduce dark spots' },
          { value: 'sensitive', label: '🌡️ Sensitivity', sub: 'Anti-inflammatory foods soothe skin' },
        ];
        const skinData = form.skinConcerns || {};
        const hasConcerns = SKIN_OPTIONS.some(o => skinData[o.value]);

        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Any skin concerns?" subtitle="We'll recommend foods proven to support healthy skin. Optional — skip if none." />
            <div className="space-y-2.5">
              {SKIN_OPTIONS.map((o, i) => (
                <motion.button
                  key={o.value}
                  custom={i}
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const prev = form.skinConcerns || {};
                    set('skinConcerns', { ...prev, [o.value]: !prev[o.value] });
                  }}
                  className={`w-full px-4 py-3.5 rounded-2xl text-left transition-all duration-200 border ${
                    skinData[o.value]
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:border-primary/20'
                  }`}
                >
                  <span className="text-sm font-semibold">{o.label}</span>
                  <p className={`text-[11px] mt-0.5 leading-snug ${skinData[o.value] ? 'text-background/70' : 'text-muted-foreground'}`}>{o.sub}</p>
                </motion.button>
              ))}
            </div>

            {hasConcerns && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Seasonal changes</p>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => set('skinConcerns', { ...skinData, winterDry: !skinData.winterDry })}
                    className={`flex-1 py-3 px-3 rounded-2xl text-center transition-all border ${
                      skinData.winterDry ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
                    }`}
                  >
                    <span className="text-sm">❄️</span>
                    <p className={`text-[10px] font-medium mt-1 ${skinData.winterDry ? 'text-background/80' : 'text-foreground'}`}>Drier in winter</p>
                  </button>
                  <button
                    onClick={() => set('skinConcerns', { ...skinData, summerOily: !skinData.summerOily })}
                    className={`flex-1 py-3 px-3 rounded-2xl text-center transition-all border ${
                      skinData.summerOily ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
                    }`}
                  >
                    <span className="text-sm">☀️</span>
                    <p className={`text-[10px] font-medium mt-1 ${skinData.summerOily ? 'text-background/80' : 'text-foreground'}`}>Oilier in summer</p>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        );
      }
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Women's health" subtitle="Helps tailor your meal plan to hormonal needs." />
            <ChipSelect
              options={[
                { value: 'pcos', label: '🌸 PCOS' },
                { value: 'pregnancy', label: '🤰 Pregnancy / Breastfeeding' },
                { value: 'menopause', label: '🌡️ Menopause' },
                { value: 'irregular_periods', label: '📅 Irregular Periods' },
                { value: 'none', label: '✅ None' },
              ]}
              selected={form.womenHealth || []}
              onToggle={v => {
                const curr = form.womenHealth || [];
                if (v === 'none') {
                  set('womenHealth', curr.includes('none') ? [] : ['none']);
                } else {
                  const without = curr.filter((x: string) => x !== 'none');
                  set('womenHealth', without.includes(v) ? without.filter((x: string) => x !== v) : [...without, v]);
                }
              }}
            />
          </div>
        );

      case 'pcosDetails':
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Tell us about your PCOS" subtitle="Helps personalize meals for your specific type." />
            
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">PCOS type</p>
              <div className="space-y-2">
                {[
                  { v: 'insulin-resistant', l: 'Insulin-Resistant', s: 'Most common — blood sugar issues' },
                  { v: 'inflammatory', l: 'Inflammatory', s: 'Chronic inflammation & skin issues' },
                  { v: 'mixed', l: 'Mixed', s: 'Combination of both' },
                  { v: 'unknown', l: 'Not Sure', s: 'General PCOS guidelines' },
                ].map((o, i) => (
                  <Option key={o.v} value={o.v} current={form.pcosType || ''} label={o.l} sub={o.s} onSelect={v => set('pcosType', v)} idx={i} />
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Symptom severity (1 = mild, 5 = severe)</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => set('pcosSeverity', n)}
                    className={`flex-1 py-3 rounded-full text-sm font-bold transition-all border ${
                      form.pcosSeverity === n
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Diagnosed by a doctor?</p>
              <div className="flex gap-2.5">
                {[
                  { v: true, l: 'Yes' },
                  { v: false, l: 'No / Self-suspected' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => set('pcosDiagnosed', o.v)}
                    className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all border ${
                      form.pcosDiagnosed === o.v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        );

      case 'menHealth':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Men's health" subtitle="Helps provide relevant nutritional guidance." />
            <div className="space-y-2.5">
              {[
                { v: 'yes', l: 'Yes, I have prostate concerns', s: 'We\'ll include supportive nutrients' },
                { v: 'no', l: 'No concerns', s: 'No adjustments needed' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={form.menHealth?.prostateConcerns ? 'yes' : (form.menHealth?.prostateConcerns === false ? 'no' : '')} label={o.l} sub={o.s} onSelect={v => set('menHealth', { prostateConcerns: v === 'yes' })} idx={i} />
              ))}
            </div>
          </div>
        );

      case 'medications':
        return (
          <div className="space-y-6">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Medications & supplements" subtitle="Optional — helps avoid nutrient interactions." />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <textarea
                value={form.medications || ''}
                onChange={e => set('medications', e.target.value)}
                placeholder="e.g., Metformin, Vitamin D, Birth control..."
                rows={3}
                className="w-full px-5 py-4 rounded-2xl bg-card border border-border text-sm font-medium outline-none focus:border-primary/30 transition-all placeholder:text-muted-foreground/40 resize-none"
              />
              <p className="text-[11px] text-muted-foreground mt-2">You can skip this — it's completely optional.</p>
            </motion.div>
          </div>
        );

      case 'mealTimes':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Your meal schedule" subtitle="When do you usually eat?" />
            <motion.div className="space-y-2.5" initial="hidden" animate="visible">
              {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((meal, i) => (
                <motion.div
                  key={meal}
                  custom={i}
                  variants={stagger}
                  className="flex items-center justify-between bg-card border border-border px-5 py-3.5 rounded-2xl"
                >
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {meal === 'breakfast' ? '🌅' : meal === 'lunch' ? '☀️' : meal === 'dinner' ? '🌙' : '🍿'} {meal}
                  </span>
                  <input
                    type="time"
                    value={form.mealTimes?.[meal] || '12:00'}
                    onChange={e => set('mealTimes', { ...form.mealTimes, [meal]: e.target.value })}
                    className="bg-transparent text-sm font-mono font-semibold text-foreground outline-none"
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        );

      case 'water':
        return (
          <div className="space-y-5">
            <MonikaGuide message={monikaData.message} mood={monikaData.mood} />
            <StepHeader title="Daily water goal" subtitle="Proper hydration is essential for metabolism." />
            <div className="space-y-2.5">
              {[
                { v: 1500, l: '💧 1.5 Liters', s: '6 cups — minimum recommended' },
                { v: 2000, l: '💧 2.0 Liters', s: '8 cups — standard recommendation' },
                { v: 2500, l: '💧 2.5 Liters', s: '10 cups — active lifestyle' },
                { v: 3000, l: '🌊 3.0 Liters', s: '12 cups — high activity' },
              ].map((o, i) => (
                <Option key={o.v} value={String(o.v)} current={String(form.waterGoal)} label={o.l} sub={o.s} onSelect={v => set('waterGoal', Number(v))} idx={i} />
              ))}
            </div>
          </div>
        );

      default: return null;
    }
  };

  // === WELCOME PHASE ===
  if (phase === 'welcome') {
    return (
      <WelcomeScreen
        onGetStarted={() => setPhase('scanner')}
        onSignIn={() => navigate('/auth')}
      />
    );
  }

  // === SCANNER PHASE ===
  if (phase === 'scanner') {
    return (
      <ScannerOnboardingScreen
        onBack={() => setPhase('welcome')}
        onContinue={() => {
          setPhase('onboarding');
          setStepIdx(1); // Skip old 'welcome' step, start at 'name'
        }}
      />
    );
  }

  // === SUBSCRIPTION PHASE ===
  if (phase === 'subscription') {
    return (
      <SubscriptionScreen
        name={form.name || 'Friend'}
        onUpgrade={() => navigate('/')}
        onSkip={() => {
          const hasSeenRetention = localStorage.getItem('retention_offer_shown');
          if (!hasSeenRetention) {
            setPhase('retention');
          } else {
            navigate('/');
          }
        }}
      />
    );
  }

  // === RETENTION OFFER PHASE ===
  if (phase === 'retention') {
    return (
      <RetentionOfferScreen
        onAccept={() => navigate('/')}
        onDismiss={() => navigate('/')}
      />
    );
  }

  // === COMPLETION PHASE ===
  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-background">
        <CompletionScreen name={form.name || 'Friend'} onGoHome={() => setPhase('subscription')} />
      </div>
    );
  }

  // === PROFILE REVIEW PHASE ===
  if (phase === 'profileReview') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto w-full px-5 py-5 overflow-y-auto">
          <ProfileSummaryScreen
            form={form}
            onEdit={handleEditSection}
            onContinue={handleProfileReviewContinue}
          />
        </div>
      </div>
    );
  }

  // === CALCULATING PHASE ===
  if (phase === 'calculating') {
    return (
      <div className="min-h-screen bg-background relative">
        <CalculatingScreen onComplete={handleCalculationComplete} />
      </div>
    );
  }

  // === MEAL BREAKDOWN PHASE ===
  if (phase === 'mealBreakdown') {
    const targets = calculatedTargets || { calories: 2000, protein: 75, carbs: 250, fat: 65 };
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto w-full px-5 py-5 overflow-y-auto">
          <MealBreakdownScreen
            calories={targets.calories}
            protein={targets.protein}
            carbs={targets.carbs}
            fat={targets.fat}
            onContinue={handleMealBreakdownContinue}
          />
        </div>
      </div>
    );
  }

  // === MOTIVATION PHASE ===
  if (phase === 'motivation') {
    return (
      <div className="min-h-screen bg-background">
        <MotivationalScreen
          name={form.name || 'Friend'}
          goal={form.goal || 'maintain'}
          healthConditions={form.healthConditions || []}
          onDismiss={() => void handleMotivationDismiss()}
        />
      </div>
    );
  }

  // === ONBOARDING PHASE ===
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {step !== 'welcome' && (
        <OnboardingProgress
          current={stepIdx}
          total={STEPS.length - 1}
          stepName={STEP_LABELS[step] || step}
        />
      )}

      <div className="flex-1 max-w-lg mx-auto w-full px-6 py-5 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepIdx}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {step !== 'welcome' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto w-full px-6 pb-6 flex gap-3"
        >
          {stepIdx > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goBack}
              className="px-4 py-3.5 rounded-full bg-card border border-border font-semibold text-sm hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={goNext}
            disabled={!canContinue()}
            className={`flex-1 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              canContinue() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {stepIdx === STEPS.length - 1 ? (
              <><Check className="w-4 h-4" /> Review & Finish</>
            ) : (
              <>Continue <ArrowRight className="w-4 h-4" /></>
            )}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
