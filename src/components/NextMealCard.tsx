import { useMemo, useState, memo } from 'react';
import { Utensils, Zap, Beef, ChevronRight, Home, RefreshCw } from 'lucide-react';
import { getPESForMeal } from '@/lib/pes-engine';
import PESBadge from '@/components/PESBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentMealSlot, getRecipesForMeal, getRemainingMealBudget, type SuggestedRecipe } from '@/lib/meal-suggestion-engine';
import { getDailyLog, getDailyTotals, getTodayKey, type UserProfile } from '@/lib/store';
import { useNavigate } from 'react-router-dom';

interface Props {
  profile: UserProfile;
  onRefresh?: () => void;
}

export default memo(function NextMealCard({ profile }: Props) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const suggestions = useMemo(() => {
    const slot = getCurrentMealSlot();
    const today = getTodayKey();
    const log = getDailyLog(today);
    const totals = getDailyTotals(log);

    const alreadyLogged = log.meals.some(m => m.type === slot);
    if (alreadyLogged) return null;

    const remainingCal = Math.max(0, profile.dailyCalories - totals.eaten);
    const remainingProt = Math.max(0, profile.dailyProtein - totals.protein);
    const remainingBudget = getRemainingMealBudget(slot);

    if (remainingCal <= 0) return null;

    const recipes = getRecipesForMeal(slot, remainingBudget, profile, remainingCal, remainingProt);
    if (recipes.length === 0) return null;

    return { recipes, slot, remainingBudget, remainingCal, remainingProt };
  }, [profile]);

  if (!suggestions) return null;

  const { recipes, slot, remainingBudget, remainingProt } = suggestions;
  const recipe = recipes[currentIndex % recipes.length];
  const slotLabel = slot === 'snack' ? 'Snack' : slot.charAt(0).toUpperCase() + slot.slice(1);

  const handleLog = () => {
    navigate('/log-food', { state: { prefill: { name: recipe.name, calories: recipe.calories, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat, cost: recipe.estimatedCost, mealType: slot } } });
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % recipes.length);
  };

  const hasPantryMatch = (recipe.pantryMatchRatio ?? 0) > 0.3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Utensils className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Next: {slotLabel}</p>
            <p className="text-[10px] text-muted-foreground">₹{remainingBudget} budget left</p>
          </div>
        </div>
        {remainingProt > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Need {remainingProt}g protein
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl bg-muted/50 p-3"
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-bold text-foreground mb-1">{recipe.emoji || '🍽️'} {recipe.name}</p>
            <div className="flex items-center gap-1">
              {recipe.contextBadge && (
                <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {recipe.contextBadge}
                </span>
              )}
              {hasPantryMatch && (
                <span className="flex items-center gap-0.5 text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  <Home className="w-2.5 h-2.5" />
                  {recipe.pantryMatchCount}/{recipe.totalIngredientCount} at home
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{recipe.calories} kcal</span>
            <span className="flex items-center gap-0.5"><Beef className="w-3 h-3" />{recipe.protein}g protein</span>
            <span>₹{recipe.estimatedCost}</span>
            {recipe.estimatedCost > 0 && (() => {
              const { pes, color } = getPESForMeal(recipe.estimatedCost, recipe.protein);
              return <PESBadge pes={pes} color={color} />;
            })()}
          </div>
          {recipe.matchReason && !hasPantryMatch && !recipe.contextBadge && (
            <p className="text-[9px] text-muted-foreground mt-1 italic">{recipe.matchReason}</p>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleLog}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-[0.97] transition-transform"
        >
          Log This Meal
        </button>
        {recipes.length > 1 && (
          <button
            onClick={handleNext}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground active:scale-[0.97] transition-transform flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {recipes.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {recipes.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex % recipes.length ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
});
