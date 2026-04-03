import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStreaks, getNextMilestone, getMilestoneProgress, STREAK_META, StreakType, checkStreakBreaks } from '@/lib/streaks';
import { Progress } from '@/components/ui/progress';
import { useMemo, memo } from 'react';

interface Props {
  refreshKey?: number;
}

export default memo(function ConsistencyCard({ refreshKey }: Props) {
  const streaks = useMemo(() => {
    checkStreakBreaks();
    return getStreaks();
  }, [refreshKey]);

  const streakTypes: StreakType[] = ['nutrition', 'hydration'];
  const totalStreak = streakTypes.reduce((s, t) => s + streaks[t].current, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Flame className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-foreground">Consistency</h3>
          <p className="text-[10px] text-muted-foreground">Keep your streaks alive!</p>
        </div>
        {totalStreak > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10">
            <Flame className="w-3 h-3 text-destructive" />
            <span className="text-xs font-bold text-destructive">{totalStreak}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {streakTypes.map(type => {
          const streak = streaks[type];
          const meta = STREAK_META[type];
          const next = getNextMilestone(streak.current);
          const progress = getMilestoneProgress(streak.current);

          return (
            <div key={type} className="flex items-center gap-3">
              <span className="text-lg">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                  <div className="flex items-center gap-1">
                    {streak.current > 0 && <Flame className="w-3 h-3 text-destructive" />}
                    <span className="text-xs font-bold text-foreground">{streak.current} {streak.current === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>
                <Progress value={progress.pct} className="h-1.5" />
                {next && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {next.emoji} {next.target - streak.current} more to "{next.label}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Longest streaks */}
      <div className="flex gap-3 mt-3 pt-3 border-t border-border">
        {streakTypes.map(type => {
          const streak = streaks[type];
          const meta = STREAK_META[type];
          return (
            <div key={type} className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground">{meta.emoji} Best</p>
              <p className="text-sm font-bold text-foreground">{streak.longest} days</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});
