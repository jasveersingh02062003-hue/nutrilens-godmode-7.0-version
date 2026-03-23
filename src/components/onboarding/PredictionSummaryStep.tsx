import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, TrendingUp, Zap, Clock, Target, Sparkles, Info, Minus } from 'lucide-react';
import type { OnboardingGoalResult } from '@/lib/goal-engine';

const KCAL_PER_KG = 7700;

interface PlanOption {
  key: string;
  label: string;
  emoji: string;
  deficit: number;
  days: number;
  weeks: number;
  months: number;
  weeklyRate: number;
  targetCalories: number;
  recommended?: boolean;
}

interface Props {
  goalResult: OnboardingGoalResult;
  currentWeight: number;
  targetWeight: number;
  goalType: string;
}

export default function PredictionSummaryStep({ goalResult, currentWeight, targetWeight, goalType }: Props) {
  const [selectedPlan, setSelectedPlan] = useState('moderate');

  if (goalType === 'maintain') {
    return (
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2">
          <p className="text-3xl">⚖️</p>
          <h2 className="text-xl font-display font-bold text-foreground">Maintenance Mode</h2>
          <p className="text-sm text-muted-foreground">You're maintaining — no timeline needed.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Daily Target</p>
          <p className="text-4xl font-mono font-bold text-foreground">{goalResult.targetCalories}</p>
          <p className="text-sm text-muted-foreground">kcal/day</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-2">
          {[
            { label: 'Protein', val: goalResult.protein, color: 'text-primary' },
            { label: 'Carbs', val: goalResult.carbs, color: 'text-accent' },
            { label: 'Fat', val: goalResult.fat, color: 'text-foreground' },
          ].map(m => (
            <div key={m.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
              <p className={`text-lg font-mono font-bold ${m.color}`}>{m.val}g</p>
            </div>
          ))}
        </motion.div>
        <MonikaCoachTip message="Maintaining is about consistency. Eat at your maintenance level and stay active!" />
      </div>
    );
  }

  const isLoss = goalType === 'lose';
  const weightDiff = Math.abs(currentWeight - targetWeight);
  const totalDeficit = weightDiff * KCAL_PER_KG;

  const plans: PlanOption[] = [
    { key: 'aggressive', label: 'Aggressive', emoji: '🔥', deficit: 800, recommended: false },
    { key: 'moderate', label: 'Moderate', emoji: '⚡', deficit: 500, recommended: true },
    { key: 'slow', label: 'Slow & Steady', emoji: '🌱', deficit: 300, recommended: false },
  ].map(p => {
    const days = Math.ceil(totalDeficit / p.deficit);
    const weeks = +(days / 7).toFixed(1);
    const months = +(days / 30).toFixed(1);
    const weeklyRate = +((p.deficit * 7) / KCAL_PER_KG).toFixed(2);
    const targetCalories = isLoss
      ? goalResult.tdee - p.deficit
      : goalResult.tdee + p.deficit;
    return { ...p, days, weeks, months, weeklyRate, targetCalories };
  });

  const active = plans.find(p => p.key === selectedPlan) || plans[1];

  const coachMessage = weightDiff > 20
    ? `That's a big goal — ${weightDiff.toFixed(1)} kg! Breaking it into milestones will keep you motivated. Start with 5-10% first.`
    : weightDiff > 10
    ? `${weightDiff.toFixed(1)} kg is very achievable. With the moderate plan, you'll see real changes in 4-6 weeks.`
    : `${weightDiff.toFixed(1)} kg — you're almost there! Stay consistent and you'll reach your goal soon.`;

  return (
    <div className="space-y-4">
      {/* Goal Summary */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          {isLoss ? <TrendingDown className="w-5 h-5 text-primary" /> : <TrendingUp className="w-5 h-5 text-primary" />}
          <div>
            <p className="text-sm font-semibold text-foreground">
              You want to {isLoss ? 'lose' : 'gain'} <span className="text-primary">{weightDiff.toFixed(1)} kg</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {currentWeight} kg → {targetWeight} kg
            </p>
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            Total {isLoss ? 'deficit' : 'surplus'} needed: <span className="font-mono font-semibold text-foreground">{totalDeficit.toLocaleString()} kcal</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">1 kg ≈ 7,700 kcal</p>
        </div>
      </motion.div>

      {/* Plan Options */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Choose your pace</p>
        {plans.map((plan, i) => (
          <motion.button
            key={plan.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedPlan(plan.key)}
            className={`w-full p-4 rounded-2xl text-left transition-all border ${
              selectedPlan === plan.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:border-primary/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span>{plan.emoji}</span>
                <span className="text-sm font-semibold">{plan.label}</span>
                {plan.recommended && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    selectedPlan === plan.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    Recommended
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className={`text-[10px] ${selectedPlan === plan.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {isLoss ? 'Deficit' : 'Surplus'}
                </p>
                <p className="text-xs font-mono font-semibold">{plan.deficit} kcal/day</p>
              </div>
              <div>
                <p className={`text-[10px] ${selectedPlan === plan.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  Timeline
                </p>
                <p className="text-xs font-mono font-semibold">{plan.weeks} wks (~{plan.months} mo)</p>
              </div>
              <div>
                <p className={`text-[10px] ${selectedPlan === plan.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  Rate
                </p>
                <p className="text-xs font-mono font-semibold">{plan.weeklyRate} kg/wk</p>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Calorie Intelligence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPlan}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">Calorie Intelligence</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Maintenance (TDEE)</p>
              <p className="text-sm font-mono font-bold text-foreground">{goalResult.tdee} kcal</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Target Intake</p>
              <p className="text-sm font-mono font-bold text-primary">{Math.max(1200, active.targetCalories)} kcal</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Daily {isLoss ? 'Deficit' : 'Surplus'}</p>
              <p className="text-sm font-mono font-bold text-accent">{active.deficit} kcal</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Weekly {isLoss ? 'Loss' : 'Gain'}</p>
              <p className="text-sm font-mono font-bold text-foreground">{active.weeklyRate} kg</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg px-3 py-2 mt-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <Info className="w-3 h-3 inline mr-1 -mt-0.5" />
              1 kg = 7,700 kcal. Your plan creates a {active.deficit} kcal {isLoss ? 'deficit' : 'surplus'} daily → ~{active.weeklyRate} kg/{isLoss ? 'loss' : 'gain'} per week.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dynamic Timeline */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Estimated Journey</p>
        </div>
        <p className="text-2xl font-mono font-bold text-primary">{active.weeks} weeks</p>
        <p className="text-sm text-muted-foreground">(~{active.months} months)</p>
        <p className="text-[10px] text-muted-foreground mt-2">
          At current pace, you'll reach {targetWeight} kg by approximately{' '}
          <span className="font-semibold text-foreground">
            {new Date(Date.now() + active.days * 86400000).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
        </p>
      </motion.div>

      {/* Coach Tip */}
      <MonikaCoachTip message={coachMessage} />
    </div>
  );
}

function MonikaCoachTip({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 30 }}
      className="bg-card border border-border rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-0.5">Monika's Tip</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}
