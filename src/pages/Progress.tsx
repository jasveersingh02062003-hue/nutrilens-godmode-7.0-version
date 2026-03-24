import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trophy, TrendingUp, Scale, Share2, Camera, IndianRupee, FileText, Crown } from 'lucide-react';
import { getRecentLogs, getDailyTotals, getDailyLog, getAllLogDates } from '@/lib/store';
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
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getPlan, isPremium } from '@/lib/subscription-service';
import UpgradeModal from '@/components/UpgradeModal';
import SubscriptionBadge from '@/components/SubscriptionBadge';

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

  const calendarDays = useMemo(() => {
    const days: { day: number; dateStr: string; status: AdherenceStatus; isToday: boolean; isFuture: boolean; locked: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;
      const locked = !premium && dateStr < threeDaysAgo;
      const status: AdherenceStatus = isFuture || locked ? 'gray' : getAdherence(dateStr, goal, waterGoal, logDatesSet);
      days.push({ day: d, dateStr, status, isToday, isFuture, locked });
    }
    return days;
  }, [monthOffset, refreshKey, logDatesSet, goal, waterGoal, premium, threeDaysAgo]);

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
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> On Track</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Partial</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Off Track</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted border border-border" /> No Data</span>
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
