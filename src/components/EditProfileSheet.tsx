import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User, Ruler, Scale, Target, Activity, Heart, Apple, ChefHat, Save, Shield, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
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
  return localStorage.getItem(PHOTO_KEY);
}

export function saveProfilePhoto(dataUrl: string) {
  localStorage.setItem(PHOTO_KEY, dataUrl);
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
                          <button key={v} onClick={() => setTravelFrequency(v)}
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
                          <button key={f} onClick={() => setWorkplaceFacilities(toggleArrayItem(workplaceFacilities, f))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${workplaceFacilities.includes(f) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {f === 'none' ? 'None' : f.charAt(0).toUpperCase() + f.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Do you carry food when traveling?">
                      <div className="flex gap-2">
                        {['always', 'sometimes', 'never'].map(v => (
                          <button key={v} onClick={() => setCarriesFood(v)}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${carriesFood === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Living Situation">
                      <div className="flex gap-2">
                        {['alone', 'family', 'shared'].map(v => (
                          <button key={v} onClick={() => setLivingSituation(v)}
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
