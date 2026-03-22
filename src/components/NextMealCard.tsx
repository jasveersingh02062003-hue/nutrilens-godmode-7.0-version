import { useMemo } from 'react';
import { Utensils, Zap, DollarSign, Beef } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentMealSlot, getRecipesForMeal, getRemainingMealBudget, type SuggestedRecipe } from '@/lib/meal-suggestion-engine';
import { getDailyLog, getDailyTotals, getTodayKey, type UserProfile } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { addMealToLog } from '@/lib/daily-log-sync';
import { toast } from 'sonner';

interface Props {
  profile: UserProfile;
  onRefresh?: () => void;
}

export default function NextMealCard({ profile, onRefresh }: Props) {
  const navigate = useNavigate();

  const suggestion = useMemo(() => {
    const slot = getCurrentMealSlot();
    const today = getTodayKey();
    const log = getDailyLog(today);
    const totals = getDailyTotals(log);

    // Check if slot already logged
    const alreadyLogged = log.meals.some(m => m.type === slot);
    if (alreadyLogged) return null;

    const remainingCal = Math.max(0, profile.dailyCalories - totals.calories);
    const remainingProt = Math.max(0, profile.dailyProtein - totals.protein);
    const remainingBudget = getRemainingMealBudget(slot);

    if (remainingCal <= 0) return null;

    const recipes = getRecipesForMeal(slot, remainingBudget, profile, remainingCal, remainingProt);
    if (recipes.length === 0) return null;

    return { recipe: recipes[0], slot, remainingBudget, remainingCal, remainingProt };
  }, [profile]);

  if (!suggestion) return null;

  const { recipe, slot, remainingBudget } = suggestion;
  const slotLabel = slot === 'snack' ? 'Snack' : slot.charAt(0).toUpperCase() + slot.slice(1);

  const handleLog = () => {
    navigate('/log-food', { state: { prefill: { name: recipe.name, calories: recipe.calories, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat, cost: recipe.estimatedCost, mealType: slot } } });
    toast.success(`Logging ${recipe.name}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Utensils className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Next: {slotLabel}</p>
          <p className="text-[10px] text-muted-foreground">₹{remainingBudget} budget left</p>
        </div>
      </div>

      <div className="rounded-xl bg-muted/50 p-3">
        <p className="text-sm font-bold text-foreground mb-1">{recipe.emoji || '🍽️'} {recipe.name}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{recipe.calories} kcal</span>
          <span className="flex items-center gap-0.5"><Beef className="w-3 h-3" />{recipe.protein}g protein</span>
          <span className="flex items-center gap-0.5">₹{recipe.estimatedCost}</span>
          <span className="text-primary font-semibold">Satiety {recipe.satietyScore.toFixed(1)}</span>
        </div>
      </div>

      <button
        onClick={handleLog}
        className="mt-3 w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-[0.97] transition-transform"
      >
        Log This Meal
      </button>
    </motion.div>
  );
}