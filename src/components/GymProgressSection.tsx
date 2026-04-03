import { useMemo } from 'react';
import { Dumbbell, Flame, Trophy, Zap } from 'lucide-react';
import { getProfile, getDailyLog, toLocalDateKey } from '@/lib/store';

export default function GymProgressSection() {
  const profile = getProfile();

  const data = useMemo(() => {
    if (!profile?.gym?.goer) return null;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monthly calendar dots
    const workoutDays: Set<number> = new Set();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = getDailyLog(dateStr);
      if (log.gym?.attended) workoutDays.add(d);
    }

    // Weekly consistency bars (last 12 weeks)
    const weeklyBars: { week: number; attended: number; planned: number }[] = [];
    const planned = profile.gym.daysPerWeek || 3;
    for (let w = 0; w < 12; w++) {
      let attended = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + d));
        const log = getDailyLog(toLocalDateKey(date));
        if (log.gym?.attended) attended++;
      }
      weeklyBars.unshift({ week: 12 - w, attended, planned });
    }

    const stats = profile.gym.stats || { totalWorkouts: 0, totalCaloriesBurned: 0, currentStreak: 0, bestStreak: 0, consistencyPercent: 0 };

    return { workoutDays, daysInMonth, weeklyBars, stats, monthName: new Date(year, month).toLocaleString('default', { month: 'long' }) };
  }, [profile]);

  if (!data) return null;

  const firstDayOfWeek = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();

  return (
    <div className="card-elevated p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Dumbbell className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Gym Progress</h3>
      </div>

      {/* Monthly calendar */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{data.monthName}</p>
        <div className="grid grid-cols-7 gap-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <span key={i} className="text-center text-[9px] text-muted-foreground font-semibold">{d}</span>
          ))}
          {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map(day => (
            <div key={day} className="flex items-center justify-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                data.workoutDays.has(day)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}>
                {day}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly consistency bars */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Weekly Consistency (12 weeks)</p>
        <div className="flex items-end gap-1 h-16">
          {data.weeklyBars.map((w, i) => {
            const pct = w.planned > 0 ? Math.min(100, (w.attended / w.planned) * 100) : 0;
            const color = pct >= 80 ? 'bg-primary' : pct >= 50 ? 'bg-accent' : pct > 0 ? 'bg-destructive' : 'bg-muted';
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full rounded-t-sm overflow-hidden bg-muted" style={{ height: '48px' }}>
                  <div className={`w-full ${color} rounded-t-sm`} style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                </div>
                {i % 3 === 0 && <span className="text-[7px] text-muted-foreground">W{w.week}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Trophy, label: 'Workouts', value: data.stats.totalWorkouts },
          { icon: Zap, label: 'Cal Burned', value: `${Math.round(data.stats.totalCaloriesBurned / 1000)}k` },
          { icon: Flame, label: 'Best Streak', value: `${data.stats.bestStreak}d` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
            <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
