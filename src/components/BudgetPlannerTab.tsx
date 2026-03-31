import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Plus, IndianRupee, Zap, AlertTriangle,
  Package, ArrowRightLeft, ShoppingBag, Gift, ChevronRight,
  ChevronDown, ChevronUp, X, ScanLine, ArrowLeft, PieChart,
  Clock, Settings, BarChart3, Sparkles, Eye, Pencil, Trash2, Minus,
  Brain, Edit3, Utensils, Home as HomeIcon, UtensilsCrossed, ShieldAlert
} from 'lucide-react';
import { getBudgetSummary, getNutritionalEconomics, CATEGORY_CONFIG, type BudgetSummary, isSurvivalModeManual, activateSurvivalMode, deactivateSurvivalMode } from '@/lib/budget-service';
import { Switch } from '@/components/ui/switch';
import { getRecipesForMeal, getRemainingMealBudget, getUpcomingMealSlots, type SuggestedRecipe } from '@/lib/meal-suggestion-engine';
import { getBudgetSettings, saveBudgetSettings, saveManualExpense, deleteManualExpense, updateManualExpense, getManualExpenses, type Expense } from '@/lib/expense-store';
import { checkBudgetAlerts, getEnhancedBudgetSettings, saveEnhancedBudgetSettings, getSmartSwaps, getBurnRateProjection, type BudgetAlert, type EnhancedBudgetSettings, type PerMealBudget } from '@/lib/budget-alerts';
import { getUnifiedBudget, computeDailyBudget, computePerMealBudgets, validateBudgetVsGoals, saveMealSplitPcts, DEFAULT_MEAL_SPLIT, type MealSplitPcts } from '@/lib/budget-engine';
import { getPantrySummary, getLowStockAlerts, getPantryItems, addPantryItem, updatePantryItem, deletePantryItem, type PantryItem } from '@/lib/pantry-store';
import { getPriceTrends } from '@/lib/price-database';
import GroceryBillScanner from '@/components/GroceryBillScanner';
import MonikaGuide, { BUDGET_PLANNER_MONIKA } from '@/components/onboarding/MonikaGuide';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

// ─── Animated Progress Bar ───
function AnimatedBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div className="h-3 rounded-full bg-muted overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, percentage)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

