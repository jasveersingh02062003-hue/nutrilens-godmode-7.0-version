import { useState, useMemo } from 'react';
import { Plus, ChevronRight, AlertTriangle, Check, Dumbbell, SkipForward } from 'lucide-react';
import { DailyLog, getTodayKey } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { getMealHealthColor } from '@/lib/meal-feedback';
import { getSourceEmoji, getSourceLabel } from '@/lib/context-learning';
import { scoreUnifiedMeal, userHasHealthConditions } from '@/lib/health-score';
import { useUserProfile } from '@/contexts/UserProfileContext';
import HealthBadge from '@/components/HealthBadge';
import MealDetailSheet from '@/components/MealDetailSheet';
import LoggingOptionsSheet from '@/components/LoggingOptionsSheet';
import { getMissedMeals } from '@/lib/meal-targets';
import { Progress } from '@/components/ui/progress';
import { isRedistributed, getAllRedistributionDetailsForDate } from '@/lib/redistribution-service';
import { resolveMealVisualState } from '@/lib/meal-state-service';
import { getExerciseAdjustmentSummary } from '@/lib/exercise-adjustment';
import { motion } from 'framer-motion';
import { DayState, skipMeal as engineSkipMeal } from '@/lib/calorie-engine';
import { getRemainingMealBudget } from '@/lib/meal-suggestion-engine';
import { getEnhancedBudgetSettings } from '@/lib/budget-alerts';
import { getPESForMeal } from '@/lib/pes-engine';
import PESBadge from '@/components/PESBadge';

const mealIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

const mealConfig = [
  { type: 'breakfast', label: 'Breakfast', time: '8:00 AM' },
  { type: 'lunch', label: 'Lunch', time: '1:00 PM' },
  { type: 'dinner', label: 'Dinner', time: '7:00 PM' },
  { type: 'snack', label: 'Snacks', time: 'Anytime' },
] as const;

interface Props {
  log: DailyLog;
  onRefresh?: () => void;
  dayState: DayState;
}

