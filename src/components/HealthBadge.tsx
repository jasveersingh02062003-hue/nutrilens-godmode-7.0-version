import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UnifiedMealScore } from '@/lib/health-score';

const dotColor = {
  green: 'bg-primary',
  yellow: 'bg-accent',
  red: 'bg-destructive',
};

const textColor = {
  green: 'text-primary',
  yellow: 'text-accent',
  red: 'text-destructive',
};

const bgColor = {
  green: 'bg-primary/10',
  yellow: 'bg-accent/10',
  red: 'bg-destructive/10',
};

interface Props {
  score: UnifiedMealScore;
  compact?: boolean;
}

export default function HealthBadge({ score, compact = false }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (score.conditionScores.length === 0) return null;

  return (
    <div className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${bgColor[score.overallColor]} transition-all`}
        title="Health Score"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor[score.overallColor]}`} />
        {!compact && (
          <span className={`text-[9px] font-bold ${textColor[score.overallColor]}`}>
            {score.overallScore}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-1.5 z-50 w-64 p-3 rounded-xl bg-card border border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-foreground">Health Score</span>
              <span className={`text-sm font-bold ${textColor[score.overallColor]}`}>{score.overallScore}/100</span>
            </div>

            {/* Per-condition breakdown */}
            <div className="space-y-1.5 mb-2">
              {score.conditionScores.map((cs, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {cs.icon} {cs.condition}
                  </span>
                  <span className={`text-[10px] font-bold ${textColor[cs.color]}`}>
                    {cs.score}/100
                  </span>
                </div>
              ))}
            </div>

            {/* Top reasons */}
            {score.topReasons.length > 0 && (
              <ul className="space-y-0.5 border-t border-border pt-1.5">
                {score.topReasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground leading-snug">• {r}</li>
                ))}
              </ul>
            )}

            {/* Top tip */}
            {score.topTips.length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-border">
                <p className="text-[9px] font-semibold text-primary mb-0.5">💡 Tip</p>
                <p className="text-[10px] text-muted-foreground">{score.topTips[0]}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
