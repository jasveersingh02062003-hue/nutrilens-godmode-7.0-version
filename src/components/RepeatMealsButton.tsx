import { useState } from 'react';
import { getDailyLog, getDailyTotals, addMealToLog, type MealEntry } from '@/lib/store';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

interface Props {
  onApplied: () => void;
}

export default function RepeatMealsButton({ onApplied }: Props) {
  const [applied, setApplied] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  const todayLog = getDailyLog(today);
  const yesterdayLog = getDailyLog(yesterdayKey);

  // Only show if yesterday had meals and today has none
  if (yesterdayLog.meals.length === 0 || todayLog.meals.length > 0 || applied) return null;

  const yesterdayTotals = getDailyTotals(yesterdayLog);

  const handleRepeat = () => {
    for (const meal of yesterdayLog.meals) {
      const newMeal: MealEntry = {
        ...meal,
        id: `repeat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        time: meal.time,
      };
      addMealToLog(newMeal);
    }
    setApplied(true);
    toast.success(`Copied ${yesterdayLog.meals.length} meals from yesterday!`);
    onApplied();
  };

  return (
    <button
      onClick={handleRepeat}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors active:scale-[0.98]"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Copy className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-foreground">Repeat yesterday's meals</p>
        <p className="text-[10px] text-muted-foreground">
          {yesterdayLog.meals.length} meals · {yesterdayTotals.eaten} kcal · {yesterdayTotals.protein}g protein
        </p>
      </div>
    </button>
  );
}
