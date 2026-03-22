// ============================================
// NutriLens AI – Edit Meal Target Modal
// ============================================

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserProfile } from '@/lib/store';
import { getDailyAdjustments, saveDailyAdjustments, getMealTarget, type MealTarget } from '@/lib/meal-targets';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  mealType: string;
  mealLabel: string;
  date: string;
  onSaved: () => void;
}

export default function EditMealTargetModal({ open, onClose, profile, mealType, mealLabel, date, onSaved }: Props) {
  const baseTarget = getMealTarget(profile, mealType);
  const adjustments = getDailyAdjustments(date);
  const adj = adjustments[mealType] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const currentTarget: MealTarget = {
    calories: baseTarget.calories + adj.calories,
    protein: baseTarget.protein + adj.protein,
    carbs: baseTarget.carbs + adj.carbs,
    fat: baseTarget.fat + adj.fat,
  };

  const [cal, setCal] = useState(currentTarget.calories);
  const [protein, setProtein] = useState(currentTarget.protein);
  const [carbs, setCarbs] = useState(currentTarget.carbs);
  const [fat, setFat] = useState(currentTarget.fat);

  const exceedsDaily = cal > profile.dailyCalories * 0.6;

  function handleSave() {
    const newAdj = { ...adjustments };
    newAdj[mealType] = {
      calories: cal - baseTarget.calories,
      protein: protein - baseTarget.protein,
      carbs: carbs - baseTarget.carbs,
      fat: fat - baseTarget.fat,
    };
    saveDailyAdjustments(date, newAdj);
    toast.success(`${mealLabel} target updated!`);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Edit {mealLabel} Target</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Calories</label>
            <Input
              type="number"
              value={cal}
              onChange={e => setCal(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Protein (g)</label>
            <Input
              type="number"
              value={protein}
              onChange={e => setProtein(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Carbs (g)</label>
              <Input
                type="number"
                value={carbs}
                onChange={e => setCarbs(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Fat (g)</label>
              <Input
                type="number"
                value={fat}
                onChange={e => setFat(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          {exceedsDaily && (
            <p className="text-[11px] text-destructive font-medium">
              ⚠️ This exceeds 60% of your daily calorie goal ({profile.dailyCalories} kcal). Are you sure?
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] transition-transform">
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
