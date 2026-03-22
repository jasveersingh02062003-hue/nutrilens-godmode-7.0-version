// ============================================
// NutriLens AI – Manual Adjustment Sheet
// ============================================

import { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ChevronLeft, Check } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';
import { type UserProfile } from '@/lib/store';
import { getMealTarget } from '@/lib/meal-targets';
import { applyManualAdjustment } from '@/lib/smart-adjustment';
import { toast } from 'sonner';

const MEAL_INFO: Record<string, { emoji: string; label: string }> = {
  breakfast: { emoji: '🌅', label: 'Breakfast' },
  lunch: { emoji: '☀️', label: 'Lunch' },
  snack: { emoji: '🍿', label: 'Snacks' },
  dinner: { emoji: '🌙', label: 'Dinner' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  deviation: number;
  remainingMeals: string[];
  date: string;
  onApplied: () => void;
}

export default function ManualAdjustmentSheet({ open, onClose, profile, deviation, remainingMeals, date, onApplied }: Props) {
  const isOver = deviation > 0;
  const absDev = Math.abs(deviation);

  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const alloc: Record<string, number> = {};
    const perMeal = Math.round(absDev / remainingMeals.length);
    remainingMeals.forEach(m => { alloc[m] = perMeal; });
    return alloc;
  });

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const remaining = absDev - totalAllocated;

  const handleSliderChange = (meal: string, value: number) => {
    setAllocations(prev => ({ ...prev, [meal]: value }));
  };

  const handleQuickOption = (option: 'even' | 'snacks_first' | 'keep_dinner') => {
    const alloc: Record<string, number> = {};
    if (option === 'even') {
      const per = Math.round(absDev / remainingMeals.length);
      remainingMeals.forEach(m => { alloc[m] = per; });
    } else if (option === 'snacks_first') {
      const snackTarget = getMealTarget(profile, 'snack').calories;
      const snackMax = Math.min(absDev, Math.round(snackTarget * 0.8));
      alloc['snack'] = remainingMeals.includes('snack') ? snackMax : 0;
      const leftover = absDev - (alloc['snack'] || 0);
      const others = remainingMeals.filter(m => m !== 'snack');
      const per = Math.round(leftover / Math.max(others.length, 1));
      others.forEach(m => { alloc[m] = per; });
    } else if (option === 'keep_dinner') {
      alloc['dinner'] = 0;
      const others = remainingMeals.filter(m => m !== 'dinner');
      const per = Math.round(absDev / Math.max(others.length, 1));
      others.forEach(m => { alloc[m] = per; });
    }
    setAllocations(alloc);
  };

  const handleApply = () => {
    const adjustments = remainingMeals.map(m => ({
      mealType: m,
      change: isOver ? -(allocations[m] || 0) : (allocations[m] || 0),
    }));
    applyManualAdjustment(adjustments, date);
    toast.success('Meal targets adjusted!');
    onApplied();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <div className="space-y-5 pt-2">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-foreground">Adjust Today's Plan</h3>
              <p className="text-[11px] text-muted-foreground">
                {isOver ? `${absDev} kcal over — distribute the reduction` : `${absDev} kcal under — distribute the extra`}
              </p>
            </div>
          </div>

          {/* Quick options */}
          <div className="flex gap-2">
            {[
              { id: 'even' as const, label: '⚖️ Balance evenly' },
              ...(remainingMeals.includes('snack') ? [{ id: 'snacks_first' as const, label: '🍿 Reduce snacks first' }] : []),
              ...(remainingMeals.includes('dinner') ? [{ id: 'keep_dinner' as const, label: '🌙 Keep dinner same' }] : []),
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => handleQuickOption(opt.id)}
                className="flex-1 px-2 py-2 rounded-xl bg-card border border-border text-[10px] font-semibold text-foreground hover:bg-primary/5 hover:border-primary/20 active:scale-[0.97] transition-all"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            {remainingMeals.map(meal => {
              const info = MEAL_INFO[meal] || { emoji: '🍽️', label: meal };
              const baseTarget = getMealTarget(profile, meal).calories;
              const value = allocations[meal] || 0;
              const maxValue = Math.round(baseTarget * 0.8);

              return (
                <div key={meal} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{info.emoji} {info.label}</span>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground">Base: {baseTarget} kcal → </span>
                      <span className="text-xs font-bold text-foreground">
                        {isOver ? baseTarget - value : baseTarget + value} kcal
                      </span>
                    </div>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([v]) => handleSliderChange(meal, v)}
                    min={0}
                    max={maxValue}
                    step={10}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total {isOver ? 'reduced' : 'added'}</span>
              <span className="font-bold text-foreground">{totalAllocated} / {absDev} kcal</span>
            </div>
            {remaining !== 0 && (
              <p className="text-[10px] text-amber-600 mt-1">
                {remaining > 0 ? `${remaining} kcal still unallocated` : `${Math.abs(remaining)} kcal over-allocated`}
              </p>
            )}
          </div>

          {/* Apply */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Adjustments
          </motion.button>
        </div>
      </SheetContent>
    </Sheet>
  );
}