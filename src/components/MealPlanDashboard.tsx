import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkAllergens, getAllergenLabel, getAllergenEmoji } from '@/lib/allergen-engine';
import { checkFoodForConditions, getUserConditions } from '@/lib/condition-coach';
import { RefreshCw, ShoppingCart, Clock, Flame, Beef, Wheat, Droplets, ArrowRight, Check, Repeat, IndianRupee, AlertCircle, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Scale } from 'lucide-react';
import { getSwapAlternatives } from '@/lib/swap-engine';
import { buildFromRecipe, type CompareItem } from '@/lib/compare-helpers';
import ComparisonSheet from './ComparisonSheet';
import { WeekPlan, DayPlan, PlannedMeal } from '@/lib/meal-planner-store';
import { MealPlannerProfile } from '@/lib/meal-planner-store';
import { getRecipeById, getEnrichedRecipe, Recipe } from '@/lib/recipes';
import { generateShoppingList } from '@/lib/meal-plan-generator';
import { getRecipeImage } from '@/lib/recipe-images';
import { getRecipeCost } from '@/lib/recipe-cost';
import { computePES, getMealTargetCalories } from '@/lib/pes-engine';
import { getBudgetSummary } from '@/lib/budget-service';
import { calculatePortions } from '@/lib/portion-engine';
import { getUnifiedBudget, validateBudgetVsGoals } from '@/lib/budget-engine';
import { saveManualExpense } from '@/lib/expense-store';
import { getScaledMealInfo } from '@/lib/meal-scale';
import { validatePlanFeasibility, validateDaySync } from '@/lib/plan-validator';
import { deductRecipeFromPantry } from '@/lib/pantry-deduction';
import RecipeDetail from './RecipeDetail';
import ShoppingList from './ShoppingList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Props {
  plan: WeekPlan;
  profile: MealPlannerProfile;
  onRegenerate: () => void;
  onSwapMeal: (date: string, recipeId: string) => void;
  onMarkCooked: (date: string, recipeId: string) => void;
  onUpdateBudget?: (newMonthly: number) => void;
  onUpdateProteinTarget?: (newProtein: number) => void;
}

