import { useState, useCallback, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ChevronLeft, Trash2, Plus, Minus, Camera, Mic, Search, Pencil, IndianRupee, ArrowRight, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MealEntry, FoodItem, getProfile, getDailyLog, saveDailyLog, getTodayKey } from '@/lib/store';
import { getSourceEmoji, getSourceLabel, getCookingMethodEmoji, getCookingMethodLabel } from '@/lib/context-learning';
import { getMealFeedback } from '@/lib/meal-feedback';
import { evaluateConditions, getUserConditions } from '@/lib/condition-coach';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AddFoodSheet from '@/components/AddFoodSheet';
import { Progress } from '@/components/ui/progress';
import FoodEditModal from '@/components/FoodEditModal';
import { getUnitOptionsForFood, calculateNutrition } from '@/lib/unit-conversion';
import { getFoodByName } from '@/lib/indian-foods';
import { getAdjustedMealTarget, getMissedMeals, getNextMealType, redistributeMissedMeal, getGapSuggestions, type MealTarget } from '@/lib/meal-targets';
import { toast } from 'sonner';
import SmartRedistributionSheet from '@/components/SmartRedistributionSheet';
import MissedMealEducation from '@/components/MissedMealEducation';
import EditMealTargetModal from '@/components/EditMealTargetModal';
import { wasEducationShown } from '@/lib/education-service';
import { isRedistributed, getRedistributionDetails, markRedistributed, undoRedistribution } from '@/lib/redistribution-service';
import WeatherNudgeCard from '@/components/WeatherNudgeCard';
import { getMealDetailNudge } from '@/lib/weather-nudge-service';
import SmartAdjustmentCard from '@/components/SmartAdjustmentCard';
import ManualAdjustmentSheet from '@/components/ManualAdjustmentSheet';
import { computeSmartAdjustment, applySmartAdjustment, type AdjustmentResult } from '@/lib/smart-adjustment';
import { resolveMealVisualState } from '@/lib/meal-state-service';
import PESBreakdownModal from '@/components/PESBreakdownModal';
import { getBudgetSettings } from '@/lib/expense-store';
import { syncDailyBalance, getContextualMealToast, getDinnerNotificationSummary } from '@/lib/calorie-correction';
import AdjustmentExplanationModal from '@/components/AdjustmentExplanationModal';

interface Props {
  open: boolean;
  onClose: () => void;
  mealType: string;
  mealLabel: string;
  date: string;
  onChanged: () => void;
}

