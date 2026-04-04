import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, X, Check, SkipForward } from 'lucide-react';
import { getProfile, toLocalDateKey, getDailyLog, addMealToLog, type MealEntry, type FoodItem } from '@/lib/store';
import { isGymDay } from '@/lib/gym-service';
import { getPostWorkoutSuggestion } from '@/lib/gym-meal-engine';
import { toast } from 'sonner';

export default function PostWorkoutCard() {
  const profile = getProfile();
  const today = toLocalDateKey(new Date());
  const log = getDailyLog(today);
  const [dismissed, setDismissed] = useState(false);

  // Get actual duration/intensity from today's gym log for scaling
  const actualDuration = log.gym?.durationMinutes;
  const actualIntensity = log.gym?.intensity;

  const suggestion = useMemo(
    () => getPostWorkoutSuggestion(profile, actualDuration, actualIntensity),
    [profile, actualDuration, actualIntensity]
  );

  if (!profile?.gym?.goer || !isGymDay(profile, today) || dismissed) return null;
  if (!log.gym?.attended) return null; // only show after gym check-in "Yes"
  if (!suggestion) return null;

  const handleLogMeal = () => {
    // Create a meal entry from the suggestion and log it in one tap
    const mealItems: FoodItem[] = suggestion.items.map((item, i) => ({
      id: `post-workout-${Date.now()}-${i}`,
      name: item,
      calories: Math.round(suggestion.calories / suggestion.items.length),
      protein: Math.round(suggestion.protein / suggestion.items.length),
      carbs: 0,
      fat: 0,
      quantity: 1,
      unit: 'serving',
      confidenceScore: 0.7,
    }));

    const now = new Date();
    const meal: MealEntry = {
      id: `post-workout-${Date.now()}`,
      type: now.getHours() < 11 ? 'breakfast' : now.getHours() < 15 ? 'lunch' : 'dinner',
      items: mealItems,
      totalCalories: suggestion.calories,
      totalProtein: suggestion.protein,
      totalCarbs: 0,
      totalFat: 0,
      time: now.toTimeString().slice(0, 5),
    };

    addMealToLog(meal);
    setDismissed(true);
    toast.success(`🍽️ Meal logged! +${suggestion.protein}g protein`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-4 space-y-3 border-l-4 border-l-green-500"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Recovery Meal 🍽️</p>
            <p className="text-[10px] text-muted-foreground">
              Great workout! Refuel for recovery · {suggestion.timing}
              {actualDuration && actualDuration !== 45 && ` · Scaled for ${actualDuration}min`}
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-green-500/5 border border-green-500/15 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-foreground mb-1.5">{suggestion.title}</p>
        <div className="flex flex-wrap gap-1.5">
          {suggestion.items.map((item, i) => (
            <span key={i} className="text-[11px] bg-background px-2.5 py-1 rounded-full text-muted-foreground border border-border">
              {item}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-muted-foreground">~{suggestion.calories} kcal</span>
          <span className="text-[10px] text-muted-foreground">~{suggestion.protein}g protein</span>
        </div>
      </div>

      {suggestion.tip && (
        <p className="text-[10px] text-muted-foreground italic">💡 {suggestion.tip}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleLogMeal}
          className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> Log This Meal
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="py-2.5 px-4 rounded-xl bg-muted text-muted-foreground text-xs font-semibold flex items-center gap-1"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip
        </button>
      </div>
    </motion.div>
  );
}
