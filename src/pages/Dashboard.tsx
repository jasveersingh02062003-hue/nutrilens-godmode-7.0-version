import { useState, useEffect } from 'react';
import PostOnboardingTutorial from '@/components/PostOnboardingTutorial';
import { runWeeklyAdaptation as runGoalAdaptation, applyAdaptation } from '@/lib/goal-engine';
import { Bell, ClipboardList, X, ShieldAlert } from 'lucide-react';
import AdjustmentExplanationModal from '@/components/AdjustmentExplanationModal';
import MorningRecoveryPrompt from '@/components/MorningRecoveryPrompt';
import MonikaFab from '@/components/MonikaFab';
import TimeInsightCard from '@/components/TimeInsightCard';
import { updateDailyBehaviorStats, runWeeklyAdaptation, isSurvivalModeActive } from '@/lib/behavior-stats';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProteinRescueCard from '@/components/ProteinRescueCard';
import WeeklyWeightCheckIn from '@/components/WeeklyWeightCheckIn';
import RepeatMealsButton from '@/components/RepeatMealsButton';
import { checkDropOff, dismissDropOff, updateLastLogDate } from '@/lib/drop-off-defense';
import { checkWeeklySurplus, applyHardReset, dismissHardBoundary } from '@/lib/hard-boundary';
import CalorieRing from '@/components/CalorieRing';
import MacroCard from '@/components/MacroCard';
import TodayMeals from '@/components/TodayMeals';
import WaterTrackerCompact from '@/components/WaterTrackerCompact';
import SupplementsCompact from '@/components/SupplementsCompact';
import SupplementLogSheet from '@/components/SupplementLogSheet';
import SupplementEditModal from '@/components/SupplementEditModal';
import CaloriesBurnedCard from '@/components/CaloriesBurnedCard';
import { getDailyLog, getDailyTotals, addWater, DailyLog, SupplementEntry, getTodayKey, getProfile as getStoredProfile, saveProfile as saveStoredProfile } from '@/lib/store';
import { recalculateDay } from '@/lib/calorie-engine';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getGreeting } from '@/lib/nutrition';

