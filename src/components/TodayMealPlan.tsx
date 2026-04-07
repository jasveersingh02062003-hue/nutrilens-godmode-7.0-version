import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { useState, useMemo } from 'react';
import { ChefHat, ArrowRight, Check, Clock, Flame, ChevronDown, IndianRupee, Repeat, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMealPlannerProfile, getWeekPlan, getCurrentWeekStart, markMealCooked } from '@/lib/meal-planner-store';
import { getRecipeById, getEnrichedRecipe } from '@/lib/recipes';
import { getRecipeImage } from '@/lib/recipe-images';
import { getRecipeCost } from '@/lib/recipe-cost';
import { getUnifiedBudget } from '@/lib/budget-engine';
import { getScaledMealInfo } from '@/lib/meal-scale';
import { saveManualExpense } from '@/lib/expense-store';
import { deductRecipeFromPantry } from '@/lib/pantry-deduction';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import SwapNudgeCard from '@/components/SwapNudgeCard';
import { toast } from 'sonner';

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function TodayMealPlan() {
  const navigate = useNavigate();
  const profile = getMealPlannerProfile();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const [isExpanded, setIsExpanded] = useState(false);
  const [loggedMeals, setLoggedMeals] = useState<Set<string>>(() => {
    const saved = scopedGet('nutrilens_home_logged_meals_' + today);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const plan = useMemo(() => {
    if (!profile?.onboardingComplete) return null;
    return getWeekPlan(getCurrentWeekStart());
  }, [profile]);

  const todayPlan = useMemo(() => {
    if (!plan) return null;
    return plan.days.find(d => d.date === today) || null;
  }, [plan, today]);

  const unified = useMemo(() => getUnifiedBudget(), []);

  // Memoize enriched recipes to avoid re-computing tags on every render
  const enrichedMap = useMemo(() => {
    if (!todayPlan) return new Map<string, ReturnType<typeof getEnrichedRecipe>>();
    const map = new Map<string, ReturnType<typeof getEnrichedRecipe>>();
    todayPlan.meals.forEach(m => {
      const recipe = getRecipeById(m.recipeId);
      if (recipe) map.set(recipe.id, getEnrichedRecipe(recipe));
    });
    return map;
  }, [todayPlan]);

  // Calculate total cost for today
  const totalCost = useMemo(() => {
    if (!todayPlan) return 0;
    let cost = 0;
    todayPlan.meals.forEach(m => {
      const info = getScaledMealInfo(m);
      if (info) cost += info.cost;
    });
    return cost;
  }, [todayPlan]);

  if (!todayPlan || !plan) {
    return (
      <button onClick={() => navigate('/planner')} className="card-subtle p-4 w-full text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Create a Meal Plan</p>
            <p className="text-xs text-muted-foreground">Get personalized meals for the week</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  const handleLogMeal = (recipeId: string, mealType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const recipe = getRecipeById(recipeId);
    if (!recipe) return;

    const cost = getRecipeCost(recipe);

    // Create expense
    saveManualExpense({
      id: `homeplan-${today}-${recipeId}-${Date.now()}`,
      date: today,
      amount: cost,
      currency: '₹',
      category: 'home',
      description: `${MEAL_LABELS[mealType] || mealType} – ${recipe.name}`,
      mealId: recipe.id,
      type: 'meal',
    });

    // Mark as cooked
    markMealCooked(plan.weekStart, today, recipeId);

    // Auto-deduct from pantry
    const result = deductRecipeFromPantry(recipeId);
    if (result.missingItems.length > 0 && result.deductions.length > 0) {
      toast.success(`Logged ${recipe.name} · ₹${cost}`, {
        description: `${result.missingItems.length} ingredient(s) not in pantry`,
      });
    } else {
      toast.success(`Logged ${recipe.name} · ₹${cost}`);
    }

    // Track logged meal
    const newLogged = new Set(loggedMeals);
    newLogged.add(recipeId);
    setLoggedMeals(newLogged);
    scopedSet('nutrilens_home_logged_meals_' + today, JSON.stringify([...newLogged]));

    window.dispatchEvent(new Event('storage'));
  };

  const mealsCount = todayPlan.meals.length;
  const cookedCount = todayPlan.meals.filter(m => m.cooked || loggedMeals.has(m.recipeId)).length;

  function getMealBudget(mealType: string): number {
    const slotKey = (mealType === 'snack' ? 'snacks' : mealType) as keyof typeof unified.perMeal;
    return unified.perMeal[slotKey] || 0;
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="card-subtle overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-foreground">Today's Plan</p>
                <p className="text-[11px] text-muted-foreground">
                  {mealsCount} meals · {cookedCount} logged · <span className="font-semibold text-accent">~₹{totalCost}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/planner'); }}
                className="text-[11px] text-primary font-semibold flex items-center gap-0.5"
              >
                Full Plan <ArrowRight className="w-3 h-3" />
              </button>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {todayPlan.meals.map(meal => {
              const scaled = getScaledMealInfo(meal);
              if (!scaled) return null;
              const recipe = scaled.recipe;
              const imageUrl = getRecipeImage(recipe.id, meal.mealType);
              const cost = scaled.cost;
              const mealBudget = getMealBudget(meal.mealType);
              const overBudget = mealBudget > 0 && cost > mealBudget;
              const isLogged = meal.cooked || loggedMeals.has(meal.recipeId);

              return (
                <div
                  key={meal.recipeId}
                  className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl bg-muted/50 transition-colors"
                >
                  <button onClick={() => navigate('/planner')} className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs">{MEAL_EMOJI[meal.mealType]}</span>
                      <p className="font-semibold text-xs text-foreground truncate">{recipe.name}</p>
                      {overBudget && <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />}
                      {(() => {
                        const enriched = enrichedMap.get(recipe.id);
                        if (!enriched) return null;
                        const badge = enriched.tags.includes('no_cook') ? '⚡ Zero-cook'
                          : enriched.tags.includes('portable') ? '🚗 Portable'
                          : enriched.tags.includes('cooling') ? '🌡️ Cooling'
                          : null;
                        return badge ? (
                          <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {badge}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 text-coral" />{scaled.calories} kcal</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{recipe.prepTime + recipe.cookTime}m</span>
                      <span className={`flex items-center gap-0.5 font-semibold ${overBudget ? 'text-destructive' : 'text-accent'}`}>
                        ₹{cost}
                        {mealBudget > 0 && (
                          <span className="text-muted-foreground font-normal">/{mealBudget}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isLogged ? (
                      <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleLogMeal(meal.recipeId, meal.mealType, e)}
                          className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors"
                        >
                          Log
                        </button>
                        {overBudget && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/planner'); }}
                            className="px-2 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold"
                          >
                            <Repeat className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {todayPlan.meals.map(meal => {
              const scaled = getScaledMealInfo(meal);
              if (!scaled) return null;
              const recipe = scaled.recipe;
              const cost = scaled.cost;
              const isLogged = meal.cooked || loggedMeals.has(meal.recipeId);

              return (
                <div key={meal.recipeId}>
                  {/* existing meal card is above, swap nudge below */}
                  {!isLogged && cost > 0 && scaled.protein > 0 && (
                    <SwapNudgeCard
                      mealName={recipe.name}
                      mealCost={cost}
                      mealProtein={scaled.protein}
                    />
                  )}
                </div>
              );
            })}
                <IndianRupee className="w-3 h-3" /> Today's estimated cost
              </span>
              <span className="text-xs font-bold text-accent">₹{totalCost}</span>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}