export default function MealDetailSheet({ open, onClose, mealType, mealLabel, date, onChanged }: Props) {
  const navigate = useNavigate();
  const profile = getProfile();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'camera' | 'voice' | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemMealId, setEditingItemMealId] = useState<string | null>(null);
  const [showRedistributeConfirm, setShowRedistributeConfirm] = useState(false);
  const [showSmartRedistribute, setShowSmartRedistribute] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [showEditTarget, setShowEditTarget] = useState(false);
  const [showManualAdjust, setShowManualAdjust] = useState(false);
  const [adjustmentResult, setAdjustmentResult] = useState<AdjustmentResult | null>(null);
  const [adjustmentDismissed, setAdjustmentDismissed] = useState(false);
  const [pendingPESItem, setPendingPESItem] = useState<FoodItem | null>(null);
  const [showPESBreakdown, setShowPESBreakdown] = useState(false);
  const [, setTick] = useState(0);
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  const log = getDailyLog(date);
  const meals = log.meals.filter(m => m.type === mealType);
  const allItems = meals.flatMap(m => m.items.map(item => ({ ...item, mealId: m.id })));
  // Recompute from items to avoid stale stored totals
  const totalCal = meals.reduce((s, m) => s + m.items.reduce((is, i) => is + (i.calories || 0) * (i.quantity || 1), 0), 0);
  const totalP = meals.reduce((s, m) => s + m.items.reduce((is, i) => is + (i.protein || 0) * (i.quantity || 1), 0), 0);
  const totalC = meals.reduce((s, m) => s + m.items.reduce((is, i) => is + (i.carbs || 0) * (i.quantity || 1), 0), 0);
  const totalF = meals.reduce((s, m) => s + m.items.reduce((is, i) => is + (i.fat || 0) * (i.quantity || 1), 0), 0);
  const totalItemCost = allItems.reduce((s, i) => s + (i.itemCost || 0), 0);
  const mealCostAmount = meals.reduce((s, m) => s + (m.cost?.amount || 0), 0);
  const displayTotalCost = totalItemCost > 0 ? totalItemCost : mealCostAmount;

  const feedback = getMealFeedback(
    meals.flatMap(m => m.items), totalCal, totalP, totalC, totalF, profile, mealType
  );

  const colorMap = {
    green: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    yellow: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
    red: 'bg-destructive/10 border-destructive/30 text-destructive',
  };
  const dotColorMap = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-destructive',
  };

  // Meal targets from profile
  const mealTarget: MealTarget | null = profile ? getAdjustedMealTarget(profile, mealType, date) : null;
  const goalP = mealTarget?.protein || 25;
  const goalC = mealTarget?.carbs || 60;
  const goalF = mealTarget?.fat || 18;
  const goalCal = mealTarget?.calories || 500;

  // Gap analysis
  const gapCal = Math.max(0, goalCal - totalCal);
  const gapP = Math.max(0, goalP - totalP);
  const gapC = Math.max(0, goalC - totalC);
  const gapF = Math.max(0, goalF - totalF);
  const calPct = goalCal > 0 ? Math.min(100, Math.round((totalCal / goalCal) * 100)) : 0;
  const hasGap = gapCal > 0 || gapP > 0;

  // Missed meal detection
  const missedMeals = getMissedMeals(log);
  const isMissed = allItems.length === 0 && missedMeals.includes(mealType);
  const nextMeal = getNextMealType(mealType);
  const nextMealLabel = nextMeal === 'lunch' ? 'Lunch' : nextMeal === 'dinner' ? 'Dinner' : nextMeal === 'snack' ? 'Snacks' : null;

  // Redistribution guard
  const alreadyRedistributed = isRedistributed(date, mealType);
  const redistributionInfo = alreadyRedistributed ? getRedistributionDetails(date, mealType) : null;

  // AI suggestions
  const suggestions = hasGap ? getGapSuggestions({ calories: gapCal, protein: gapP, carbs: gapC, fat: gapF }) : [];

  // Smart adjustment: compute deviation when meal has items
  const smartAdj = useMemo(() => {
    if (!profile || allItems.length === 0 || adjustmentDismissed) return null;
    return computeSmartAdjustment(profile, mealType, totalCal, date, allItems);
  }, [profile, mealType, totalCal, date, allItems.length, adjustmentDismissed, allItems]);

  function handleRedistribute() {
    if (!profile || !nextMeal) return;
    // Double-check at execution time to prevent double redistribution
    if (isRedistributed(date, mealType)) {
      toast.error('This meal has already been redistributed.');
      setShowRedistributeConfirm(false);
      return;
    }
    redistributeMissedMeal(profile, mealType, nextMeal, date);
    // Mark as redistributed with simple allocation info
    const target = getAdjustedMealTarget(profile, mealType, date);
    markRedistributed(date, mealType, [{
      mealType: nextMeal,
      label: nextMealLabel || nextMeal,
      addedCalories: target.calories,
      addedProtein: target.protein,
      addedCarbs: target.carbs,
      addedFat: target.fat,
      originalTarget: target,
    }]);
    toast.success(`${mealLabel} calories added to ${nextMealLabel}!`);
    setShowRedistributeConfirm(false);
    onChanged();
    forceUpdate();
  }

  function handleUndoRedistribution() {
    const success = undoRedistribution(date, mealType);
    if (success) {
      toast.success(`Redistribution reversed for ${mealLabel}. You can now log your meal.`);
      onChanged();
      forceUpdate();
    } else {
      toast.error('Could not undo redistribution.');
    }
  }

  function handleSmartRedistribute() {
    setShowRedistributeConfirm(false);
    if (!wasEducationShown(date, mealType)) {
      setShowEducation(true);
    } else {
      setShowSmartRedistribute(true);
    }
  }
  

  function handleDeleteItem(itemId: string) {
    const updatedLog = { ...log };
    updatedLog.meals = updatedLog.meals.map(m => {
      if (m.type !== mealType) return m;
      const filtered = m.items.filter(i => i.id !== itemId);
      return {
        ...m,
        items: filtered,
        totalCalories: filtered.reduce((s, i) => s + i.calories * i.quantity, 0),
        totalProtein: filtered.reduce((s, i) => s + i.protein * i.quantity, 0),
        totalCarbs: filtered.reduce((s, i) => s + i.carbs * i.quantity, 0),
        totalFat: filtered.reduce((s, i) => s + i.fat * i.quantity, 0),
      };
    }).filter(m => m.items.length > 0);
    saveDailyLog(updatedLog);
    syncDailyBalance(updatedLog, profile);
    const mealToast = getContextualMealToast();
    if (mealToast) toast(mealToast.message, { duration: 4000 });
    // Dinner notification on delete
    if (mealType === 'dinner') {
      const dinnerKey = `nutrilens_dinner_notif_${date}`;
      localStorage.removeItem(dinnerKey);
      const updatedTotals2 = { eaten: updatedLog.meals.reduce((s, m) => s + m.totalCalories, 0) };
      const origTarget = profile?.dailyCalories || 1600;
      const summary = getDinnerNotificationSummary(date, updatedTotals2.eaten, origTarget);
      if (summary) {
        toast('Plan updated ⚖️', { description: summary.message, duration: 8000, action: { label: 'Details', onClick: () => setAdjModalOpen(true) } });
        localStorage.setItem(dinnerKey, '1');
      }
    }
    setDeleteId(null);
    onChanged();
    forceUpdate();
  }

  function handleUpdateQty(mealId: string, itemId: string, delta: number) {
    const updatedLog = { ...log };
    updatedLog.meals = updatedLog.meals.map(m => {
      if (m.id !== mealId) return m;
      // Only update quantity — per-unit nutrition values stay unchanged
      const items = m.items.map(i => {
        if (i.id !== itemId) return i;
        return { ...i, quantity: Math.max(0.5, i.quantity + delta * 0.5) };
      });
      return {
        ...m,
        items,
        totalCalories: items.reduce((s, i) => s + i.calories * i.quantity, 0),
        totalProtein: items.reduce((s, i) => s + i.protein * i.quantity, 0),
        totalCarbs: items.reduce((s, i) => s + i.carbs * i.quantity, 0),
        totalFat: items.reduce((s, i) => s + i.fat * i.quantity, 0),
      };
    });
    saveDailyLog(updatedLog);
    syncDailyBalance(updatedLog, profile);
    const mealToast = getContextualMealToast();
    if (mealToast) toast(mealToast.message, { duration: 4000 });
    onChanged();
    forceUpdate();
  }

  function handleUpdateItemFromEdit(mealId: string, itemId: string, updates: { quantity: number; unit: string; itemCost?: number; itemSource?: import('@/lib/store').MealSourceCategory }) {
    const updatedLog = { ...log };
    updatedLog.meals = updatedLog.meals.map(m => {
      if (m.id !== mealId) return m;
      const items = m.items.map(i => {
        if (i.id !== itemId) return i;
        // Recalculate nutrition if per100g available
        if (i.per100g && i.unitOptions) {
          const nutrition = calculateNutrition(i.per100g, 1, updates.unit, i.unitOptions);
          return {
            ...i,
            quantity: updates.quantity,
            unit: updates.unit,
            itemCost: updates.itemCost,
            itemSource: updates.itemSource,
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbs: nutrition.carbs,
            fat: nutrition.fat,
            fiber: nutrition.fiber,
            estimatedWeightGrams: nutrition.totalGrams,
          };
        }
        return { ...i, ...updates };
      });
      // Update meal cost from item costs
      const itemCostTotal = items.reduce((s, i) => s + (i.itemCost || 0), 0);
      return {
        ...m,
        items,
        totalCalories: items.reduce((s, i) => s + i.calories * i.quantity, 0),
        totalProtein: items.reduce((s, i) => s + i.protein * i.quantity, 0),
        totalCarbs: items.reduce((s, i) => s + i.carbs * i.quantity, 0),
        totalFat: items.reduce((s, i) => s + i.fat * i.quantity, 0),
        cost: itemCostTotal > 0 ? { amount: itemCostTotal, currency: '₹' } : m.cost,
      };
    });
    saveDailyLog(updatedLog);
    onChanged();
    forceUpdate();
  }

  function handleAddItem(item: FoodItem) {
    // Check if item has cost info for PES display
    const itemCost = item.itemCost || 0;
    if (itemCost > 0) {
      // Show PES breakdown before saving
      setPendingPESItem(item);
      setShowPESBreakdown(true);
      setAddSheetOpen(false);
      return;
    }
    // No cost → save directly
    saveItemToMeal(item);
  }

  function saveItemToMeal(item: FoodItem) {
    const updatedLog = { ...log };
    const existingMeal = updatedLog.meals.find(m => m.type === mealType);
    if (existingMeal) {
      existingMeal.items.push(item);
      existingMeal.totalCalories = existingMeal.items.reduce((s, i) => s + i.calories * i.quantity, 0);
      existingMeal.totalProtein = existingMeal.items.reduce((s, i) => s + i.protein * i.quantity, 0);
      existingMeal.totalCarbs = existingMeal.items.reduce((s, i) => s + i.carbs * i.quantity, 0);
      existingMeal.totalFat = existingMeal.items.reduce((s, i) => s + i.fat * i.quantity, 0);
    } else {
      const newMeal: MealEntry = {
        id: Date.now().toString(),
        type: mealType as MealEntry['type'],
        items: [item],
        totalCalories: item.calories * item.quantity,
        totalProtein: item.protein * item.quantity,
        totalCarbs: item.carbs * item.quantity,
        totalFat: item.fat * item.quantity,
        time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      };
      updatedLog.meals.push(newMeal);
    }
    saveDailyLog(updatedLog);
    syncDailyBalance(updatedLog, profile);
    const mealToast = getContextualMealToast();
    if (mealToast) toast(mealToast.message, { duration: 4000 });
    // Dinner notification on add
    if (mealType === 'dinner') {
      const dinnerKey = `nutrilens_dinner_notif_${date}`;
      localStorage.removeItem(dinnerKey);
      const addTotals = { eaten: updatedLog.meals.reduce((s, m) => s + m.totalCalories, 0) };
      const origTarget = profile?.dailyCalories || 1600;
      const summary = getDinnerNotificationSummary(date, addTotals.eaten, origTarget);
      if (summary) {
        toast('Plan updated ⚖️', { description: summary.message, duration: 8000, action: { label: 'Details', onClick: () => setAdjModalOpen(true) } });
        localStorage.setItem(dinnerKey, '1');
      }
    }
    setAddSheetOpen(false);
    setPendingPESItem(null);
    setShowPESBreakdown(false);
    onChanged();
    forceUpdate();
  }

  function handleAddAction(mode: 'camera' | 'voice' | 'search') {
    if (mode === 'search') {
      setAddSheetOpen(true);
    } else {
      onClose();
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const dateParam = date !== todayStr ? `&date=${date}` : '';
      navigate(`/log?meal=${mealType}${dateParam}`);
    }
  }

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[88vh] flex flex-col p-0">
          {/* Header */}
          {(() => {
            const visualState = resolveMealVisualState(totalCal, goalCal, allItems.length, date, mealType);
            return (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">{mealLabel}</p>
                    {meals[0]?.source?.category && (
                      <span className="text-xs font-medium text-muted-foreground">
                        · {getSourceEmoji(meals[0].source.category)} {getSourceLabel(meals[0].source.category)}
                      </span>
                    )}
                    {/* Status Pill */}
                    {visualState.state !== 'empty' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${visualState.pillClass}`}>
                        {visualState.icon} {visualState.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
                    {displayTotalCost > 0 && (
                      <span className="text-[11px] font-medium text-accent">
                        ₹{displayTotalCost}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-foreground">{totalCal}{mealTarget ? `/${goalCal}` : ''} kcal</span>
                  {mealTarget && <span className="text-[10px] text-muted-foreground">{goalP}g protein goal</span>}
                </div>
              </div>
            );
          })()}

          {/* Target Progress Bar */}
          {mealTarget && (() => {
            const vs = resolveMealVisualState(totalCal, goalCal, allItems.length, date, mealType);
            return (
              <div className="px-4 pt-2 pb-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <Progress value={Math.min(calPct, 100)} className={`h-2 flex-1 ${vs.progressClass}`} />
                  <span className={`text-xs font-semibold ${vs.colorClass}`}>{calPct}%</span>
                  <button
                    onClick={() => setShowEditTarget(true)}
                    className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                    title="Edit target"
                  >
                    <Settings2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                {hasGap && allItems.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Still need: <span className="font-medium text-foreground">{gapCal} kcal</span>
                    {gapP > 0 && <>, <span className="font-medium text-coral">{Math.round(gapP)}g protein</span></>}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Missed Meal Banner */}
          {isMissed && !alreadyRedistributed && (
            <div className="mx-4 mt-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-xs font-semibold text-destructive mb-1">You missed {mealLabel}</p>
              <p className="text-[11px] text-muted-foreground mb-2">Redistribute these calories to remaining meals?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSmartRedistribute}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-semibold active:scale-95 transition-transform"
                >
                  ✨ Smart Redistribute <ArrowRight className="w-3 h-3" />
                </button>
                {nextMeal && nextMealLabel && (
                  <button
                    onClick={() => setShowRedistributeConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold active:scale-95 transition-transform"
                  >
                    Quick → {nextMealLabel}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Redistributed Summary Banner */}
          {isMissed && alreadyRedistributed && redistributionInfo && (
            <div className="mx-4 mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">✅</span>
                <p className="text-xs font-semibold text-foreground">{mealLabel} – Redistributed</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Calories were redistributed to other meals:
              </p>
              <div className="space-y-1">
                {redistributionInfo.allocations.map(a => (
                  <div key={a.mealType} className="flex items-center justify-between px-2 py-1 rounded-lg bg-card border border-border">
                    <span className="text-[11px] font-medium text-foreground">{a.label}</span>
                    <span className="text-[11px] font-bold text-primary">+{a.addedCalories} kcal · +{a.addedProtein}g protein</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleUndoRedistribution}
                  className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold active:scale-95 transition-transform"
                >
                  ↩️ Undo & Log {mealLabel}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Already redistributed. Tap undo if you actually ate this meal.
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {/* Food Items */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Food Items ({allItems.length})
              </p>
              <AnimatePresence mode="popLayout">
                {allItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 mb-1.5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-base shrink-0">
                      {item.emoji || '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <button
                          onClick={() => { setEditingItemId(item.id); setEditingItemMealId(item.mealId); }}
                          className="w-5 h-5 rounded-md hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors"
                          title="Edit item"
                        >
                          <Pencil className="w-3 h-3 text-primary" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {item.quantity} {item.unit}
                        {item.estimatedWeightGrams ? ` · ~${item.estimatedWeightGrams}g` : ''}
                        {' · '}{item.calories} kcal
                        {item.itemCost ? ` · ₹${item.itemCost}` : ''}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        P:{Math.round(item.protein)}g · C:{Math.round(item.carbs)}g · F:{Math.round(item.fat)}g
                        {item.fiber ? ` · Fiber:${Math.round(item.fiber)}g` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(item.mealId, item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Minus className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <span className="text-xs font-semibold w-7 text-center text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.mealId, item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Plus className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center ml-0.5 active:scale-90 transition-transform"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {allItems.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No items logged yet</p>
              )}
            </div>

            {/* Source Tag */}
            {meals[0]?.source?.category && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
                <span className="text-lg">{getSourceEmoji(meals[0].source.category)}</span>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Source</p>
                  <p className="text-sm font-medium text-foreground">{getSourceLabel(meals[0].source.category)}</p>
                </div>
                {meals[0]?.restaurantName && (
                  <span className="text-xs text-muted-foreground ml-auto">@ {meals[0].restaurantName}</span>
                )}
                {displayTotalCost > 0 && (
                  <span className="text-xs font-semibold text-accent ml-auto">
                    ₹{displayTotalCost}
                  </span>
                )}
              </div>
            )}

            {/* Cooking Method Tag */}
            {meals[0]?.cookingMethod && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
                <span className="text-lg">{getCookingMethodEmoji(meals[0].cookingMethod)}</span>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cooking Method</p>
                  <p className="text-sm font-medium text-foreground">{getCookingMethodLabel(meals[0].cookingMethod)}</p>
                </div>
              </div>
            )}

            {allItems.length > 0 && (
              <div className="rounded-xl bg-card border border-border p-3 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Meal Summary</p>
                {/* Cost summary */}
                {displayTotalCost > 0 && (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-accent/10 mb-1">
                    <span className="text-[11px] font-semibold text-accent">Total Cost</span>
                    <span className="text-sm font-bold text-accent">₹{displayTotalCost}</span>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-base font-bold text-foreground">{totalCal}</p>
                    <p className="text-[9px] text-muted-foreground">kcal</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-coral">{Math.round(totalP)}g</p>
                    <p className="text-[9px] text-muted-foreground">Protein</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-primary">{Math.round(totalC)}g</p>
                    <p className="text-[9px] text-muted-foreground">Carbs</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-accent">{Math.round(totalF)}g</p>
                    <p className="text-[9px] text-muted-foreground">Fat</p>
                  </div>
                </div>

                {/* Macro progress bars */}
                <div className="space-y-2 pt-1">
                  <MacroBar label="Protein" current={totalP} goal={goalP} color="bg-coral" />
                  <MacroBar label="Carbs" current={totalC} goal={goalC} color="bg-primary" />
                  <MacroBar label="Fat" current={totalF} goal={goalF} color="bg-accent" />
                </div>

                {/* Remaining needs */}
                {feedback.remaining && (feedback.remaining.protein > 0 || feedback.remaining.carbs > 0) && (
                  <div className="pt-1 border-t border-border">
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Still need: {feedback.remaining.protein > 0 && <span className="font-medium text-coral">{feedback.remaining.protein}g protein</span>}
                      {feedback.remaining.protein > 0 && feedback.remaining.carbs > 0 && ' · '}
                      {feedback.remaining.carbs > 0 && <span className="font-medium text-primary">{feedback.remaining.carbs}g carbs</span>}
                      {(feedback.remaining.protein > 0 || feedback.remaining.carbs > 0) && feedback.remaining.fat > 0 && ' · '}
                      {feedback.remaining.fat > 0 && <span className="font-medium text-accent">{feedback.remaining.fat}g fat</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Gap Analysis & AI Suggestions */}

            {/* Smart Adjustment Card */}
            {smartAdj && !adjustmentDismissed && allItems.length > 0 && (
              <SmartAdjustmentCard
                result={smartAdj}
                mealLabel={mealLabel}
                onAdjustManually={() => {
                  applySmartAdjustment(smartAdj, date);
                  setAdjustmentResult(smartAdj);
                  setShowManualAdjust(true);
                }}
                onDismiss={() => {
                  applySmartAdjustment(smartAdj, date);
                  setAdjustmentDismissed(true);
                  onChanged();
                  forceUpdate();
                  toast.success('Meal targets adjusted automatically');
                }}
              />
            )}

            {hasGap && suggestions.length > 0 && allItems.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">🎯</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground mb-1">Fill the Gap</p>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      You need {gapCal} more kcal{gapP > 0 ? ` and ${Math.round(gapP)}g protein` : ''}. Try adding:
                    </p>
                    <div className="space-y-1.5">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            // Look up real nutrition from food database
                            const dbFood = getFoodByName(s.name);
                            const item: FoodItem = {
                              id: Date.now().toString() + i,
                              name: s.name,
                              calories: dbFood ? dbFood.calories : s.calories,
                              protein: dbFood ? dbFood.protein : s.protein,
                              carbs: dbFood ? dbFood.carbs : Math.round(s.calories * 0.4 / 4),
                              fat: dbFood ? dbFood.fat : Math.round(s.calories * 0.3 / 9),
                              quantity: 1,
                              unit: s.portion,
                              emoji: s.emoji,
                            };
                            handleAddItem(item);
                          }}
                          className="flex items-center gap-2 w-full p-2 rounded-lg bg-card hover:bg-muted/60 transition-colors text-left active:scale-[0.98]"
                        >
                          <span className="text-base">{s.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">{s.portion} · {s.calories} kcal · {s.protein}g protein</p>
                          </div>
                          <Plus className="w-4 h-4 text-primary shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Weather-Aware Smart Tip */}
            {allItems.length > 0 && (() => {
              const weatherNudge = getMealDetailNudge(allItems, mealType);
              if (!weatherNudge) return null;
              return (
                <WeatherNudgeCard
                  mealItems={allItems}
                  compact
                  onAddFood={(food) => {
                    // Look up real nutrition from food database
                    const dbFood = getFoodByName(food.name);
                    const item: FoodItem = {
                      id: Date.now().toString(),
                      name: food.name,
                      calories: dbFood ? dbFood.calories : food.calories,
                      protein: dbFood ? dbFood.protein : Math.round(food.calories * 0.15 / 4),
                      carbs: dbFood ? dbFood.carbs : Math.round(food.calories * 0.5 / 4),
                      fat: dbFood ? dbFood.fat : Math.round(food.calories * 0.35 / 9),
                      quantity: 1,
                      unit: 'serving',
                      emoji: food.emoji,
                    };
                    handleAddItem(item);
                  }}
                />
              );
            })()}

            {/* AI Coach Feedback */}
            {allItems.length > 0 && (
              <div className={`rounded-xl border p-3 ${colorMap[feedback.color]}`}>
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">🤖</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold mb-1">AI Coach Insight</p>
                    <p className="text-xs leading-relaxed">{feedback.message}</p>
                    {feedback.suggestions.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {feedback.suggestions.map((s, i) => (
                          <li key={i} className="text-[11px] flex items-start gap-1">
                            <span>💡</span> {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Suggested Foods */}
                {feedback.suggestedFoods.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-current/10">
                    <p className="text-[10px] font-semibold mb-1.5">Suggested additions:</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {feedback.suggestedFoods.map((food, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-card/60 text-[11px] font-medium">
                          {food.emoji} {food.name} <span className="opacity-60">{food.reason}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Health Condition Coaching */}
            {allItems.length > 0 && (() => {
              const conditionFeedback = evaluateConditions(
                meals.flatMap(m => m.items), totalC, totalP, totalF, totalCal, profile
              );
              const conditions = getUserConditions(profile);
              if (conditionFeedback.messages.length === 0 || conditions.length === 0) return null;

              const condColorMap = {
                green: 'bg-emerald-500/10 border-emerald-500/30',
                yellow: 'bg-amber-500/10 border-amber-500/30',
                red: 'bg-destructive/10 border-destructive/30',
              };
              const typeStyles = {
                warning: 'text-destructive',
                caution: 'text-amber-700 dark:text-amber-400',
                positive: 'text-emerald-700 dark:text-emerald-400',
              };

              return (
                <div className={`rounded-xl border p-3 ${condColorMap[conditionFeedback.overallColor]}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5">🩺</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold mb-1 text-foreground">Health Condition Insights</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {conditions.map(c => (
                          <span key={c} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground capitalize">
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {conditionFeedback.messages.slice(0, 4).map((msg, i) => (
                          <div key={i} className={`text-[11px] leading-relaxed flex items-start gap-1.5 ${typeStyles[msg.type]}`}>
                            <span className="shrink-0">{msg.icon}</span>
                            <span>{msg.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Bottom: Add More Options */}
          <div className="px-4 py-3 border-t border-border space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Add More Food</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAddAction('camera')}
                className="h-11 rounded-xl bg-primary/10 text-primary font-medium text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Camera className="w-4 h-4" /> Camera
              </button>
              <button
                onClick={() => handleAddAction('voice')}
                className="h-11 rounded-xl bg-secondary/10 text-secondary font-medium text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Mic className="w-4 h-4" /> Voice
              </button>
              <button
                onClick={() => handleAddAction('search')}
                className="h-11 rounded-xl bg-accent/10 text-accent font-medium text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the item from your meal log.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteItem(deleteId)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Redistribute confirmation */}
      <AlertDialog open={showRedistributeConfirm} onOpenChange={v => { if (!v) setShowRedistributeConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redistribute {mealLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              Add {goalCal} kcal from {mealLabel} to {nextMealLabel || 'the next meal'}? Your {nextMealLabel} target will increase. This only affects today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRedistribute}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Smart Redistribution Sheet */}
      {profile && (
        <SmartRedistributionSheet
          open={showSmartRedistribute}
          onClose={() => setShowSmartRedistribute(false)}
          profile={profile}
          missedMealType={mealType}
          missedMealLabel={mealLabel}
          date={date}
          onApplied={() => { onChanged(); forceUpdate(); }}
        />
      )}

      {/* Educational Pop-up */}
      <MissedMealEducation
        open={showEducation}
        onClose={() => { setShowEducation(false); setShowSmartRedistribute(true); }}
        goal={profile?.goal || 'maintain'}
        mealType={mealType}
        mealLabel={mealLabel}
        date={date}
        userName={profile?.name}
      />

      {/* Edit Meal Target Modal */}
      {profile && (
        <EditMealTargetModal
          open={showEditTarget}
          onClose={() => setShowEditTarget(false)}
          profile={profile}
          mealType={mealType}
          mealLabel={mealLabel}
          date={date}
          onSaved={() => { onChanged(); forceUpdate(); }}
        />
      )}


      <AddFoodSheet open={addSheetOpen} onOpenChange={setAddSheetOpen} onAdd={handleAddItem} />

      {/* Manual Adjustment Sheet */}
      {profile && adjustmentResult && (
        <ManualAdjustmentSheet
          open={showManualAdjust}
          onClose={() => setShowManualAdjust(false)}
          profile={profile}
          deviation={adjustmentResult.deviation}
          remainingMeals={adjustmentResult.adjustments.map(a => a.mealType)}
          date={date}
          onApplied={() => {
            setAdjustmentDismissed(true);
            onChanged();
            forceUpdate();
          }}
        />
      )}

      {/* Food Edit Modal for per-item editing */}
      {editingItemId && editingItemMealId && (() => {
        const editItem = allItems.find(i => i.id === editingItemId);
        if (!editItem) return null;
        // Get or build per100g and unitOptions
        const dbFood = getFoodByName(editItem.name);
        const per100g = editItem.per100g || (dbFood
          ? { calories: dbFood.calories, protein: dbFood.protein, carbs: dbFood.carbs, fat: dbFood.fat, fiber: dbFood.fiber }
          : { calories: editItem.calories, protein: editItem.protein, carbs: editItem.carbs, fat: editItem.fat });
        const unitOptions = editItem.unitOptions || (dbFood
          ? getUnitOptionsForFood(dbFood.id, dbFood.category, dbFood.defaultServing, dbFood.servingUnit)
          : getUnitOptionsForFood('custom', 'Snacks', editItem.estimatedWeightGrams || 100, editItem.unit || 'serving'));
        return (
          <FoodEditModal
            open={true}
            onOpenChange={(open) => { if (!open) { setEditingItemId(null); setEditingItemMealId(null); } }}
            item={{
              id: editItem.id,
              name: editItem.name,
              quantity: editItem.quantity,
              unit: editItem.unit,
              per100g,
              unitOptions,
              itemCost: editItem.itemCost,
              itemSource: editItem.itemSource,
            }}
            onSave={(updates) => {
              handleUpdateItemFromEdit(editingItemMealId, editItem.id, updates);
              setEditingItemId(null);
              setEditingItemMealId(null);
            }}
          />
        );
      })()}

      {/* PES Breakdown Modal for manual food adds */}
      {pendingPESItem && (
        <PESBreakdownModal
          open={showPESBreakdown}
          food={{
            name: pendingPESItem.name,
            cost: pendingPESItem.itemCost || 0,
            protein: Math.round(pendingPESItem.protein * pendingPESItem.quantity),
            carbs: Math.round(pendingPESItem.carbs * pendingPESItem.quantity),
            fat: Math.round(pendingPESItem.fat * pendingPESItem.quantity),
            calories: Math.round(pendingPESItem.calories * pendingPESItem.quantity),
          }}
          mealLabel={mealLabel}
          onConfirm={() => saveItemToMeal(pendingPESItem)}
          onEdit={() => {
            setShowPESBreakdown(false);
            setPendingPESItem(null);
          }}
        />
      )}
      <AdjustmentExplanationModal open={adjModalOpen} onClose={() => setAdjModalOpen(false)} />
    </>
  );
}

function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const over = current > goal;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-12">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-medium ${over ? 'text-destructive' : 'text-muted-foreground'}`}>{pct}%</span>
    </div>
  );
}
