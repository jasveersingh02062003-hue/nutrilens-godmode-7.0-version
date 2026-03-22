import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles, Heart, User, Dumbbell, Ruler, Scale, Target, TrendingDown, Droplets, AlertTriangle, ChevronDown, Clock, Loader2, UtensilsCrossed, Zap, Camera, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateBMI, calculateBMR, getBMICategory, getActivityMultiplier } from '@/lib/nutrition';
import { calculateOnboardingGoals, calculateWaterGoal, type OnboardingGoalResult } from '@/lib/goal-engine';
import { saveOnboardingData, saveOnboardingProgress, getOnboardingProgress, clearOnboardingProgress, type OnboardingData } from '@/lib/onboarding-store';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { saveProfile } from '@/lib/store';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import ScannerOnboardingScreen from '@/components/onboarding/ScannerOnboardingScreen';
import PlansPage from '@/components/PlansPage';

// ── Animation variants ──
const pageVariants = {
  enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
  exit: (d: number) => ({ x: d < 0 ? 60 : -60, opacity: 0, transition: { duration: 0.2 } }),
};
const stagger = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, type: 'spring' as const, stiffness: 500, damping: 35 } }),
};

// ── Reusable UI ──
const Option = ({ value, current, label, sub, onSelect, idx }: { value: string; current: string; label: string; sub?: string; onSelect: (v: string) => void; idx?: number }) => (
  <motion.button custom={idx || 0} variants={stagger} initial="hidden" animate="visible" onClick={() => onSelect(value)} whileTap={{ scale: 0.98 }}
    className={`w-full px-4 py-3.5 rounded-2xl text-left transition-all duration-200 border ${current === value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/20'}`}>
    <span className="text-sm font-semibold">{label}</span>
    {sub && <p className={`text-[11px] mt-0.5 leading-snug ${current === value ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{sub}</p>}
  </motion.button>
);

const ChipSelect = ({ options, selected, onToggle }: { options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }) => (
  <motion.div className="flex flex-wrap gap-2" initial="hidden" animate="visible">
    {options.map((o, i) => (
      <motion.button key={o.value} custom={i} variants={stagger} whileTap={{ scale: 0.95 }} onClick={() => onToggle(o.value)}
        className={`px-4 py-2.5 rounded-full text-xs font-semibold transition-all border ${selected.includes(o.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/20'}`}>
        {o.label}
      </motion.button>
    ))}
  </motion.div>
);

const StepHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
    <h2 className="text-xl font-display font-bold text-foreground tracking-tight">{title}</h2>
    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
  </motion.div>
);

