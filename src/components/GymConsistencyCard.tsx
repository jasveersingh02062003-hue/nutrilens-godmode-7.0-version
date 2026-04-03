import React, { useMemo } from 'react';
import { Dumbbell, Flame } from 'lucide-react';
import { getProfile, toLocalDateKey, getDailyLog } from '@/lib/store';
import { getWeeklyConsistency } from '@/lib/gym-service';

interface GymConsistencyCardProps {
  onLogWorkout?: () => void;
}

const GymConsistencyCard = React.memo(function GymConsistencyCard({ onLogWorkout }: GymConsistencyCardProps) {
  const profile = getProfile();

  const stats = useMemo(() => {
    if (!profile?.gym?.goer) return null;

    const today = new Date();
    const todayStr = toLocalDateKey(today);
    const planned = profile.gym.daysPerWeek || 3;
    
    // Count attended this week (last 7 days)
    let attended = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const log = getDailyLog(toLocalDateKey(d));
      if (log.gym?.attended) attended++;
    }

    const consistency = getWeeklyConsistency(profile, todayStr);
    const consistencyPct = Math.round(consistency * 100);
    const currentStreak = profile.gym.stats?.currentStreak || 0;

    return { attended, planned, consistencyPct, currentStreak };
  }, [profile]);

  if (!profile?.gym?.goer || !stats) return null;

  const consistencyColor = stats.consistencyPct >= 80
    ? 'text-primary'
    : stats.consistencyPct >= 50
      ? 'text-accent'
      : 'text-destructive';

  const ringPct = Math.min(100, (stats.attended / stats.planned) * 100);

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-3">
        {/* Mini progress ring */}
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${ringPct * 1.257} 125.7`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            This week: {stats.attended}/{stats.planned} workouts
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {stats.currentStreak > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                <Flame className="w-3 h-3 text-destructive" /> {stats.currentStreak} day streak
              </span>
            )}
            <span className={`text-xs font-bold ${consistencyColor}`}>
              {stats.consistencyPct}% consistent
            </span>
          </div>
        </div>

        {onLogWorkout && (
          <button
            onClick={onLogWorkout}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold"
          >
            Log
          </button>
        )}
      </div>
    </div>
  );
});

export default GymConsistencyCard;
