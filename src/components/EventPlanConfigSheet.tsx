import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CalendarIcon, Check, AlertTriangle, Zap, Coffee, Salad, Moon, Dumbbell, ChefHat, Wallet, Clock } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  calculateEventTargets,
  setActivePlan,
  type EventGoalType,
  type ExerciseTime,
  type CookingTime,
  type BudgetTier,
  type EventPlanSettings,
  type PlanTargets,
} from '@/lib/event-plan-service';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EVENT_TYPES = [
  { id: 'wedding', emoji: '💒', label: 'Wedding' },
  { id: 'vacation', emoji: '🏖️', label: 'Vacation' },
  { id: 'meeting', emoji: '💼', label: 'Meeting' },
  { id: 'reunion', emoji: '🎉', label: 'Reunion' },
  { id: 'photoshoot', emoji: '📸', label: 'Photoshoot' },
  { id: 'other', emoji: '🎯', label: 'Other' },
];

const GOAL_TYPES: { id: EventGoalType; emoji: string; label: string; desc: string }[] = [
  { id: 'lose', emoji: '⬇️', label: 'Lose Weight', desc: 'Overall fat loss' },
  { id: 'gain', emoji: '⬆️', label: 'Gain Weight', desc: 'Lean muscle gain' },
  { id: 'tummy', emoji: '🎯', label: 'Reduce Tummy', desc: 'Focus on belly fat' },
  { id: 'shape', emoji: '💪', label: 'Get in Shape', desc: 'Tone & define' },
];

const EXERCISE_OPTIONS: { id: ExerciseTime; icon: typeof Dumbbell; label: string; desc: string }[] = [
  { id: 'none', icon: Clock, label: 'No Time', desc: 'Walking only' },
  { id: '10min', icon: Dumbbell, label: '10-15 min', desc: 'Quick workout' },
  { id: '30min', icon: Dumbbell, label: '30 min', desc: 'Full routine' },
  { id: '1hour', icon: Dumbbell, label: '1 hour', desc: 'Dedicated session' },
];

const COOKING_OPTIONS: { id: CookingTime; icon: typeof ChefHat; label: string; desc: string }[] = [
  { id: 'none', icon: Clock, label: 'No Cooking', desc: 'Ready-to-eat only' },
  { id: 'limited', icon: ChefHat, label: '15-30 min', desc: 'Quick meals' },
  { id: 'plenty', icon: ChefHat, label: '1+ hour', desc: 'Full cooking' },
];

const BUDGET_OPTIONS: { id: BudgetTier; icon: typeof Wallet; label: string; desc: string }[] = [
  { id: 'tight', icon: Wallet, label: 'Tight', desc: '<₹150/day' },
  { id: 'moderate', icon: Wallet, label: 'Moderate', desc: '₹150-300/day' },
  { id: 'flexible', icon: Wallet, label: 'Flexible', desc: '>₹300/day' },
];

const FASTING_OPTIONS = [
  { value: 0, label: 'No Fasting' },
  { value: 12, label: '12h Fast' },
  { value: 14, label: '14h Fast' },
  { value: 16, label: '16h Fast' },
];

const BOOSTER_OPTIONS = [
  { id: 'morning_routine', emoji: '🌅', label: 'Morning Routine', desc: 'Warm water + lemon + jeera, walk, stretching' },
  { id: 'metabolism_drinks', emoji: '☕', label: 'Metabolism Drinks', desc: 'Jeera water, ginger tea, green tea, black coffee' },
  { id: 'superfoods', emoji: '🥜', label: 'Superfoods', desc: 'Makhana, sattu, chia seeds, sprouted moong' },
  { id: 'evening_routine', emoji: '🌙', label: 'Evening Routine', desc: 'Herbal tea, finish dinner by 7 PM' },
];

