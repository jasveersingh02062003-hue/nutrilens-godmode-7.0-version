import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getDailyLog, getDailyTotals, addWater, DailyLog, SupplementEntry, getTodayKey, getProfile as getStoredProfile, saveProfile as saveStoredProfile } from '@/lib/store';
import { recalculateDay } from '@/lib/calorie-engine';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getWeather, fetchLiveWeather, type WeatherData } from '@/lib/weather-service';
import { runWeeklyAdaptation as runGoalAdaptation, applyAdaptation } from '@/lib/goal-engine';
import { updateDailyBehaviorStats, runWeeklyAdaptation, isSurvivalModeActive } from '@/lib/behavior-stats';
import { checkDropOff, updateLastLogDate } from '@/lib/drop-off-defense';
import { checkWeeklySurplus } from '@/lib/hard-boundary';
import { checkAndUpdateStreaks } from '@/lib/streaks';
import { getPendingCarryOver, applyCarryOver } from '@/lib/redistribution-service';
import { applyOverageCarryOver } from '@/lib/smart-adjustment';
import { applyCarryForwardToday } from '@/lib/exercise-adjustment';
import { isRecoveryModeActive } from '@/lib/decision-engine';
import { processEndOfDay, getAdjustedDailyTarget, getProteinTarget, isTargetAdjusted, getAdherenceScore, getBalanceStreak, getDayType, setDayType as setCorrectionDayType, onCalorieBankUpdate, offCalorieBankUpdate, getAdjustmentExplanation, type DayType } from '@/lib/calorie-correction';
import { shouldGenerateSummary, generateWeeklySummary, scheduleWeeklyNotification } from '@/lib/weekly-feedback';
import { hasBrowserPermission, startProactiveChecks } from '@/lib/notifications';
import { getPlanProgress, getExpiredEventPlan } from '@/lib/event-plan-service';
import { getMealPlannerProfile } from '@/lib/meal-planner-store';
import { isDailyHidden } from '@/lib/daily-visibility';
import { getDualSyncInsight, isSurvivalModeManual, getLatestBudgetAlert, type BudgetAlertResult } from '@/lib/budget-service';

