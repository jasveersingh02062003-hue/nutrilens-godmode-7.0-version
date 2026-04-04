import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Settings2, X, Check } from 'lucide-react';
import { mobileOverlayMotion, mobileOverlayTransition, mobileSheetMotion, mobileSheetTransition, useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import MonikaGuide from './MonikaGuide';

interface MealBreakdownProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  onContinue: (splits: MealSplits) => void;
}

export interface MealSplits {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
}

const DEFAULT_SPLITS: MealSplits = {
  breakfast: 25,
  lunch: 35,
  dinner: 30,
  snacks: 10,
};

const MEAL_META: Record<keyof MealSplits, { emoji: string; label: string }> = {
  breakfast: { emoji: '🌅', label: 'Breakfast' },
  lunch: { emoji: '☀️', label: 'Lunch' },
  dinner: { emoji: '🌙', label: 'Dinner' },
  snacks: { emoji: '🍿', label: 'Snacks' },
};

const stagger = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, type: 'spring' as const, stiffness: 500, damping: 35 },
  }),
};

export default function MealBreakdownScreen({ calories, protein, carbs, fat, onContinue }: MealBreakdownProps) {
  const [splits, setSplits] = useState<MealSplits>(DEFAULT_SPLITS);
  const [editing, setEditing] = useState(false);
  const [tempSplits, setTempSplits] = useState<MealSplits>(DEFAULT_SPLITS);

  const getMealNutrition = useCallback((pct: number) => ({
    calories: Math.round(calories * pct / 100),
    protein: Math.round(protein * pct / 100),
    carbs: Math.round(carbs * pct / 100),
    fat: Math.round(fat * pct / 100),
  }), [calories, protein, carbs, fat]);

  const totalPct = Object.values(editing ? tempSplits : splits).reduce((s, v) => s + v, 0);

  const handleSplitChange = (meal: keyof MealSplits, value: number) => {
    setTempSplits(prev => ({ ...prev, [meal]: value }));
  };

  const saveSplits = () => {
    setSplits(tempSplits);
    setEditing(false);
  };

  const openEdit = () => {
    setTempSplits({ ...splits });
    setEditing(true);
  };

  return (
    <div className="flex flex-col min-h-[80vh]">
      <div className="flex-1 space-y-5 pb-4">
        <MonikaGuide
          message="Here's how your daily nutrition breaks down. You can customize the split."
          mood="excited"
        />

        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-display font-bold text-foreground tracking-tight">Your Daily Targets</h2>
          <p className="text-sm text-muted-foreground mt-1">Distributed across your meals.</p>
        </motion.div>

        {/* Daily summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <div className="text-center mb-3">
            <span className="text-4xl font-mono font-bold text-foreground tracking-tighter">{calories}</span>
            <span className="text-sm text-muted-foreground ml-1.5">kcal/day</span>
          </div>
          <div className="flex justify-center gap-6 text-xs font-medium text-muted-foreground">
            <span>P <span className="font-semibold text-foreground">{protein}g</span></span>
            <span>C <span className="font-semibold text-foreground">{carbs}g</span></span>
            <span>F <span className="font-semibold text-foreground">{fat}g</span></span>
          </div>
        </motion.div>

        {/* Meal cards */}
        <div className="space-y-2.5">
          {(Object.keys(MEAL_META) as (keyof MealSplits)[]).map((meal, i) => {
            const meta = MEAL_META[meal];
            const pct = splits[meal];
            const nutrition = getMealNutrition(pct);
            return (
              <motion.div
                key={meal}
                custom={i}
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="bg-card border border-border rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{meta.emoji}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{meta.label}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">{pct}% of daily</p>
                    </div>
                  </div>
                  <span className="text-base font-mono font-bold text-foreground">{nutrition.calories}</span>
                </div>
                {/* Minimal progress bar */}
                <div className="h-1 rounded-full bg-muted overflow-hidden mb-2">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  />
                </div>
                <div className="flex gap-4 text-[10px] font-medium text-muted-foreground">
                  <span>P {nutrition.protein}g</span>
                  <span>C {nutrition.carbs}g</span>
                  <span>F {nutrition.fat}g</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Edit Split Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {editing && (
            <motion.div
              {...mobileOverlayMotion}
              transition={mobileOverlayTransition}
              className="fixed inset-0 bg-primary/30 backdrop-blur-sm z-50 flex items-end justify-center"
              onClick={() => setEditing(false)}
            >
              <motion.div
                {...mobileSheetMotion}
                transition={mobileSheetTransition}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain bg-card rounded-t-3xl p-6 pb-8 border-t border-border"
              >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-display font-bold text-foreground tracking-tight">Edit Meal Split</h3>
                <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                {(Object.keys(MEAL_META) as (keyof MealSplits)[]).map(meal => {
                  const meta = MEAL_META[meal];
                  const val = tempSplits[meal];
                  const nutrition = getMealNutrition(val);
                  return (
                    <div key={meal}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-foreground">
                          {meta.emoji} {meta.label}
                        </span>
                        <span className="text-sm font-mono font-semibold text-foreground">{val}% · {nutrition.calories}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={60}
                        value={val}
                        onChange={e => handleSplitChange(meal, Number(e.target.value))}
                        className="w-full accent-foreground h-1.5"
                      />
                    </div>
                  );
                })}
              </div>

              <div className={`text-center text-xs font-semibold mt-4 ${totalPct === 100 ? 'text-foreground' : 'text-destructive'}`}>
                Total: {totalPct}% {totalPct !== 100 && '(must equal 100%)'}
              </div>

              <button
                onClick={saveSplits}
                disabled={totalPct !== 100}
                className={`w-full mt-4 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  totalPct === 100 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" /> Save Split
              </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      , document.body)}

      {/* Bottom buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="sticky bottom-0 pt-3 pb-2 bg-background flex gap-3"
      >
        <button
          onClick={openEdit}
          className="px-5 py-3.5 rounded-full bg-card border border-border font-semibold text-sm flex items-center gap-2 hover:bg-muted transition-colors"
        >
          <Settings2 className="w-4 h-4" /> Edit
        </button>
        <button
          onClick={() => onContinue(splits)}
          className="flex-1 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
        >
          Looks Good <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
