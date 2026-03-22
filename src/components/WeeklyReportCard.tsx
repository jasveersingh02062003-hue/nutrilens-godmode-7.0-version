import { useState, useMemo } from 'react';
import { X, TrendingUp, Droplets, Target, Flame, ChevronDown, ChevronUp, AlertTriangle, Lightbulb, Activity, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWeeklyReport, WeeklyReport } from '@/lib/coach';
import { getProfile } from '@/lib/store';
import { detectAllPatterns, DetectedPattern, savePatternSnapshot } from '@/lib/pattern-detection';
import { getUserConditions } from '@/lib/condition-coach';
import { getSourceEmoji, getSourceLabel } from '@/lib/context-learning';
import type { MealSourceCategory } from '@/lib/store';

export default function WeeklyReportCard() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const profile = getProfile();

  const report = useMemo<WeeklyReport | null>(() => {
    if (!profile) return null;
    const day = new Date().getDay();
    if (day !== 1) return null;
    return generateWeeklyReport(profile);
  }, [profile]);

  const patterns = useMemo<DetectedPattern[]>(() => {
    if (!profile || !report) return [];
    const p = detectAllPatterns(profile, 7);
    if (p.length > 0) savePatternSnapshot(p);
    return p;
  }, [profile, report]);

  const conditions = useMemo(() => profile ? getUserConditions(profile) : [], [profile]);

  if (!report || dismissed) return null;

  const mealPct = Math.round((report.mealsLogged / report.mealsPossible) * 100);
  const severityColor: Record<string, string> = {
    high: 'text-destructive',
    medium: 'text-accent',
    low: 'text-muted-foreground',
  };
  const severityBg: Record<string, string> = {
    high: 'bg-destructive/10',
    medium: 'bg-accent/10',
    low: 'bg-muted/50',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="card-elevated p-4 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent rounded-t-xl" />

        <div className="flex items-center justify-between mb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <p className="text-sm font-bold text-foreground">Weekly Report</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(Date.now() - 7 * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' })} – {new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{mealPct}%</p>
            <p className="text-[9px] text-muted-foreground">Meals</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Flame className="w-3.5 h-3.5 text-coral mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{report.nutritionStreak}</p>
            <p className="text-[9px] text-muted-foreground">Streak</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Droplets className="w-3.5 h-3.5 text-secondary mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{report.hydrationDaysMet}/7</p>
            <p className="text-[9px] text-muted-foreground">Hydrated</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Target className="w-3.5 h-3.5 text-accent mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{report.proteinDaysMet}/7</p>
            <p className="text-[9px] text-muted-foreground">Protein</p>
          </div>
        </div>

        {/* Detected Patterns */}
        {patterns.length > 0 && (
          <div className="mb-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Patterns Detected
            </p>
            {patterns.slice(0, expanded ? patterns.length : 2).map((p) => (
              <div key={p.id} className={`rounded-lg p-2 mb-1.5 ${severityBg[p.severity]}`}>
                <p className={`text-xs font-semibold flex items-center gap-1.5 ${severityColor[p.severity]}`}>
                  <span>{p.icon}</span> {p.title}
                </p>
                <p className="text-[11px] text-foreground mt-0.5">{p.insight}</p>
                {expanded && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-start gap-1">
                    <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-accent" /> {p.recommendation}
                  </p>
                )}
              </div>
            ))}
            {patterns.length > 2 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-[10px] text-primary font-semibold flex items-center gap-0.5 mt-1"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> {patterns.length - 2} more patterns</>}
              </button>
            )}
          </div>
        )}

        {/* Context Stats – Where You Ate */}
        {report.contextStats && Object.keys(report.contextStats.sourceBreakdown).length > 0 && (
          <div className="mb-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Utensils className="w-3 h-3" /> Where You Ate
            </p>
            <div className="space-y-1">
              {Object.entries(report.contextStats.sourceBreakdown)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([cat, data]) => (
                  <div key={cat} className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {getSourceEmoji(cat as MealSourceCategory)} {getSourceLabel(cat as MealSourceCategory)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {data.count} meals · avg {data.avgCal} kcal
                    </span>
                  </div>
                ))}
            </div>
            {Object.keys(report.contextStats.companionStats).length > 0 && (
              <div className="mt-2 space-y-0.5">
                {Object.entries(report.contextStats.companionStats).map(([comp, data]) => (
                  <p key={comp} className="text-[11px] text-foreground flex items-center gap-1.5">
                    <span className="text-muted-foreground">•</span>
                    With {comp}: {data.count} meals · avg {data.avgCal} kcal
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Condition-Specific Insights */}
        {conditions.length > 0 && report.patterns.length > 0 && (
          <div className="mb-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Health Insights
            </p>
            {report.patterns.map((p, i) => (
              <p key={i} className="text-xs text-foreground flex items-start gap-1.5 mb-0.5">
                <span className="text-muted-foreground">•</span> {p}
              </p>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommendations</p>
            {report.recommendations.map((r, i) => (
              <p key={i} className="text-xs text-primary flex items-start gap-1.5 mb-0.5">
                <span>💡</span> {r}
              </p>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
