// ============================================
// NutriLens AI – Smart Redistribution Sheet with Sliders
// ============================================

import { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ChevronLeft, Check, ArrowRight, CalendarPlus, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { UserProfile, getDailyLog } from '@/lib/store';
import {
  calculateProportionalDistribution,
  applyRedistribution,
  markRedistributed,
  isRedistributed,
  type RedistributionResult,
} from '@/lib/redistribution-service';
import { recalculateDay } from '@/lib/calorie-engine';
import { toast } from 'sonner';
import { isPremium } from '@/lib/subscription-service';
import UpgradeModal from '@/components/UpgradeModal';

const MEAL_LABELS: Record<string, { emoji: string; label: string }> = {
  breakfast: { emoji: '🌅', label: 'Breakfast' },
  lunch: { emoji: '☀️', label: 'Lunch' },
  dinner: { emoji: '🌙', label: 'Dinner' },
  snack: { emoji: '🍿', label: 'Snacks' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  missedMealType: string;
  missedMealLabel: string;
  date: string;
  onApplied: () => void;
}

export default function SmartRedistributionSheet({
  open, onClose, profile, missedMealType, missedMealLabel, date, onApplied,
}: Props) {
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [carryOver, setCarryOver] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [carryOverAmount, setCarryOverAmount] = useState(0);
  const premium = isPremium();

  const autoResult = useMemo(
    () => calculateProportionalDistribution(profile, missedMealType, date),
    [profile, missedMealType, date]
  );

  const remainingMeals = autoResult.allocations.map(a => a.mealType);

  const [customPcts, setCustomPcts] = useState<Record<string, number>>(() => {
    const pcts: Record<string, number> = {};
    const total = autoResult.allocations.reduce((s, a) => s + a.addedCalories, 0);
    for (const a of autoResult.allocations) {
      pcts[a.mealType] = total > 0 ? Math.round((a.addedCalories / total) * 100) : Math.round(100 / autoResult.allocations.length);
    }
    return pcts;
  });

  const totalPct = Object.values(customPcts).reduce((s, v) => s + v, 0);
  const missedCal = autoResult.missedTarget.calories;

  const customResult = useMemo(
    () => calculateProportionalDistribution(profile, missedMealType, date, customPcts),
    [profile, missedMealType, date, customPcts]
  );

  const activeResult = mode === 'auto' ? autoResult : customResult;

  // Gate redistribution for free users
  if (open && !premium) {
    return (
      <>
        <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
          <SheetContent side="bottom" className="rounded-t-3xl px-4 py-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Crown className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-base font-bold text-foreground">Premium Feature</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Upgrade to automatically balance your missed meals across the day.
              </p>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold"
              >
                Upgrade to Premium
              </button>
            </div>
          </SheetContent>
        </Sheet>
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      </>
    );
  }

  function handleSliderChange(mealType: string, value: number) {
    setCustomPcts(prev => ({ ...prev, [mealType]: value }));
  }

  function handleApply() {
    // Double-check at execution time to prevent double redistribution
    if (isRedistributed(date, missedMealType)) {
      toast.error('This meal has already been redistributed.');
      onClose();
      return;
    }
    const carryAmount = carryOver ? carryOverAmount : undefined;
    applyRedistribution(activeResult, date, carryAmount);
    markRedistributed(date, missedMealType, activeResult.allocations);
    toast.success('Calories redistributed successfully!');
    onApplied();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-foreground text-sm">Redistribute {missedMealLabel}</p>
            <p className="text-[11px] text-muted-foreground">
              {missedCal} kcal · {autoResult.missedTarget.protein}g protein to distribute
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Mode Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('auto')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                mode === 'auto' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              ✨ Smart Auto
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                mode === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              🎛️ Customize
            </button>
          </div>

          {/* Auto Summary */}
          {mode === 'auto' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-3">
                  We've proportionally distributed your missed {missedMealLabel} based on remaining meal sizes:
                </p>
                <div className="space-y-2">
                  {autoResult.allocations.map(a => {
                    const meta = MEAL_LABELS[a.mealType];
                    return (
                      <div key={a.mealType} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{meta?.emoji}</span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{meta?.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              +{a.addedProtein}g protein · +{a.addedCarbs}g carbs
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary">+{a.addedCalories} kcal</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Custom Sliders */}
          {mode === 'custom' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <div className="text-center">
                  <span className="text-2xl font-extrabold text-foreground">{missedCal}</span>
                  <span className="text-xs text-muted-foreground ml-1">kcal to distribute</span>
                </div>

                {remainingMeals.map(mealType => {
                  const meta = MEAL_LABELS[mealType];
                  const pct = customPcts[mealType] || 0;
                  const cal = Math.round(missedCal * pct / 100);
                  return (
                    <div key={mealType}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          {meta?.emoji} {meta?.label}
                        </span>
                        <span className="text-xs font-bold text-primary">{pct}% · +{cal} kcal</span>
                      </div>
                      <Slider
                        value={[pct]}
                        min={0}
                        max={80}
                        step={5}
                        onValueChange={([v]) => handleSliderChange(mealType, v)}
                      />
                    </div>
                  );
                })}

                <div className={`text-center text-xs font-semibold ${
                  totalPct === 100 ? 'text-primary' : 'text-destructive'
                }`}>
                  Total: {totalPct}% {totalPct !== 100 && '(must equal 100%)'}
                </div>
              </div>
            </motion.div>
          )}

          {/* Carry Over Option */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Carry over to tomorrow</span>
              </div>
              <Switch checked={carryOver} onCheckedChange={setCarryOver} />
            </div>
            {carryOver && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <p className="text-[10px] text-muted-foreground mb-2">
                  How many calories to carry over instead of distributing today?
                </p>
                <Slider
                  value={[carryOverAmount]}
                  min={0}
                  max={missedCal}
                  step={25}
                  onValueChange={([v]) => setCarryOverAmount(v)}
                />
                <p className="text-xs text-center font-semibold text-primary mt-1">
                  {carryOverAmount} kcal → tomorrow
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Apply Button */}
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={handleApply}
            disabled={mode === 'custom' && totalPct !== 100}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              (mode === 'auto' || totalPct === 100)
                ? 'bg-primary text-primary-foreground active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" /> Apply Redistribution
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
