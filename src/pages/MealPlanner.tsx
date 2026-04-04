import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { isGymDay, markRestDay, unmarkRestDay, isRestDay } from '@/lib/gym-service';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChefHat, CalendarDays, ArrowLeft, ArrowRight, Check, ShoppingCart, Repeat, X, Search, Target, Scale, Crown, Lock, Zap, Dumbbell } from 'lucide-react';
import { isPremium } from '@/lib/subscription-service';
import UpgradeModal from '@/components/UpgradeModal';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import SeasonalPicksRow from '@/components/SeasonalPicksRow';
import MealPlanOnboarding from '@/components/MealPlanOnboarding';
import MealPlanDashboard from '@/components/MealPlanDashboard';
import MealPlannerTabs from '@/components/MealPlannerTabs';
import type { TabName } from '@/components/MealPlannerTabs';
import { getMealPlannerProfile, MealPlannerProfile, getWeekPlan, saveWeekPlan, markMealCooked, getCurrentWeekStart } from '@/lib/meal-planner-store';
import { generateWeekPlan, swapMeal } from '@/lib/meal-plan-generator';
import { getRecipeById, getRecipesByMealType } from '@/lib/recipes';
import SwapSimulatorSheet from '@/components/SwapSimulatorSheet';
import type { SwapImpact } from '@/lib/swap-engine';
import { getProfile as getUserProfile, type UserProfile } from '@/lib/store';
import { saveMealPlannerProfile } from '@/lib/meal-planner-store';
import { getRecipeImage } from '@/lib/recipe-images';
import { getEnhancedBudgetSettings } from '@/lib/budget-alerts';
import type { WeekPlan } from '@/lib/meal-planner-store';
import MonikaFab from '@/components/MonikaFab';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getActivePlan, getPlanById } from '@/lib/event-plan-service';

type PlannerStep = 'initial' | 'dates' | 'onboarding' | 'generating' | 'preview' | 'dashboard';

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (dateStr === today) return `Today, ${monthDay}`;
  if (dateStr === tomorrow) return `Tomorrow, ${monthDay}`;
  return `${dayName}, ${monthDay}`;
}

