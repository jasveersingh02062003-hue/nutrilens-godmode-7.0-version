import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User, Ruler, Scale, Target, Activity, Heart, Apple, ChefHat, Save, Shield, Briefcase, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import type { UserProfile } from '@/lib/store';
import { COMMON_ALLERGENS } from '@/lib/allergen-tags';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { calculateBMI, calculateBMR, calculateTDEE } from '@/lib/nutrition';
import { determineGoalAndTargets } from '@/lib/goal-engine';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { fileToDataUrl } from '@/lib/photo-store';

const PHOTO_KEY = 'nutrilens_profile_photo';

export function getProfilePhoto(): string | null {
  return scopedGet(PHOTO_KEY);
}

export function saveProfilePhoto(dataUrl: string) {
  scopedSet(PHOTO_KEY, dataUrl);
}

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise' },
  { value: 'light', label: 'Light', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'active', label: 'Active', desc: '6-7 days/week' },
  { value: 'athlete', label: 'Athlete', desc: 'Intense daily training' },
];

const GOALS = [
  { value: 'lose', label: '🔥 Lose Weight' },
  { value: 'maintain', label: '⚖️ Maintain' },
  { value: 'gain', label: '💪 Gain Muscle' },
];

const HEALTH_CONDITIONS = ['diabetes', 'hypertension', 'pcos', 'thyroid', 'lactose_intolerance'];
const DIETARY_PREFS = ['vegetarian', 'vegan', 'eggetarian', 'non_vegetarian', 'jain', 'gluten_free'];

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function EditProfileSheet({ open, onClose }: EditProfileSheetProps) {
  const { profile, updateProfile } = useUserProfile();
  const [photo, setPhoto] = useState<string | null>(getProfilePhoto());

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [targetWeight, setTargetWeight] = useState(65);
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('lose');
  const [goalSpeed, setGoalSpeed] = useState(0.5);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [waterGoal, setWaterGoal] = useState(2000);
  const [occupation, setOccupation] = useState('');
  const [travelFrequency, setTravelFrequency] = useState<UserProfile['travelFrequency']>(undefined);
  const [kitchenAppliances, setKitchenAppliances] = useState<string[]>([]);
  const [workplaceFacilities, setWorkplaceFacilities] = useState<string[]>([]);
  const [carriesFood, setCarriesFood] = useState<UserProfile['carriesFood']>(undefined);
  const [livingSituation, setLivingSituation] = useState<UserProfile['livingSituation']>(undefined);
  const [lifestyleOpen, setLifestyleOpen] = useState(false);
  const [gymOpen, setGymOpen] = useState(false);
  const [gymGoer, setGymGoer] = useState(false);
  const [gymDays, setGymDays] = useState(3);
  const [gymDuration, setGymDuration] = useState(45);
  const [gymIntensity, setGymIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate');
  const [gymGoal, setGymGoal] = useState<'fat_loss' | 'muscle_gain' | 'general'>('general');
  const [gymTimeOfDay, setGymTimeOfDay] = useState<string>('');
  const [gymSpecificHour, setGymSpecificHour] = useState(7);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [sleepStart, setSleepStart] = useState('22:00');
  const [sleepEnd, setSleepEnd] = useState('06:00');
  const [shiftType, setShiftType] = useState<string>('day');
  const [fastedTraining, setFastedTraining] = useState(false);
  const [hasWeekendSchedule, setHasWeekendSchedule] = useState(false);
  const [weekendHour, setWeekendHour] = useState(9);

  useEffect(() => {
    if (profile && open) {
      setName(profile.name || '');
      setGender(profile.gender || '');
      setDob(profile.dob || '');
      setHeightCm(profile.heightCm || 170);
      setWeightKg(profile.weightKg || 70);
      setTargetWeight(profile.targetWeight || 65);
      setActivityLevel(profile.activityLevel || 'moderate');
      setGoal(profile.goal || 'lose');
      setGoalSpeed(profile.goalSpeed || 0.5);
      setHealthConditions(profile.healthConditions || []);
      setAllergens(profile.allergens || []);
      setDietaryPrefs(profile.dietaryPrefs || []);
      setWaterGoal(profile.waterGoal || 2000);
      setOccupation(profile.occupation || '');
      setTravelFrequency(profile.travelFrequency || undefined);
      setKitchenAppliances(profile.kitchenAppliances || []);
      setWorkplaceFacilities(profile.workplaceFacilities || []);
      setCarriesFood(profile.carriesFood || undefined);
      setLivingSituation(profile.livingSituation || undefined);
      setPhoto(getProfilePhoto());
      setGymGoer(profile.gym?.goer || false);
      setGymDays(profile.gym?.daysPerWeek || 3);
      setGymDuration(profile.gym?.durationMinutes || 45);
      setGymIntensity(profile.gym?.intensity || 'moderate');
      setGymGoal(profile.gym?.goal || 'general');
      setGymTimeOfDay(profile.gym?.timeOfDay || '');
      setGymSpecificHour(profile.gym?.specificHour ?? 7);
      setWorkStart(profile.gym?.workStart || '09:00');
      setWorkEnd(profile.gym?.workEnd || '18:00');
      setSleepStart(profile.gym?.sleepStart || '22:00');
      setSleepEnd(profile.gym?.sleepEnd || '06:00');
      setShiftType(profile.gym?.shiftType || 'day');
      setFastedTraining(profile.gym?.fastedTraining || false);
      setHasWeekendSchedule(!!(profile.gym?.weekendSchedule?.length));
      setWeekendHour(profile.gym?.weekendHour ?? 9);
    }
  }, [profile, open]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2MB');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    saveProfilePhoto(dataUrl);
    setPhoto(dataUrl);
    toast.success('Photo updated!');
  };

  const calculateAge = (dobStr: string): number => {
    if (!dobStr) return 25;
    const birth = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    const age = calculateAge(dob);
    const decision = determineGoalAndTargets(
      weightKg, heightCm, age, gender, activityLevel, goal, healthConditions
    );

    const { inferSchedule } = await import('@/lib/gym-service');

    updateProfile({
      name: name.trim(),
      gender,
      dob,
      age,
      heightCm,
      weightKg,
      targetWeight,
      activityLevel,
      goal: decision.effectiveGoal,
      goalSpeed,
      healthConditions,
      allergens,
      dietaryPrefs,
      waterGoal,
      occupation,
      travelFrequency,
      kitchenAppliances,
      workplaceFacilities,
      carriesFood,
      livingSituation,
      bmi: decision.bmi,
      bmr: calculateBMR(weightKg, heightCm, age, gender),
      tdee: calculateTDEE(calculateBMR(weightKg, heightCm, age, gender), activityLevel),
      dailyCalories: decision.targetCalories,
      dailyProtein: decision.targetProtein,
      dailyCarbs: decision.targetCarbs,
      dailyFat: decision.targetFat,
      gym: gymGoer ? {
        goer: true,
        daysPerWeek: gymDays,
        durationMinutes: gymDuration,
        intensity: gymIntensity,
        goal: gymGoal,
        schedule: inferSchedule(gymDays),
        stats: profile?.gym?.stats || { totalWorkouts: 0, totalCaloriesBurned: 0, currentStreak: 0, bestStreak: 0, consistencyPercent: 0 },
        timeOfDay: gymTimeOfDay as any || undefined,
        specificHour: gymSpecificHour,
        workStart, workEnd, sleepStart, sleepEnd,
        shiftType: shiftType as any || undefined,
        fastedTraining,
        weekendSchedule: hasWeekendSchedule ? ['saturday', 'sunday'].filter(d => inferSchedule(gymDays).includes(d) || hasWeekendSchedule) : undefined,
        weekendHour: hasWeekendSchedule ? weekendHour : undefined,
      } : { goer: false, daysPerWeek: 0, durationMinutes: 0, intensity: 'moderate' as const, goal: 'general' as const, schedule: [], stats: { totalWorkouts: 0, totalCaloriesBurned: 0, currentStreak: 0, bestStreak: 0, consistencyPercent: 0 } },
    });

    // Validate budget against new goals
    const { getUnifiedBudget, validateBudgetVsGoals } = await import('@/lib/budget-engine');
    const unified = getUnifiedBudget();
    const budgetCheck = validateBudgetVsGoals(unified.monthly, decision.targetCalories, decision.targetProtein);
    if (budgetCheck.severity === 'insufficient') {
      toast.warning(budgetCheck.warning || `Your food budget may be too low for your new goals. Recommended: ₹${budgetCheck.minMonthly}/month`);
    } else {
      toast.success('Profile updated! All targets recalculated.');
    }
    onClose();
  };

  const toggleArrayItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 max-h-[92vh] bg-background rounded-t-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Edit Profile</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(92vh-56px)] px-4 py-4 space-y-5">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  {photo ? (
                    <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-primary">{(name || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md">
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">Tap camera to change photo</p>
            </div>

            {/* Basic Info */}
            <Section title="Basic Info" icon={User}>
              <Field label="Name">
                <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Your name" />
              </Field>
              <Field label="Gender">
                <div className="flex gap-2">
                  {['male', 'female'].map(g => (
                    <button key={g} onClick={() => setGender(g)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${gender === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {g === 'male' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="input-field" />
              </Field>
              <Field label="Occupation">
                <input value={occupation} onChange={e => setOccupation(e.target.value)} className="input-field" placeholder="e.g. Software Engineer" />
              </Field>
            </Section>

            {/* Body Measurements */}
            <Section title="Body Measurements" icon={Ruler}>
              <Field label={`Height: ${heightCm} cm`}>
                <Slider value={[heightCm]} onValueChange={v => setHeightCm(v[0])} min={120} max={220} step={1} />
              </Field>
              <Field label={`Current Weight: ${weightKg} kg`}>
                <Slider value={[weightKg]} onValueChange={v => setWeightKg(v[0])} min={30} max={200} step={0.5} />
              </Field>
              <Field label={`Target Weight: ${targetWeight} kg`}>
                <Slider value={[targetWeight]} onValueChange={v => setTargetWeight(v[0])} min={30} max={200} step={0.5} />
              </Field>
            </Section>

            {/* Goal & Activity */}
            <Section title="Goal & Activity" icon={Target}>
              <Field label="Goal">
                <div className="flex gap-2">
                  {GOALS.map(g => (
                    <button key={g.value} onClick={() => setGoal(g.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${goal === g.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={`Goal Speed: ${goalSpeed} kg/week`}>
                <Slider value={[goalSpeed]} onValueChange={v => setGoalSpeed(v[0])} min={0.25} max={1} step={0.25} />
              </Field>
              <Field label="Activity Level">
                <div className="space-y-1.5">
                  {ACTIVITY_LEVELS.map(a => (
                    <button key={a.value} onClick={() => setActivityLevel(a.value)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${activityLevel === a.value ? 'bg-primary/10 border border-primary/30 text-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <span className="font-semibold">{a.label}</span>
                      <span className="ml-1 text-[10px] opacity-70">{a.desc}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            {/* Health Conditions */}
            <Section title="Health Conditions" icon={Heart}>
              <div className="flex flex-wrap gap-2">
                {HEALTH_CONDITIONS.map(c => (
                  <button key={c} onClick={() => setHealthConditions(toggleArrayItem(healthConditions, c))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${healthConditions.includes(c) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </Section>

            {/* Allergies & Intolerances */}
            <Section title="Allergies & Intolerances" icon={Shield}>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map(a => (
                  <button key={a.value} onClick={() => setAllergens(toggleArrayItem(allergens, a.value))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${allergens.includes(a.value) ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {a.label}
                  </button>
                ))}
              </div>
              {allergens.length > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-destructive font-medium mt-1"
                >
                  🛡️ You'll be warned before logging foods with these allergens.
                </motion.p>
              )}
            </Section>

            {/* Dietary Preferences */}
            <Section title="Dietary Preferences" icon={Apple}>
              <div className="flex flex-wrap gap-2">
                {DIETARY_PREFS.map(p => (
                  <button key={p} onClick={() => setDietaryPrefs(toggleArrayItem(dietaryPrefs, p))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dietaryPrefs.includes(p) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </Section>

            {/* Water Goal */}
            <Section title="Hydration" icon={Activity}>
              <Field label={`Daily Water Goal: ${waterGoal} ml`}>
                <Slider value={[waterGoal]} onValueChange={v => setWaterGoal(v[0])} min={1000} max={5000} step={250} />
              </Field>
            </Section>

            {/* Work & Lifestyle (Collapsible) */}
            <div className="space-y-3">
              <button
                onClick={() => setLifestyleOpen(!lifestyleOpen)}
                className="flex items-center gap-2 w-full"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground flex-1 text-left">Work & Lifestyle</h3>
                {lifestyleOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {lifestyleOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-9 space-y-3"
                  >
                    <p className="text-[10px] text-muted-foreground">Helps us suggest meals that fit your real life</p>

                    <Field label="How often do you travel for work?">
                      <div className="flex gap-2">
                        {['never', 'sometimes', 'often'].map(v => (
                          <button key={v} onClick={() => setTravelFrequency(v as UserProfile['travelFrequency'])}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${travelFrequency === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Kitchen Appliances">
                      <div className="flex flex-wrap gap-2">
                        {['stove', 'microwave', 'air_fryer', 'oven', 'fridge'].map(a => (
                          <button key={a} onClick={() => setKitchenAppliances(toggleArrayItem(kitchenAppliances, a))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${kitchenAppliances.includes(a) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Workplace Facilities">
                      <div className="flex flex-wrap gap-2">
                        {['fridge', 'microwave', 'none'].map(f => (
                          <button key={f} onClick={() => {
                            if (f === 'none') {
                              setWorkplaceFacilities(['none']);
                            } else {
                              setWorkplaceFacilities(toggleArrayItem(workplaceFacilities.filter(x => x !== 'none'), f));
                            }
                          }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${workplaceFacilities.includes(f) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {f === 'none' ? 'None' : f.charAt(0).toUpperCase() + f.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Do you carry food when traveling?">
                      <div className="flex gap-2">
                        {['always', 'sometimes', 'never'].map(v => (
                          <button key={v} onClick={() => setCarriesFood(v as UserProfile['carriesFood'])}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${carriesFood === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Living Situation">
                      <div className="flex gap-2">
                        {['alone', 'family', 'shared'].map(v => (
                          <button key={v} onClick={() => setLivingSituation(v as UserProfile['livingSituation'])}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${livingSituation === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Gym Settings (Collapsible) */}
            <div className="space-y-3">
              <button onClick={() => setGymOpen(!gymOpen)} className="flex items-center gap-2 w-full">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-3.5 h-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground flex-1 text-left">Gym Settings</h3>
                {gymOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {gymOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-9 space-y-3">
                    <Field label="I go to the gym">
                      <div className="flex gap-2">
                        {[true, false].map(v => (
                          <button key={String(v)} onClick={() => setGymGoer(v)}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${gymGoer === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {v ? '🏋️ Yes' : '❌ No'}
                          </button>
                        ))}
                      </div>
                    </Field>
                    {gymGoer && (
                      <>
                        <Field label={`Days per week: ${gymDays}`}>
                          <Slider value={[gymDays]} onValueChange={v => setGymDays(v[0])} min={1} max={7} step={1} />
                        </Field>
                        <Field label="Duration">
                          <div className="flex gap-2">
                            {[30, 45, 60].map(d => (
                              <button key={d} onClick={() => setGymDuration(d)}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${gymDuration === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {d === 60 ? '60+ min' : `${d} min`}
                              </button>
                            ))}
                          </div>
                        </Field>
                        <Field label="Intensity">
                          <div className="flex gap-2">
                            {(['light', 'moderate', 'intense'] as const).map(i => (
                              <button key={i} onClick={() => setGymIntensity(i)}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${gymIntensity === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {i.charAt(0).toUpperCase() + i.slice(1)}
                              </button>
                            ))}
                          </div>
                        </Field>
                        <Field label="Goal">
                          <div className="flex gap-2">
                            {([['fat_loss', '🔥 Fat Loss'], ['muscle_gain', '💪 Muscle'], ['general', '🏃 General']] as const).map(([v, l]) => (
                              <button key={v} onClick={() => setGymGoal(v as any)}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${gymGoal === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </Field>

                        {/* Gym Timing */}
                        <Field label="When do you go?">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { v: 'morning', l: '🌅 Morning' },
                              { v: 'afternoon', l: '☀️ Afternoon' },
                              { v: 'evening', l: '🌆 Evening' },
                              { v: 'night', l: '🌙 Night' },
                            ].map(o => (
                              <button key={o.v} onClick={() => setGymTimeOfDay(o.v)}
                                className={`py-2 rounded-xl text-xs font-semibold transition-colors ${gymTimeOfDay === o.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </Field>

                        {gymTimeOfDay && (
                          <Field label={`Exact time: ${gymSpecificHour > 12 ? gymSpecificHour - 12 : gymSpecificHour === 0 ? 12 : gymSpecificHour}:00 ${gymSpecificHour >= 12 ? 'PM' : 'AM'}`}>
                            <input type="range" min={0} max={23} step={1} value={gymSpecificHour}
                              onChange={e => setGymSpecificHour(Number(e.target.value))} className="w-full accent-primary" />
                          </Field>
                        )}

                        {/* Work Schedule */}
                        <Field label="Work Hours">
                          <div className="flex gap-2 items-center">
                            <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium outline-none" />
                            <span className="text-muted-foreground text-xs">to</span>
                            <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium outline-none" />
                          </div>
                        </Field>

                        {/* Sleep Schedule */}
                        <Field label="Sleep Schedule">
                          <div className="flex gap-2 items-center">
                            <input type="time" value={sleepStart} onChange={e => setSleepStart(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium outline-none" />
                            <span className="text-muted-foreground text-xs">to</span>
                            <input type="time" value={sleepEnd} onChange={e => setSleepEnd(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium outline-none" />
                          </div>
                        </Field>

                        {/* Shift Type */}
                        <Field label="Shift Type">
                          <div className="flex gap-2">
                            {[['day', '☀️ Day'], ['night', '🌙 Night'], ['rotating', '🔄 Rotating']].map(([v, l]) => (
                              <button key={v} onClick={() => setShiftType(v)}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${shiftType === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </Field>

                        {/* Fasted Training Toggle */}
                        <Field label="Training Style">
                          <button
                            onClick={() => setFastedTraining(!fastedTraining)}
                            className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors border ${fastedTraining ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                          >
                            {fastedTraining ? '🥊 Fasted Training (no pre-workout meal)' : '🍌 Regular (pre-workout meal suggested)'}
                          </button>
                        </Field>

                        {/* Weekend Schedule */}
                        <Field label="Different schedule on weekends?">
                          <button
                            onClick={() => setHasWeekendSchedule(!hasWeekendSchedule)}
                            className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors border ${hasWeekendSchedule ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                          >
                            {hasWeekendSchedule ? '✅ Yes, different weekend time' : '📅 Same as weekdays'}
                          </button>
                        </Field>
                        {hasWeekendSchedule && (
                          <Field label={`Weekend gym time: ${weekendHour > 12 ? weekendHour - 12 : weekendHour === 0 ? 12 : weekendHour}:00 ${weekendHour >= 12 ? 'PM' : 'AM'}`}>
                            <input type="range" min={0} max={23} step={1} value={weekendHour}
                              onChange={e => setWeekendHour(Number(e.target.value))} className="w-full accent-primary" />
                          </Field>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom spacer */}
            <div className="h-8" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <div className="space-y-3 pl-9">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
