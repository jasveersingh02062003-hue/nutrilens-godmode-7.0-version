import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Dumbbell, Flame, TrendingUp, Calendar, Download, Trophy, Zap } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getProfile, getDailyLog } from '@/lib/store';
import { toast } from 'sonner';
import GymPDFExport from '@/components/GymPDFExport';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface GymSettingsPageProps {
  open: boolean;
  onClose: () => void;
}

// ─── Summary Tab ───
function SummaryTab() {
  const { profile } = useUserProfile();
  const gym = profile?.gym;
  const stats = gym?.stats || { totalWorkouts: 0, totalCaloriesBurned: 0, currentStreak: 0, bestStreak: 0, consistencyPercent: 0 };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Compute monthly data
  const monthData = useMemo(() => {
    const workoutDays: number[] = [];
    let totalMins = 0;
    let totalCals = 0;
    const energyGym: number[] = [];
    const energyRest: number[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = getDailyLog(dateStr);
      if (log.gym?.attended) {
        workoutDays.push(d);
        totalMins += log.gym.durationMinutes || 0;
        totalCals += log.gym.caloriesBurned || 0;
        if (log.energyLevel) energyGym.push(log.energyLevel);
      } else {
        if (log.energyLevel) energyRest.push(log.energyLevel);
      }
    }

    const avgGymEnergy = energyGym.length > 0 ? (energyGym.reduce((a, b) => a + b, 0) / energyGym.length).toFixed(1) : '—';
    const avgRestEnergy = energyRest.length > 0 ? (energyRest.reduce((a, b) => a + b, 0) / energyRest.length).toFixed(1) : '—';

    return { workoutDays, totalMins, totalCals, avgGymEnergy, avgRestEnergy };
  }, [year, month, daysInMonth]);

  // 12-week consistency
  const weeklyBars = useMemo(() => {
    const bars: { week: number; pct: number }[] = [];
    const planned = gym?.daysPerWeek || 3;
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (w * 7 + today.getDay()));
      let count = 0;
      for (let d = 0; d < 7; d++) {
        const dt = new Date(weekStart);
        dt.setDate(weekStart.getDate() + d);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        const log = getDailyLog(key);
        if (log.gym?.attended) count++;
      }
      bars.push({ week: 12 - w, pct: Math.min(100, Math.round((count / planned) * 100)) });
    }
    return bars;
  }, [gym?.daysPerWeek]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();

  return (
    <div className="space-y-5 pb-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Workouts', value: monthData.workoutDays.length, icon: '🏋️' },
          { label: 'Minutes', value: monthData.totalMins, icon: '⏱️' },
          { label: 'Calories', value: monthData.totalCals, icon: '🔥' },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-lg">{s.icon}</p>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Current Streak', value: `${stats.currentStreak}d`, icon: '🔥' },
          { label: 'Best Streak', value: `${stats.bestStreak}d`, icon: '🏆' },
          { label: 'Consistency', value: `${stats.consistencyPercent}%`, icon: '📊' },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-lg">{s.icon}</p>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Calendar */}
      <div className="rounded-xl border border-border p-3 space-y-2">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary" /> {monthName}
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map(d => (
            <p key={d} className="text-[8px] text-muted-foreground text-center font-medium">{d}</p>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isWorkout = monthData.workoutDays.includes(day);
            const isToday = day === today.getDate();
            return (
              <div
                key={day}
                className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold ${
                  isWorkout
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                    ? 'border border-primary text-primary'
                    : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* 12-Week Consistency Bars */}
      <div className="rounded-xl border border-border p-3 space-y-2">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" /> 12-Week Consistency
        </h3>
        <div className="flex items-end gap-1 h-16">
          {weeklyBars.map(b => (
            <div key={b.week} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${Math.max(4, (b.pct / 100) * 56)}px`,
                  backgroundColor: b.pct >= 80 ? 'hsl(var(--primary))' : b.pct >= 50 ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--muted-foreground) / 0.3)',
                }}
              />
              <span className="text-[7px] text-muted-foreground">{b.week}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Energy Comparison */}
      <div className="rounded-xl border border-border p-3 space-y-2">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" /> Energy Trend
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-lg font-bold text-primary">{monthData.avgGymEnergy}</p>
            <p className="text-[9px] text-muted-foreground">Gym Days</p>
          </div>
          <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-foreground">{monthData.avgRestEnergy}</p>
            <p className="text-[9px] text-muted-foreground">Rest Days</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ───
function SettingsTab({ onSaved }: { onSaved: () => void }) {
  const { profile, updateProfile } = useUserProfile();
  const gym = profile?.gym;

  const [gymGoer, setGymGoer] = useState(gym?.goer || false);
  const [gymDays, setGymDays] = useState(gym?.daysPerWeek || 3);
  const [gymDuration, setGymDuration] = useState(gym?.durationMinutes || 45);
  const [gymIntensity, setGymIntensity] = useState<'light' | 'moderate' | 'intense'>(gym?.intensity || 'moderate');
  const [gymGoal, setGymGoal] = useState<'fat_loss' | 'muscle_gain' | 'general'>(gym?.goal || 'general');
  const [gymTimeOfDay, setGymTimeOfDay] = useState<string>(gym?.timeOfDay || '');
  const [gymSpecificHour, setGymSpecificHour] = useState(gym?.specificHour ?? 7);
  const [workStart, setWorkStart] = useState(gym?.workStart || '09:00');
  const [workEnd, setWorkEnd] = useState(gym?.workEnd || '18:00');
  const [sleepStart, setSleepStart] = useState(gym?.sleepStart || '22:00');
  const [sleepEnd, setSleepEnd] = useState(gym?.sleepEnd || '06:00');
  const [shiftType, setShiftType] = useState<string>(gym?.shiftType || 'day');
  const [fastedTraining, setFastedTraining] = useState(gym?.fastedTraining || false);
  const [hasWeekendSchedule, setHasWeekendSchedule] = useState(gym?.weekendHour != null || !!(gym?.weekendSchedule?.length));
  const [weekendHour, setWeekendHour] = useState(gym?.weekendHour ?? 9);

  const handleSave = async () => {
    const { inferSchedule } = await import('@/lib/gym-service');
    const inferredSchedule = inferSchedule(gymDays);
    const inferredWeekendSchedule = inferredSchedule.filter(day => day === 'saturday' || day === 'sunday');

    updateProfile({
      gym: gymGoer ? {
        goer: true,
        daysPerWeek: gymDays,
        durationMinutes: gymDuration,
        intensity: gymIntensity,
        goal: gymGoal,
        schedule: inferredSchedule,
        stats: profile?.gym?.stats || { totalWorkouts: 0, totalCaloriesBurned: 0, currentStreak: 0, bestStreak: 0, consistencyPercent: 0 },
        timeOfDay: gymTimeOfDay as any || undefined,
        specificHour: gymSpecificHour,
        workStart, workEnd, sleepStart, sleepEnd,
        shiftType: shiftType as any || undefined,
        fastedTraining,
        weekendSchedule: hasWeekendSchedule && inferredWeekendSchedule.length > 0 ? inferredWeekendSchedule : undefined,
        weekendHour: hasWeekendSchedule ? weekendHour : undefined,
      } : { goer: false, daysPerWeek: 0, durationMinutes: 0, intensity: 'moderate' as const, goal: 'general' as const, schedule: [], stats: { totalWorkouts: 0, totalCaloriesBurned: 0, currentStreak: 0, bestStreak: 0, consistencyPercent: 0 } },
    });
    toast.success('Gym settings saved!');
    onSaved();
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );

  const formatHour = (h: number) => `${h > 12 ? h - 12 : h === 0 ? 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;

  return (
    <div className="space-y-4 pb-6">
      <Field label="I go to the gym">
        <div className="flex gap-2">
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => setGymGoer(v)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${gymGoer === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {v ? '🏋️ Yes' : '❌ No'}
            </button>
          ))}
        </div>
      </Field>

      {gymGoer && (
        <>
          <Field label={`Days per week: ${gymDays}`}>
            <Slider value={[gymDays]} onValueChange={v => setGymDays(v[0])} min={1} max={7} step={1} />
          </Field>

          <Field label="Duration">
            <div className="flex gap-2">
              {[30, 45, 60].map(d => (
                <button key={d} onClick={() => setGymDuration(d)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${gymDuration === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {d === 60 ? '60+ min' : `${d} min`}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Intensity">
            <div className="flex gap-2">
              {(['light', 'moderate', 'intense'] as const).map(i => (
                <button key={i} onClick={() => setGymIntensity(i)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${gymIntensity === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i.charAt(0).toUpperCase() + i.slice(1)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Goal">
            <div className="flex gap-2">
              {([['fat_loss', '🔥 Fat Loss'], ['muscle_gain', '💪 Muscle'], ['general', '🏃 General']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setGymGoal(v as any)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${gymGoal === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="When do you go?">
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'morning', l: '🌅 Morning' },
                { v: 'afternoon', l: '☀️ Afternoon' },
                { v: 'evening', l: '🌆 Evening' },
                { v: 'night', l: '🌙 Night' },
              ].map(o => (
                <button key={o.v} onClick={() => setGymTimeOfDay(o.v)}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${gymTimeOfDay === o.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </Field>

          {gymTimeOfDay && (
            <Field label={`Exact time: ${formatHour(gymSpecificHour)}`}>
              <input type="range" min={0} max={23} step={1} value={gymSpecificHour}
                onChange={e => setGymSpecificHour(Number(e.target.value))} className="w-full accent-primary" />
            </Field>
          )}

          <Field label="Work Hours">
            <div className="flex gap-2 items-center">
              <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium outline-none" />
              <span className="text-muted-foreground text-xs">to</span>
              <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium outline-none" />
            </div>
          </Field>

          <Field label="Sleep Schedule">
            <div className="flex gap-2 items-center">
              <input type="time" value={sleepStart} onChange={e => setSleepStart(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium outline-none" />
              <span className="text-muted-foreground text-xs">to</span>
              <input type="time" value={sleepEnd} onChange={e => setSleepEnd(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium outline-none" />
            </div>
          </Field>

          <Field label="Shift Type">
            <div className="flex gap-2">
              {[['day', '☀️ Day'], ['night', '🌙 Night'], ['rotating', '🔄 Rotating']].map(([v, l]) => (
                <button key={v} onClick={() => setShiftType(v)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${shiftType === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Training Style">
            <button
              onClick={() => setFastedTraining(!fastedTraining)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors border ${fastedTraining ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
            >
              {fastedTraining ? '🥊 Fasted Training (no pre-workout meal)' : '🍌 Regular (pre-workout meal suggested)'}
            </button>
          </Field>

          <Field label="Different schedule on weekends?">
            <button
              onClick={() => setHasWeekendSchedule(!hasWeekendSchedule)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors border ${hasWeekendSchedule ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
            >
              {hasWeekendSchedule ? '✅ Yes, different weekend time' : '📅 Same as weekdays'}
            </button>
          </Field>

          {hasWeekendSchedule && (
            <Field label={`Weekend gym time: ${formatHour(weekendHour)}`}>
              <input type="range" min={0} max={23} step={1} value={weekendHour}
                onChange={e => setWeekendHour(Number(e.target.value))} className="w-full accent-primary" />
            </Field>
          )}
        </>
      )}

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98] transition-transform"
      >
        Save Gym Settings
      </button>
    </div>
  );
}

// ─── Reports Tab ───
function ReportsTab() {
  const [period, setPeriod] = useState<'month' | '30' | '60' | '90'>('month');

  const { startDate, endDate, label } = useMemo(() => {
    const today = new Date();
    const end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (period === 'month') {
      const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      return { startDate: start, endDate: end, label: today.toLocaleString('default', { month: 'long', year: 'numeric' }) };
    }

    const days = parseInt(period);
    const startDt = new Date(today);
    startDt.setDate(today.getDate() - days);
    const start = `${startDt.getFullYear()}-${String(startDt.getMonth() + 1).padStart(2, '0')}-${String(startDt.getDate()).padStart(2, '0')}`;
    return { startDate: start, endDate: end, label: `Last ${days} Days` };
  }, [period]);

  // Compute filtered stats
  const filteredStats = useMemo(() => {
    let workouts = 0, minutes = 0, calories = 0;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const log = getDailyLog(key);
      if (log.gym?.attended) {
        workouts++;
        minutes += log.gym.durationMinutes || 0;
        calories += log.gym.caloriesBurned || 0;
      }
    }
    return { workouts, minutes, calories };
  }, [startDate, endDate]);

  return (
    <div className="space-y-5 pb-6">
      {/* Period Filter */}
      <div className="flex gap-2">
        {([['month', 'This Month'], ['30', '30 Days'], ['60', '60 Days'], ['90', '90 Days']] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setPeriod(v as any)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-semibold transition-colors ${period === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Filtered Stats */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-xs font-bold text-foreground">{label}</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Workouts', value: filteredStats.workouts },
            { label: 'Minutes', value: filteredStats.minutes },
            { label: 'Calories', value: filteredStats.calories },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-base font-bold text-foreground">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Download */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-primary" /> Download Report
        </h3>
        <p className="text-[10px] text-muted-foreground">
          Generate a PDF report for the selected period with attendance calendar, stats, and insights.
        </p>
        <GymPDFExport startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function GymSettingsPage({ open, onClose }: GymSettingsPageProps) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold text-foreground">Gym Settings</h1>
          </div>
        </div>

        <div className="px-4 pt-3">
          <Tabs defaultValue="summary">
            <TabsList className="w-full">
              <TabsTrigger value="summary" className="flex-1 text-xs">Summary</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
              <TabsTrigger value="reports" className="flex-1 text-xs">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="summary"><SummaryTab /></TabsContent>
            <TabsContent value="settings"><SettingsTab onSaved={onClose} /></TabsContent>
            <TabsContent value="reports"><ReportsTab /></TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