export default function TodayMeals({ log, onRefresh, dayState }: Props) {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const hasConditions = userHasHealthConditions(profile);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{ type: string; label: string } | null>(null);
  const [loggingSheetOpen, setLoggingSheetOpen] = useState(false);
  const [loggingMeal, setLoggingMeal] = useState<{ type: string; label: string } | null>(null);

  const missedMeals = getMissedMeals(log);
  const todayKey = log.date || getTodayKey();
  const allRedistributions = getAllRedistributionDetailsForDate(todayKey);
  const exerciseSummary = getExerciseAdjustmentSummary(todayKey);

  const handleMealTap = (type: string, label: string, hasMeals: boolean) => {
    const mealIsRedistributed = isRedistributed(todayKey, type);
    if (hasMeals || missedMeals.includes(type) || mealIsRedistributed) {
      setSelectedMeal({ type, label });
      setDetailOpen(true);
    } else {
      setLoggingMeal({ type, label });
      setLoggingSheetOpen(true);
    }
  };

  const getMealTime = (type: string, defaultTime: string) => {
    if (!profile?.mealTimes) return defaultTime;
    const times: Record<string, string> = profile.mealTimes as any;
    return times[type === 'snack' ? 'snacks' : type] || defaultTime;
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">Today's Meals</h2>
          <button onClick={() => navigate('/progress')} className="text-xs text-primary font-semibold flex items-center gap-0.5">
            View History <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {mealConfig.map((mc, idx) => {
            const meals = log.meals.filter(m => m.type === mc.type);
            const totalCal = meals.reduce((s, m) => s + m.totalCalories, 0);
            const displayTime = getMealTime(mc.type, mc.time);
            const totalProtein = Math.round(meals.reduce((s, m) => s + m.items.reduce((is, i) => is + (i.protein || 0), 0), 0));
            const totalCarbs = Math.round(meals.reduce((s, m) => s + m.items.reduce((is, i) => is + (i.carbs || 0), 0), 0));
            const totalFat = Math.round(meals.reduce((s, m) => s + m.items.reduce((is, i) => is + (i.fat || 0), 0), 0));
            const healthScore = hasConditions && meals.length > 0
              ? scoreUnifiedMeal(meals.flatMap(m => m.items), totalCarbs, totalProtein, totalFat, totalCal, profile)
              : null;

            // Use engine-computed target from dayState
            const slotName = mc.type === 'snack' ? 'snacks' : mc.type;
            const engineSlot = dayState.slots.find(s => s.name === slotName);
            const target = engineSlot ? { calories: engineSlot.targetKcal, protein: 0, carbs: 0, fat: 0 } : null;
            const calPct = target && target.calories > 0 ? Math.min(200, Math.round((totalCal / target.calories) * 100)) : 0;
            const engineStatus = engineSlot?.status || 'pending';
            const isMissed = engineStatus === 'missed';
            const mealRedistributed = isRedistributed(todayKey, mc.type);

            // Visual state
            const stateInfo = resolveMealVisualState(
              totalCal,
              target?.calories || 0,
              meals.flatMap(m => m.items).length,
              todayKey,
              mc.type
            );

            // Received redistributions
            const receivedFrom: { source: string; calories: number }[] = [];
            for (const [sourceMeal, info] of Object.entries(allRedistributions)) {
              for (const alloc of info.allocations) {
                if (alloc.mealType === mc.type) {
                  receivedFrom.push({ source: sourceMeal, calories: alloc.addedCalories });
                }
              }
            }

            return (
              <motion.button
                key={mc.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                onClick={() => handleMealTap(mc.type, mc.label, meals.length > 0)}
                className={`relative p-3 flex items-center gap-3 w-full text-left group rounded-xl border transition-all duration-300
                  ${stateInfo.state !== 'empty' ? `border-l-[3px] ${stateInfo.borderClass} ${stateInfo.bgClass}` : 'border-border'}
                  ${isMissed && !mealRedistributed ? 'border-status-danger/40' : mealRedistributed ? 'border-primary/30' : ''}
                  bg-card hover:shadow-md`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl">
                    {mealIcons[mc.type]}
                  </div>
                  {isMissed && !mealRedistributed && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-danger flex items-center justify-center">
                      <AlertTriangle className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  {isMissed && mealRedistributed && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{mc.label}</p>
                    <span className="text-[10px] text-muted-foreground">{displayTime}</span>
                    {isMissed && !mealRedistributed && <span className="text-[9px] font-semibold text-status-danger">Missed</span>}
                    {isMissed && mealRedistributed && <span className="text-[9px] font-semibold text-primary">Redistributed</span>}
                    {/* Status badge */}
                    {stateInfo.state !== 'empty' && !isMissed && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${stateInfo.pillClass}`}>
                        {stateInfo.icon} {stateInfo.label}
                      </span>
                    )}
                  </div>
                  {meals.length > 0 ? (
                    <div className="mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{meals.flatMap(m => m.items.map(i => i.name)).join(', ')}</p>
                      {/* Progress bar with state color */}
                      {target && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1">
                            <Progress value={Math.min(calPct, 100)} className={`h-1.5 ${stateInfo.progressClass}`} />
                          </div>
                          <span className={`text-[10px] font-semibold ${stateInfo.colorClass}`}>{calPct}%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {(() => {
                          const lastSource = meals.find(m => m.source?.category)?.source?.category;
                          return lastSource ? (
                            <span className="text-[10px] text-muted-foreground/70">
                              {getSourceEmoji(lastSource)} {getSourceLabel(lastSource)}
                            </span>
                          ) : null;
                        })()}
                        {(() => {
                          const mealCost = meals.reduce((s, m) => {
                            if (m.cost?.amount) return s + m.cost.amount;
                            return s + m.items.reduce((is, i) => is + (i.itemCost || 0), 0);
                          }, 0);
                          const enhanced = getEnhancedBudgetSettings();
                          const slotKey = mc.type === 'snack' ? 'snacks' : mc.type;
                          const mealBudget = enhanced.perMeal ? (enhanced.perMeal as any)[slotKey] || 0 : 0;
                          const overBudget = mealBudget > 0 && mealCost > mealBudget;
                          return mealCost > 0 ? (
                            <span className={`text-[10px] font-semibold ${overBudget ? 'text-destructive' : 'text-accent'}`}>
                              ₹{mealCost}{mealBudget > 0 ? `/₹${mealBudget}` : ''}
                            </span>
                          ) : mealBudget > 0 ? (
                            <span className="text-[10px] text-muted-foreground">₹0/₹{mealBudget}</span>
                          ) : null;
                        })()}
                        {(() => {
                          // Financial insight for expensive meals
                          const mealCost = meals.reduce((s, m) => s + (m.cost?.amount || 0) + m.items.reduce((is, i) => is + (i.itemCost || 0), 0), 0);
                          if (mealCost >= 100) {
                            const dalMeals = Math.floor(mealCost / 45);
                            return dalMeals >= 2 ? (
                              <span className="text-[9px] text-muted-foreground/60 italic">
                                = {dalMeals} dal-rice meals
                              </span>
                            ) : null;
                          }
                          return null;
                        })()}
                        <span className="text-[10px] text-muted-foreground">{totalCal}{target ? `/${target.calories}` : ''} kcal</span>
                        {receivedFrom.length > 0 && (
                          <span className="text-[10px] font-semibold text-primary">
                            {receivedFrom.map(r => `+${r.calories} from ${r.source}`).join(', ')}
                          </span>
                        )}
                        {/* Exercise adjustment badge */}
                        {exerciseSummary && exerciseSummary.adjustments.find(a => a.mealType === mc.type) && (
                          <span className="text-[10px] font-semibold text-coral flex items-center gap-0.5">
                            <Dumbbell className="w-2.5 h-2.5" />
                            +{exerciseSummary.adjustments.find(a => a.mealType === mc.type)!.added} from exercise
                          </span>
                        )}
                        {totalProtein > 0 && receivedFrom.length === 0 && (
                          <span className="text-[10px] font-semibold text-primary">{totalProtein}g protein</span>
                        )}
                        {healthScore && healthScore.conditionScores.length > 0 && (
                          <HealthBadge score={healthScore} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-0.5">
                      {target && (
                        <p className="text-[10px] text-muted-foreground">
                          Goal: {target.calories} kcal · {target.protein}g protein
                          {receivedFrom.length > 0 && (
                            <span className="font-semibold text-primary ml-1">
                              ({receivedFrom.map(r => `+${r.calories} from ${r.source}`).join(', ')})
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isMissed && mealRedistributed
                          ? 'Redistributed · Tap to view details'
                          : isMissed
                          ? 'Tap to redistribute or add'
                          : 'Tap to add your meal'}
                      </p>
                    </div>
                  )}
                </div>
                {meals.length > 0 ? (
                  <div className="text-right">
                    <div>
                      <span className="text-sm font-bold text-foreground">{totalCal}</span>
                      <span className="text-[10px] text-muted-foreground ml-0.5">kcal</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {engineStatus === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          engineSkipMeal(todayKey, mc.type);
                          onRefresh?.();
                        }}
                        className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                        title="Skip this meal"
                      >
                        <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {selectedMeal && (
        <MealDetailSheet
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          mealType={selectedMeal.type}
          mealLabel={selectedMeal.label}
          date={log.date || getTodayKey()}
          onChanged={() => onRefresh?.()}
        />
      )}

      {loggingMeal && (
        <LoggingOptionsSheet
          open={loggingSheetOpen}
          onClose={() => setLoggingSheetOpen(false)}
          mealType={loggingMeal.type}
          mealLabel={loggingMeal.label}
        />
      )}
    </>
  );
}
