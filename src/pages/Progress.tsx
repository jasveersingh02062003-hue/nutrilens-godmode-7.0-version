import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trophy, TrendingUp, Scale, Share2, Camera, IndianRupee, FileText, Crown } from 'lucide-react';
import { getRecentLogs, getDailyTotals, getDailyLog, getAllLogDates, getProfile } from '@/lib/store';
import { hasExpensesOnDate } from '@/lib/expense-store';
import { Flame, BarChart3 } from 'lucide-react';
import { getWeeklySummaries, type WeeklySummary } from '@/lib/weekly-feedback';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { getWeightStreak } from '@/lib/weight-history';
import { BADGES, computeAchievementStats, checkAndUnlockBadges, getUnlockedBadges } from '@/lib/achievements';
import { sendAchievementAlert } from '@/lib/notifications';
import WeightLogSheet from '@/components/WeightLogSheet';
import WeightChart from '@/components/WeightChart';
import WeeklyWeightTimeline from '@/components/WeeklyWeightTimeline';
import ProgressPhotosSection from '@/components/ProgressPhotosSection';
import DayDetailsSheet from '@/components/DayDetailsSheet';
import OverviewStats from '@/components/OverviewStats';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { Progress } from '@/components/ui/progress';
import ProgressReportSheet from '@/components/ProgressReportSheet';
import WeightProgressArc from '@/components/WeightProgressArc';
import ConsistencyCard from '@/components/ConsistencyCard';
import FlashbackCard from '@/components/FlashbackCard';
import FoodStoryStrip from '@/components/FoodStoryStrip';
import MemoryArchiveEntry from '@/components/MemoryArchiveEntry';
import BudgetInsightsCard from '@/components/BudgetInsightsCard';
import HealthScoreCard from '@/components/HealthScoreCard';
import SymptomTrackerCard from '@/components/SymptomTrackerCard';
import BloodReportCard from '@/components/BloodReportCard';
import BloodReportSheet from '@/components/BloodReportSheet';
import IdentityBadgesCard from '@/components/IdentityBadgesCard';
import { getMonthlySavings } from '@/lib/budget-impact';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getPlan, isPremium } from '@/lib/subscription-service';
import UpgradeModal from '@/components/UpgradeModal';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import { getDailyBalances, getTodayAdjustmentStatus, getMonthlyStats, getWeekendPattern, computeAdjustmentMap, computeSafeSpreadDays, type DailyBalanceEntry } from '@/lib/calorie-correction';


type AdherenceStatus = 'green' | 'yellow' | 'red' | 'gray';

function getAdherence(dateStr: string, goal: number, waterGoal: number, logDatesSet: Set<string>): AdherenceStatus {
  if (!logDatesSet.has(dateStr)) return 'gray';
  const log = getDailyLog(dateStr);
  const totals = getDailyTotals(log);
  if (totals.eaten === 0 && log.waterCups === 0) return 'gray';

  const calRatio = Math.abs(totals.eaten - goal) / goal;
  const withinTen = calRatio <= 0.1;
  const withinTwenty = calRatio <= 0.2;
  const waterMet = log.waterCups >= waterGoal;

  if (withinTen && waterMet) return 'green';
  if ((withinTen && !waterMet) || (withinTwenty && waterMet)) return 'yellow';
  return 'red';
}

const dotColors: Record<AdherenceStatus, string> = {
  green: 'bg-primary',
  yellow: 'bg-accent',
  red: 'bg-destructive',
  gray: 'bg-transparent',
};

const cellColors: Record<AdherenceStatus, string> = {
  green: 'bg-primary/10 text-primary border-primary/20',
  yellow: 'bg-accent/10 text-accent border-accent/20',
  red: 'bg-destructive/10 text-destructive border-destructive/20',
  gray: 'bg-transparent text-foreground border-transparent',
};