export default function MealPlanner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MealPlannerProfile | null>(getMealPlannerProfile());
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [step, setStep] = useState<PlannerStep>('initial');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  });
  const [swapTarget, setSwapTarget] = useState<{ date: string; recipeId: string; mealType: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['Budget', 'Meal Plan', 'Plans', 'Compare', 'Kitchen'].includes(tabParam)) {
      return tabParam as TabName;
    }
    return 'Budget';
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const premium = isPremium();
  const activePlanData = useMemo(() => getActivePlan(), []);
  const planMeta = activePlanData ? getPlanById(activePlanData.planId) : null;

  // Sync planner profile targets with main UserProfile to prevent mismatches
  useEffect(() => {
    if (profile?.onboardingComplete) {
      const mainProfile = getUserProfile();
      if (mainProfile) {
        let synced = false;
        const updated = { ...profile };
        if (mainProfile.dailyCalories && mainProfile.dailyCalories !== profile.dailyCalories) {
          updated.dailyCalories = mainProfile.dailyCalories;
          synced = true;
        }
        if (mainProfile.dailyProtein && mainProfile.dailyProtein !== profile.dailyProtein) {
          updated.dailyProtein = mainProfile.dailyProtein;
          synced = true;
        }
        if (mainProfile.dailyCarbs && mainProfile.dailyCarbs !== profile.dailyCarbs) {
          updated.dailyCarbs = mainProfile.dailyCarbs;
          synced = true;
        }
        if (mainProfile.dailyFat && mainProfile.dailyFat !== profile.dailyFat) {
          updated.dailyFat = mainProfile.dailyFat;
          synced = true;
        }
        if (synced) {
          saveMealPlannerProfile(updated);
          setProfile(updated);
        }
      }

      const weekStartStr = getCurrentWeekStart();
      let existing = getWeekPlan(weekStartStr);
      if (!existing) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('nutrilens_week_plan_')) {
            try {
              const candidate = JSON.parse(scopedGet(key)!);
              if (candidate?.days?.length > 0) {
                existing = candidate;
                break;
              }
            } catch {}
          }
        }
      }
      if (existing) {
        setPlan(existing);
        setStep('dashboard');
      }
    }
  }, [profile?.onboardingComplete]);

  const handleOnboardingComplete = (p: MealPlannerProfile) => {
    setProfile(p);
    setStep('generating');
    setTimeout(() => {
      const userProfile = getUserProfile();
      const newPlan = generateWeekPlan(p, userProfile?.healthConditions, userProfile?.womenHealth);
      saveWeekPlan(newPlan);
      setPlan(newPlan);
      setStep('preview');
    }, 2500);
  };

  const handleGenerateFromDates = () => {
    if (!profile) return;
    setStep('generating');
    setTimeout(() => {
      const userProfile = getUserProfile();
      const newPlan = generateWeekPlan(profile, userProfile?.healthConditions, userProfile?.womenHealth);
      saveWeekPlan(newPlan);
      setPlan(newPlan);
      setStep('preview');
    }, 2500);
  };

  const handleRegenerate = () => {
    if (!profile) return;
    setStep('generating');
    setTimeout(() => {
      const userProfile = getUserProfile();
      const newPlan = generateWeekPlan(profile, userProfile?.healthConditions, userProfile?.womenHealth);
      saveWeekPlan(newPlan);
      setPlan(newPlan);
      setStep('dashboard');
    }, 1500);
  };

  const handleSwapMeal = (date: string, recipeId: string) => {
    if (!plan) return;
    const day = plan.days.find(d => d.date === date);
    const meal = day?.meals.find(m => m.recipeId === recipeId);
    if (meal) {
      setSwapTarget({ date, recipeId, mealType: meal.mealType });
    }
  };

  const performSwap = (newRecipeId: string, impact?: { costDiff: number; proteinDiff: number }) => {
    if (!plan || !profile || !swapTarget) return;
    const updated = { ...plan, days: plan.days.map(d => d.date === swapTarget.date ? {
      ...d, meals: d.meals.map(m => m.recipeId === swapTarget.recipeId ? { ...m, recipeId: newRecipeId } : m)
    } : d) };
    saveWeekPlan(updated);
    setPlan({ ...updated });
    setSwapTarget(null);
    // Feedback toast
    if (impact) {
      const costMsg = impact.costDiff < 0 ? `₹${Math.abs(impact.costDiff)} saved` : impact.costDiff > 0 ? `₹${impact.costDiff} more` : '';
      const protMsg = impact.proteinDiff >= 0 ? 'Protein on track ✓' : '⚠ Protein low — add a snack';
      toast.success(`${costMsg}${costMsg ? ' · ' : ''}${protMsg}`);
    }
  };

  const handleMarkCooked = (date: string, recipeId: string) => {
    if (!plan) return;
    markMealCooked(plan.weekStart, date, recipeId);
    setPlan({ ...getWeekPlan(plan.weekStart)! });
  };

  const handleSavePlan = () => {
    setShowSuccess(true);
  };

  const handleConfirmSave = () => {
    setShowSuccess(false);
    setStep('dashboard');
    toast.success('Meal plan saved!');
  };

  // ====== GENERATING (full screen) ======
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
            className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <ChefHat className="w-10 h-10 text-primary" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground">Cooking up your personalized plan...</h2>
          <div className="mt-4 space-y-2">
            {['Analyzing your profile...', 'Selecting recipes...', 'Balancing nutrients...'].map((msg, i) => (
              <motion.p key={msg} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.6 }}
                className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3 text-primary" /> {msg}
              </motion.p>
            ))}
          </div>
          <div className="w-48 h-1.5 bg-muted rounded-full mx-auto mt-6 overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2.5 }} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ====== ONBOARDING (full screen, only for Meal Plan tab) ======
  if ((step === 'onboarding' || !profile?.onboardingComplete) && activeTab === 'Meal Plan') {
    return <MealPlanOnboarding onComplete={handleOnboardingComplete} />;
  }

  // ====== PREVIEW (full screen) ======
  if (step === 'preview' && plan) {
    const dateRange = plan.days.length > 0
      ? `${formatDate(plan.days[0].date).split(',')[1]?.trim()} – ${formatDate(plan.days[plan.days.length - 1].date).split(',')[1]?.trim()}`
      : '';

    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('dates')} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">Meal plan preview</h1>
                <SubscriptionBadge />
              </div>
              <p className="text-xs text-muted-foreground">{dateRange}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Here are the recipes we've chosen for your meal plan. Feel free to swap out any you don't like!</p>

          <div className="space-y-3">
            {plan.days.map(day => (
              <div key={day.date} className="card-subtle overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
                  <p className="text-xs font-bold text-foreground">{formatDate(day.date)}</p>
                </div>
                <div className="divide-y divide-border">
                  {day.meals.map(meal => {
                    const recipe = getRecipeById(meal.recipeId);
                    if (!recipe) return null;
                    const mealLabel = meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1);
                    return (
                      <div key={meal.recipeId} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={getRecipeImage(recipe.id, meal.mealType)} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{mealLabel}</p>
                          <p className="text-sm font-semibold text-foreground truncate">{recipe.name}</p>
                          <p className="text-[10px] text-muted-foreground">{recipe.calories} kcal · {recipe.prepTime + recipe.cookTime}m</p>
                        </div>
                        <button onClick={() => handleSwapMeal(day.date, meal.recipeId)}
                          className="px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold flex items-center gap-1 hover:bg-primary/10 hover:text-primary transition-colors">
                          <Zap className="w-3 h-3" /> Try Swap
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSavePlan}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition-transform">
            <Check className="w-4 h-4" /> Save Plan
          </button>
        </div>

        {/* Swap Simulator Sheet */}
        {swapTarget && (
          <SwapSimulatorSheet
            open={!!swapTarget}
            onClose={() => setSwapTarget(null)}
            originalRecipeId={swapTarget.recipeId}
            mealType={swapTarget.mealType}
            onApply={(recipeId, impact) => performSwap(recipeId, { costDiff: impact.costDiff, proteinDiff: impact.proteinDiff })}
          />
        )}

        {/* Success modal */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={handleConfirmSave}>
              <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-card rounded-3xl p-6 w-full max-w-sm text-center shadow-lg" onClick={e => e.stopPropagation()}>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Meal plan successfully saved</h3>
                <p className="text-sm text-muted-foreground mt-2">All ingredients have been added to your groceries</p>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleConfirmSave}
                    className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold">Close</button>
                  <button onClick={() => { handleConfirmSave(); navigate('/groceries'); }}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5" /> View Groceries
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <MonikaFab />
      </div>
    );
  }

  // ====== MAIN VIEW WITH TABS (always accessible) ======
  // Build the meal plan content based on current step
  let mealPlanContent: React.ReactNode;

  if (step === 'dashboard' && plan && profile) {
    mealPlanContent = (
      <>
        {activePlanData && planMeta && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-2.5 mb-3">
            <Target className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-foreground">Meals optimized for {planMeta.name}</p>
              <p className="text-[9px] text-muted-foreground truncate">{planMeta.rules.slice(0, 3).join(' · ')}</p>
            </div>
            <span className="text-lg">{planMeta.emoji}</span>
          </motion.div>
        )}
        <MealPlanDashboard plan={plan} profile={profile} onRegenerate={handleRegenerate} onSwapMeal={handleSwapMeal} onMarkCooked={handleMarkCooked} />
      </>
    );
  } else if (step === 'dates') {
    mealPlanContent = (
      <div className="space-y-4 animate-fade-in">
        <p className="text-sm text-muted-foreground">Select dates for your meal plan.</p>
        <div className="space-y-3">
          <div className="card-subtle p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start</label>
            <input type="date" value={startDate} onChange={e => {
              setStartDate(e.target.value);
              const end = new Date(e.target.value);
              end.setDate(end.getDate() + 6);
              setEndDate(end.toISOString().split('T')[0]);
            }}
              className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-1">{formatDate(startDate)}</p>
          </div>
          <div className="card-subtle p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate}
              className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-1">{formatDate(endDate)}</p>
          </div>
        </div>
        <button onClick={handleGenerateFromDates}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition-transform">
          Generate Plan <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  } else {
    // Initial / no plan state
    mealPlanContent = (
      <div className="space-y-5 animate-fade-in">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-base font-bold text-foreground">No Meal Plan Yet</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {premium ? 'Create a personalized plan tailored to your goals and preferences' : 'Create a basic meal plan to get started'}
          </p>
        </motion.div>

        {!premium && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Personalised Meal Plans</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Upgrade to Premium for AI‑generated plans tailored to your health conditions, goals, dietary preferences, and budget.
            </p>
            <button
              onClick={() => setUpgradeOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              <Crown className="w-3.5 h-3.5" /> Upgrade to Premium
            </button>
          </div>
        )}

        <div className="space-y-2">
          {[
            { icon: Search, color: 'bg-primary/10 text-primary', text: 'Meals for breakfast, lunch & dinner' },
            { icon: Target, color: 'bg-destructive/10 text-destructive', text: premium ? 'Tailored to your goals' : 'Basic balanced meals', locked: !premium },
            { icon: Scale, color: 'bg-accent text-amber-600', text: 'Balanced macros & fiber' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 card-subtle p-3">
              <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-foreground">{item.text}</p>
              {item.locked && <Lock className="w-3 h-3 text-muted-foreground ml-auto" />}
            </div>
          ))}
        </div>

        {/* Seasonal Picks */}
        <SeasonalPicksRow />

        <button onClick={() => {
          // Check if budget onboarding is done first
          const budgetSettings = getEnhancedBudgetSettings();
          if (!budgetSettings.onboardingDone) {
            setActiveTab('Budget');
            toast('Set your budget first', { description: 'Complete budget setup before creating a meal plan' });
            return;
          }
          if (!profile?.onboardingComplete) {
            setStep('onboarding');
            setActiveTab('Meal Plan');
          } else {
            setStep('dates');
          }
        }}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition-transform">
          <CalendarDays className="w-4 h-4" /> Create Meal Plan
        </button>
      </div>
    );
  }

  // Create a dummy empty plan for tabs that need it
  const tabPlan: WeekPlan = plan || { weekStart: getCurrentWeekStart(), days: [], generatedAt: new Date().toISOString() };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <MealPlannerTabs
          plan={tabPlan}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          mealPlanContent={mealPlanContent}
          onBudgetComplete={() => {
            setActiveTab('Meal Plan');
            if (!profile?.onboardingComplete) {
              setStep('onboarding');
            }
            toast.success('Budget set! Now let\'s plan your meals');
          }}
        />
      </div>
      <MonikaFab />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      {swapTarget && (
        <SwapSimulatorSheet
          open={!!swapTarget}
          onClose={() => setSwapTarget(null)}
          originalRecipeId={swapTarget.recipeId}
          mealType={swapTarget.mealType}
          onApply={(recipeId, impact) => performSwap(recipeId, { costDiff: impact.costDiff, proteinDiff: impact.proteinDiff })}
        />
      )}
    </div>
  );
}