export function useDashboardInit() {
  const navigate = useNavigate();
  const { profile, refreshProfile, loadedUserId } = useUserProfile();
  const [log, setLog] = useState<DailyLog>(getDailyLog());
  const totals = useMemo(() => getDailyTotals(log), [log]);
  const dayState = useMemo(() => recalculateDay(profile, log), [profile, log]);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<SupplementEntry | null>(null);
  const [editingSupplement, setEditingSupplement] = useState<SupplementEntry | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => !scopedGet('tutorial_seen'));
  const [showPESExplanation, setShowPESExplanation] = useState(() => !scopedGet('pes_explanation_seen'));
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

  const plannerProfile = useMemo(() => getMealPlannerProfile(), [log]);
  const plannerIncomplete = !plannerProfile || !plannerProfile.onboardingComplete;
  const plannerDismissKey = `planner_modal_dismissed_${loadedUserId || 'anon'}`;
  const [showPlannerModal, setShowPlannerModal] = useState(() =>
    plannerIncomplete && !scopedGet(plannerDismissKey)
  );
  const showPlannerBanner = plannerIncomplete && !showPlannerModal;

  const survivalMode = isSurvivalModeActive() || isSurvivalModeManual();
  const recoveryMode = isRecoveryModeActive();
  const dualSyncInsight = profile ? getDualSyncInsight(profile.dailyCalories) : null;

  // ── Init effect ──
  useEffect(() => {
    if (!profile?.onboardingComplete) navigate('/onboarding');
    const carryGuardKey = `carry_applied_${getTodayKey()}`;
    if (!scopedGet(carryGuardKey)) {
      scopedSet(carryGuardKey, '1');
      const co = getPendingCarryOver();
      if (co) {
        applyCarryOver(getTodayKey());
        toast.info(`+${co.calories} kcal carried over from yesterday`);
      }
      const carryResult = applyOverageCarryOver(getTodayKey());
      if (carryResult === 'applied') {
        toast.info('Yesterday\'s overage adjustment applied to today\'s meals');
      }
      const exerciseCarry = applyCarryForwardToday(getTodayKey());
      if (exerciseCarry) {
        toast.info(`📅 Exercise carry-forward: +${exerciseCarry.lunch} lunch, +${exerciseCarry.dinner} dinner`);
      }
    }
    fetchLiveWeather().then(setWeather).catch(() => setWeather(getWeather()));
    updateDailyBehaviorStats();
    const adaptation = runWeeklyAdaptation();
    if (adaptation.adapted) {
      adaptation.changes.forEach(c => toast.info(`📊 ${c}`));
    }
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
    if (profile) {
      processEndOfDay(profile);
      setShowCorrectionBadge(isTargetAdjusted(profile));
      setAdherenceScore(Math.round(getAdherenceScore().score * 100));
      setBalanceStreak(getBalanceStreak());
      setCurrentDayType(getDayType());
      const toastKey = `calorie_toast_${getTodayKey()}`;
      if (!scopedGet(toastKey)) {
        const explanation = getAdjustmentExplanation();
        if (explanation) {
          toast('⚖️ Calories adjusted', {
            description: explanation,
            action: { label: 'Details', onClick: () => setWhyModalOpen(true) },
            duration: 6000,
          });
          scopedSet(toastKey, '1');
        }
      }
    }
    if (shouldGenerateSummary()) {
      const summary = generateWeeklySummary();
      if (hasBrowserPermission()) scheduleWeeklyNotification(summary);
    }
    const dropOff = checkDropOff();
    if (dropOff.detected) setDropOffModal(dropOff);
    const boundary = checkWeeklySurplus();
    if (boundary) setHardBoundaryModal(boundary);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    // Don't show missed-day prompt for dates on or before the join date
    const joinDate = profile?.joinDate;
    const isBeforeOrOnJoinDate = joinDate && yesterdayKey <= joinDate;
    if (!isBeforeOrOnJoinDate) {
      const recoveryDismissed = scopedGet(`nutrilens_missed_ack_${yesterdayKey}`);
      if (!recoveryDismissed) {
        const yLog = getDailyLog(yesterdayKey);
        const yTotals = getDailyTotals(yLog);
        if (yTotals.eaten < 300) {
          setMissedDate(yesterdayKey);
          setMissedPromptOpen(true);
        }
      }
    }
    updateLastLogDate();
    startProactiveChecks();
  }, [profile, navigate]);

  // ── Polling & reactive sync ──
  useEffect(() => {
    const interval = setInterval(() => {
      const nowKey = getTodayKey();
      if (nowKey !== log.date) window.location.reload();
      setLog(getDailyLog());
      setBudgetAlert(getLatestBudgetAlert());
      const { milestones } = checkAndUpdateStreaks();
      for (const m of milestones) {
        toast.success(`${m.milestone.emoji} ${m.milestone.label}! ${m.type} streak: ${m.milestone.target} days!`);
      }
    }, 10000);

    const handleBankUpdate = () => {
      setLog(getDailyLog());
      setShowCorrectionBadge(isTargetAdjusted(profile));
      setAdherenceScore(Math.round(getAdherenceScore().score * 100));
      setBalanceStreak(getBalanceStreak());
      setCurrentDayType(getDayType());
    };
    onCalorieBankUpdate(handleBankUpdate);

    const handleGlobalUpdate = () => setLog(getDailyLog());
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

  return {
    profile, navigate, loadedUserId, log, totals, dayState, weather,
    sheetOpen, setSheetOpen, editModalOpen, setEditModalOpen,
    selectedSupplement, editingSupplement, setEditingSupplement,
    showTutorial, setShowTutorial, showPESExplanation, setShowPESExplanation,
    budgetAlert, setBudgetAlert, showCorrectionBadge, setShowCorrectionBadge,
    adherenceScore, balanceStreak, currentDayType, setCurrentDayType,
    whyModalOpen, setWhyModalOpen, missedPromptOpen, setMissedPromptOpen, missedDate,
    dropOffModal, setDropOffModal, hardBoundaryModal, setHardBoundaryModal,
    showDailyPlan, setShowDailyPlan, showPlanComplete, setShowPlanComplete,
    expiredEventPlan, showEventFeedback, setShowEventFeedback,
    eventExtendSheet, setEventExtendSheet,
    showPlannerModal, setShowPlannerModal, showPlannerBanner, plannerDismissKey,
    survivalMode, recoveryMode, dualSyncInsight, refreshProfile, refreshLog,
    handleAddWater, handleSupplementTap, handleEditSupplement,
  };
}