export default function ProgressPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [showWeightSheet, setShowWeightSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBloodReport, setShowBloodReport] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { profile } = useUserProfile();
  const logs = useMemo(() => getRecentLogs(30), [refreshKey]);
  const premium = isPremium();

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = viewDate.getDay();

  const logDatesSet = useMemo(() => new Set(getAllLogDates()), [refreshKey]);
  const goal = profile?.dailyCalories || 2000;
  const waterGoal = profile?.waterGoal || 8;

  // Dates that have meal photos
  const datesWithPhotos = useMemo(() => {
    const set = new Set<string>();
    for (const dateStr of logDatesSet) {
      const log = getDailyLog(dateStr);
      if (log.meals.some(m => m.photo)) set.add(dateStr);
    }
    return set;
  }, [logDatesSet, refreshKey]);

  const datesWithExpenses = useMemo(() => {
    const set = new Set<string>();
    for (const dateStr of logDatesSet) {
      if (hasExpensesOnDate(dateStr)) set.add(dateStr);
    }
    return set;
  }, [logDatesSet, refreshKey]);

  // Achievements
  const stats = useMemo(() => computeAchievementStats(), [refreshKey]);
  const unlockedSet = useMemo(() => new Set(getUnlockedBadges()), [refreshKey]);

  useEffect(() => {
    const newlyUnlocked = checkAndUnlockBadges(stats);
    if (newlyUnlocked.length > 0) {
      setShowConfetti(true);
      for (const id of newlyUnlocked) {
        const badge = BADGES.find(b => b.id === id);
        if (badge) sendAchievementAlert(badge.name);
      }
      setTimeout(() => setShowConfetti(false), 100);
    }
  }, [stats]);

  // For free users, only show last 3 days
  const threeDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toISOString().split('T')[0];
  }, []);

  const allBalances = useMemo(() => getDailyBalances(), [refreshKey]);
  const baseTarget = profile?.dailyCalories || 2000;

  const tdee = profile?.tdee || baseTarget;
  // Compute adjustment map deterministically from past balances (exclude today)
  const adjMap = useMemo(() => {
    const pastLogs = allBalances.filter((b: DailyBalanceEntry) => b.date < todayStr && b.actual >= 300);
    return computeAdjustmentMap(pastLogs, baseTarget, tdee);
  }, [allBalances, baseTarget, todayStr, tdee]);

  const calendarDays = useMemo(() => {
    const days: { day: number; dateStr: string; status: AdherenceStatus; isToday: boolean; isFuture: boolean; locked: boolean; adjustment: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;
      const locked = !premium && dateStr < threeDaysAgo;
      const status: AdherenceStatus = isFuture || locked ? 'gray' : getAdherence(dateStr, goal, waterGoal, logDatesSet);
      const adjustment = isFuture ? (adjMap[dateStr] || 0) : 0;
      days.push({ day: d, dateStr, status, isToday, isFuture, locked, adjustment });
    }
    return days;
  }, [monthOffset, refreshKey, logDatesSet, goal, waterGoal, premium, threeDaysAgo, adjMap]);

  const weeklyData = useMemo(() => {
    return logs.slice(0, 7).reverse().map(l => {
      const t = getDailyTotals(l);
      return { date: l.date.slice(5), calories: t.eaten };
    });
  }, [logs]);

  const maxCal = Math.max(...weeklyData.map(d => d.calories), profile?.dailyCalories || 2000);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <ConfettiCelebration show={showConfetti} />
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">Progress</h1>
            <SubscriptionBadge />
          </div>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Report
          </button>
        </div>

        {/* Overview Stats */}
        <OverviewStats refreshKey={refreshKey} />

        {/* Weekly Summaries History */}
        <WeeklySummariesSection />

        {/* Flashback */}
        <FlashbackCard onOpenDate={(d) => setSelectedDate(d)} />

        {/* Calendar */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMonthOffset(m => m - 1)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            <h3 className="font-semibold text-sm text-foreground">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setMonthOffset(m => Math.min(0, m + 1))} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground font-semibold mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {calendarDays.map(d => (
              <button
                key={d.day}
                onClick={() => !d.locked && setSelectedDate(d.dateStr)}
                disabled={d.locked}
                className={`flex flex-col items-center justify-center py-0.5 group ${d.locked ? 'opacity-30' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold border transition-colors group-active:scale-90 relative
                  ${d.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                  ${cellColors[d.status]}`}>
                  {d.day}
                  {premium && datesWithPhotos.has(d.dateStr) && (
                    <Camera className="w-2 h-2 text-primary absolute -top-0.5 -right-0.5" />
                  )}
                  {datesWithExpenses.has(d.dateStr) && !datesWithPhotos.has(d.dateStr) && (
                    <IndianRupee className="w-2 h-2 text-accent absolute -top-0.5 -right-0.5" />
                  )}
                </div>
                {d.status !== 'gray' && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColors[d.status]}`} />
                )}
                {d.isFuture && d.adjustment !== 0 && (
                  <span className="text-[8px] leading-none mt-0.5">{d.adjustment < 0 ? '🔻' : '🔺'}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> On Track</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Partial</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Off Track</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted border border-border" /> No Data</span>
            <span className="flex items-center gap-1">🔻 Reduced</span>
            <span className="flex items-center gap-1">🔺 Recovery</span>
          </div>
          {!premium && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold"
            >
              <Crown className="w-3.5 h-3.5" /> Upgrade for full calendar & photos
            </button>
          )}
        </div>

        {/* Food Story Strip */}
        <FoodStoryStrip onOpenDate={(d) => setSelectedDate(d)} refreshKey={refreshKey} />

        {/* Food Archive Entry */}
        <MemoryArchiveEntry />

        {/* Budget Insights */}
        <BudgetInsightsCard refreshKey={refreshKey} />

        {/* Monthly Savings Impact */}
        <MonthlySavingsCard />

        {/* Identity Badges */}
        <IdentityBadgesCard />

        {/* Health Score (multi-condition) */}
        <HealthScoreCard refreshKey={refreshKey} />

        {/* Symptom Tracker */}
        <SymptomTrackerCard refreshKey={refreshKey} />

        {/* Blood Report & Supplement Insights */}
        <BloodReportCard refreshKey={refreshKey} />

        <button
          onClick={() => setShowBloodReport(true)}
          className="w-full py-3 rounded-2xl bg-card border border-border font-semibold text-sm flex items-center justify-center gap-2 hover:border-primary/30 transition-colors"
        >
          <FileText className="w-4 h-4 text-muted-foreground" /> Enter Blood Report
        </button>

        {/* Calorie Balance History */}
        <CalorieBalanceCard />

        {/* Weekly Overview */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Weekly Overview</h3>
          </div>
          <div className="flex items-end gap-2 h-28">
            {weeklyData.map((d, i) => {
              const pct = Math.max(4, (d.calories / maxCal) * 100);
              const isToday = i === weeklyData.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground font-medium">{d.calories > 0 ? d.calories : ''}</span>
                  <div className={`w-full rounded-lg transition-all duration-500 ${isToday ? 'bg-primary' : 'bg-primary/20'}`} style={{ height: `${pct}%` }} />
                  <span className="text-[9px] text-muted-foreground font-medium">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weight Log Button */}
        <button
          onClick={() => setShowWeightSheet(true)}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2.5 shadow-fab active:scale-[0.98] transition-transform"
        >
          <Scale className="w-4 h-4" /> Log Weight with Photo
        </button>

        {/* Weight Progress Arc */}
        <WeightProgressArc refreshKey={refreshKey} />

        {/* Weekly Weight Timeline */}
        <WeeklyWeightTimeline refreshKey={refreshKey} onLogWeight={() => setShowWeightSheet(true)} />

        {/* Weight Chart */}
        <WeightChart refreshKey={refreshKey} />

        {/* Progress Photos */}
        <ProgressPhotosSection refreshKey={refreshKey} onChanged={refresh} />

        {/* Streaks */}
        <ConsistencyCard refreshKey={refreshKey} />

        {/* Achievements */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm text-foreground">Achievements</h3>
            <span className="ml-auto text-[10px] text-muted-foreground font-medium">
              {unlockedSet.size}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BADGES.map(badge => {
              const unlocked = unlockedSet.has(badge.id);
              const prog = badge.progress(stats);
              const pct = Math.round((prog.current / prog.target) * 100);
              return (
                <div key={badge.id} className={`rounded-xl p-3 text-center border transition-all ${unlocked ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/50 opacity-60'}`}>
                  <div className="text-xl mb-1">{badge.icon}</div>
                  <p className="text-[10px] font-semibold text-foreground">{badge.name}</p>
                  <p className="text-[9px] text-muted-foreground mb-1.5">{badge.description}</p>
                  {!unlocked ? (
                    <div className="space-y-0.5">
                      <Progress value={pct} className="h-1" />
                      <p className="text-[8px] text-muted-foreground">{prog.current}/{prog.target}</p>
                    </div>
                  ) : (
                    <span className="text-[9px] text-primary font-semibold">✓ Unlocked</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <WeightLogSheet
        open={showWeightSheet}
        onClose={() => setShowWeightSheet(false)}
        onSaved={refresh}
        defaultWeight={profile?.weightKg}
      />

      <DayDetailsSheet
        open={!!selectedDate}
        date={selectedDate || todayStr}
        onClose={() => setSelectedDate(null)}
        onChanged={refresh}
      />

      <ProgressReportSheet open={showReport} onClose={() => setShowReport(false)} />

      <BloodReportSheet
        open={showBloodReport}
        onClose={() => setShowBloodReport(false)}
        onSaved={refresh}
      />

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}

function MonthlySavingsCard() {
  const savings = getMonthlySavings();
  if (savings.saved <= 0 || savings.totalBudget <= 0) return null;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">💰</span>
        <h3 className="font-semibold text-sm text-foreground">Monthly Savings</h3>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-primary">₹{savings.saved}</span>
        <span className="text-xs text-muted-foreground">saved this month</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Budget: ₹{savings.totalBudget} · Spent: ₹{savings.totalSpent}
      </p>
      {savings.equivalents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {savings.equivalents.map((eq, i) => (
            <span key={i} className="px-2.5 py-1 rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              {eq}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CalorieBalanceCard() {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const balances = getDailyBalances();
  const summary = getTodayAdjustmentStatus();
  const monthlyStats = getMonthlyStats();
  const weekendPattern = getWeekendPattern();
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Compute adjMap for future adjustments display
  const profile = getProfile();
  const baseTarget = profile?.dailyCalories || 1600;
  const tdee = profile?.tdee || baseTarget;
  const pastLogs = balances.filter(b => b.date < todayStr && b.actual >= 300);
  const adjMap = computeAdjustmentMap(pastLogs, baseTarget, tdee);

  if (balances.length === 0) return null;

  const last7 = balances.slice(-7);
  const last14 = balances.slice(-14);
  const maxAbs = Math.max(1, ...last14.map(b => Math.abs(b.diff)));

  // Weekly totals — always use baseTarget for honest math
  const weeklyTarget = last7.reduce((s, b) => s + b.target, 0);
  const weeklyActual = last7.reduce((s, b) => s + b.actual, 0);
  const weeklyNet = weeklyActual - weeklyTarget;

  const fmtDay = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { weekday: 'short' });
  };
  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="card-elevated p-4 space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚖️</span>
          <h3 className="font-semibold text-sm text-foreground">Calorie Balance</h3>
          {summary.status !== 'balanced' && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              summary.status === 'surplus' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
            }`}>
              {summary.status === 'surplus' ? 'Surplus' : 'Deficit'}: {Math.abs(summary.adjustment)} kcal
            </span>
          )}
        </div>
        <div className="flex rounded-lg bg-muted p-0.5 gap-0.5">
          <button
            onClick={() => setView('weekly')}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${view === 'weekly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Week
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${view === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Month
          </button>
        </div>
      </div>

      {view === 'weekly' ? (
        <>
          {/* Weekly summary */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">This week</span>
            <span className="font-semibold text-foreground">
              Target: {weeklyTarget} · Actual: {weeklyActual} ·{' '}
              <span className={weeklyNet > 0 ? 'text-accent' : weeklyNet < 0 ? 'text-primary' : 'text-foreground'}>
                Net: {weeklyNet > 0 ? '+' : ''}{weeklyNet}
              </span>
            </span>
          </div>

          {/* Day-by-day table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-5 gap-0 text-[9px] font-semibold text-muted-foreground bg-muted/50 px-2 py-1.5">
              <span>Day</span>
              <span className="text-right">Target</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Diff</span>
              <span className="text-right">Status</span>
            </div>
            {last7.map((b, i) => {
              const status = Math.abs(b.diff) < 50 ? 'On Track' : b.diff > 0 ? 'Surplus' : 'Deficit';
              const statusColor = status === 'On Track' ? 'text-primary' : status === 'Surplus' ? 'text-accent' : 'text-muted-foreground';
              return (
                <div key={i} className="grid grid-cols-5 gap-0 text-[10px] px-2 py-1.5 border-t border-border">
                  <span className="font-medium text-foreground">{fmtDay(b.date)}</span>
                  <span className="text-right text-muted-foreground">{b.target}</span>
                  <span className="text-right text-foreground font-medium">{b.actual}</span>
                  <span className={`text-right font-semibold ${b.diff > 0 ? 'text-accent' : b.diff < 0 ? 'text-primary' : 'text-foreground'}`}>
                    {b.diff > 0 ? '+' : ''}{b.diff}
                  </span>
                  <span className={`text-right font-medium ${statusColor}`}>{status}</span>
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-0.5 h-16">
            {last14.map((b, i) => {
              const pct = Math.max(4, (Math.abs(b.diff) / maxAbs) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-full rounded-sm transition-all ${b.diff > 0 ? 'bg-accent/60' : 'bg-primary/60'}`}
                    style={{ height: `${pct}%` }}
                    title={`${b.date}: ${b.diff > 0 ? '+' : ''}${b.diff} kcal`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>{last14[0]?.date.slice(5)}</span>
            <span>{last14[last14.length - 1]?.date.slice(5)}</span>
          </div>

          {/* Recovery tracker */}
          {/* Future adjustments from deterministic map */}
          {(() => {
            const futureAdj = Object.entries(adjMap).filter(([d]) => d > todayStr).sort(([a], [b]) => a.localeCompare(b));
            if (futureAdj.length === 0) return null;
            const totalAdj = futureAdj.reduce((s, [, v]) => s + v, 0);
            return (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs">⚖️</span>
                  <p className="text-xs font-semibold text-foreground">Upcoming adjustments</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {totalAdj < 0 ? `${Math.abs(totalAdj)} kcal being reduced` : `${totalAdj} kcal being added`} across {futureAdj.length} days.
                </p>
                <button
                  onClick={() => setShowPlanDetails(!showPlanDetails)}
                  className="text-[10px] font-semibold text-primary"
                >
                  {showPlanDetails ? 'Hide details ↑' : 'Show details ↓'}
                </button>
                {showPlanDetails && (
                  <div className="space-y-1 pt-1">
                    {futureAdj.map(([d, v], i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{fmtDate(d)}</span>
                        <span className="font-semibold text-foreground">{v > 0 ? '+' : ''}{v} kcal</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        /* Monthly view */
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-accent/5 border border-accent/10 p-3 text-center">
              <p className="text-lg font-bold text-accent">{monthlyStats.surplusDays}</p>
              <p className="text-[10px] text-muted-foreground">Surplus days</p>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
              <p className="text-lg font-bold text-primary">{monthlyStats.deficitDays}</p>
              <p className="text-[10px] text-muted-foreground">Deficit days</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
              <p className="text-lg font-bold text-foreground">{monthlyStats.balancedDays}</p>
              <p className="text-[10px] text-muted-foreground">Balanced</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-muted/30">
            <span className="text-muted-foreground">Net monthly balance</span>
            <span className={`font-bold ${monthlyStats.netBalance > 0 ? 'text-accent' : monthlyStats.netBalance < 0 ? 'text-primary' : 'text-foreground'}`}>
              {monthlyStats.netBalance > 0 ? '+' : ''}{monthlyStats.netBalance} kcal
            </span>
          </div>

          {/* Balance meter — based on monthly net */}
          {(() => {
            const bankClamped = Math.max(-2000, Math.min(2000, monthlyStats.netBalance));
            const bankPct = Math.round(((bankClamped + 2000) / 4000) * 100);
            return (
              <div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border z-10" />
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${monthlyStats.netBalance >= 0 ? 'bg-accent' : 'bg-primary'}`}
                    style={{
                      width: `${Math.abs(bankPct - 50)}%`,
                      marginLeft: monthlyStats.netBalance < 0 ? `${bankPct}%` : '50%',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                  <span>-2000</span>
                  <span>0</span>
                  <span>+2000</span>
                </div>
              </div>
            );
          })()}

          {/* Behavioral insight */}
          {weekendPattern.detected && (
            <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
              <p className="text-xs font-medium text-foreground">💡 {weekendPattern.message}</p>
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-muted-foreground">{summary.message}</p>
    </div>
  );
}

function SummaryMetricBar({ label, value, detail, inverted }: { label: string; value: number; detail: string; inverted?: boolean }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = inverted
    ? (value > 100 ? 'bg-destructive' : value > 80 ? 'bg-accent' : 'bg-primary')
    : (value >= 80 ? 'bg-primary' : value >= 60 ? 'bg-accent' : 'bg-destructive');

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{detail}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${Math.min(100, clamped)}%` }} />
      </div>
    </div>
  );
}

function WeeklySummariesSection() {
  const summaries = getWeeklySummaries();
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  if (summaries.length === 0) return null;

  const fmt = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const scoreColor = (s: number) =>
    s >= 80 ? 'bg-primary/10 text-primary' : s >= 60 ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive';

  const scoreEmoji = (s: number) => s >= 80 ? '🟢' : s >= 60 ? '🟡' : '🔴';

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Weekly Summaries</h3>
      </div>
      <div className="space-y-3">
        {summaries.slice(0, 6).map((s) => {
          const isExpanded = expandedWeek === s.weekStart;
          const mealPct = s.mealsPlanned > 0 ? Math.round((s.mealsLogged / s.mealsPlanned) * 100) : 0;
          const proteinPct = s.proteinTarget > 0 ? Math.round((s.proteinConsumed / s.proteinTarget) * 100) : 0;
          const budgetPct = s.budget > 0 ? Math.round((s.spent / s.budget) * 100) : 0;

          return (
            <div key={s.weekStart} className="rounded-xl bg-muted/30 overflow-hidden">
              <button
                onClick={() => setExpandedWeek(isExpanded ? null : s.weekStart)}
                className="flex items-center gap-3 p-2.5 w-full text-left"
              >
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${scoreColor(s.adherenceScore)}`}>
                  {s.adherenceScore}%
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">{s.insight}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt(s.weekStart)} – {fmt(s.weekEnd)}</p>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 animate-fade-in">
                  {/* Score header */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground font-medium">Adherence Score</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${scoreColor(s.adherenceScore)}`}>
                      {scoreEmoji(s.adherenceScore)} {s.adherenceScore}%
                    </span>
                  </div>

                  {/* Metric bars */}
                  <div className="space-y-2.5">
                    <SummaryMetricBar label="Meals logged" value={mealPct} detail={`${s.mealsLogged}/${s.mealsPlanned}`} />
                    <SummaryMetricBar label="Protein target" value={proteinPct} detail={`${s.proteinConsumed}g / ${s.proteinTarget}g`} />
                    <SummaryMetricBar label="Budget spent" value={budgetPct} detail={`₹${s.spent} / ₹${s.budget}`} inverted />
                    {s.weightChange !== null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Weight change</span>
                        <span className={`font-semibold ${
                          s.weightChange < 0 ? 'text-primary' : s.weightChange > 0 ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {s.weightChange > 0 ? '+' : ''}{s.weightChange}kg
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Insight */}
                  <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-medium text-foreground">💡 {s.insight}</p>
                  </div>

                  {/* Auto-fix status */}
                  {s.autoFixApplied && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium">
                      <TrendingUp className="w-3.5 h-3.5" /> Plan was adjusted for the following week
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