export default function EventPlanConfigSheet({ open, onOpenChange }: Props) {
  const { profile } = useUserProfile();
  const [step, setStep] = useState(0);

  // Step 1
  const [eventType, setEventType] = useState('wedding');
  const [eventDate, setEventDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [dateOpen, setDateOpen] = useState(false);

  // Step 2
  const [goalType, setGoalType] = useState<EventGoalType>('lose');
  const [targetWeight, setTargetWeight] = useState(profile?.weightKg ? profile.weightKg - 3 : 70);

  // Step 3
  const [exerciseTime, setExerciseTime] = useState<ExerciseTime>('none');
  const [cookingTime, setCookingTime] = useState<CookingTime>(() => {
    if (profile?.cookingHabits === 'none' || profile?.cookingHabits === 'minimal') return 'none';
    if (profile?.cookingHabits === 'moderate') return 'limited';
    return 'plenty';
  });
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('moderate');

  // Step 4
  const [fastingWindow, setFastingWindow] = useState<0 | 12 | 14 | 16>(0);
  const [boosters, setBoosters] = useState<string[]>(['morning_routine', 'metabolism_drinks']);

  const currentWeight = profile?.weightKg || 70;
  const tdee = profile?.tdee || 2000;
  const duration = eventDate ? Math.max(7, differenceInDays(eventDate, new Date())) : 30;

  const targets: PlanTargets = calculateEventTargets(currentWeight, targetWeight, duration, tdee, goalType);

  const toggleBooster = (id: string) => {
    setBoosters(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleActivate = () => {
    const settings: EventPlanSettings = {
      eventType,
      eventDate: eventDate ? format(eventDate, 'yyyy-MM-dd') : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      goalType,
      targetWeight,
      exerciseTime,
      cookingTime,
      budgetTier,
      fastingWindow,
      boosters,
    };

    setActivePlan({
      planId: 'event_based',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      duration,
      targetWeight,
      dailyCalories: targets.dailyCalories,
      dailyProtein: targets.dailyProtein,
      dailyCarbs: targets.dailyCarbs,
      dailyFat: targets.dailyFat,
      dailyDeficit: targets.dailyDeficit,
      activatedAt: new Date().toISOString(),
      eventSettings: settings,
    });

    toast.success('🎯 Event plan activated!');
    onOpenChange(false);
    setStep(0);
    window.dispatchEvent(new Event('nutrilens:update'));
  };

  const STEPS = ['Event', 'Goal', 'Constraints', 'Extras', 'Summary'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Header */}
          <SheetHeader>
            <div className="flex items-center justify-between">
              {step > 0 ? (
                <button onClick={() => setStep(s => s - 1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </button>
              ) : <div />}
              <SheetTitle className="text-base">
                {STEPS[step]}
              </SheetTitle>
              <div className="text-xs text-muted-foreground">{step + 1}/{STEPS.length}</div>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1.5 justify-center pt-2">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'}`} />
              ))}
            </div>
          </SheetHeader>

          <AnimatePresence mode="wait">
            {/* Step 0: Event */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">What's the event?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {EVENT_TYPES.map(e => (
                      <button
                        key={e.id}
                        onClick={() => setEventType(e.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                          eventType === e.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        <span className="text-2xl">{e.emoji}</span>
                        <span className="text-[10px] font-semibold text-foreground">{e.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">When is it?</p>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !eventDate && 'text-muted-foreground')}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {eventDate ? format(eventDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={eventDate}
                        onSelect={(d) => { setEventDate(d); setDateOpen(false); }}
                        disabled={(date) => date < addDays(new Date(), 7)}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                  {eventDate && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      📅 {duration} days from now
                    </p>
                  )}
                </div>

                <Button className="w-full" onClick={() => setStep(1)}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Step 1: Goal */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">What do you want to achieve?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_TYPES.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setGoalType(g.id)}
                        className={`flex flex-col items-center gap-1 p-4 rounded-2xl border transition-all ${
                          goalType === g.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <span className="text-xs font-bold text-foreground">{g.label}</span>
                        <span className="text-[9px] text-muted-foreground">{g.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Target weight</p>
                  <p className="text-[10px] text-muted-foreground mb-3">Current: {currentWeight} kg</p>
                  <Slider
                    value={[targetWeight]}
                    onValueChange={([v]) => setTargetWeight(v)}
                    min={goalType === 'gain' ? currentWeight : Math.max(40, currentWeight - 20)}
                    max={goalType === 'gain' ? currentWeight + 15 : currentWeight}
                    step={0.5}
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{goalType === 'gain' ? currentWeight : Math.max(40, currentWeight - 20)} kg</span>
                    <span className="text-base font-bold text-primary">{targetWeight} kg</span>
                    <span className="text-xs text-muted-foreground">{goalType === 'gain' ? currentWeight + 15 : currentWeight} kg</span>
                  </div>

                  {!targets.feasible && targets.warning && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-[10px] text-foreground">{targets.warning}</p>
                    </div>
                  )}
                </div>

                <Button className="w-full" onClick={() => setStep(2)}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Constraints */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Daily exercise time?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EXERCISE_OPTIONS.map(o => (
                      <button
                        key={o.id}
                        onClick={() => setExerciseTime(o.id)}
                        className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${
                          exerciseTime === o.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        <o.icon className="w-4 h-4 text-primary" />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-foreground">{o.label}</p>
                          <p className="text-[9px] text-muted-foreground">{o.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Cooking time?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {COOKING_OPTIONS.map(o => (
                      <button
                        key={o.id}
                        onClick={() => setCookingTime(o.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                          cookingTime === o.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        <o.icon className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-semibold text-foreground">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Food budget?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {BUDGET_OPTIONS.map(o => (
                      <button
                        key={o.id}
                        onClick={() => setBudgetTier(o.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                          budgetTier === o.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        <o.icon className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-semibold text-foreground">{o.label}</span>
                        <span className="text-[8px] text-muted-foreground">{o.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={() => setStep(3)}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Step 3: Extras */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Intermittent fasting?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {FASTING_OPTIONS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setFastingWindow(f.value as 0 | 12 | 14 | 16)}
                        className={`p-2.5 rounded-2xl border text-center transition-all ${
                          fastingWindow === f.value ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        <span className="text-[10px] font-semibold text-foreground">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Daily boosters (optional)</p>
                  <div className="space-y-2">
                    {BOOSTER_OPTIONS.map(b => (
                      <button
                        key={b.id}
                        onClick={() => toggleBooster(b.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                          boosters.includes(b.id) ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        <span className="text-xl">{b.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{b.label}</p>
                          <p className="text-[9px] text-muted-foreground">{b.desc}</p>
                        </div>
                        {boosters.includes(b.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={() => setStep(4)}>
                  Review Plan <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Step 4: Summary */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-4xl">{EVENT_TYPES.find(e => e.id === eventType)?.emoji}</span>
                  <p className="text-base font-bold text-foreground">Your {EVENT_TYPES.find(e => e.id === eventType)?.label} Plan</p>
                  <p className="text-xs text-muted-foreground">{duration} days · {GOAL_TYPES.find(g => g.id === goalType)?.label}</p>
                </div>

                {/* Targets */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-card border border-border p-3 text-center">
                    <p className="text-lg font-bold text-primary">{targets.dailyCalories}</p>
                    <p className="text-[9px] text-muted-foreground">kcal/day</p>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-3 text-center">
                    <p className="text-lg font-bold text-primary">{targets.dailyProtein}g</p>
                    <p className="text-[9px] text-muted-foreground">protein/day</p>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{targets.dailyCarbs}g</p>
                    <p className="text-[9px] text-muted-foreground">carbs</p>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{targets.dailyFat}g</p>
                    <p className="text-[9px] text-muted-foreground">fats</p>
                  </div>
                </div>

                {/* Config summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">Weight goal</span>
                    <span className="text-xs font-semibold text-foreground">{currentWeight} → {targetWeight} kg</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">Exercise</span>
                    <span className="text-xs font-semibold text-foreground">{EXERCISE_OPTIONS.find(o => o.id === exerciseTime)?.label}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">Cooking</span>
                    <span className="text-xs font-semibold text-foreground">{COOKING_OPTIONS.find(o => o.id === cookingTime)?.label}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">Budget</span>
                    <span className="text-xs font-semibold text-foreground">{BUDGET_OPTIONS.find(o => o.id === budgetTier)?.label}</span>
                  </div>
                  {fastingWindow > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-xs text-muted-foreground">Fasting</span>
                      <span className="text-xs font-semibold text-foreground">{fastingWindow}h window</span>
                    </div>
                  )}
                  {boosters.length > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-muted-foreground">Boosters</span>
                      <span className="text-xs font-semibold text-foreground">{boosters.length} selected</span>
                    </div>
                  )}
                </div>

                {!targets.feasible && (
                  <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-[10px] text-foreground">{targets.warning}</p>
                  </div>
                )}

                {targets.feasible && targets.warning && (
                  <div className="flex items-start gap-2 rounded-xl bg-accent/10 border border-accent/20 p-3">
                    <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-[10px] text-foreground">{targets.warning}</p>
                  </div>
                )}

                <p className="text-[9px] text-muted-foreground text-center">
                  ⚠️ Consult your doctor before starting, especially if you have diabetes, heart disease, or eating disorders.
                </p>

                <Button className="w-full" size="lg" onClick={handleActivate} disabled={!targets.feasible}>
                  🎯 Activate Plan
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
