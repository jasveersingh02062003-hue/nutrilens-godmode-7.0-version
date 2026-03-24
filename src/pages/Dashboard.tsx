import { useState, useEffect } from 'react';
import PostOnboardingTutorial from '@/components/PostOnboardingTutorial';
import { runWeeklyAdaptation as runGoalAdaptation, applyAdaptation } from '@/lib/goal-engine';
import { Bell, ClipboardList, X, ShieldAlert } from 'lucide-react';
import { updateDailyBehaviorStats, runWeeklyAdaptation, isSurvivalModeActive } from '@/lib/behavior-stats';
import { useNavigate } from 'react-router-dom';
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
import MonikaFab from '@/components/MonikaFab';
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
import { getDualSyncInsight, isSurvivalModeManual, getLatestBudgetAlert, clearLatestBudgetAlert, type BudgetAlertResult } from '@/lib/budget-service';
import UpgradeBanner from '@/components/UpgradeBanner';
import { getMealPlannerProfile } from '@/lib/meal-planner-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PESExplanationCard from '@/components/PESExplanationCard';
import WeeklyFeedbackCard from '@/components/WeeklyFeedbackCard';
import { shouldGenerateSummary, generateWeeklySummary, scheduleWeeklyNotification } from '@/lib/weekly-feedback';
import { hasBrowserPermission } from '@/lib/notifications';
import { getRecoveredTargets, type RecoveryAdjustment } from '@/lib/meal-recovery';
export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useUserProfile();
  const [log, setLog] = useState<DailyLog>(getDailyLog());
  const totals = getDailyTotals(log);
  const dayState = recalculateDay(profile, log);
  const [weather, setWeather] = useState<WeatherData>(getWeather());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<SupplementEntry | null>(null);
  const [editingSupplement, setEditingSupplement] = useState<SupplementEntry | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tutorial_seen'));
  const [showPESExplanation, setShowPESExplanation] = useState(() => !localStorage.getItem('pes_explanation_seen'));
  const [budgetAlert, setBudgetAlert] = useState<(BudgetAlertResult & { timestamp: number; date: string }) | null>(getLatestBudgetAlert());
  const [recovery, setRecovery] = useState<RecoveryAdjustment | null>(null);
  const [adjustedTargets, setAdjustedTargets] = useState<{ cal: number; protein: number } | null>(null);

  const plannerProfile = getMealPlannerProfile();
  const plannerIncomplete = !plannerProfile || !plannerProfile.onboardingComplete;
  const [showPlannerModal, setShowPlannerModal] = useState(() =>
    plannerIncomplete && !localStorage.getItem('planner_modal_dismissed')
  );
  const showPlannerBanner = plannerIncomplete && !showPlannerModal;

  useEffect(() => {
    if (!profile?.onboardingComplete) navigate('/onboarding');
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
    // Meal recovery from yesterday
    if (profile) {
      const { adjustedCal, adjustedProtein, recovery: rec } = getRecoveredTargets(profile.dailyCalories, profile.dailyProtein);
      if (rec) {
        setRecovery(rec);
        setAdjustedTargets({ cal: adjustedCal, protein: adjustedProtein });
      }
    }
    // Weekly feedback engine
    if (shouldGenerateSummary()) {
      const summary = generateWeeklySummary();
      if (hasBrowserPermission()) scheduleWeeklyNotification(summary);
    }
  }, [profile, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLog(getDailyLog());
      setBudgetAlert(getLatestBudgetAlert());
      // Check streaks on each refresh
      const { milestones } = checkAndUpdateStreaks();
      for (const m of milestones) {
        toast.success(`${m.milestone.emoji} ${m.milestone.label}! ${m.type} streak: ${m.milestone.target} days!`);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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
              <p className="text-[11px] text-muted-foreground">Track your nutrition today</p>
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

        {/* 2. Calorie Ring */}
        <div className="animate-scale-in">
          <CalorieRing dayState={dayState} />
        </div>

        {/* Next Meal Suggestion */}
        <div className="animate-slide-up" style={{ animationDelay: '0.03s' }}>
          <NextMealCard profile={profile} onRefresh={refreshLog} />
        </div>

        {/* 3. Macros */}
        <div className="flex gap-2 animate-slide-up">
          <MacroCard label="Protein" current={totals.protein} goal={profile.dailyProtein} variant="coral" icon="protein" />
          <MacroCard label="Carbs" current={totals.carbs} goal={profile.dailyCarbs} variant="primary" icon="carbs" />
          <MacroCard label="Fats" current={totals.fat} goal={profile.dailyFat} variant="gold" icon="fat" />
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

        {/* 7. Today's Meals */}
        <div className="animate-slide-up" style={{ animationDelay: '0.18s' }}>
          <TodayMeals log={log} onRefresh={refreshLog} dayState={dayState} />
        </div>
      </div>

      <MonikaFab onDashboardRefresh={refreshLog} />

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