// ── Unit toggle button ──
const UnitToggle = ({ active, options, onToggle }: { active: string; options: [string, string]; onToggle: () => void }) => (
  <button onClick={onToggle} className="flex items-center bg-muted rounded-full p-0.5 text-[10px] font-semibold">
    {options.map(o => (
      <span key={o} className={`px-3 py-1.5 rounded-full transition-all ${active === o ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{o}</span>
    ))}
  </button>
);

// ── Skin insights ──
const SKIN_INSIGHTS: Record<string, string> = {
  'acne-prone': "Your plan will focus on zinc-rich foods like pumpkin seeds and lentils, and limit dairy.",
  dry: "Your plan will focus on healthy fats like avocado and nuts, plus extra water reminders.",
  oily: "Your plan will focus on zinc-rich foods like chickpeas and seeds to help regulate oil production.",
  combination: "Your plan will balance omega-3 fats and zinc-rich foods for your combination skin.",
  sensitive: "Your plan will prioritize anti-inflammatory foods like turmeric, berries and leafy greens.",
  eczema: "Your plan will focus on omega-3 rich foods like flaxseeds and walnuts to reduce inflammation.",
  rosacea: "Your plan will prioritize anti-inflammatory foods and limit spicy triggers.",
  psoriasis: "Your plan will focus on vitamin D-rich foods and anti-inflammatory omega-3 sources.",
};

// ── Condition insights ──
const CONDITION_INSIGHTS: Record<string, string> = {
  diabetes: 'low-GI foods to manage blood sugar',
  thyroid: 'iodine and selenium-rich foods for thyroid support',
  pcos: 'anti-inflammatory and hormone-balancing foods',
  hypertension: 'low-sodium, potassium-rich foods for blood pressure',
  highCholesterol: 'fiber-rich foods and healthy fats to manage cholesterol',
  ibs: 'gut-friendly, low-FODMAP food choices',
  anemia: 'iron-rich foods like spinach, lentils and fortified cereals',
};

// ── Macro food translations ──
function getProteinTranslation(protein: number, diet: string): string {
  if (diet === 'veg' || diet === 'vegan') {
    const dal = Math.round(protein * 0.3 / 8);
    const paneer = Math.round(protein * 0.3 / 18);
    const tofu = Math.round(protein * 0.2 / 12);
    return `~${dal} bowls dal + ${paneer}×100g paneer + ${tofu}×100g tofu daily`;
  }
  const eggs = Math.round(protein * 0.25 / 6);
  const chicken = Math.round(protein * 0.4 / 25);
  return `~${eggs} eggs + ${chicken}×100g chicken + a bowl of dal daily`;
}

// ── Supplement insights ──
function getSupplementInsight(supp: string, protein: number): string {
  const map: Record<string, string> = {
    vitaminD: "Vitamin D supports calcium absorption and immune health.",
    omega3: "Omega-3 reduces inflammation and supports heart health.",
    proteinPowder: `Protein powder will help you hit your daily protein target of ${protein}g.`,
    collagen: "Collagen supports skin elasticity and joint health.",
    multivitamin: "A multivitamin fills potential nutrient gaps in your diet.",
    iron: "Iron is essential for oxygen transport, especially for women.",
    magnesium: "Magnesium supports sleep quality and muscle recovery.",
  };
  return map[supp] || '';
}

// ── Intelligence Demo data ──
const DEMO_FOODS = [
  { name: 'Grilled Paneer Salad', tags: ['lowGI', 'highProtein', 'veg'], cal: 380, protein: 22, carbs: 12, fat: 24, cost: 120 },
  { name: 'Egg Bhurji with Roti', tags: ['highProtein', 'nonVeg'], cal: 350, protein: 20, carbs: 35, fat: 14, cost: 80 },
  { name: 'Moong Dal Cheela', tags: ['lowGI', 'highProtein', 'veg', 'vegan'], cal: 220, protein: 14, carbs: 28, fat: 6, cost: 40 },
  { name: 'Chicken Tikka Bowl', tags: ['highProtein', 'nonVeg', 'lowGI'], cal: 420, protein: 35, carbs: 25, fat: 18, cost: 150 },
];

const CONDITION_RULES: Record<string, { avoid: string[]; prefer: string[] }> = {
  diabetes: { avoid: ['highSugar', 'highGI'], prefer: ['lowGI'] },
  pcos: { avoid: ['highGI', 'inflammatory'], prefer: ['lowGI', 'antiInflammatory'] },
  hypertension: { avoid: ['highSodium'], prefer: ['potassiumRich'] },
  highCholesterol: { avoid: ['highSatFat'], prefer: ['fiberRich'] },
};

function getDemoMeal(diet: string, conditions: string[]) {
  let pool = DEMO_FOODS;
  if (diet === 'veg' || diet === 'vegan') pool = pool.filter(f => f.tags.includes('veg') || f.tags.includes('vegan'));
  if (diet === 'non-veg' || diet === 'noRestrictions') pool = DEMO_FOODS;
  // Prefer foods matching condition preferences
  const preferred = pool.filter(f => {
    return conditions.some(c => CONDITION_RULES[c]?.prefer.some(t => f.tags.includes(t)));
  });
  return preferred.length > 0 ? preferred[0] : pool[0];
}

function getCameraWarnings(conditions: string[]): string[] {
  const food = { name: 'Sweet Lassi', tags: ['highSugar', 'dairy', 'highGI'] };
  const warnings: string[] = [];
  conditions.forEach(c => {
    const rules = CONDITION_RULES[c];
    if (!rules) return;
    const matched = rules.avoid.filter(t => food.tags.includes(t));
    if (matched.length > 0) {
      const labels: Record<string, string> = {
        diabetes: '⚠️ High sugar content — may spike blood glucose',
        pcos: '⚠️ High-GI dairy — may worsen inflammation',
        hypertension: '⚠️ Watch sodium in flavoured variants',
        highCholesterol: '⚠️ Full-fat dairy — consider low-fat option',
      };
      if (labels[c]) warnings.push(labels[c]);
    }
  });
  if (warnings.length === 0) warnings.push('✅ No major warnings for your profile');
  return warnings;
}

type Phase = 'welcome' | 'scanner' | 'wizard' | 'calculating' | 'success';

interface FormState {
  name: string;
  gender: string;
  age: number;
  heightCm: number;
  weightKg: number;
  heightUnit: 'cm' | 'ft';
  weightUnit: 'kg' | 'lb';
  heightFt: number;
  heightIn: number;
  conditions: string[];
  skin: string;
  // Gender-specific
  pcosSeverity: number;
  pregnant: boolean;
  breastfeeding: boolean;
  menstrualPhase: string;
  prostateConcerns: boolean;
  testosteroneConcerns: boolean;
  // Activity
  work: string;
  exercise: string;
  // Goals
  goalType: string;
  goalSpeed: string;
  targetWeight: number;
  // Lifestyle
  wantLifestyle: boolean | null;
  diet: string;
  water: number;
  supplements: string[];
  cookingSkill: string;
  cookingTime: number;
  cookingEquipment: string[];
  // Budget
  budgetEnabled: boolean;
  budgetAmount: number;
  budgetBreakfast: number;
  budgetLunch: number;
  budgetDinner: number;
  budgetSnacks: number;
}

/*
 * Step map:
 * 0  Name
 * 1  Gender
 * 2  Age
 * 3  Height
 * 4  Weight
 * 5  BMI/BMR value drop
 * 6  Health conditions
 * 7  Skin
 * 8  Gender-specific questions (NEW)
 * 9  Work type
 * 10 Exercise
 * 11 Goal type
 * 12 Goal speed (conditional: lose/gain)
 * 13 Target weight (conditional: lose/gain)
 * 14 Final output (calculating transition before this)
 * 15 Want lifestyle?
 * 16 Diet (conditional: wantLifestyle)
 * 17 Water (conditional)
 * 18 Supplements (conditional)
 * 19 Budget (conditional) (NEW)
 * 20 Cooking (conditional)
 * 21 Intelligence demo (NEW)
 * 22 Finish
 */

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useUserProfile();
  const { syncProfileToCloud } = useAuth();
  const [phase, setPhase] = useState<Phase>('welcome');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [goalResult, setGoalResult] = useState<OnboardingGoalResult | null>(null);
  const [showPlansAfterOnboarding, setShowPlansAfterOnboarding] = useState(false);

  const [f, setF] = useState<FormState>({
    name: '', gender: '', age: 25, heightCm: 170, weightKg: 70,
    heightUnit: 'cm', weightUnit: 'kg', heightFt: 5, heightIn: 7,
    conditions: [], skin: '',
    pcosSeverity: 3, pregnant: false, breastfeeding: false, menstrualPhase: '',
    prostateConcerns: false, testosteroneConcerns: false,
    work: '', exercise: '',
    goalType: '', goalSpeed: 'balanced', targetWeight: 65,
    wantLifestyle: null,
    diet: '', water: 2.5, supplements: [], cookingSkill: '', cookingTime: 30, cookingEquipment: [],
    budgetEnabled: false, budgetAmount: 500, budgetBreakfast: 25, budgetLunch: 35, budgetDinner: 30, budgetSnacks: 10,
  });

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => setF(prev => ({ ...prev, [key]: val })), []);

  // Unit conversion helpers
  const setHeightFromFtIn = (ft: number, inches: number) => {
    const cm = Math.round(ft * 30.48 + inches * 2.54);
    setF(prev => ({ ...prev, heightFt: ft, heightIn: inches, heightCm: cm }));
  };
  const toggleHeightUnit = () => {
    if (f.heightUnit === 'cm') {
      const totalIn = f.heightCm / 2.54;
      setF(prev => ({ ...prev, heightUnit: 'ft', heightFt: Math.floor(totalIn / 12), heightIn: Math.round(totalIn % 12) }));
    } else {
      setF(prev => ({ ...prev, heightUnit: 'cm' }));
    }
  };
  const toggleWeightUnit = () => {
    if (f.weightUnit === 'kg') {
      setF(prev => ({ ...prev, weightUnit: 'lb' }));
    } else {
      setF(prev => ({ ...prev, weightUnit: 'kg' }));
    }
  };
  const displayWeight = f.weightUnit === 'lb' ? Math.round(f.weightKg * 2.205) : f.weightKg;
  const setWeightFromDisplay = (val: number) => {
    const kg = f.weightUnit === 'lb' ? +(val / 2.205).toFixed(1) : val;
    set('weightKg', kg);
  };

  const getVisibleSteps = (): number[] => {
    const steps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    if (f.goalType === 'lose' || f.goalType === 'gain') {
      steps.push(12, 13);
    }
    steps.push(14, 15);
    if (f.wantLifestyle === true) {
      steps.push(16, 17, 18, 19, 20);
    }
    steps.push(21, 22);
    return steps;
  };

  const visibleSteps = getVisibleSteps();
  const currentVisibleIdx = visibleSteps.indexOf(step);
  const progress = currentVisibleIdx >= 0 ? (currentVisibleIdx / (visibleSteps.length - 1)) * 100 : 0;

  const goNext = () => {
    setDirection(1);
    const vs = getVisibleSteps();
    const curIdx = vs.indexOf(step);
    if (curIdx < vs.length - 1) {
      const nextStep = vs[curIdx + 1];
      // Show calculating animation before final output
      if (nextStep === 14) {
        computeGoals();
        setPhase('calculating');
        setTimeout(() => {
          setPhase('wizard');
          setStep(14);
        }, 2500);
        return;
      }
      setStep(nextStep);
      saveOnboardingProgress(nextStep, f);
    }
  };

  const goBack = () => {
    setDirection(-1);
    const vs = getVisibleSteps();
    const curIdx = vs.indexOf(step);
    if (curIdx > 0) setStep(vs[curIdx - 1]);
  };

  const computeGoals = () => {
    const result = calculateOnboardingGoals({
      gender: f.gender, age: f.age, heightCm: f.heightCm, weightKg: f.weightKg,
      work: f.work || 'sitting', exercise: f.exercise || 'none',
      goalType: (f.goalType || 'maintain') as any, goalSpeed: (f.goalSpeed || 'balanced') as any,
      healthConditions: f.conditions,
      targetWeight: f.goalType !== 'maintain' ? f.targetWeight : null,
      diet: f.diet, cookingTime: f.cookingTime,
    });
    setGoalResult(result);
    const multiplier = getActivityMultiplier(f.work || 'sitting', f.exercise || 'none');
    const recommendedWater = calculateWaterGoal(f.weightKg, multiplier);
    set('water', recommendedWater);
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 0: return f.name.trim().length >= 2;
      case 1: return !!f.gender;
      case 2: return f.age >= 13 && f.age <= 80;
      case 3: return f.heightCm >= 120 && f.heightCm <= 230;
      case 4: return f.weightKg >= 30 && f.weightKg <= 300;
      case 5: return true;
      case 6: return true;
      case 7: return !!f.skin;
      case 8: return true; // gender-specific, always valid
      case 9: return !!f.work;
      case 10: return !!f.exercise;
      case 11: return !!f.goalType;
      case 12: return !!f.goalSpeed;
      case 13: {
        if (f.goalType === 'lose') return f.targetWeight > 20 && f.targetWeight < f.weightKg;
        if (f.goalType === 'gain') return f.targetWeight > f.weightKg && f.targetWeight < 300;
        return true;
      }
      case 14: return true;
      case 15: return f.wantLifestyle !== null;
      case 16: return !!f.diet;
      case 17: return f.water >= 0.5 && f.water <= 5.0;
      case 18: return true;
      case 19: return true; // budget
      case 20: return !!f.cookingSkill;
      case 21: return true; // intelligence demo
      case 22: return true;
      default: return true;
    }
  };

  const handleFinish = async () => {
    const goals = goalResult || calculateOnboardingGoals({
      gender: f.gender, age: f.age, heightCm: f.heightCm, weightKg: f.weightKg,
      work: f.work || 'sitting', exercise: f.exercise || 'none',
      goalType: (f.goalType || 'maintain') as any, goalSpeed: (f.goalSpeed || 'balanced') as any,
      healthConditions: f.conditions,
      targetWeight: f.goalType !== 'maintain' ? f.targetWeight : null,
      diet: f.diet, cookingTime: f.cookingTime,
    });

    const data: OnboardingData = {
      basic: { name: f.name, gender: f.gender, age: f.age, heightCm: f.heightCm, weightKg: f.weightKg },
      health: {
        conditions: f.conditions,
        skin: f.skin || 'none',
        genderSpecific: {
          pcos: f.conditions.includes('pcos'),
          pcosSeverity: f.conditions.includes('pcos') ? f.pcosSeverity : null,
          pregnancy: f.pregnant,
          breastfeeding: f.breastfeeding,
          menstrualPhase: f.menstrualPhase || null,
          prostate: f.prostateConcerns,
          testosterone: f.testosteroneConcerns,
        },
      },
      activity: { work: f.work, exercise: f.exercise },
      goals: {
        type: goals.goalType, speed: f.goalSpeed,
        targetWeight: f.goalType !== 'maintain' ? f.targetWeight : null,
        calories: goals.targetCalories,
        macros: { protein: goals.protein, carbs: goals.carbs, fat: goals.fat },
        expectedRate: goals.expectedRate,
        weeksMin: goals.weeksMin,
        weeksMax: goals.weeksMax,
      },
      lifestyle: {
        diet: f.diet || 'noRestrictions', water: f.water, supplements: f.supplements,
        cooking: { skill: f.cookingSkill || 'beginner', time: f.cookingTime, equipment: f.cookingEquipment },
        budget: {
          enabled: f.budgetEnabled,
          amount: f.budgetEnabled ? f.budgetAmount : 0,
          period: 'daily',
          mealSplit: { breakfast: f.budgetBreakfast, lunch: f.budgetLunch, dinner: f.budgetDinner, snacks: f.budgetSnacks },
        },
      },
      meta: {
        createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString(),
        adherenceScore: goals.adherenceScore, adherenceLabel: goals.adherenceLabel,
        expectedAdaptation: true, plateauCounter: 0, lastWeightEntry: null,
        weeklyAdjustments: [],
      },
    };

    saveOnboardingData(data);
    clearOnboardingProgress();
    refreshProfile();

    try {
      const { getProfile } = await import('@/lib/store');
      const profile = getProfile();
      if (profile) await syncProfileToCloud(profile);
    } catch (e) {
      console.error('Failed to sync profile to cloud:', e);
    }

    setPhase('success');
    setShowPlansAfterOnboarding(true);
  };

  const bmi = calculateBMI(f.weightKg, f.heightCm);
  const bmr = calculateBMR(f.weightKg, f.heightCm, f.age, f.gender || 'male');

  const renderStep = () => {
    switch (step) {
      // ── Phase 1: Core Identity ──
      case 0:
        return (
          <div className="space-y-6">
            <StepHeader title="What should we call you?" subtitle="We'll personalize your entire experience." />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Your name" autoFocus
                className="w-full px-5 py-4 rounded-2xl bg-card border border-border text-base font-medium outline-none focus:border-primary/30 transition-all placeholder:text-muted-foreground/40" />
            </motion.div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <StepHeader title="What's your gender?" subtitle="Used for accurate BMR calculation." />
            <div className="space-y-2.5">
              {[{ v: 'male', l: '👨 Male' }, { v: 'female', l: '👩 Female' }].map((o, i) => (
                <Option key={o.v} value={o.v} current={f.gender} label={o.l} onSelect={v => set('gender', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <StepHeader title="How old are you?" subtitle="Age is a key factor in BMR calculation." />
            <div className="flex flex-col items-center gap-4">
              <motion.p key={f.age} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-6xl font-mono font-bold text-foreground tracking-tighter">{f.age}</motion.p>
              <p className="text-sm text-muted-foreground">years old</p>
              <input type="range" min={13} max={80} value={f.age} onChange={e => set('age', Number(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between w-full text-[10px] text-muted-foreground font-mono"><span>13</span><span>80</span></div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <StepHeader title="Your height" subtitle="Used with weight to calculate BMI." />
            <div className="flex justify-end">
              <UnitToggle active={f.heightUnit} options={['cm', 'ft']} onToggle={toggleHeightUnit} />
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {f.heightUnit === 'cm' ? (
                <>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Height (cm)</label>
                  <div className="relative mt-1.5">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="number" value={f.heightCm} onChange={e => set('heightCm', parseFloat(e.target.value) || 0)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all" />
                  </div>
                </>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Feet</label>
                    <input type="number" value={f.heightFt} onChange={e => setHeightFromFtIn(Number(e.target.value) || 0, f.heightIn)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all mt-1.5" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Inches</label>
                    <input type="number" value={f.heightIn} onChange={e => setHeightFromFtIn(f.heightFt, Number(e.target.value) || 0)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all mt-1.5" />
                  </div>
                </div>
              )}
              {(f.heightCm < 120 || f.heightCm > 230) && f.heightCm > 0 && (
                <p className="text-xs text-destructive mt-1.5">Height must be between 120–230 cm.</p>
              )}
            </motion.div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <StepHeader title="Your weight" subtitle="Used for BMR, BMI, and calorie calculations." />
            <div className="flex justify-end">
              <UnitToggle active={f.weightUnit} options={['kg', 'lb']} onToggle={toggleWeightUnit} />
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Weight ({f.weightUnit})</label>
              <div className="relative mt-1.5">
                <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="number" value={displayWeight} onChange={e => setWeightFromDisplay(parseFloat(e.target.value) || 0)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all" />
              </div>
              {(f.weightKg < 30 || f.weightKg > 300) && f.weightKg > 0 && (
                <p className="text-xs text-destructive mt-1.5">Weight must be between 30–300 kg (66–661 lbs).</p>
              )}
            </motion.div>
          </div>
        );

      // ── Phase 2: Value Drop (BMI + BMR) ──
      case 5: {
        const bmiCat = getBMICategory(bmi);
        return (
          <div className="space-y-6">
            <StepHeader title={`Hey ${f.name} 👋`} subtitle="Here's what your body numbers tell us." />
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Body Mass Index</span>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  bmi < 18.5 ? 'bg-muted text-muted-foreground' : bmi < 23 ? 'bg-primary/10 text-primary' : bmi < 27.5 ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                }`}>{bmiCat}</span>
              </div>
              <p className="text-4xl font-mono font-bold text-foreground tracking-tighter">{bmi.toFixed(1)}</p>
              <div className="mt-3 h-2 rounded-full overflow-hidden bg-muted relative">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 bg-muted-foreground/20 rounded-l-full" />
                  <div className="flex-1 bg-primary/40" />
                  <div className="flex-1 bg-accent/40" />
                  <div className="flex-1 bg-destructive/40 rounded-r-full" />
                </div>
                <motion.div className="absolute top-0 w-0.5 h-full bg-primary rounded-full"
                  initial={{ left: '50%' }} animate={{ left: `${Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100))}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground font-mono font-medium">
                <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-2xl p-5 text-center">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Basal Metabolic Rate</p>
              <p className="text-3xl font-mono font-bold text-foreground tracking-tighter">{Math.round(bmr)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">kcal burned at rest per day</p>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className="text-sm text-muted-foreground leading-relaxed bg-muted/50 rounded-xl p-4">
              Your BMI is <strong>{bmi.toFixed(1)}</strong> ({bmiCat}). Your body burns about <strong>{Math.round(bmr)} kcal</strong> at rest.
            </motion.p>
          </div>
        );
      }

      // ── Phase 3: Health ──
      case 6: {
        const conditionOpts = [
          { value: 'diabetes', label: '🩸 Diabetes' },
          { value: 'thyroid', label: '🦋 Thyroid' },
          { value: 'hypertension', label: '💓 Hypertension' },
          { value: 'highCholesterol', label: '🫀 High Cholesterol' },
          { value: 'ibs', label: '🫄 IBS' },
          { value: 'anemia', label: '🩸 Anemia' },
          ...(f.gender === 'female' ? [{ value: 'pcos', label: '🌸 PCOS' }] : []),
        ];
        const activeInsights = f.conditions
          .filter(c => CONDITION_INSIGHTS[c])
          .map(c => CONDITION_INSIGHTS[c]);
        return (
          <div className="space-y-5">
            <StepHeader title="Any health conditions?" subtitle="Helps us adjust macros and recommendations." />
            <ChipSelect options={conditionOpts} selected={f.conditions}
              onToggle={v => {
                const curr = f.conditions;
                set('conditions', curr.includes(v) ? curr.filter(x => x !== v) : [...curr, v]);
              }} />
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => set('conditions', [])}
              className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold transition-all border ${f.conditions.length === 0 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
              ✅ None of the above
            </motion.button>
            {activeInsights.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs text-foreground leading-relaxed font-medium mb-1">💡 Your plan will focus on:</p>
                <ul className="space-y-1">
                  {activeInsights.map((insight, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed">• {insight}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        );
      }

      case 7:
        return (
          <div className="space-y-5">
            <StepHeader title="Skin type" subtitle="Your plan will include foods that support your skin health." />
            <div className="space-y-2.5">
              {[
                { v: 'oily', l: '💧 Oily' },
                { v: 'dry', l: '🏜️ Dry' },
                { v: 'combination', l: '🔄 Combination' },
                { v: 'acne-prone', l: '🔴 Acne-Prone' },
                { v: 'sensitive', l: '🌡️ Sensitive' },
                { v: 'eczema', l: '🩹 Eczema' },
                { v: 'rosacea', l: '🌹 Rosacea' },
                { v: 'psoriasis', l: '🧬 Psoriasis' },
                { v: 'none', l: '✅ No concerns' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={f.skin} label={o.l} onSelect={v => set('skin', v)} idx={i} />
              ))}
            </div>
            {f.skin && f.skin !== 'none' && SKIN_INSIGHTS[f.skin] && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs text-foreground leading-relaxed">💡 {SKIN_INSIGHTS[f.skin]}</p>
              </motion.div>
            )}
          </div>
        );

      // ── Phase 3b: Gender-Specific (NEW) ──
      case 8: {
        if (f.gender === 'female') {
          return (
            <div className="space-y-5">
              <StepHeader title="Women's health" subtitle="Helps us fine-tune your nutrition for hormonal balance." />
              {/* PCOS severity */}
              {f.conditions.includes('pcos') && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">PCOS Severity</p>
                  <div className="flex items-center gap-4">
                    <input type="range" min={1} max={5} step={1} value={f.pcosSeverity}
                      onChange={e => set('pcosSeverity', Number(e.target.value))} className="flex-1 accent-primary" />
                    <span className="text-sm font-mono font-bold text-foreground w-6 text-right">{f.pcosSeverity}/5</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">1 = mild, 5 = severe</p>
                </motion.div>
              )}
              {/* Pregnancy */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Are you pregnant?</p>
                <div className="flex gap-2">
                  <Option value="yes" current={f.pregnant ? 'yes' : 'no'} label="Yes" onSelect={() => set('pregnant', true)} idx={0} />
                  <Option value="no" current={!f.pregnant ? 'no' : 'yes'} label="No" onSelect={() => set('pregnant', false)} idx={1} />
                </div>
              </div>
              {/* Breastfeeding */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Are you breastfeeding?</p>
                <div className="flex gap-2">
                  <Option value="yes" current={f.breastfeeding ? 'yes' : 'no'} label="Yes" onSelect={() => set('breastfeeding', true)} idx={0} />
                  <Option value="no" current={!f.breastfeeding ? 'no' : 'yes'} label="No" onSelect={() => set('breastfeeding', false)} idx={1} />
                </div>
              </div>
              {/* Menstrual phase */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current menstrual phase (optional)</p>
                <div className="space-y-2">
                  {[
                    { v: 'menstrual', l: '🔴 Menstrual' },
                    { v: 'follicular', l: '🌱 Follicular' },
                    { v: 'luteal', l: '🌙 Luteal' },
                    { v: '', l: '⏭️ Not applicable' },
                  ].map((o, i) => (
                    <Option key={o.v + i} value={o.v} current={f.menstrualPhase} label={o.l} onSelect={v => set('menstrualPhase', v)} idx={i} />
                  ))}
                </div>
              </div>
              {/* Insights */}
              {(f.pregnant || f.breastfeeding) && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-xs text-foreground leading-relaxed">
                    💡 {f.pregnant ? 'Your plan will include extra folate, iron, and calcium for pregnancy.' : ''}
                    {f.breastfeeding ? ' Your plan will add ~500 extra calories and prioritize nutrient-dense foods for breastfeeding.' : ''}
                  </p>
                </motion.div>
              )}
            </div>
          );
        }
        // Male
        return (
          <div className="space-y-5">
            <StepHeader title="Men's health" subtitle="Helps us tailor nutrition for your specific needs." />
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Any prostate concerns?</p>
              <div className="flex gap-2">
                <Option value="yes" current={f.prostateConcerns ? 'yes' : 'no'} label="Yes" onSelect={() => set('prostateConcerns', true)} idx={0} />
                <Option value="no" current={!f.prostateConcerns ? 'no' : 'yes'} label="No" onSelect={() => set('prostateConcerns', false)} idx={1} />
              </div>
            </div>
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Testosterone concerns?</p>
              <div className="flex gap-2">
                <Option value="yes" current={f.testosteroneConcerns ? 'yes' : 'no'} label="Yes" onSelect={() => set('testosteroneConcerns', true)} idx={0} />
                <Option value="no" current={!f.testosteroneConcerns ? 'no' : 'yes'} label="No" onSelect={() => set('testosteroneConcerns', false)} idx={1} />
              </div>
            </div>
            {(f.prostateConcerns || f.testosteroneConcerns) && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs text-foreground leading-relaxed">
                  💡 {f.prostateConcerns ? 'Your plan will include lycopene-rich foods like tomatoes and zinc-rich seeds.' : ''}
                  {f.testosteroneConcerns ? ' Your plan will prioritize zinc, vitamin D, and healthy fats for testosterone support.' : ''}
                </p>
              </motion.div>
            )}
          </div>
        );
      }

      // ── Phase 4: Activity ──
      case 9:
        return (
          <div className="space-y-5">
            <StepHeader title="What's your work like?" subtitle="Your daily work type affects calorie burn." />
            <div className="space-y-2.5">
              {[
                { v: 'sitting', l: '🪑 Sitting / Desk Job', s: 'Most of the day seated' },
                { v: 'mixed', l: '🚶 Mixed / Moderate', s: 'Some walking and standing' },
                { v: 'physical', l: '🏗️ Physical / Labour', s: 'On your feet most of the day' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={f.work} label={o.l} sub={o.s} onSelect={v => set('work', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-5">
            <StepHeader title="How often do you exercise?" subtitle="Combined with work type for accurate TDEE." />
            <div className="space-y-2.5">
              {[
                { v: 'none', l: '😐 No Exercise', s: 'Rarely or never' },
                { v: '1-3', l: '🚶 1–3 Days/Week', s: 'Light to moderate' },
                { v: '4-5', l: '🏃 4–5 Days/Week', s: 'Regular training' },
                { v: 'daily', l: '🏋️ Daily', s: 'Intense daily exercise' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={f.exercise} label={o.l} sub={o.s} onSelect={v => set('exercise', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      // ── Phase 5: Goal & Target ──
      case 11:
        return (
          <div className="space-y-5">
            <StepHeader title="What's your goal?" subtitle="This determines your daily calorie target." />
            <div className="space-y-2.5">
              {[
                { v: 'lose', l: '🔥 Lose Weight', s: 'Calorie deficit for fat loss' },
                { v: 'maintain', l: '⚖️ Maintain Weight', s: 'Eat at your maintenance level' },
                { v: 'gain', l: '💪 Build Muscle / Gain', s: 'Calorie surplus for growth' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={f.goalType} label={o.l} sub={o.s} onSelect={v => set('goalType', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 12:
        return (
          <div className="space-y-5">
            <StepHeader title="Choose your pace" subtitle={f.goalType === 'lose' ? 'How fast do you want to lose weight?' : 'How fast do you want to gain?'} />
            <div className="space-y-2.5">
              {[
                { v: 'balanced', l: '🐢 Balanced', s: f.goalType === 'lose' ? '20% deficit — sustainable and healthy' : '10% surplus — lean gains' },
                { v: 'aggressive', l: '🐇 Aggressive', s: f.goalType === 'lose' ? '30% deficit — faster but harder' : '20% surplus — faster gains' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={f.goalSpeed} label={o.l} sub={o.s} onSelect={v => set('goalSpeed', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 13: {
        const isLosing = f.goalType === 'lose';
        const diff = isLosing ? f.weightKg - f.targetWeight : f.targetWeight - f.weightKg;
        const valid = isLosing ? f.targetWeight < f.weightKg : f.targetWeight > f.weightKg;
        return (
          <div className="space-y-6">
            <StepHeader title="What's your target weight?" subtitle={`Current weight: ${f.weightKg} kg`} />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="number" value={f.targetWeight} onChange={e => set('targetWeight', parseFloat(e.target.value) || 0)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/30 transition-all" />
              </div>
            </motion.div>
            {!valid && f.targetWeight > 0 && (
              <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive/80">
                  {isLosing ? 'Target must be less than current weight.' : 'Target must be greater than current weight.'}
                </p>
              </div>
            )}
            {valid && diff > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-2xl p-5 text-center">
                <p className="text-3xl font-mono font-bold text-foreground">{f.targetWeight} kg</p>
                <p className="text-xs text-muted-foreground mt-1.5">{diff.toFixed(1)} kg to {isLosing ? 'lose' : 'gain'}</p>
              </motion.div>
            )}
          </div>
        );
      }

      // ── Phase 6: Final Output ──
      case 14: {
        const g = goalResult;
        if (!g) return null;
        const cueConfig = {
          sustainable: { emoji: '🟢', label: 'Sustainable', color: 'text-primary' },
          moderate: { emoji: '🟡', label: 'Moderate deficit', color: 'text-accent' },
          aggressive: { emoji: '🔴', label: 'Aggressive', color: 'text-destructive' },
        };
        const cue = cueConfig[g.calorieCue];
        const adhConfig = {
          easy: { emoji: '🟢', label: 'Easy to follow', color: 'text-primary' },
          moderate: { emoji: '🟡', label: 'Moderate challenge', color: 'text-accent' },
          hard: { emoji: '🔴', label: 'Hard – consider adjustments', color: 'text-destructive' },
        };
        const adh = adhConfig[g.adherenceLabel];
        const proteinHint = getProteinTranslation(g.protein, f.diet || 'noRestrictions');
        const calorieGap = Math.abs(g.tdee - g.targetCalories);
        return (
          <div className="space-y-4">
            <StepHeader title="Your Personalized Plan" subtitle="This is your starting plan. You can adjust this anytime." />
            {/* TDEE → Target */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-center flex-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Maintenance</p>
                  <p className="text-2xl font-mono font-bold text-muted-foreground">{g.tdee}</p>
                  <p className="text-[9px] text-muted-foreground">kcal/day</p>
                </div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
                  <ArrowRight className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="text-center flex-1">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Your Target</p>
                  <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }}
                    className="text-2xl font-mono font-bold text-primary">{g.targetCalories}</motion.p>
                  <p className="text-[9px] text-muted-foreground">kcal/day</p>
                </div>
              </div>
              {g.goalType !== 'maintain' && (
                <p className="text-[10px] text-muted-foreground text-center mb-2">
                  {g.goalType === 'lose' ? `${calorieGap} kcal deficit` : `${calorieGap} kcal surplus`} per day
                </p>
              )}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-1.5 pt-2 border-t border-border">
                <span className="text-xs">{cue.emoji}</span>
                <span className={`text-[11px] font-semibold ${cue.color}`}>{cue.label}</span>
              </motion.div>
            </motion.div>
            {/* Macros */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-2">
              {[
                { label: 'Protein', val: g.protein, color: 'text-primary', unit: 'g' },
                { label: 'Carbs', val: g.carbs, color: 'text-accent', unit: 'g' },
                { label: 'Fat', val: g.fat, color: 'text-coral', unit: 'g' },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                  <p className={`text-lg font-mono font-bold ${m.color}`}>{m.val}{m.unit}</p>
                </motion.div>
              ))}
            </motion.div>
            {/* Protein translation */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              className="bg-muted/50 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">🍳 {g.protein}g protein ≈ {proteinHint}</p>
            </motion.div>
            {/* Expected change + Timeline */}
            {g.goalType !== 'maintain' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <p className="text-xs text-foreground font-medium text-center">
                  Expected {g.goalType === 'lose' ? 'fat loss' : 'weight gain'}: <strong>{g.expectedRate}</strong>
                </p>
                {g.weeksMin != null && g.weeksMax != null && (
                  <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> Estimated timeline: {g.weeksMin}–{g.weeksMax} weeks
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground text-center">You'll start seeing changes in 2–3 weeks</p>
              </motion.div>
            )}
            {/* Adherence score */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Adherence Score</p>
                <p className={`text-sm font-semibold ${adh.color} mt-0.5`}>{adh.emoji} {adh.label}</p>
              </div>
              <p className="text-2xl font-mono font-bold text-foreground">{g.adherenceScore}</p>
            </motion.div>
            {/* Goal insight */}
            {g.goalInsight && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs text-foreground leading-relaxed">💡 {g.goalInsight}</p>
              </motion.div>
            )}
            {/* Thyroid note */}
            {g.thyroidNote && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                <p className="text-xs text-foreground leading-relaxed">🦋 {g.thyroidNote}</p>
              </motion.div>
            )}
            {/* Trust + plateau */}
            {g.goalType !== 'maintain' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="bg-muted/50 rounded-xl p-3 space-y-1.5">
                <p className="text-[11px] text-muted-foreground leading-relaxed">📉 Progress may slow as your body adapts. Adjustments will be made weekly.</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">🔄 This is your starting plan — it evolves with you.</p>
              </motion.div>
            )}
            {/* Safety warnings */}
            {g.safetyWarnings.map((w, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
                className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive/80">{w}</p>
              </motion.div>
            ))}
          </div>
        );
      }

      // ── Phase 7: Lifestyle ──
      case 15:
        return (
          <div className="space-y-5">
            <StepHeader title="Want to personalise more?" subtitle="Diet preferences, supplements, budget, and cooking habits." />
            <div className="space-y-2.5">
              <Option value="yes" current={f.wantLifestyle === true ? 'yes' : f.wantLifestyle === false ? 'no' : ''} label="✨ Yes, personalise my plan" sub="Takes about 2 minutes"
                onSelect={() => set('wantLifestyle', true)} idx={0} />
              <Option value="no" current={f.wantLifestyle === false ? 'no' : f.wantLifestyle === true ? 'yes' : ''} label="⏭️ Skip for now" sub="You can set these later"
                onSelect={() => set('wantLifestyle', false)} idx={1} />
            </div>
          </div>
        );

      case 16:
        return (
          <div className="space-y-5">
            <StepHeader title="Dietary preference" subtitle="Your plan will be tailored accordingly." />
            <div className="space-y-2.5">
              {[
                { v: 'veg', l: '🥬 Vegetarian' },
                { v: 'vegan', l: '🌱 Vegan' },
                { v: 'non-veg', l: '🍗 Non-Vegetarian' },
                { v: 'noRestrictions', l: '🍽️ No Restrictions' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={f.diet} label={o.l} onSelect={v => set('diet', v)} idx={i} />
              ))}
            </div>
          </div>
        );

      case 17: {
        const multiplier = getActivityMultiplier(f.work || 'sitting', f.exercise || 'none');
        const recommended = calculateWaterGoal(f.weightKg, multiplier);
        return (
          <div className="space-y-6">
            <StepHeader title="Daily water goal" subtitle={`Recommended: ${recommended}L based on your weight and activity.`} />
            <div className="flex flex-col items-center gap-4">
              <motion.div key={f.water} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex items-baseline gap-1">
                <Droplets className="w-6 h-6 text-primary" />
                <p className="text-5xl font-mono font-bold text-foreground tracking-tighter">{f.water.toFixed(1)}</p>
                <p className="text-lg text-muted-foreground font-medium">L</p>
              </motion.div>
              <input type="range" min={0.5} max={5.0} step={0.1} value={f.water}
                onChange={e => set('water', parseFloat(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between w-full text-[10px] text-muted-foreground font-mono"><span>0.5L</span><span>5.0L</span></div>
            </div>
          </div>
        );
      }

      case 18: {
        const suppOptions = [
          { value: 'vitaminD', label: '☀️ Vitamin D' },
          { value: 'omega3', label: '🐟 Omega-3' },
          { value: 'proteinPowder', label: '💪 Protein Powder' },
          { value: 'collagen', label: '✨ Collagen' },
          { value: 'multivitamin', label: '💊 Multivitamin' },
          { value: 'iron', label: '🩸 Iron' },
          { value: 'magnesium', label: '🧲 Magnesium' },
        ];
        return (
          <div className="space-y-5">
            <StepHeader title="Any supplements?" subtitle="Select what you currently take or plan to." />
            <ChipSelect options={suppOptions} selected={f.supplements}
              onToggle={v => {
                const curr = f.supplements;
                set('supplements', curr.includes(v) ? curr.filter(x => x !== v) : [...curr, v]);
              }} />
            {f.supplements.length > 0 && goalResult && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                {f.supplements.map(s => {
                  const insight = getSupplementInsight(s, goalResult.protein);
                  return insight ? <p key={s} className="text-xs text-foreground leading-relaxed">💡 {insight}</p> : null;
                })}
              </motion.div>
            )}
          </div>
        );
      }

      // ── Budget Step (NEW) ──
      case 19:
        return (
          <div className="space-y-5">
            <StepHeader title="Daily food budget" subtitle="Set a budget to get cost-aware meal suggestions." />
            <div className="space-y-2.5">
              <Option value="yes" current={f.budgetEnabled ? 'yes' : 'no'} label="💰 Yes, set a budget" sub="Get meals within your daily budget"
                onSelect={() => set('budgetEnabled', true)} idx={0} />
              <Option value="no" current={!f.budgetEnabled ? 'no' : 'yes'} label="⏭️ No budget limit" sub="Skip budget tracking"
                onSelect={() => set('budgetEnabled', false)} idx={1} />
            </div>
            {f.budgetEnabled && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Daily budget</p>
                    <p className="text-lg font-mono font-bold text-primary">₹{f.budgetAmount}</p>
                  </div>
                  <input type="range" min={100} max={2000} step={50} value={f.budgetAmount}
                    onChange={e => set('budgetAmount', Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono"><span>₹100</span><span>₹2000</span></div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Meal split</p>
                  {[
                    { key: 'budgetBreakfast' as const, label: 'Breakfast', val: f.budgetBreakfast },
                    { key: 'budgetLunch' as const, label: 'Lunch', val: f.budgetLunch },
                    { key: 'budgetDinner' as const, label: 'Dinner', val: f.budgetDinner },
                    { key: 'budgetSnacks' as const, label: 'Snacks', val: f.budgetSnacks },
                  ].map(m => (
                    <div key={m.key} className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-16">{m.label}</span>
                      <input type="range" min={5} max={50} step={5} value={m.val}
                        onChange={e => set(m.key, Number(e.target.value))} className="flex-1 accent-primary" />
                      <span className="text-xs font-mono font-semibold text-foreground w-8 text-right">{m.val}%</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground text-center">
                    Total: {f.budgetBreakfast + f.budgetLunch + f.budgetDinner + f.budgetSnacks}%
                    {f.budgetBreakfast + f.budgetLunch + f.budgetDinner + f.budgetSnacks !== 100 && (
                      <span className="text-destructive ml-1">(should be 100%)</span>
                    )}
                  </p>
                </div>
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-xs text-foreground leading-relaxed">
                    💡 With ₹{f.budgetAmount}/day, your meals will be optimized for nutrition within budget — about ₹{Math.round(f.budgetAmount * f.budgetLunch / 100)} for lunch.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </div>
        );

      case 20: {
        const equipmentOpts = [
          { value: 'basic', label: '🍳 Basic (Pan/Pot)' },
          { value: 'microwave', label: '📡 Microwave' },
          { value: 'airfryer', label: '🌀 Air Fryer' },
          { value: 'oven', label: '🔥 Oven' },
        ];
        const equipmentStr = f.cookingEquipment.length > 0 ? f.cookingEquipment.join(', ') : 'basic equipment';
        return (
          <div className="space-y-6">
            <StepHeader title="Cooking habits" subtitle="Your plan will match recipes to your skill and time." />
            <div className="space-y-2.5">
              {[
                { v: 'beginner', l: '🔰 Beginner', s: 'Simple recipes, minimal prep' },
                { v: 'intermediate', l: '👩‍🍳 Intermediate', s: 'Comfortable with most recipes' },
                { v: 'advanced', l: '👨‍🍳 Advanced', s: 'Enjoys complex cooking' },
              ].map((o, i) => (
                <Option key={o.v} value={o.v} current={f.cookingSkill} label={o.l} sub={o.s} onSelect={v => set('cookingSkill', v)} idx={i} />
              ))}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cooking time (minutes)</label>
              <div className="flex items-center gap-4 mt-2">
                <input type="range" min={10} max={90} step={5} value={f.cookingTime}
                  onChange={e => set('cookingTime', Number(e.target.value))} className="flex-1 accent-primary" />
                <span className="text-sm font-mono font-bold text-foreground w-12 text-right">{f.cookingTime}m</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Kitchen equipment</label>
              <ChipSelect options={equipmentOpts} selected={f.cookingEquipment}
                onToggle={v => {
                  const curr = f.cookingEquipment;
                  set('cookingEquipment', curr.includes(v) ? curr.filter(x => x !== v) : [...curr, v]);
                }} />
            </div>
            {f.cookingSkill && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs text-foreground leading-relaxed">
                  💡 With {f.cookingTime} minutes and {equipmentStr}, your plan will suggest quick {f.cookingSkill === 'beginner' ? 'one-pan' : f.cookingSkill === 'intermediate' ? 'simple multi-step' : 'creative'} meals.
                </p>
              </motion.div>
            )}
          </div>
        );
      }

      // ── Intelligence Demo (NEW) ──
      case 21: {
        const meal = getDemoMeal(f.diet || 'noRestrictions', f.conditions);
        const warnings = getCameraWarnings(f.conditions);
        const budgetFits = !f.budgetEnabled || meal.cost <= (f.budgetAmount * 0.35);
        return (
          <div className="space-y-5">
            <StepHeader title="See your AI in action" subtitle="Here's how NutriLens AI will work for you in real time." />
            {/* Mock meal suggestion */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">AI Meal Suggestion</p>
              </div>
              <p className="text-base font-bold text-foreground">{meal.name}</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-sm font-mono font-bold text-foreground">{meal.cal}</p>
                  <p className="text-[9px] text-muted-foreground">kcal</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-mono font-bold text-primary">{meal.protein}g</p>
                  <p className="text-[9px] text-muted-foreground">protein</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-mono font-bold text-accent">{meal.carbs}g</p>
                  <p className="text-[9px] text-muted-foreground">carbs</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-mono font-bold text-foreground">{meal.fat}g</p>
                  <p className="text-[9px] text-muted-foreground">fat</p>
                </div>
              </div>
              {f.budgetEnabled && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs">{budgetFits ? '✅' : '⚠️'}</span>
                  <p className="text-[11px] text-muted-foreground">
                    ₹{meal.cost} — {budgetFits ? 'fits your budget' : 'slightly over budget'}
                  </p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground italic">
                Suggested based on your {f.conditions.length > 0 ? 'health conditions, ' : ''}{f.diet && f.diet !== 'noRestrictions' ? `${f.diet} diet, ` : ''}goal, and profile.
              </p>
            </motion.div>

            {/* Mock camera warning */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-4 h-4 text-accent" />
                <p className="text-xs font-semibold text-accent uppercase tracking-wider">Camera Warning Demo</p>
              </div>
              <p className="text-sm text-foreground font-medium">If you scan: <strong>Sweet Lassi</strong></p>
              <div className="space-y-1.5">
                {warnings.map((w, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-foreground">{w}</p>
                  </motion.div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Warnings are generated based on your health profile — every scan is personalized.
              </p>
            </motion.div>

            {/* Explanation */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs text-foreground leading-relaxed">
                🧠 <strong>This is your AI brain.</strong> Every meal suggestion, camera scan, and budget alert will be personalized using your profile data. The more you use NutriLens, the smarter it gets.
              </p>
            </motion.div>
          </div>
        );
      }

      // ── Finish ──
      case 22:
        return (
          <div className="space-y-6">
            <StepHeader title="All set! 🎉" subtitle="Your personalized nutrition plan is ready." />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
              <p className="text-4xl">🥗</p>
              <p className="text-lg font-display font-bold text-foreground">Ready to go, {f.name}!</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tap "Finish" to save your profile and start tracking.
              </p>
            </motion.div>
          </div>
        );

      default: return null;
    }
  };

  // ── Phase routing ──
  if (phase === 'welcome') {
    return <WelcomeScreen onGetStarted={() => setPhase('scanner')} onSignIn={() => navigate('/auth')} />;
  }
  if (phase === 'scanner') {
    return <ScannerOnboardingScreen onBack={() => setPhase('welcome')} onContinue={() => { setPhase('wizard'); setStep(0); }} />;
  }
  if (phase === 'calculating') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 max-w-sm">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
            <Sparkles className="w-12 h-12 text-primary mx-auto" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-foreground">Calculating your plan…</h2>
            <p className="text-sm text-muted-foreground">Analyzing your body stats, activity level, and goals.</p>
          </div>
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }
  if (phase === 'success') {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 max-w-sm">
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-6xl">✅</motion.p>
            <h1 className="text-2xl font-display font-bold text-foreground">Onboarding complete!</h1>
            <p className="text-sm text-muted-foreground">Your personalized plan has been saved. Let's get started!</p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-xs text-muted-foreground">Next step: Log your first meal</motion.p>
            <div className="space-y-3">
              <button onClick={() => navigate('/')}
                className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
                <UtensilsCrossed className="w-4 h-4" /> Log Breakfast
              </button>
              <button onClick={() => navigate('/dashboard')}
                className="w-full py-3 rounded-full bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors">
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
        <PlansPage open={showPlansAfterOnboarding} onClose={() => setShowPlansAfterOnboarding(false)} onPlanChanged={() => {}} />
      </>
    );
  }

  // ── Wizard phase ──
  const isFinishStep = step === 22;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-6 pt-4 pb-2">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-right font-mono">{Math.round(progress)}%</p>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-6 py-4 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={step} custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit">
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto w-full px-6 pb-6 flex gap-3">
        {currentVisibleIdx > 0 && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={goBack}
            className="px-4 py-3.5 rounded-full bg-card border border-border font-semibold text-sm hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        )}
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={isFinishStep ? handleFinish : goNext}
          disabled={!canContinue()}
          className={`flex-1 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            canContinue() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}>
          {isFinishStep ? <><Check className="w-4 h-4" /> Finish</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </motion.button>
      </motion.div>
    </div>
  );
}