import TodayMealPlan from '@/components/TodayMealPlan';
import ConsistencyCard from '@/components/ConsistencyCard';
import CoachCard from '@/components/CoachCard';
import WeeklyReportCard from '@/components/WeeklyReportCard';
import BudgetSummaryCard from '@/components/BudgetSummaryCard';
import DailyEfficiencyCard from '@/components/DailyEfficiencyCard';
import NudgeBanner from '@/components/NudgeBanner';
import WeatherNudgeCard from '@/components/WeatherNudgeCard';
import SymptomReminderCard from '@/components/SymptomReminderCard';
import DailyAdjustmentSummary from '@/components/DailyAdjustmentSummary';
import SkinHealthCard from '@/components/SkinHealthCard';
import { checkAndUpdateStreaks } from '@/lib/streaks';
import { applyCarryOver, getPendingCarryOver } from '@/lib/redistribution-service';
import { applyOverageCarryOver } from '@/lib/smart-adjustment';
import { applyCarryForwardToday } from '@/lib/exercise-adjustment';
import RecoveryOptionsCard from '@/components/RecoveryOptionsCard';
import OverspendDecisionSheet from '@/components/OverspendDecisionSheet';
import { isRecoveryModeActive } from '@/lib/decision-engine';
import { toast } from 'sonner';
import { getWeather, fetchLiveWeather, type WeatherData } from '@/lib/weather-service';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import NextMealCard from '@/components/NextMealCard';
import ActivePlanBanner from '@/components/ActivePlanBanner';
import MadhavanPlanBanner from '@/components/MadhavanPlanBanner';
import PlanCompletionModal from '@/components/PlanCompletionModal';
import PlanPromoCard from '@/components/PlanPromoCard';
import { getPlanProgress, getActivePlan, getActivePlanRaw, getExpiredEventPlan, resumeActivePlan, getPlanById } from '@/lib/event-plan-service';
import { isReverseDietActive, getReverseDietWeek } from '@/lib/reverse-diet-service';
import BoostersChecklist from '@/components/BoostersChecklist';
import ActivityTracker from '@/components/ActivityTracker';
import PostEventFeedbackModal from '@/components/PostEventFeedbackModal';
import EventPlanConfigSheet from '@/components/EventPlanConfigSheet';
import TummyInsightCard from '@/components/TummyInsightCard';
import ContextualTipsCard from '@/components/ContextualTipsCard';
import ProfileCompletionNudge from '@/components/ProfileCompletionNudge';
import { getDualSyncInsight, isSurvivalModeManual, getLatestBudgetAlert, clearLatestBudgetAlert, type BudgetAlertResult } from '@/lib/budget-service';
import UpgradeBanner from '@/components/UpgradeBanner';
import { getMealPlannerProfile } from '@/lib/meal-planner-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import DailyPlanCard from '@/components/DailyPlanCard';
import { isDailyHidden, setDailyHidden } from '@/lib/daily-visibility';
import { validateBudgetVsGoals, getUnifiedBudget } from '@/lib/budget-engine';
import PESExplanationCard from '@/components/PESExplanationCard';
import WeeklyFeedbackCard from '@/components/WeeklyFeedbackCard';
import { shouldGenerateSummary, generateWeeklySummary, scheduleWeeklyNotification } from '@/lib/weekly-feedback';
import { hasBrowserPermission, startProactiveChecks } from '@/lib/notifications';
import { processEndOfDay, getAdjustedDailyTarget, getProteinTarget, getCarbTarget, getFatTarget, isTargetAdjusted, getAdherenceScore, getBalanceStreak, getDayType, setDayType, onCalorieBankUpdate, offCalorieBankUpdate, getAdjustmentExplanation, getContextualMealToast, type DayType } from '@/lib/calorie-correction';
import { Flame } from 'lucide-react';
export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, refreshProfile, loadedUserId } = useUserProfile();
  const [log, setLog] = useState<DailyLog>(getDailyLog());
  const totals = getDailyTotals(log);
  const dayState = recalculateDay(profile, log);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<SupplementEntry | null>(null);
  const [editingSupplement, setEditingSupplement] = useState<SupplementEntry | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tutorial_seen'));
  const [showPESExplanation, setShowPESExplanation] = useState(() => !localStorage.getItem('pes_explanation_seen'));
  const [budgetAlert, setBudgetAlert] = useState<(BudgetAlertResult & { timestamp: number; date: string }) | null>(getLatestBudgetAlert());
  const [showCorrectionBadge, setShowCorrectionBadge] = useState(false);
  const [adherenceScore, setAdherenceScore] = useState(0);
  const [balanceStreak, setBalanceStreak] = useState(0);
  const [currentDayType, setCurrentDayType] = useState<DayType>('normal');
  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [missedPromptOpen, setMissedPromptOpen] = useState(false);
  const [missedDate, setMissedDate] = useState('');
  const [dropOffModal, setDropOffModal] = useState<{ detected: boolean; daysMissed: number; message: string } | null>(null);
  const [hardBoundaryModal, setHardBoundaryModal] = useState<{ weeklySurplus: number; message: string; suggestion: string } | null>(null);
  const [showDailyPlan, setShowDailyPlan] = useState(() => !isDailyHidden('daily_plan'));
  const [showPlanComplete, setShowPlanComplete] = useState(() => {
    const progress = getPlanProgress();
    return progress !== null && progress.daysLeft === 0;
  });
  const [expiredEventPlan] = useState(() => getExpiredEventPlan());
  const [showEventFeedback, setShowEventFeedback] = useState(() => !!getExpiredEventPlan());
  const [eventExtendSheet, setEventExtendSheet] = useState(false);

  const plannerProfile = getMealPlannerProfile();
  const plannerIncomplete = !plannerProfile || !plannerProfile.onboardingComplete;
  const plannerDismissKey = `planner_modal_dismissed_${loadedUserId || 'anon'}`;
  const [showPlannerModal, setShowPlannerModal] = useState(() =>
    plannerIncomplete && !localStorage.getItem(plannerDismissKey)
  );
  const showPlannerBanner = plannerIncomplete && !showPlannerModal;

  useEffect(() => {
    if (!profile?.onboardingComplete) navigate('/onboarding');
    // Idempotency guard: only apply carry-overs once per day
    const carryGuardKey = `carry_applied_${getTodayKey()}`;
    if (!localStorage.getItem(carryGuardKey)) {
      localStorage.setItem(carryGuardKey, '1');
      // Apply carry-over from yesterday
      const co = getPendingCarryOver();
      if (co) {
        applyCarryOver(getTodayKey());
        toast.info(`+${co.calories} kcal carried over from yesterday`);
      }
      // Apply overage carry-over from previous day
      const carryResult = applyOverageCarryOver(getTodayKey());
      if (carryResult === 'applied') {
        toast.info('Yesterday\'s overage adjustment applied to today\'s meals');
      }
      // Apply exercise carry-forward from previous day
      const exerciseCarry = applyCarryForwardToday(getTodayKey());
      if (exerciseCarry) {
        toast.info(`📅 Exercise carry-forward: +${exerciseCarry.lunch} lunch, +${exerciseCarry.dinner} dinner`);
      }
    }
    // Fetch live weather
    fetchLiveWeather().then(setWeather).catch(() => {});
    // Update behavioral stats & run weekly adaptation
    updateDailyBehaviorStats();
    const adaptation = runWeeklyAdaptation();
    if (adaptation.adapted) {
      adaptation.changes.forEach(c => toast.info(`📊 ${c}`));
    }
    // Run intelligent goal-engine weekly adaptation
    if (profile) {
      const goalAdapt = runGoalAdaptation(profile);
      if (goalAdapt && goalAdapt.shouldAdjust) {
        const updates = applyAdaptation(profile, goalAdapt.newTargetCalories);
        const current = getStoredProfile();
        if (current) {
          saveStoredProfile({ ...current, ...updates });
          refreshProfile();
          toast.info(`🎯 Target adjusted to ${goalAdapt.newTargetCalories} kcal — ${goalAdapt.reason}`);
        }
      }
    }
    // Smart Calorie Correction Engine — day rollover + toast
    if (profile) {
      processEndOfDay(profile);
      setShowCorrectionBadge(isTargetAdjusted(profile));
      setAdherenceScore(Math.round(getAdherenceScore().score * 100));
      setBalanceStreak(getBalanceStreak());
      setCurrentDayType(getDayType());
      // Morning toast explaining adjustment
      const toastKey = `calorie_toast_${getTodayKey()}`;
      if (!localStorage.getItem(toastKey)) {
        const explanation = getAdjustmentExplanation();
        if (explanation) {
          toast('⚖️ Calories adjusted', {
            description: explanation,
            action: { label: 'Details', onClick: () => setWhyModalOpen(true) },
            duration: 6000,
          });
          localStorage.setItem(toastKey, '1');
        }
      }
    }
    // Weekly feedback engine
    if (shouldGenerateSummary()) {
      const summary = generateWeeklySummary();
      if (hasBrowserPermission()) scheduleWeeklyNotification(summary);
    }
    // Drop-off defense
    const dropOff = checkDropOff();
    if (dropOff.detected) setDropOffModal(dropOff);
    // Hard boundary check
    const boundary = checkWeeklySurplus();
    if (boundary) setHardBoundaryModal(boundary);
    // Morning recovery prompt — check if yesterday had <300 kcal
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const recoveryDismissed = localStorage.getItem(`nutrilens_missed_ack_${yesterdayKey}`);
    if (!recoveryDismissed) {
      const yLog = getDailyLog(yesterdayKey);
      const yTotals = getDailyTotals(yLog);
      if (yTotals.eaten < 300) {
        setMissedDate(yesterdayKey);
        setMissedPromptOpen(true);
      }
    }
    // Update last log date
    updateLastLogDate();
    // Start proactive notification checks
    startProactiveChecks();
  }, [profile, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Midnight rollover check
      const nowKey = getTodayKey();
      if (nowKey !== log.date) window.location.reload();
      setLog(getDailyLog());
      setBudgetAlert(getLatestBudgetAlert());
      const { milestones } = checkAndUpdateStreaks();
      for (const m of milestones) {
        toast.success(`${m.milestone.emoji} ${m.milestone.label}! ${m.type} streak: ${m.milestone.target} days!`);
      }
    }, 10000);

    // Reactive UI sync from calorie correction engine
    const handleBankUpdate = () => {
      setLog(getDailyLog());
      setShowCorrectionBadge(isTargetAdjusted(profile));
      setAdherenceScore(Math.round(getAdherenceScore().score * 100));
      setBalanceStreak(getBalanceStreak());
      setCurrentDayType(getDayType());
    };
    onCalorieBankUpdate(handleBankUpdate);

    // Also listen for nutrilens:update (fired by saveDailyLog centralized recompute)
    const handleGlobalUpdate = () => {
      setLog(getDailyLog());
    };
    window.addEventListener('nutrilens:update', handleGlobalUpdate);
    window.addEventListener('storage', handleGlobalUpdate);
    window.addEventListener('focus', handleGlobalUpdate);

    return () => {
      clearInterval(interval);
      offCalorieBankUpdate(handleBankUpdate);
      window.removeEventListener('nutrilens:update', handleGlobalUpdate);
      window.removeEventListener('storage', handleGlobalUpdate);
      window.removeEventListener('focus', handleGlobalUpdate);
    };
  }, [profile]);

  if (!profile) return null;

  const handleAddWater = () => setLog(addWater());
  const refreshLog = () => setLog(getDailyLog());

  const handleSupplementTap = (s: SupplementEntry) => {
    setSelectedSupplement(s);
    setEditModalOpen(true);
  };

  const handleEditSupplement = (s: SupplementEntry) => {
    setEditingSupplement(s);
    setSheetOpen(true);
  };

  const survivalMode = isSurvivalModeActive() || isSurvivalModeManual();
  const recoveryMode = isRecoveryModeActive();
  const dualSyncInsight = getDualSyncInsight(profile.dailyCalories);

  return (
    <>
    {showTutorial && <PostOnboardingTutorial onDismiss={() => setShowTutorial(false)} />}
    {showPESExplanation && profile?.onboardingComplete && !showTutorial && (
      <PESExplanationCard onDismiss={() => setShowPESExplanation(false)} />
    )}
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* 1. Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              <span className="text-sm font-bold text-primary">{(profile.name || 'U')[0].toUpperCase()}</span>
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground">{getGreeting()}, {profile.name || 'there'}</p>
                <SubscriptionBadge />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Weather indicator */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-card border border-border shadow-sm">
              <span className="text-sm">{weather.icon}</span>
              <span className="text-xs font-semibold text-foreground">{weather.temperature}°</span>
            </div>
            <button className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center relative shadow-sm">
              <Bell className="w-4.5 h-4.5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-coral" />
            </button>
          </div>
        </div>

        {/* Daily Plan Popup (once per day) */}
        {profile && (
          <DailyPlanCard profile={profile} open={showDailyPlan} onDismiss={() => setShowDailyPlan(false)} />
        )}

        {/* Budget insufficient warning */}
        {(() => {
          if (isDailyHidden('budget_warning') || !profile) return null;
          const unified = getUnifiedBudget();
          const bv = validateBudgetVsGoals(unified.monthly, profile.dailyCalories || 2000, profile.dailyProtein || 80);
          if (bv.severity !== 'insufficient') return null;
          return (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Your food budget of ₹{unified.monthly}/month may not cover your nutrition goals</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Recommended minimum: ₹{bv.minMonthly}/month</p>
                </div>
                <button onClick={() => { setDailyHidden('budget_warning'); }} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })()}

        {/* Planner setup banner (persistent until completed) */}
        {showPlannerBanner && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3">
              <ClipboardList className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Complete your plan for accurate tracking</p>
              </div>
              <Button size="sm" className="shrink-0 text-xs h-8" onClick={() => navigate('/planner')}>
                Set Plan
              </Button>
            </div>
          </div>
        )}

        {/* Upgrade Banner (free users only) */}
        <div className="animate-fade-in">
          <UpgradeBanner />
        </div>

        {/* Weather-Aware Nudge */}
        <div className="animate-fade-in">
          <WeatherNudgeCard />
        </div>

        {/* Symptom Reminder */}
        <div className="animate-fade-in">
          <SymptomReminderCard />
        </div>

        {/* Nudge Banner */}
        <div className="animate-fade-in">
          <NudgeBanner />
        </div>

        {/* Survival / Recovery Mode Banner */}
        {(survivalMode || recoveryMode) && (
          <div className="animate-fade-in">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
              survivalMode ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'
            }`}>
              <ShieldAlert className={`w-4 h-4 shrink-0 ${survivalMode ? 'text-destructive' : 'text-primary'}`} />
              <p className="text-xs font-medium text-foreground">
                {survivalMode
                  ? '🔴 Survival mode: focusing on filling, affordable meals'
                  : '🔄 Recovery mode: budget-friendly meals for the next few days'}
              </p>
            </div>
          </div>
        )}

        {/* Calorie Correction Badge — clickable for explanation (Fix 2) */}
        {showCorrectionBadge && (
          <div className="animate-fade-in">
            <button onClick={() => setWhyModalOpen(true)} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 border bg-primary/10 border-primary/20 text-left">
              <span className="text-sm">⚖️</span>
              <p className="text-[11px] font-medium text-foreground flex-1">Adjusted for balance — tap to see why</p>
              <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" onClick={(e) => { e.stopPropagation(); setShowCorrectionBadge(false); }} />
            </button>
          </div>
        )}

        {/* Adherence & Streak Row */}
        {(adherenceScore > 0 || balanceStreak > 0) && (
          <div className="flex gap-2 animate-fade-in">
            {adherenceScore > 0 && (
              <div className="flex-1 card-subtle p-3 flex items-center gap-2">
                <span className="text-sm">📋</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">Adherence: {adherenceScore}%</p>
                  <p className="text-[9px] text-muted-foreground">Last 7 days</p>
                </div>
              </div>
            )}
            {balanceStreak > 0 && (
              <div className="flex-1 card-subtle p-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{balanceStreak} day{balanceStreak !== 1 ? 's' : ''} balanced</p>
                  <p className="text-[9px] text-muted-foreground">Within ±100 kcal</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Day Type Selector */}
        <div className="animate-fade-in flex items-center gap-2">
          {(['normal', 'cheat', 'recovery', 'fasting'] as DayType[]).map(dt => (
            <button
              key={dt}
              onClick={() => {
                const today = getTodayKey();
                setDayType(today, dt);
                setCurrentDayType(dt);
                toast.success(`Day marked as ${dt}`);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
                currentDayType === dt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {dt === 'normal' ? '🟢 Normal' : dt === 'cheat' ? '🎉 Cheat' : dt === 'recovery' ? '🔄 Recovery' : '🍽️ Fasting'}
            </button>
          ))}
        </div>

        {/* Daily Adjustment Summary (from yesterday) */}
        <div className="animate-fade-in">
          <DailyAdjustmentSummary />
        </div>

        {/* Recovery Options (end-of-day overage) */}
        <div className="animate-fade-in">
          <RecoveryOptionsCard />
        </div>

        {/* Skin Health Tip */}
        <div className="animate-fade-in">
          <SkinHealthCard />
        </div>

        {/* Dual-Sync Insight */}
        {dualSyncInsight && (
          <div className="animate-fade-in">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
              dualSyncInsight.type === 'low_efficiency' ? 'bg-accent/10 border-accent/20' : 'bg-primary/10 border-primary/20'
            }`}>
              <span className="text-sm">{dualSyncInsight.emoji}</span>
              <p className="text-[11px] font-medium text-foreground">{dualSyncInsight.message}</p>
            </div>
          </div>
        )}

        {/* Protein Priority Card (Fix 5) */}
        <div className="animate-scale-in">
          <div className="card-elevated p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center">
              <span className="text-lg">💪</span>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-foreground">{Math.max(0, getProteinTarget(profile) - totals.protein)}g <span className="text-xs font-medium text-muted-foreground">protein remaining</span></p>
              <p className="text-[10px] text-muted-foreground">Target: {getProteinTarget(profile)}g · Eaten: {totals.protein}g</p>
            </div>
          </div>
        </div>

        {/* Protein Rescue Card (after 6 PM, >40g remaining) */}
        <div className="animate-fade-in">
          <ProteinRescueCard profile={profile} onApplied={refreshLog} />
        </div>

        {/* Time-Based Insight (Fix 8) */}
        <div className="animate-fade-in">
          <TimeInsightCard />
        </div>

        {/* Surplus/Deficit Live Indicator */}
        {dayState.totalConsumed > 0 && (
          <div className="animate-fade-in">
            <div className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 border ${
              dayState.remaining >= 0
                ? 'bg-primary/5 border-primary/15'
                : 'bg-destructive/5 border-destructive/15'
            }`}>
              <span className="text-sm">{dayState.remaining >= 0 ? '🟢' : '🔴'}</span>
              <span className={`text-sm font-bold ${dayState.remaining >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {dayState.remaining >= 0 ? `${Math.round(dayState.remaining)} kcal remaining` : `+${Math.abs(Math.round(dayState.remaining))} kcal over target`}
              </span>
            </div>
          </div>
        )}

        {/* Paused Plan Banner */}
        {(() => {
          const raw = getActivePlanRaw();
          if (raw && raw.status === 'paused') {
            const meta = getPlanById(raw.planId);
            return (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border bg-accent/10 border-accent/20">
                  <span className="text-sm">⏸</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">{meta?.name || 'Plan'} is paused</p>
                    <p className="text-[10px] text-muted-foreground">Your normal targets are active. Resume anytime.</p>
                  </div>
                  <Button size="sm" className="h-7 text-[10px]" onClick={() => { resumeActivePlan(); window.location.reload(); }}>
                    Resume
                  </Button>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Active Plan Banner — Madhavan gets custom banner, Event gets countdown */}
        {(() => {
          const ap = getActivePlan();
          if (!ap) return <><ActivePlanBanner /><PlanPromoCard /></>;
          if (ap.planId === 'madhavan_21_day') return <MadhavanPlanBanner />;
          if (ap.planId === 'event_based' && ap.eventSettings) {
            const prog = getPlanProgress();
            return (
              <div className="animate-fade-in space-y-3">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground">
                            {prog?.daysLeft ?? 0} days until your {ap.eventSettings.eventType}!
                          </p>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-[8px] font-bold text-primary">
                            🔒 Locked
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Day {prog?.dayNumber ?? 1} of {prog?.totalDays ?? ap.duration}
                        </p>
                        {ap.eventSettings.motivation && (
                          <p className="text-[9px] text-primary/80 italic mt-0.5">"{ap.eventSettings.motivation}"</p>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-primary">{prog?.percentComplete ?? 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${prog?.percentComplete ?? 0}%` }} />
                  </div>
                  <div className="flex gap-2 text-center">
                    <div className="flex-1 rounded-xl bg-card p-2">
                      <p className="text-xs font-bold text-foreground">{ap.dailyCalories}</p>
                      <p className="text-[9px] text-muted-foreground">kcal/day</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-card p-2">
                      <p className="text-xs font-bold text-foreground">{ap.dailyProtein}g</p>
                      <p className="text-[9px] text-muted-foreground">protein</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-card p-2">
                      <p className="text-xs font-bold text-foreground">{ap.targetWeight} kg</p>
                      <p className="text-[9px] text-muted-foreground">target</p>
                    </div>
                  </div>
                </div>
                {/* Tummy Insight Card */}
                {ap.eventSettings.goalType === 'tummy' && <TummyInsightCard />}
                {/* Boosters */}
                {ap.eventSettings.boosters.length > 0 && (
                  <BoostersChecklist activeBoosters={ap.eventSettings.boosters} />
                )}
                {/* Activity Tracker */}
                <ActivityTracker exerciseTime={ap.eventSettings.exerciseTime} planStartDate={ap.startDate} />
              </div>
            );
          }
          return <ActivePlanBanner />;
        })()}
        {!getActivePlan() && <PlanPromoCard />}
        <PlanCompletionModal open={showPlanComplete} onClose={() => setShowPlanComplete(false)} />

        {/* Reverse Diet Banner */}
        {isReverseDietActive() && !getActivePlan() && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border bg-accent/10 border-accent/20">
              <span className="text-sm">🔄</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Reverse Diet — Week {getReverseDietWeek()}/3</p>
                <p className="text-[10px] text-muted-foreground">Gradually returning to maintenance calories</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Calorie Ring */}
        <div className="animate-scale-in">
          <CalorieRing dayState={dayState} proteinRemaining={Math.max(0, getProteinTarget(profile) - totals.protein)} />
        </div>

        {/* Next Meal Suggestion */}
        <div className="animate-slide-up" style={{ animationDelay: '0.03s' }}>
          <NextMealCard profile={profile} onRefresh={refreshLog} />
        </div>

        {/* Profile Completion Nudge */}
        <ProfileCompletionNudge onOpenProfile={() => navigate('/profile')} />

        {/* Contextual Intelligence Tips */}
        <div className="animate-slide-up" style={{ animationDelay: '0.035s' }}>
          <ContextualTipsCard weather={weather} />
        </div>

        {/* 3. Macros */}
        <div className="flex gap-2 animate-slide-up">
          <MacroCard label="Protein" current={totals.protein} goal={getProteinTarget(profile)} variant="coral" icon="protein" />
          <MacroCard label="Carbs" current={totals.carbs} goal={getCarbTarget(profile)} variant="primary" icon="carbs" />
          <MacroCard label="Fats" current={totals.fat} goal={getFatTarget(profile)} variant="gold" icon="fat" />
        </div>

        {/* 3a. Budget Summary */}
        <div className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <BudgetSummaryCard />
        </div>

        {/* Budget Alert Banner */}
        {budgetAlert && budgetAlert.level !== 'ok' && (
          <div className="animate-fade-in">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
              budgetAlert.level === 'warning'
                ? 'bg-accent/10 border-accent/20'
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <span className="text-sm">
                {budgetAlert.level === 'warning' ? '⚠️' : budgetAlert.level === 'overspend' ? '🚫' : '⛔'}
              </span>
              <p className="text-[11px] font-medium text-foreground flex-1">{budgetAlert.message}</p>
              <button
                onClick={() => { clearLatestBudgetAlert(); setBudgetAlert(null); }}
                className="shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Daily Food Efficiency */}
        <div className="animate-slide-up" style={{ animationDelay: '0.055s' }}>
          <DailyEfficiencyCard />
        </div>

        {/* Weekly Feedback (behavior correction) */}
        <div className="animate-slide-up" style={{ animationDelay: '0.053s' }}>
          <WeeklyFeedbackCard />
        </div>

        {/* 3b. Weekly Report (Mondays) */}
        <div className="animate-slide-up" style={{ animationDelay: '0.06s' }}>
          <WeeklyReportCard />
        </div>

        {/* 3c. Coach Card */}
        <div className="animate-slide-up" style={{ animationDelay: '0.07s' }}>
          <CoachCard />
        </div>

        {/* 3c. Consistency Streaks */}
        <div className="animate-slide-up" style={{ animationDelay: '0.09s' }}>
          <ConsistencyCard />
        </div>

        {/* 4. Hydration + Supplements (side-by-side) */}
        <div className="flex gap-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <WaterTrackerCompact cups={log.waterCups} goal={profile.waterGoal} onAdd={handleAddWater} />
          <SupplementsCompact
            supplements={log.supplements || []}
            onAdd={() => { setEditingSupplement(null); setSheetOpen(true); }}
            onTap={handleSupplementTap}
          />
        </div>

        {/* 5. Calories Burned */}
        <div className="animate-slide-up" style={{ animationDelay: '0.12s' }}>
          <CaloriesBurnedCard log={log} weightKg={profile.weightKg} onRefresh={refreshLog} />
        </div>

        {/* 6. Today's Plan (collapsible) */}
        <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <TodayMealPlan />
        </div>

        {/* Repeat Yesterday's Meals */}
        <div className="animate-slide-up" style={{ animationDelay: '0.17s' }}>
          <RepeatMealsButton onApplied={refreshLog} />
        </div>

        {/* 7. Today's Meals */}
        <div className="animate-slide-up" style={{ animationDelay: '0.18s' }}>
          <TodayMeals log={log} onRefresh={refreshLog} dayState={dayState} />
        </div>
      </div>

      <MonikaFab onDashboardRefresh={refreshLog} />

      {/* Weekly Weight Check-In (Sunday prompt) */}
      <WeeklyWeightCheckIn defaultWeight={profile.weightKg} onDone={refreshLog} />

      <AdjustmentExplanationModal open={whyModalOpen} onClose={() => setWhyModalOpen(false)} />
      <MorningRecoveryPrompt open={missedPromptOpen} onClose={() => setMissedPromptOpen(false)} missedDate={missedDate} />

      {/* Drop-Off Defense Modal */}
      <Dialog open={!!dropOffModal} onOpenChange={(v) => !v && setDropOffModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span>👋</span> Welcome Back!
            </DialogTitle>
            <DialogDescription className="text-sm">
              {dropOffModal?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => { dismissDropOff(); setDropOffModal(null); }}>
              Dismiss
            </Button>
            <Button className="flex-1" onClick={() => { dismissDropOff(); setDropOffModal(null); refreshLog(); toast.success('Plan restarted! Let\'s go! 💪'); }}>
              🚀 Restart
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard Boundary Alert Modal */}
      <Dialog open={!!hardBoundaryModal} onOpenChange={(v) => !v && setHardBoundaryModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4 text-destructive" /> Weekly Alert
            </DialogTitle>
            <DialogDescription className="text-sm">
              {hardBoundaryModal?.message}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{hardBoundaryModal?.suggestion}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => { dismissHardBoundary(); setHardBoundaryModal(null); }}>
              Not now
            </Button>
            <Button className="flex-1" onClick={() => { applyHardReset(); setHardBoundaryModal(null); toast.success('Plan reset for tomorrow — 15% lighter day ahead'); refreshProfile(); }}>
              Reset Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplement Sheets */}
      <SupplementLogSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingSupplement(null); }}
        onSaved={refreshLog}
        editEntry={editingSupplement}
      />
      <SupplementEditModal
        open={editModalOpen}
        supplement={selectedSupplement}
        onClose={() => setEditModalOpen(false)}
        onEdit={handleEditSupplement}
        onDeleted={refreshLog}
      />
    </div>

    {/* Post-Event Feedback Modal */}
    {expiredEventPlan && (
      <PostEventFeedbackModal
        open={showEventFeedback}
        onClose={() => setShowEventFeedback(false)}
        expiredPlan={expiredEventPlan}
        onExtend={() => setEventExtendSheet(true)}
      />
    )}
    <EventPlanConfigSheet open={eventExtendSheet} onOpenChange={setEventExtendSheet} />

    {/* One-time planner setup modal */}
    <Dialog open={showPlannerModal} onOpenChange={(open) => {
      if (!open) {
        localStorage.setItem('planner_modal_dismissed', 'true');
        setShowPlannerModal(false);
      }
    }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Set up your daily plan</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            To get accurate meals, budget tracking, and calorie guidance — set your budget and meal plan.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => { setShowPlannerModal(false); navigate('/planner'); }}>
            Set My Plan
          </Button>
          <Button variant="ghost" onClick={() => {
            localStorage.setItem('planner_modal_dismissed', 'true');
            setShowPlannerModal(false);
          }}>
            Do it later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