// ─── Budget Onboarding ───
function BudgetOnboarding({ onComplete }: { onComplete: () => void }) {
  const { profile: userProfile } = useUserProfile();
  const [mode, setMode] = useState<'choose' | 'manual' | 'ai' | 'ai-result'>('choose');
  const [monthly, setMonthly] = useState('5000');
  const [weekly, setWeekly] = useState('');
  const [splitBreakfast, setSplitBreakfast] = useState(DEFAULT_MEAL_SPLIT.breakfast);
  const [splitLunch, setSplitLunch] = useState(DEFAULT_MEAL_SPLIT.lunch);
  const [splitDinner, setSplitDinner] = useState(DEFAULT_MEAL_SPLIT.dinner);
  const [splitSnacks, setSplitSnacks] = useState(DEFAULT_MEAL_SPLIT.snacks);
  const [outsideLimit, setOutsideLimit] = useState('1500');
  const [alertThreshold, setAlertThreshold] = useState(80);

  // AI flow state
  const [incomeRange, setIncomeRange] = useState('');
  const [eatingOut, setEatingOut] = useState(3);
  const [cooksHome, setCooksHome] = useState<'yes' | 'no' | 'mixed'>('mixed');
  const [groceryStore, setGroceryStore] = useState('');
  const [aiSuggested, setAiSuggested] = useState({ monthly: 0, breakfast: 0, lunch: 0, dinner: 0, snacks: 0 });

  const handleManualSave = () => {
    const m = Number(monthly) || 5000;
    const w = Number(weekly) || Math.round(m / 4.33);
    saveBudgetSettings({
      weeklyBudget: w,
      monthlyBudget: m,
      period: 'month',
      currency: '₹',
    });
    // Store split percentages, not absolute values
    const pcts: MealSplitPcts = { breakfast: splitBreakfast, lunch: splitLunch, dinner: splitDinner, snacks: splitSnacks };
    saveMealSplitPcts(pcts);
    saveEnhancedBudgetSettings({
      perMealBudget: 0,
      perMeal: pcts as any,
      outsideFoodLimit: Number(outsideLimit) || 0,
      onboardingDone: true,
    });
    // Trigger cloud sync so budget settings are persisted
    window.dispatchEvent(new Event('nutrilens:budget-updated'));
    onComplete();
  };

  const calculateAiBudget = () => {
    // Simple rule-based estimation
    let base = 5000;
    if (incomeRange === '10000-20000') base = 3500;
    else if (incomeRange === '20000-40000') base = 5000;
    else if (incomeRange === '40000-70000') base = 7000;
    else if (incomeRange === '70000+') base = 10000;

    // Adjust for eating out
    const outsideAdj = eatingOut * 150; // ~₹150 per outside meal
    if (cooksHome === 'yes') base = Math.round(base * 0.85);
    else if (cooksHome === 'no') base = Math.round(base * 1.3);

    // AI suggests percentages, not absolute per-meal values
    const bkfPct = 18;
    const lncPct = 30;
    const dnrPct = 35;
    const snkPct = 17;

    const daily = computeDailyBudget(base);
    const bkf = Math.round(daily * bkfPct / 100);
    const lnc = Math.round(daily * lncPct / 100);
    const dnr = Math.round(daily * dnrPct / 100);
    const snk = Math.round(daily * snkPct / 100);

    setAiSuggested({ monthly: base, breakfast: bkf, lunch: lnc, dinner: dnr, snacks: snk });
    setMonthly(String(base));
    setSplitBreakfast(bkfPct);
    setSplitLunch(lncPct);
    setSplitDinner(dnrPct);
    setSplitSnacks(snkPct);
    setOutsideLimit(String(outsideAdj || 1500));
    setMode('ai-result');
  };

  const inputCls = "w-full pl-8 pr-4 py-3.5 rounded-2xl bg-muted text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 text-foreground";

  if (mode === 'choose') {
    const msg = BUDGET_PLANNER_MONIKA.choose;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center pt-4 pb-6 px-4"
      >
        <MonikaGuide message={msg.message} mood={msg.mood} />
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
          <IndianRupee className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1.5">Let's plan your food budget</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-8">
          We'll help you eat well without breaking the bank.
        </p>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          How would you like to set your budget?
        </p>
        <div className="w-full max-w-[320px] space-y-3">
          <button
            onClick={() => setMode('manual')}
            className="w-full py-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all flex items-center gap-4 px-5"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Edit3 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">Enter Manually</p>
              <p className="text-[11px] text-muted-foreground">Set your own monthly & per-meal budgets</p>
            </div>
          </button>
          <button
            onClick={() => setMode('ai')}
            className="w-full py-4 rounded-2xl bg-card border border-border hover:border-accent/30 transition-all flex items-center gap-4 px-5"
          >
            <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">Let AI Decide</p>
              <p className="text-[11px] text-muted-foreground">Answer 3-4 questions for a smart suggestion</p>
            </div>
          </button>
        </div>
      </motion.div>
    );
  }

  if (mode === 'ai') {
    const msg = BUDGET_PLANNER_MONIKA.ai;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5 px-1 pt-2"
      >
        <button onClick={() => setMode('choose')} className="text-xs font-semibold text-primary flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
        <MonikaGuide message={msg.message} mood={msg.mood} compact />
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Smart Budget Setup</h3>
            <p className="text-[11px] text-muted-foreground">Answer a few questions</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Monthly income range (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: '10000-20000', label: '₹10K–20K' },
              { val: '20000-40000', label: '₹20K–40K' },
              { val: '40000-70000', label: '₹40K–70K' },
              { val: '70000+', label: '₹70K+' },
            ].map(o => (
              <button key={o.val} onClick={() => setIncomeRange(o.val)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  incomeRange === o.val ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground'
                }`}>{o.label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase">
            Meals eaten out per week: <span className="text-foreground">{eatingOut}</span>
          </label>
          <input type="range" min={0} max={14} value={eatingOut} onChange={e => setEatingOut(Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span><span>7</span><span>14</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Do you cook most meals at home?</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'yes' as const, label: 'Yes', emoji: '👨‍🍳' },
              { val: 'mixed' as const, label: 'Mixed', emoji: '🔄' },
              { val: 'no' as const, label: 'No', emoji: '🍽️' },
            ].map(o => (
              <button key={o.val} onClick={() => setCooksHome(o.val)}
                className={`py-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                  cooksHome === o.val ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground'
                }`}>
                <span className="text-base">{o.emoji}</span>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Primary grocery store (optional)</label>
          <input value={groceryStore} onChange={e => setGroceryStore(e.target.value)}
            placeholder="e.g., DMart, BigBasket, local kirana"
            className="w-full px-4 py-3.5 rounded-2xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
        </div>

        <button onClick={calculateAiBudget}
          className="w-full py-3.5 rounded-2xl bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" /> Calculate My Budget
        </button>
      </motion.div>
    );
  }

  if (mode === 'ai-result') {
    const msg = BUDGET_PLANNER_MONIKA['ai-result'];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-5 px-1 pt-2"
      >
        <button onClick={() => setMode('ai')} className="text-xs font-semibold text-primary flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Adjust answers
        </button>
        <MonikaGuide message={msg.message} mood={msg.mood} compact />

        <div className="card-elevated p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">AI Recommendation</h3>
              <p className="text-[11px] text-muted-foreground">Based on your lifestyle</p>
            </div>
          </div>

          <div className="text-center py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Monthly Budget</p>
            <p className="text-3xl font-extrabold text-primary mt-1">₹{aiSuggested.monthly.toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Breakfast', val: aiSuggested.breakfast, emoji: '🌅' },
              { label: 'Lunch', val: aiSuggested.lunch, emoji: '☀️' },
              { label: 'Dinner', val: aiSuggested.dinner, emoji: '🌙' },
              { label: 'Snacks', val: aiSuggested.snacks, emoji: '🍎' },
            ].map(m => (
              <div key={m.label} className="rounded-xl bg-muted p-3 text-center">
                <span className="text-base">{m.emoji}</span>
                <p className="text-[10px] text-muted-foreground mt-1">{m.label}</p>
                <p className="text-sm font-bold text-foreground">₹{m.val}/day</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleManualSave}
            className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold">
            Accept
          </button>
          <button onClick={() => setMode('manual')}
            className="flex-1 py-3.5 rounded-2xl bg-muted text-foreground text-sm font-semibold">
            Edit
          </button>
        </div>
      </motion.div>
    );
  }

  // Manual entry
  const manualMsg = BUDGET_PLANNER_MONIKA.manual;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4 px-1 pt-2"
    >
      <button onClick={() => setMode('choose')} className="text-xs font-semibold text-primary flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Back
      </button>
      <MonikaGuide message={manualMsg.message} mood={manualMsg.mood} compact />
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Edit3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Manual Budget Setup</h3>
          <p className="text-[11px] text-muted-foreground">Set your own limits</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase">Monthly Budget (₹) *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
          <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} className={inputCls} />
        </div>
      </div>

      {(() => {
        const m = Number(monthly) || 5000;
        const daily = computeDailyBudget(m);
        const perMeal = computePerMealBudgets(daily, { breakfast: splitBreakfast, lunch: splitLunch, dinner: splitDinner, snacks: splitSnacks });
        const validation = validateBudgetVsGoals(m, userProfile?.dailyCalories || 2000, userProfile?.dailyProtein || 80);
        return (
          <>
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Daily Budget</p>
              <p className="text-lg font-extrabold text-foreground">₹{Math.round(daily)}/day</p>
              <div className="grid grid-cols-4 gap-1 mt-2">
                <div className="text-center"><p className="text-[9px] text-muted-foreground">🌅 Bkf</p><p className="text-xs font-bold">₹{perMeal.breakfast}</p></div>
                <div className="text-center"><p className="text-[9px] text-muted-foreground">☀️ Lunch</p><p className="text-xs font-bold">₹{perMeal.lunch}</p></div>
                <div className="text-center"><p className="text-[9px] text-muted-foreground">🌙 Dinner</p><p className="text-xs font-bold">₹{perMeal.dinner}</p></div>
                <div className="text-center"><p className="text-[9px] text-muted-foreground">🍎 Snacks</p><p className="text-xs font-bold">₹{perMeal.snacks}</p></div>
              </div>
            </div>
            {validation.warning && (
              <div className={`rounded-xl p-3 text-xs font-medium ${validation.severity === 'insufficient' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent-foreground'}`}>
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                {validation.warning}
              </div>
            )}
          </>
        );
      })()}

      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase">Meal Split (% of daily budget)</label>
        <div className="space-y-3">
          {[
            { label: '🌅 Breakfast', val: splitBreakfast, set: setSplitBreakfast },
            { label: '☀️ Lunch', val: splitLunch, set: setSplitLunch },
            { label: '🌙 Dinner', val: splitDinner, set: setSplitDinner },
            { label: '🍎 Snacks', val: splitSnacks, set: setSplitSnacks },
          ].map(m => (
            <div key={m.label} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
                <span className="text-xs font-bold text-foreground">{m.val}%</span>
              </div>
              <input type="range" min={5} max={60} value={m.val} onChange={e => m.set(Number(e.target.value))}
                className="w-full accent-primary h-2" />
            </div>
          ))}
          <p className={`text-[10px] font-semibold ${splitBreakfast + splitLunch + splitDinner + splitSnacks === 100 ? 'text-primary' : 'text-destructive'}`}>
            Total: {splitBreakfast + splitLunch + splitDinner + splitSnacks}% {splitBreakfast + splitLunch + splitDinner + splitSnacks !== 100 && '(must be 100%)'}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase">Outside Food Limit (optional, monthly)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
          <input type="number" value={outsideLimit} onChange={e => setOutsideLimit(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase">Alert when budget reaches</label>
        <select value={alertThreshold} onChange={e => setAlertThreshold(Number(e.target.value))}
          className="w-full px-4 py-3.5 rounded-2xl bg-muted text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
          <option value={70}>70% of limit</option>
          <option value={80}>80% of limit</option>
          <option value={90}>90% of limit</option>
        </select>
      </div>

      <button onClick={handleManualSave} disabled={!monthly}
        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40">
        SAVE & START
      </button>
    </motion.div>
  );
}