const MEAL_LABELS: Record<string, { label: string; emoji: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅' },
  lunch: { label: 'Lunch', emoji: '☀️' },
  dinner: { label: 'Dinner', emoji: '🌙' },
  snack: { label: 'Snack', emoji: '🍎' },
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MealPlanDashboard({ plan, profile, onRegenerate, onSwapMeal, onMarkCooked, onUpdateBudget, onUpdateProteinTarget }: Props) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const idx = plan.days.findIndex(d => d.date === today);
    return idx >= 0 ? idx : 0;
  });
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showShopping, setShowShopping] = useState(false);
  const [showLogConfirm, setShowLogConfirm] = useState(false);
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [loggedDays, setLoggedDays] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('nutrilens_logged_meal_days');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const currentDay = plan.days[selectedDayIdx];
  const shoppingList = useMemo(() => generateShoppingList(plan), [plan]);
  const weeklySummary = useMemo(() => getBudgetSummary('week'), [loggedDays]);
  const unifiedBudget = useMemo(() => getUnifiedBudget(), []);

  // Per-meal budget limits
  const perMealBudget = unifiedBudget.perMeal;

  function getMealBudget(mealType: string): number {
    if (mealType === 'breakfast') return perMealBudget.breakfast;
    if (mealType === 'lunch') return perMealBudget.lunch;
    if (mealType === 'dinner') return perMealBudget.dinner;
    if (mealType === 'snack') return perMealBudget.snacks;
    return 0;
  }

  // Calculate weekly plan cost
  const weeklyPlanCost = useMemo(() => {
    let total = 0;
    for (const day of plan.days) {
      for (const meal of day.meals) {
        const info = getScaledMealInfo(meal);
        if (info) total += info.cost;
      }
    }
    return total;
  }, [plan]);

  // Feasibility warning — use real budget engine validation
  const feasibilityResult = useMemo(() => {
    try {
      return validateBudgetVsGoals(
        unifiedBudget.monthly,
        profile.dailyCalories,
        profile.dailyProtein || 60
      );
    } catch { return null; }
  }, [profile, unifiedBudget]);
  const feasibilityWarning = feasibilityResult?.warning || null;
  const feasibilitySeverity = feasibilityResult?.severity || 'ok';

  if (selectedRecipe) {
    return <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  if (showShopping) {
    return <ShoppingList list={shoppingList} onBack={() => setShowShopping(false)} />;
  }

  // Use unified budget for weekly display instead of raw weeklySummary
  const weeklyBudgetFromMonthly = Math.round(unifiedBudget.monthly / 4.33);
  const budgetPct = weeklyBudgetFromMonthly > 0 ? Math.min(100, Math.round((weeklySummary.spent / weeklyBudgetFromMonthly) * 100)) : 0;
  const barColor = budgetPct > 90 ? 'bg-destructive' : budgetPct > 70 ? 'bg-accent' : 'bg-primary';

  const isDayLogged = currentDay ? loggedDays.has(currentDay.date) : false;

  const handleCompare = (recipeId: string, mealType: string) => {
    const original = getRecipeById(recipeId);
    if (!original) return;
    const alts = getSwapAlternatives(recipeId, mealType);
    const items: CompareItem[] = [buildFromRecipe(original)];
    alts.slice(0, 2).forEach(a => items.push(buildFromRecipe(a.recipe)));
    if (items.length < 2) { toast.info('No alternatives found to compare'); return; }
    setCompareItems(items);
    setShowCompare(true);
  };

  const handleLogAllMeals = () => {
    if (!currentDay) return;
    setShowLogConfirm(true);
  };

  const confirmLogAllMeals = () => {
    if (!currentDay) return;
    
    for (const meal of currentDay.meals) {
      const recipe = getRecipeById(meal.recipeId);
      if (!recipe) continue;
      const cost = getRecipeCost(recipe);
      
      saveManualExpense({
        id: `mealplan-${currentDay.date}-${meal.recipeId}-${Date.now()}`,
        date: currentDay.date,
        amount: cost,
        currency: '₹',
        category: 'home',
        description: `${MEAL_LABELS[meal.mealType]?.label || meal.mealType} – ${recipe.name}`,
        mealId: recipe.id,
        type: 'meal',
      });

      // Mark as cooked and deduct from pantry
      onMarkCooked(currentDay.date, meal.recipeId);
      deductRecipeFromPantry(meal.recipeId);
    }

    const newLogged = new Set(loggedDays);
    newLogged.add(currentDay.date);
    setLoggedDays(newLogged);
    localStorage.setItem('nutrilens_logged_meal_days', JSON.stringify([...newLogged]));
    
    setShowLogConfirm(false);
    toast.success(`Logged ${currentDay.meals.length} meals as expenses`);
    window.dispatchEvent(new Event('storage'));
  };

  // Day totals
  let dayTotalCal = 0, dayTotalP = 0, dayTotalC = 0, dayTotalF = 0, dayTotalCost = 0;
  if (currentDay) {
    currentDay.meals.forEach(m => {
      const info = getScaledMealInfo(m);
      if (info) {
        dayTotalCal += info.calories;
        dayTotalP += info.protein;
        dayTotalC += info.carbs;
        dayTotalF += info.fat;
        dayTotalCost += info.cost;
      }
    });
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Meal Plan</h1>
            <p className="text-xs text-muted-foreground">Personalized for {profile.name || 'you'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowShopping(true)} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={onRegenerate} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Budget Bar */}
        {weeklyBudgetFromMonthly > 0 && (
          <div className="card-subtle p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-foreground">Weekly Budget (from ₹{unifiedBudget.monthly.toLocaleString()}/mo)</span>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">
                ₹{Math.max(0, weeklyBudgetFromMonthly - weeklySummary.spent).toLocaleString()} left
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${budgetPct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Spent: ₹{weeklySummary.spent.toLocaleString()} · Daily limit: ₹{Math.round(unifiedBudget.daily)}</span>
              <span>Plan cost: ~₹{weeklyPlanCost.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Feasibility Warning */}
        {feasibilityWarning && (
          <div className={`px-3 py-2.5 rounded-xl border ${
            feasibilitySeverity === 'insufficient' 
              ? 'bg-destructive/8 border-destructive/15' 
              : 'bg-accent/10 border-accent/20'
          }`}>
            <div className="flex items-start gap-2">
              {feasibilitySeverity === 'insufficient' 
                ? <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={`text-[11px] font-medium leading-snug ${
                  feasibilitySeverity === 'insufficient' ? 'text-destructive' : 'text-accent-foreground'
                }`}>{feasibilityWarning}</p>
                {feasibilityResult?.minMonthly && feasibilitySeverity === 'insufficient' && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Recommended minimum: ₹{feasibilityResult.minMonthly.toLocaleString()}/month (₹{feasibilityResult.minDaily}/day)
                  </p>
                )}
              </div>
            </div>
            {/* Actionable buttons for insufficient budget */}
            {feasibilitySeverity === 'insufficient' && feasibilityResult?.minMonthly && (
              <div className="flex gap-2 mt-2.5 pt-2 border-t border-destructive/10">
                {onUpdateBudget && (
                  <button
                    onClick={() => onUpdateBudget(feasibilityResult.minMonthly!)}
                    className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    <TrendingUp className="w-3 h-3" /> Increase to ₹{feasibilityResult.minMonthly.toLocaleString()}/mo
                  </button>
                )}
                {onUpdateProteinTarget && (
                  <button
                    onClick={() => {
                      // Estimate achievable protein: use cost constant
                      const achievable = Math.round(unifiedBudget.daily * 0.7 / 0.23);
                      onUpdateProteinTarget(Math.min(profile.dailyProtein || 60, achievable));
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    Reduce protein target
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Daily targets */}
        <div className="card-subtle p-3">
          <div className="flex justify-between">
            <div className="text-center flex-1">
              <Flame className="w-4 h-4 text-coral mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{profile.dailyCalories}</p>
              <p className="text-[10px] text-muted-foreground">kcal</p>
            </div>
            <div className="text-center flex-1">
              <Beef className="w-4 h-4 text-coral mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{profile.dailyProtein}g</p>
              <p className="text-[10px] text-muted-foreground">Protein</p>
            </div>
            <div className="text-center flex-1">
              <Wheat className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{profile.dailyCarbs}g</p>
              <p className="text-[10px] text-muted-foreground">Carbs</p>
            </div>
            <div className="text-center flex-1">
              <Droplets className="w-4 h-4 text-gold mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{profile.dailyFat}g</p>
              <p className="text-[10px] text-muted-foreground">Fat</p>
            </div>
          </div>
        </div>

        {/* Day selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {plan.days.map((day, idx) => {
            const d = new Date(day.date + 'T00:00:00');
            const isToday = day.date === `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
            const active = idx === selectedDayIdx;
            const isLogged = loggedDays.has(day.date);
            let dayCal = 0, dayProt = 0, dayCost = 0;
            day.meals.forEach(m => {
              const info = getScaledMealInfo(m);
              if (info) { dayCal += info.calories; dayProt += info.protein; dayCost += info.cost; }
            });
            // Day health status
            const calOk = profile.dailyCalories > 0 ? dayCal >= profile.dailyCalories * 0.8 && dayCal <= profile.dailyCalories * 1.2 : true;
            const protOk = (profile.dailyProtein || 60) > 0 ? dayProt >= (profile.dailyProtein || 60) * 0.8 : true;
            const budgetOk = unifiedBudget.daily > 0 ? dayCost <= unifiedBudget.daily * 1.15 : true;
            const issueCount = [calOk, protOk, budgetOk].filter(x => !x).length;
            const dotColor = issueCount === 0 ? 'bg-primary' : issueCount === 1 ? 'bg-accent' : 'bg-destructive';
            return (
              <button key={day.date} onClick={() => setSelectedDayIdx(idx)}
                className={`flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[3.2rem] border transition-all ${active ? 'bg-primary text-primary-foreground border-primary shadow-fab' : isToday ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'}`}>
                <span className="text-[10px] font-medium">{DAYS[idx]}</span>
                <span className="text-base font-bold">{d.getDate()}</span>
                <span className={`text-[8px] font-semibold ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>₹{dayCost}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {isLogged ? (
                    <CheckCircle2 className={`w-2.5 h-2.5 ${active ? 'text-primary-foreground' : 'text-primary'}`} />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-primary-foreground/60' : dotColor}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Meals for selected day */}
        <AnimatePresence mode="wait">
          <motion.div key={selectedDayIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            {currentDay?.meals.map((meal, idx) => {
              const scaled = getScaledMealInfo(meal);
              if (!scaled) return null;
              const recipe = scaled.recipe;
              const info = MEAL_LABELS[meal.mealType] || { label: meal.mealType, emoji: '🍽️' };
              const imageUrl = getRecipeImage(recipe.id, meal.mealType);
              const cost = scaled.cost;
              const mealBudget = getMealBudget(meal.mealType);
              const withinBudget = mealBudget <= 0 || cost <= mealBudget;
              const overAmount = mealBudget > 0 ? cost - mealBudget : 0;

              return (
                <motion.div key={meal.recipeId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                  className="card-elevated overflow-hidden">
                  {/* Recipe image */}
                  <div className="relative h-36 overflow-hidden">
                    <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm">
                      <span className="text-xs">{info.emoji}</span>
                      <span className="text-[10px] font-semibold text-foreground uppercase tracking-wide">{info.label}</span>
                      {mealBudget > 0 && (
                        <span className="text-[9px] text-muted-foreground">(Budget ₹{mealBudget})</span>
                      )}
                    </div>
                    {/* Cost badge with budget status */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {meal.cooked && (
                        <span className="px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Cooked
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold backdrop-blur-sm flex items-center gap-1 ${
                        withinBudget 
                          ? 'bg-primary/90 text-primary-foreground' 
                          : 'bg-destructive/90 text-destructive-foreground'
                      }`}>
                        ₹{cost} {mealBudget > 0 && (withinBudget ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />)}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-3 right-3">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-white truncate">{recipe.name}</h3>
                        {(() => {
                          const userAllergens = (profile as any)?.allergens || [];
                          const userConds = getUserConditions(profile as any);
                          const allergenCheck = checkAllergens(recipe.name, userAllergens);
                          const condWarnings = checkFoodForConditions(recipe.name, userConds);
                          
                          return (
                            <>
                              {allergenCheck.hasConflict && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/90 text-[9px] font-bold text-white animate-scale-in shrink-0"
                                  title={allergenCheck.matched.map(a => getAllergenLabel(a)).join(', ')}>
                                  ⚠️ {allergenCheck.matched.map(a => getAllergenLabel(a)).join(', ')}
                                </span>
                              )}
                              {condWarnings.length > 0 && !allergenCheck.hasConflict && (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shrink-0 animate-scale-in ${
                                  condWarnings.some(w => w.severity === 'high') ? 'bg-destructive/90' : 'bg-orange-500/90'
                                }`} title={condWarnings.map(w => w.text).join(', ')}>
                                  {condWarnings[0].icon} {condWarnings[0].condition}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-[10px] text-white/80">
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{scaled.calories} kcal</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.prepTime + recipe.cookTime}m</span>
                        <span className="capitalize">{recipe.difficulty}</span>
                        {scaled.scale !== 1 && <span className="text-white/60">{scaled.scale}x</span>}
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    {/* Over budget warning */}
                    {!withinBudget && overAmount > 0 && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-destructive/8 border border-destructive/15 mb-2">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                        <span className="text-[10px] text-destructive font-medium">
                          ₹{overAmount} over meal budget
                        </span>
                        <button
                          onClick={() => onSwapMeal(currentDay.date, meal.recipeId)}
                          className="ml-auto text-[10px] font-bold text-primary"
                        >
                          ⚡ Try Swap
                        </button>
                      </div>
                    )}

                    {/* Macro bars + PES badge */}
                    <div className="flex items-center gap-3">
                      {[
                        { label: 'Protein', val: scaled.protein, color: 'bg-coral' },
                        { label: 'Carbs', val: scaled.carbs, color: 'bg-primary' },
                        { label: 'Fat', val: scaled.fat, color: 'bg-gold' },
                      ].map(m => (
                        <div key={m.label} className="flex items-center gap-1.5 text-[10px]">
                          <div className={`w-1.5 h-1.5 rounded-full ${m.color}`} />
                          <span className="text-muted-foreground">{m.label}: {m.val}g</span>
                        </div>
                      ))}
                      {(() => {
                        const enriched = getEnrichedRecipe(recipe);
                        const targetCal = getMealTargetCalories(meal.mealType, profile);
                        const pesScore = computePES(enriched, { targetCalories: targetCal, budgetPerMeal: getMealBudget(meal.mealType) });
                        const pesEmoji = pesScore >= 0.65 ? '🟢' : pesScore >= 0.4 ? '🟡' : '🔴';
                        return (
                          <span className="ml-auto text-[10px] font-semibold text-muted-foreground" title={`PES: ${(pesScore * 100).toFixed(0)}`}>
                            {pesEmoji} {(pesScore * 100).toFixed(0)}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Scaled portions */}
                    {recipe.ingredients?.length > 0 && (() => {
                      const mealCalSplit: Record<string, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
                      const targetCal = Math.round(profile.dailyCalories * (mealCalSplit[meal.mealType] || 0.25));
                      const portions = calculatePortions(recipe, targetCal);
                      const topIngredients = portions.ingredients.filter(i => i.scaledGrams > 0).slice(0, 4);
                      if (topIngredients.length === 0) return null;
                      return (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {topIngredients.map(i => `${i.name}: ${i.displayQuantity}`).join(' · ')}
                        </p>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setSelectedRecipe(recipe)}
                        className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5">
                        View Recipe <ArrowRight className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleCompare(meal.recipeId, meal.mealType)}
                        className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold flex items-center gap-1.5">
                        <Scale className="w-3 h-3" /> Compare
                      </button>
                      <button onClick={() => onSwapMeal(currentDay.date, meal.recipeId)}
                        className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold flex items-center gap-1.5">
                        <Repeat className="w-3 h-3" /> Swap
                      </button>
                      {!meal.cooked && (
                        <button onClick={() => onMarkCooked(currentDay.date, meal.recipeId)}
                          className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5">
                          <Check className="w-3 h-3" /> Done
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Day totals with status indicators */}
            {currentDay && (() => {
              const calPct = profile.dailyCalories > 0 ? dayTotalCal / profile.dailyCalories : 1;
              const protPct = (profile.dailyProtein || 60) > 0 ? dayTotalP / (profile.dailyProtein || 60) : 1;
              const budgetOver = unifiedBudget.daily > 0 ? dayTotalCost / unifiedBudget.daily : 0;
              const calOk = calPct >= 0.8 && calPct <= 1.2;
              const protOk = protPct >= 0.8;
              const budgetOk = budgetOver <= 1.15;
              const allGood = calOk && protOk && budgetOk;
              const statusColor = allGood ? 'border-primary/20' : (!protOk || !calOk) ? 'border-destructive/20' : 'border-accent/20';
              
              return (
                <div className={`card-subtle p-3 mt-2 border ${statusColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">Day Total</p>
                    {allGood ? (
                      <span className="text-[10px] font-bold text-primary flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> On track</span>
                    ) : (
                      <span className="text-[10px] font-bold text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Needs attention</span>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={`font-bold ${calOk ? 'text-foreground' : 'text-destructive'}`}>{dayTotalCal} kcal</span>
                    <span className="text-muted-foreground">
                      <span className={protOk ? '' : 'text-destructive font-bold'}>P: {dayTotalP}g</span> · C: {dayTotalC}g · F: {dayTotalF}g
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1.5 pt-1.5 border-t border-border">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" /> Cost: ₹{dayTotalCost} / ₹{Math.round(unifiedBudget.daily)} budget
                    </span>
                    <span className={`font-bold ${budgetOk ? 'text-accent' : 'text-destructive'}`}>
                      {budgetOk ? `₹${Math.max(0, Math.round(unifiedBudget.daily) - dayTotalCost)} left` : `₹${dayTotalCost - Math.round(unifiedBudget.daily)} over`}
                    </span>
                  </div>
                  {/* Specific warnings */}
                  {(!calOk || !protOk) && (
                    <div className="mt-2 pt-1.5 border-t border-border space-y-1">
                      {!calOk && calPct < 0.8 && (
                        <p className="text-[10px] text-destructive">⚠️ {Math.round((1 - calPct) * profile.dailyCalories)} kcal below target</p>
                      )}
                      {!protOk && (
                        <p className="text-[10px] text-destructive">⚠️ Protein {Math.round((profile.dailyProtein || 60) - dayTotalP)}g below target ({Math.round(protPct * 100)}%)</p>
                      )}
                      {!budgetOk && (
                        <p className="text-[10px] text-accent">⚠️ Budget exceeded by ₹{dayTotalCost - Math.round(unifiedBudget.daily)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Log All Meals Button */}
            {currentDay && !isDayLogged && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleLogAllMeals}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition-transform"
              >
                <Check className="w-4 h-4" /> Log All Meals · ₹{dayTotalCost}
              </motion.button>
            )}

            {isDayLogged && (
              <div className="flex items-center justify-center gap-2 py-3 text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-semibold">All meals logged for this day</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Log confirmation dialog */}
      <AlertDialog open={showLogConfirm} onOpenChange={setShowLogConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Log all meals for today?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {currentDay?.meals.length} meals totaling ₹{dayTotalCost} will be added to your expenses and budget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogAllMeals} className="rounded-xl bg-primary text-primary-foreground">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ComparisonSheet
        open={showCompare}
        onClose={() => setShowCompare(false)}
        items={compareItems}
        onPick={(item) => {
          if (currentDay && item.id.startsWith('recipe-')) {
            const pickedRecipeId = item.id.replace('recipe-', '');
            const currentMeal = currentDay.meals.find(m => compareItems[0]?.id === `recipe-${m.recipeId}`);
            if (currentMeal && pickedRecipeId !== currentMeal.recipeId) {
              onSwapMeal(currentDay.date, pickedRecipeId);
            }
          }
        }}
      />
    </div>
  );
}