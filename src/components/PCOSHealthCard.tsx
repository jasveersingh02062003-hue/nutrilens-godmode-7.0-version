import { useState, useMemo } from 'react';
import { Heart, TrendingUp, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRecentLogs } from '@/lib/store';
import { scoreDayForPCOS, getPCOSCondition, getPCOSFoodRecommendations, userHasPCOS } from '@/lib/pcos-score';
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

export default function PCOSHealthCard({ refreshKey }: Props) {
  const { profile } = useUserProfile();
  const [expanded, setExpanded] = useState(false);
  const pcos = getPCOSCondition(profile);
  const hasPCOS = userHasPCOS(profile);
  const logs = useMemo(() => hasPCOS ? getRecentLogs(7) : [], [refreshKey, hasPCOS]);

  const weekScores = useMemo(() => {
    if (!hasPCOS) return [];
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
        return scoreDayForPCOS(meals, profile);
      });
  }, [logs, refreshKey, hasPCOS]);

  const avgScore = weekScores.length > 0
    ? Math.round(weekScores.reduce((s, d) => s + d.avgScore, 0) / weekScores.length)
    : 0;

  if (!hasPCOS) return null;

  const avgColor: 'green' | 'yellow' | 'red' =
    avgScore >= 75 ? 'green' : avgScore >= 50 ? 'yellow' : 'red';

  const recommendations = getPCOSFoodRecommendations();
  const pcosType = pcos?.type === 'insulin-resistant' ? 'Insulin-Resistant'
    : pcos?.type === 'inflammatory' ? 'Inflammatory'
    : pcos?.type === 'mixed' ? 'Mixed'
    : 'General';

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
            <h3 className="font-semibold text-sm text-foreground">PCOS Health Score</h3>
            <p className="text-[10px] text-muted-foreground">{pcosType} PCOS · This week</p>
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
            <div className={`px-3 py-2 rounded-xl ${scoreBg[avgColor]} border border-${avgColor === 'green' ? 'primary' : avgColor === 'yellow' ? 'accent' : 'destructive'}/10`}>
              <p className={`text-xs font-medium ${scoreColors[avgColor]}`}>
                {avgScore >= 75
                  ? '🌟 Your meals are well-aligned with PCOS guidelines!'
                  : avgScore >= 50
                  ? '💪 Good progress — small changes can boost your score.'
                  : '🔄 Focus on low-GI foods and more protein to improve.'}
              </p>
            </div>

            {/* PCOS-friendly foods */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <p className="text-[11px] font-semibold text-muted-foreground">PCOS-Friendly Foods</p>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