// ─── Empty State (post-onboarding, no expenses) ───
function EmptyState({ onAddExpense, onSetBudget, onAddPantry, onScanBill }: {
  onAddExpense: () => void; onSetBudget: () => void; onAddPantry: () => void; onScanBill: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center pt-10 pb-6 px-4"
    >
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
        <BarChart3 className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1.5">No expenses yet</h2>
      <p className="text-sm text-muted-foreground text-center max-w-[260px] mb-8">
        Log meals with costs or add expenses manually to see your budget breakdown.
      </p>
      <button
        onClick={onAddExpense}
        className="w-full max-w-[280px] py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 mb-4 shadow-lg"
        style={{ boxShadow: 'var(--shadow-fab)' }}
      >
        <Plus className="w-4 h-4" /> Add Expense
      </button>
      <div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
        {[
          { label: 'Set Budget', icon: Settings, action: onSetBudget },
          { label: 'Add Pantry', icon: Package, action: onAddPantry },
          { label: 'Scan Bill', icon: ScanLine, action: onScanBill },
        ].map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Week/Month Summary Card ───
function BudgetCard({ label, icon, summary, onClick }: {
  label: string; icon: string; summary: BudgetSummary; onClick: () => void;
}) {
  const pct = Math.min(100, summary.percentage);
  const barColor = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-accent' : 'bg-primary';
  const pctColor = pct > 90 ? 'text-destructive' : pct > 70 ? 'text-accent' : 'text-primary';

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card-elevated p-4 space-y-3 text-left w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Budget: <span className={`font-bold ${pctColor}`}>{pct}% used</span></span>
      </div>
      <AnimatedBar percentage={pct} color={barColor} />
      <p className="text-xs text-muted-foreground">
        Remaining: <span className="font-bold text-foreground">{summary.currency}{summary.remaining.toLocaleString()}</span>
      </p>
    </motion.button>
  );
}

// ─── Alert Banner ───
function AlertsInline({ alerts }: { alerts: BudgetAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.slice(0, 3).map(a => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-3 rounded-2xl flex items-start gap-2.5 text-xs ${
            a.severity === 'critical' ? 'bg-destructive/10 border border-destructive/20' :
            a.severity === 'warning' ? 'bg-accent/10 border border-accent/20' :
            'bg-primary/10 border border-primary/20'
          }`}
        >
          <span className="text-base flex-shrink-0">{a.emoji}</span>
          <div className="flex-1">
            <p className="font-medium text-foreground leading-relaxed">{a.message}</p>
            {a.action && (
              <p className="text-[10px] text-primary font-semibold mt-1">💡 {a.action}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Market Trends ───
function MarketTrendsCard() {
  const trends = useMemo(() => getPriceTrends(), []);
  if (trends.length === 0) return null;

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Market Trends</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {trends.map(t => (
          <div
            key={t.item}
            className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl flex flex-col items-center gap-1 min-w-[80px] ${
              t.direction === 'up' ? 'bg-destructive/8 border border-destructive/15' :
              t.direction === 'down' ? 'bg-primary/8 border border-primary/15' :
              'bg-muted border border-border'
            }`}
          >
            <span className="text-xs font-bold text-foreground">{t.item}</span>
            <span className={`text-[11px] font-bold ${
              t.direction === 'up' ? 'text-destructive' :
              t.direction === 'down' ? 'text-primary' :
              'text-muted-foreground'
            }`}>
              {t.direction === 'up' ? `+${t.percentage}%` : t.direction === 'down' ? `-${t.percentage}%` : '—'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t.direction === 'up' ? '🔼 Up' : t.direction === 'down' ? '🔽 Down' : '➡️ Stable'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pantry Status Card ───
function PantryStatusCard({ onViewPantry }: { onViewPantry: () => void }) {
  const summary = useMemo(() => getPantrySummary(), []);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onViewPantry}
      className="card-elevated p-4 flex items-center gap-4 w-full text-left"
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Package className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Pantry Status</span>
        <p className="text-sm text-muted-foreground mt-0.5">
          {summary.totalItems} items · <span className="font-semibold text-foreground">₹{summary.totalValue.toLocaleString()}</span> value
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {summary.lowStockCount > 0 && (
          <span className="px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive text-[10px] font-bold">
            {summary.lowStockCount} low
          </span>
        )}
        <Eye className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.button>
  );
}

// ─── Smart Swaps Card ───
function SmartSwapsCard() {
  const swaps = useMemo(() => getSmartSwaps(), []);
  if (swaps.length === 0) return null;

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Smart Swaps</span>
      </div>
      {swaps.slice(0, 2).map(s => (
        <div key={s.original} className="p-3 rounded-xl bg-accent/5 border border-accent/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-foreground">{s.original}</span>
            <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
            <span className="font-bold text-primary">{s.suggestion}</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">{s.proteinKept}</p>
            <span className="text-xs font-bold text-accent">Save ₹{s.savings}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Category Breakdown ───
function CategoryBreakdown({ summary }: { summary: BudgetSummary }) {
  const categories = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
  if (categories.length === 0) return null;
  const total = categories.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <PieChart className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Spending by Category</span>
      </div>
      <div className="flex items-center justify-center py-3">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.91" fill="none" className="stroke-muted" strokeWidth="3" />
            {(() => {
              let offset = 0;
              return categories.map(([cat, amount]) => {
                const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                const pct = total > 0 ? (amount / total) * 100 : 0;
                const dash = (pct * 100) / 100;
                const el = (
                  <circle
                    key={cat}
                    cx="18" cy="18" r="15.91"
                    fill="none"
                    stroke={cfg.color}
                    strokeWidth="3"
                    strokeDasharray={`${dash} ${100 - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="round"
                  />
                );
                offset += dash;
                return el;
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold text-foreground">{summary.currency}{total.toLocaleString()}</span>
            <span className="text-[9px] text-muted-foreground">total</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {categories.map(([cat, amount]) => {
          const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
          const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
          return (
            <div key={cat} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
              <span className="text-xs font-medium text-foreground flex-1">{cfg.emoji} {cfg.label}</span>
              <span className="text-xs text-muted-foreground">{pct}%</span>
              <span className="text-xs font-bold text-foreground w-16 text-right">{summary.currency}{amount.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Expense Row (with edit/delete) ───
function ExpenseRow({ expense, currency, onEdit, onDelete }: {
  expense: Expense; currency: string;
  onEdit?: (e: Expense) => void;
  onDelete?: (e: Expense) => void;
}) {
  const cfg = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
  const isFree = expense.amount === 0;
  const dateStr = new Date(expense.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  const isManual = expense.type === 'manual';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${cfg.color}15` }}>
        <span className="text-sm">{isFree ? '🎁' : cfg.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{expense.description}</p>
        <p className="text-[11px] text-muted-foreground">{cfg.label} · {dateStr}</p>
      </div>
      <span className={`text-sm font-bold ${isFree ? 'text-primary' : 'text-foreground'} mr-1`}>
        {isFree ? 'Free' : `${currency}${expense.amount.toLocaleString()}`}
      </span>
      {isManual && onEdit && (
        <button onClick={() => onEdit(expense)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
      {isManual && onDelete && (
        <button onClick={() => onDelete(expense)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
        </button>
      )}
    </div>
  );
}

// ─── Budget Details Sheet ───
function BudgetDetailsSheet({ open, onClose, summary, period, onEditExpense, onDeleteExpense }: {
  open: boolean; onClose: () => void; summary: BudgetSummary; period: 'week' | 'month';
  onEditExpense: (e: Expense) => void;
  onDeleteExpense: (e: Expense) => void;
}) {
  const pct = Math.min(100, summary.percentage);
  const barColor = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-accent' : 'bg-primary';
  const [showAll, setShowAll] = useState(false);
  const visibleExpenses = showAll ? summary.expenses : summary.expenses.slice(0, 5);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-3xl overflow-y-auto pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ArrowLeft className="w-4 h-4 cursor-pointer" onClick={onClose} />
            Budget Details
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-1">
          {/* Summary */}
          <div className="card-elevated p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">{period === 'week' ? '📅' : '📆'}</span>
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                This {period === 'week' ? 'Week' : 'Month'}
              </span>
            </div>
            <div className="text-center py-2">
              <span className={`text-3xl font-extrabold ${pct > 90 ? 'text-destructive' : pct > 70 ? 'text-accent' : 'text-primary'}`}>
                {pct}%
              </span>
              <span className="text-sm text-muted-foreground ml-1">used</span>
            </div>
            <AnimatedBar percentage={pct} color={barColor} />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Total Budget</p>
                <p className="text-sm font-bold text-foreground">{summary.currency}{summary.budget.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Spent So Far</p>
                <p className="text-sm font-bold text-foreground">{summary.currency}{summary.spent.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card-elevated p-5">
            <CategoryBreakdown summary={summary} />
          </div>

          {/* Recent Expenses */}
          <div className="card-elevated p-5 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Expenses</span>
            </div>
            {visibleExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No expenses recorded</p>
            ) : (
              <>
                {visibleExpenses.map(e => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    currency={summary.currency}
                    onEdit={onEditExpense}
                    onDelete={onDeleteExpense}
                  />
                ))}
                {summary.expenses.length > 5 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full py-2 text-xs font-semibold text-primary"
                  >
                    {showAll ? 'Show less' : `See All (${summary.expenses.length})`} →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Add / Edit Expense Sheet ───
function AddExpenseSheet({ open, onClose, onSaved, editingExpense }: {
  open: boolean; onClose: () => void; onSaved: () => void; editingExpense?: Expense | null;
}) {
  const isEdit = !!editingExpense;
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('other');
  const [isFree, setIsFree] = useState(false);
  const [date, setDate] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; });

  useEffect(() => {
    if (editingExpense) {
      setDesc(editingExpense.description);
      setAmount(String(editingExpense.amount));
      setCategory(editingExpense.category);
      setIsFree(editingExpense.amount === 0);
      setDate(editingExpense.date);
    } else {
      setDesc(''); setAmount(''); setCategory('other'); setIsFree(false);
      setDate(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; });
    }
  }, [editingExpense, open]);

  const handleSave = () => {
    if (!desc.trim() || (!isFree && !amount.trim())) return;
    if (isEdit && editingExpense) {
      updateManualExpense(editingExpense.id, {
        date,
        amount: isFree ? 0 : Number(amount),
        category,
        description: desc.trim(),
      });
    } else {
      saveManualExpense({
        id: `manual-${Date.now()}`,
        date,
        amount: isFree ? 0 : Number(amount),
        currency: '₹',
        category,
        description: desc.trim(),
        type: 'manual',
      });
    }
    onSaved();
    onClose();
  };

  const handleDelete = () => {
    if (editingExpense) {
      deleteManualExpense(editingExpense.id);
      onSaved();
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ArrowLeft className="w-4 h-4 cursor-pointer" onClick={onClose} />
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-1">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Amount</label>
            {isFree ? (
              <div className="px-4 py-3.5 rounded-2xl bg-primary/10 text-primary font-bold text-sm text-center">
                Free Meal (₹0)
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3.5 rounded-2xl bg-muted text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                  autoFocus
                />
              </div>
            )}
            <button
              onClick={() => setIsFree(!isFree)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isFree ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              {isFree ? 'Free meal ✓' : 'Mark as free'}
            </button>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key as Expense['category'])}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                    category === key
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-muted text-muted-foreground border border-transparent'
                  }`}
                >
                  <span className="text-base">{cfg.emoji}</span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Note</label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Chicken and veggies"
              className="w-full px-4 py-3.5 rounded-2xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!desc.trim() || (!isFree && !amount.trim())}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 transition-opacity"
          >
            {isEdit ? 'UPDATE' : 'SAVE'}
          </button>

          {/* Delete (edit mode only) */}
          {isEdit && (
            <button
              onClick={handleDelete}
              className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Expense
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Set Budget Sheet ───
function SetBudgetSheet({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const settings = getBudgetSettings();
  const enhanced = getEnhancedBudgetSettings();
  const [weekly, setWeekly] = useState(settings.weeklyBudget);
  const [monthly, setMonthly] = useState(settings.monthlyBudget);
  const [outsideLimit, setOutsideLimit] = useState(enhanced.outsideFoodLimit);
  const [alertThreshold, setAlertThreshold] = useState(80);

  const handleSave = () => {
    saveBudgetSettings({ ...settings, weeklyBudget: weekly, monthlyBudget: monthly });
    saveEnhancedBudgetSettings({ ...enhanced, outsideFoodLimit: outsideLimit });
    window.dispatchEvent(new Event('nutrilens:budget-updated'));
    onSaved();
    onClose();
  };

  const inputCls = "w-full pl-8 pr-4 py-3.5 rounded-2xl bg-muted text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 text-foreground";

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ArrowLeft className="w-4 h-4 cursor-pointer" onClick={onClose} />
            Set Budget
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-1">
          {[
            { label: 'Weekly Budget (optional)', value: weekly, onChange: setWeekly },
            { label: 'Monthly Budget (optional)', value: monthly, onChange: setMonthly },
            { label: 'Outside Food Limit (optional)', value: outsideLimit, onChange: setOutsideLimit },
          ].map(({ label, value, onChange }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{label}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={value}
                  onChange={e => onChange(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Alert me when budget reaches</label>
            <select
              value={alertThreshold}
              onChange={e => setAlertThreshold(Number(e.target.value))}
              className="w-full px-4 py-3.5 rounded-2xl bg-muted text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            >
              <option value={70}>70% of limit</option>
              <option value={80}>80% of limit</option>
              <option value={90}>90% of limit</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold"
          >
            SAVE
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Pantry Management Sheet ───
function PantrySheet({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [useItemId, setUseItemId] = useState<string | null>(null);
  const [useQty, setUseQty] = useState('1');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add form state
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');

  const reload = useCallback(() => {
    setItems(getPantryItems().filter(i => i.quantity > 0));
  }, []);

  useEffect(() => { if (open) reload(); }, [open, reload]);

  const totalValue = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);

  const handleAdd = () => {
    if (!name.trim() || !qty) return;
    addPantryItem({
      name: name.trim(),
      quantity: Number(qty),
      unit,
      pricePaid: Number(price) || 0,
      purchaseDate: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
      category: 'grocery',
    });
    setName(''); setQty(''); setPrice('');
    setShowAddForm(false);
    reload();
    onSaved();
  };

  const handleUse = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const deduct = Math.min(Number(useQty) || 1, item.quantity);
    updatePantryItem(id, { quantity: item.quantity - deduct });
    setUseItemId(null);
    setUseQty('1');
    reload();
    onSaved();
  };

  const handleDelete = (id: string) => {
    deletePantryItem(id);
    setDeleteConfirmId(null);
    reload();
    onSaved();
  };

  const handleEditSave = () => {
    if (!editingItem) return;
    updatePantryItem(editingItem.id, {
      name: editingItem.name,
      quantity: editingItem.quantity,
      unit: editingItem.unit,
      pricePaid: editingItem.pricePaid,
      pricePerUnit: editingItem.quantity > 0 ? editingItem.pricePaid / editingItem.quantity : 0,
    });
    setEditingItem(null);
    reload();
    onSaved();
  };

  const categoryEmojis: Record<string, string> = {
    rice: '🍚', oil: '🫒', egg: '🥚', milk: '🥛', chicken: '🍗', dal: '🫘',
    vegetable: '🥬', fruit: '🍎', spice: '🌶️', bread: '🍞', default: '📦'
  };
  const getEmoji = (name: string) => {
    const lower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(categoryEmojis)) {
      if (lower.includes(key)) return emoji;
    }
    return categoryEmojis.default;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="bottom" className="max-h-[90vh] rounded-t-3xl overflow-y-auto pb-8">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ArrowLeft className="w-4 h-4 cursor-pointer" onClick={onClose} />
              My Pantry
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-3 px-1">
            {items.length === 0 && !showAddForm ? (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No pantry items yet</p>
              </div>
            ) : (
              items.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  className="card-elevated p-4 space-y-2"
                >
                  {editingItem?.id === item.id ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <input value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={editingItem.quantity} onChange={e => setEditingItem({ ...editingItem, quantity: Number(e.target.value) })}
                          className="px-3 py-2.5 rounded-xl bg-muted text-sm outline-none text-foreground" placeholder="Qty" />
                        <input value={editingItem.unit} onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                          className="px-3 py-2.5 rounded-xl bg-muted text-sm outline-none text-foreground" placeholder="Unit" />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                          <input type="number" value={editingItem.pricePaid} onChange={e => setEditingItem({ ...editingItem, pricePaid: Number(e.target.value) })}
                            className="w-full pl-6 pr-2 py-2.5 rounded-xl bg-muted text-sm outline-none text-foreground" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleEditSave} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">Save</button>
                        <button onClick={() => setEditingItem(null)} className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : useItemId === item.id ? (
                    /* Use mode */
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">{getEmoji(item.name)} How many {item.unit} to use?</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setUseQty(String(Math.max(1, Number(useQty) - 1)))}
                          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><Minus className="w-4 h-4 text-foreground" /></button>
                        <input type="number" value={useQty} onChange={e => setUseQty(e.target.value)}
                          className="w-16 text-center py-2 rounded-xl bg-muted text-sm font-bold outline-none text-foreground" />
                        <button onClick={() => setUseQty(String(Math.min(item.quantity, Number(useQty) + 1)))}
                          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><Plus className="w-4 h-4 text-foreground" /></button>
                        <span className="text-xs text-muted-foreground">of {item.quantity}{item.unit}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUse(item.id)} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">Confirm</button>
                        <button onClick={() => { setUseItemId(null); setUseQty('1'); }} className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* Normal display */
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getEmoji(item.name)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Purchased: {new Date(item.purchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{item.quantity}{item.unit}</p>
                          <p className="text-[11px] text-muted-foreground">₹{item.pricePaid}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setUseItemId(item.id); setUseQty('1'); }}
                          className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold">Use</button>
                        <button onClick={() => setEditingItem({ ...item })}
                          className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold">Edit</button>
                        <button onClick={() => setDeleteConfirmId(item.id)}
                          className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">Delete</button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))
            )}

            {/* Total Value */}
            {items.length > 0 && (
              <div className="card-elevated p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Total Value</p>
                <p className="text-lg font-extrabold text-foreground">₹{Math.round(totalValue).toLocaleString()}</p>
              </div>
            )}

            {/* Add Item Form */}
            {showAddForm ? (
              <div className="card-elevated p-4 space-y-3">
                <p className="text-xs font-bold text-foreground uppercase">New Item</p>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rice, Eggs"
                  className="w-full px-4 py-3 rounded-2xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground" autoFocus />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Quantity"
                    className="px-4 py-3 rounded-2xl bg-muted text-sm outline-none text-foreground" />
                  <select value={unit} onChange={e => setUnit(e.target.value)}
                    className="px-4 py-3 rounded-2xl bg-muted text-sm outline-none text-foreground">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="liter">liter</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price paid"
                    className="w-full pl-8 pr-4 py-3 rounded-2xl bg-muted text-sm font-bold outline-none text-foreground" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAdd} disabled={!name.trim() || !qty}
                    className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40">Add</button>
                  <button onClick={() => { setShowAddForm(false); setName(''); setQty(''); setPrice(''); }}
                    className="flex-1 py-3 rounded-2xl bg-muted text-muted-foreground text-sm font-semibold">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddForm(true)}
                className="w-full py-3.5 rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this item from your pantry.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Recent Expenses (inline on dashboard) ───
function RecentExpensesInline({ expenses, currency, onEdit, onDelete, onSeeAll }: {
  expenses: Expense[]; currency: string;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  onSeeAll: () => void;
}) {
  const recent = expenses.slice(0, 4);
  if (recent.length === 0) return null;

  return (
    <div className="card-elevated p-4 space-y-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Expenses</span>
        </div>
        {expenses.length > 4 && (
          <button onClick={onSeeAll} className="text-[11px] font-semibold text-primary">
            See All ({expenses.length}) →
          </button>
        )}
      </div>
      {recent.map(e => (
        <ExpenseRow key={e.id} expense={e} currency={currency} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ─── Budget-Aware Meal Suggestions ───
function MealSuggestionsSection({ onRefresh }: { onRefresh: () => void }) {
  const { profile } = useUserProfile();
  const upcomingSlots = useMemo(() => getUpcomingMealSlots(), []);

  if (upcomingSlots.length === 0) return null;

  const slotLabels: Record<string, string> = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', snack: '🍎 Snack', dinner: '🌙 Dinner' };

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Budget-Smart Suggestions</span>
      </div>
      {upcomingSlots.slice(0, 2).map(slot => {
        const remaining = getRemainingMealBudget(slot);
        const suggestions = getRecipesForMeal(slot, remaining, profile);

        return (
          <div key={slot} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground">{slotLabels[slot] || slot}</span>
              <span className="text-[10px] text-muted-foreground">₹{remaining} budget</span>
            </div>
            {suggestions.length > 0 ? (
              <div className="space-y-1.5">
                {suggestions.slice(0, 3).map(recipe => (
                  <div key={recipe.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/50">
                    <span className="text-lg">{recipe.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{recipe.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{recipe.calories} kcal</span>
                        <span className="text-[10px] font-semibold text-accent">₹{recipe.estimatedCost}</span>
                        <span className="text-[10px] text-primary">⭐ {recipe.nutritionScore}/10</span>
                        {recipe.matchReason && (
                          <span className="text-[9px] text-primary/70">{recipe.matchReason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">No recipes found within budget</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Budget Planner Tab ───
export default function BudgetPlannerTab({ onOnboardingComplete }: { onOnboardingComplete?: () => void } = {}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSetBudget, setShowSetBudget] = useState(false);
  const [showPantry, setShowPantry] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [detailPeriod, setDetailPeriod] = useState<'week' | 'month'>('week');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  const [survivalOn, setSurvivalOn] = useState(isSurvivalModeManual);

  const enhanced = useMemo(() => getEnhancedBudgetSettings(), [refreshKey]);
  const budgetSettings = useMemo(() => getBudgetSettings(), [refreshKey]);
  const weeklySummary = useMemo(() => getBudgetSummary('week'), [refreshKey]);
  const monthlySummary = useMemo(() => getBudgetSummary('month'), [refreshKey]);
  const alerts = useMemo(() => checkBudgetAlerts(), [refreshKey]);

  // Check if onboarding is needed
  const needsOnboarding = !enhanced.onboardingDone && budgetSettings.weeklyBudget === 2000 && budgetSettings.monthlyBudget === 8000;

  const hasData = weeklySummary.expenses.length > 0 || monthlySummary.expenses.length > 0;
  const allExpenses = useMemo(() => {
    return [...weeklySummary.expenses].sort((a, b) => b.date.localeCompare(a.date));
  }, [weeklySummary]);

  const openDetails = (p: 'week' | 'month') => {
    setDetailPeriod(p);
    setShowDetails(true);
  };

  const handleEditExpense = (e: Expense) => {
    setEditingExpense(e);
    setShowDetails(false);
    setShowAddExpense(true);
  };

  const handleDeleteExpense = (e: Expense) => {
    setDeleteConfirmExpense(e);
  };

  const confirmDeleteExpense = () => {
    if (deleteConfirmExpense) {
      deleteManualExpense(deleteConfirmExpense.id);
      setDeleteConfirmExpense(null);
      refresh();
    }
  };

  // Show onboarding if needed
  if (needsOnboarding) {
    return <BudgetOnboarding onComplete={() => { refresh(); onOnboardingComplete?.(); }} />;
  }

  if (!hasData && !showScanner) {
    return (
      <>
        <EmptyState
          onAddExpense={() => setShowAddExpense(true)}
          onSetBudget={() => setShowSetBudget(true)}
          onAddPantry={() => setShowPantry(true)}
          onScanBill={() => setShowScanner(true)}
        />
        <AddExpenseSheet open={showAddExpense} onClose={() => { setShowAddExpense(false); setEditingExpense(null); }} onSaved={refresh} editingExpense={editingExpense} />
        <SetBudgetSheet open={showSetBudget} onClose={() => setShowSetBudget(false)} onSaved={refresh} />
        <PantrySheet open={showPantry} onClose={() => setShowPantry(false)} onSaved={refresh} />
      </>
    );
  }

  if (showScanner) {
    return (
      <GroceryBillScanner
        onComplete={() => { setShowScanner(false); refresh(); }}
        onClose={() => setShowScanner(false)}
      />
    );
  }


  const toggleSurvival = () => {
    if (survivalOn) {
      deactivateSurvivalMode();
      setSurvivalOn(false);
    } else {
      activateSurvivalMode();
      setSurvivalOn(true);
    }
    refresh();
  };

  return (
    <div className="space-y-4 pb-4">
      {/* ₹100/Day Survival Mode Toggle */}
      <div className={`rounded-2xl border p-4 transition-colors ${survivalOn ? 'bg-destructive/10 border-destructive/20' : 'bg-card border-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${survivalOn ? 'bg-destructive/20' : 'bg-muted'}`}>
              <ShieldAlert className={`w-4.5 h-4.5 ${survivalOn ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">₹100/Day Survival Mode</p>
              <p className="text-[10px] text-muted-foreground">Cap all meals to ₹25 each. Maximum efficiency.</p>
            </div>
          </div>
          <Switch checked={survivalOn} onCheckedChange={toggleSurvival} />
        </div>
        {survivalOn && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-[10px] text-destructive font-medium mt-2 pl-12"
          >
            Active: Budget capped at ₹100/day (₹25/meal). Only budget-friendly recipes shown.
          </motion.p>
        )}
      </div>

      {/* Alerts */}
      <AlertsInline alerts={alerts} />

      {/* This Week Card */}
      <BudgetCard label="This Week" icon="📅" summary={weeklySummary} onClick={() => openDetails('week')} />

      {/* This Month Card */}
      <BudgetCard label="This Month" icon="📆" summary={monthlySummary} onClick={() => openDetails('month')} />

      {/* Budget-Smart Meal Suggestions */}
      <MealSuggestionsSection onRefresh={refresh} />

      {/* Burn Rate */}
      {(() => {
        const proj = getBurnRateProjection();
        if (!proj || proj.daysRemaining <= 0) return null;
        return (
          <div className="card-elevated p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">📊</span>
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Spending Pace</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted p-2.5 text-center">
                <p className="text-sm font-extrabold text-foreground">₹{proj.dailyBurnRate}</p>
                <p className="text-[10px] text-muted-foreground">per day</p>
              </div>
              <div className="rounded-xl bg-muted p-2.5 text-center">
                <p className="text-sm font-extrabold text-foreground">{proj.daysRemaining}</p>
                <p className="text-[10px] text-muted-foreground">days left</p>
              </div>
              <div className="rounded-xl bg-muted p-2.5 text-center">
                <p className={`text-sm font-extrabold ${proj.suggestedDailyBudget > proj.dailyBurnRate ? 'text-primary' : 'text-destructive'}`}>
                  ₹{proj.suggestedDailyBudget}
                </p>
                <p className="text-[10px] text-muted-foreground">target/day</p>
              </div>
            </div>
            {proj.projectedOverage > 0 && (
              <p className="text-[11px] text-destructive font-medium">
                📈 Projected overspend: ₹{proj.projectedOverage}
              </p>
            )}
          </div>
        );
      })()}

      {/* Market Trends */}
      <MarketTrendsCard />

      {/* Pantry Status */}
      <PantryStatusCard onViewPantry={() => setShowPantry(true)} />

      {/* Smart Swaps */}
      <SmartSwapsCard />

      {/* Recent Expenses (inline on dashboard) */}
      <RecentExpensesInline
        expenses={allExpenses}
        currency={weeklySummary.currency}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
        onSeeAll={() => openDetails('week')}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Expense', icon: Plus, action: () => { setEditingExpense(null); setShowAddExpense(true); } },
          { label: 'Pantry', icon: ShoppingBag, action: () => setShowPantry(true) },
          { label: 'Scan Bill', icon: ScanLine, action: () => setShowScanner(true) },
        ].map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="py-3.5 rounded-2xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Budget Settings */}
      <button
        onClick={() => setShowSetBudget(true)}
        className="w-full py-3 rounded-2xl bg-muted text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2 hover:text-foreground transition-colors"
      >
        <Settings className="w-3.5 h-3.5" /> Budget Settings
      </button>

      {/* Sheets */}
      <BudgetDetailsSheet
        open={showDetails}
        onClose={() => setShowDetails(false)}
        summary={detailPeriod === 'week' ? weeklySummary : monthlySummary}
        period={detailPeriod}
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
      />
      <AddExpenseSheet
        open={showAddExpense}
        onClose={() => { setShowAddExpense(false); setEditingExpense(null); }}
        onSaved={refresh}
        editingExpense={editingExpense}
      />
      <SetBudgetSheet open={showSetBudget} onClose={() => setShowSetBudget(false)} onSaved={refresh} />
      <PantrySheet open={showPantry} onClose={() => setShowPantry(false)} onSaved={refresh} />

      {/* Delete Expense Confirmation */}
      <AlertDialog open={!!deleteConfirmExpense} onOpenChange={() => setDeleteConfirmExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirmExpense?.description}" (₹{deleteConfirmExpense?.amount}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExpense} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


