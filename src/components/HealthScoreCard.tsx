import { useState, useMemo, memo } from 'react';
import { Heart, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRecentLogs } from '@/lib/store';
import { scoreDayUnified, userHasHealthConditions, getActiveConditionLabels, getConditionRecommendations } from '@/lib/health-score';
import { useUserProfile } from '@/contexts/UserProfileContext';

const scoreColors = {
  green: 'text-primary',
  yellow: 'text-accent',
  red: 'text-destructive',
};

const scoreBg = {
  green: 'bg-primary/10',
  yellow: 'bg-accent/10',
  red: 'bg-destructive/10',
};

interface Props {
  refreshKey?: number;
}

export default memo(function HealthScoreCard({ refreshKey }: Props) {
  const { profile } = useUserProfile();
  const [expanded, setExpanded] = useState(false);
  const hasConditions = userHasHealthConditions(profile);
  const conditionLabels = getActiveConditionLabels(profile);
  const logs = useMemo(() => hasConditions ? getRecentLogs(7) : [], [refreshKey, hasConditions]);

  const weekScores = useMemo(() => {
    if (!hasConditions) return [];
    return logs
      .filter(l => l.meals.length > 0)
      .map(l => {
        const meals = l.meals.map(m => ({
          items: m.items,
          totalCalories: m.totalCalories,
          totalProtein: m.totalProtein,
          totalCarbs: m.totalCarbs,
          totalFat: m.totalFat,
        }));
        return scoreDayUnified(meals, profile);
      });
  }, [logs, refreshKey, hasConditions]);

  const avgScore = weekScores.length > 0
    ? Math.round(weekScores.reduce((s, d) => s + d.avgScore, 0) / weekScores.length)
    : 0;

  const avgColor: 'green' | 'yellow' | 'red' =
    avgScore >= 75 ? 'green' : avgScore >= 50 ? 'yellow' : 'red';

  const recommendations = getConditionRecommendations(profile);

  // Aggregate per-condition weekly averages
  const conditionAverages = useMemo(() => {
    if (weekScores.length === 0) return [];
    const condMap = new Map<string, { total: number; count: number; icon: string }>();
    for (const day of weekScores) {
      for (const ms of day.mealScores) {
        for (const cs of ms.conditionScores) {
          const existing = condMap.get(cs.condition) || { total: 0, count: 0, icon: cs.icon };
          existing.total += cs.score;
          existing.count += 1;
          condMap.set(cs.condition, existing);
        }
      }
    }
    return Array.from(condMap.entries()).map(([condition, data]) => ({
      condition,
      icon: data.icon,
      avg: Math.round(data.total / data.count),
      color: (Math.round(data.total / data.count) >= 75 ? 'green' : Math.round(data.total / data.count) >= 50 ? 'yellow' : 'red') as 'green' | 'yellow' | 'red',
    }));
  }, [weekScores]);

  if (!hasConditions) return null;

  return (
    <div className="card-elevated p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
            <Heart className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm text-foreground">Health Score</h3>
            <p className="text-[10px] text-muted-foreground">
              {conditionLabels.map(c => c.label).join(' · ')} · This week
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg ${scoreBg[avgColor]}`}>
            <span className={`text-lg font-bold ${scoreColors[avgColor]}`}>{avgScore}</span>
            <span className={`text-[10px] font-medium ${scoreColors[avgColor]}`}>/100</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            {/* Per-condition breakdown */}
            {conditionAverages.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Condition Breakdown</p>
                {conditionAverages.map((ca, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/30">
                    <span className="text-[11px] text-foreground font-medium">{ca.icon} {ca.condition}</span>
                    <span className={`text-[11px] font-bold ${scoreColors[ca.color]}`}>{ca.avg}/100</span>
                  </div>
                ))}
              </div>
            )}

            {/* Daily score bars */}
            {weekScores.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Daily Scores</p>
                <div className="flex items-end gap-1.5 h-16">
                  {weekScores.map((ds, i) => {
                    const pct = Math.max(8, ds.avgScore);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-muted-foreground font-medium">{ds.avgScore}</span>
                        <div
                          className={`w-full rounded-md transition-all ${
                            ds.color === 'green' ? 'bg-primary/60'
                            : ds.color === 'yellow' ? 'bg-accent/60'
                            : 'bg-destructive/60'
                          }`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Score interpretation */}
            <div className={`px-3 py-2 rounded-xl ${scoreBg[avgColor]}`}>
              <p className={`text-xs font-medium ${scoreColors[avgColor]}`}>
                {avgScore >= 75
                  ? '🌟 Your meals are well-aligned with your health profile!'
                  : avgScore >= 50
                  ? '💪 Good progress — small changes can boost your score.'
                  : '🔄 Focus on condition-specific recommendations to improve.'}
              </p>
            </div>

            {/* Recommended foods */}
            {recommendations.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <p className="text-[11px] font-semibold text-muted-foreground">Recommended Foods</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {recommendations.slice(0, 4).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/50 border border-border">
                      <span className="text-sm">{r.emoji}</span>
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">{r.name}</p>
                        <p className="text-[9px] text-muted-foreground">{r.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
