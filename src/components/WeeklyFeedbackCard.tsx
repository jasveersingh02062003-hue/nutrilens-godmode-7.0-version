import { useState, useEffect } from 'react';
import { TrendingUp, Zap, Share2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  getLatestSummary,
  autoFixNextWeek,
  type WeeklySummary,
} from '@/lib/weekly-feedback';
import { useUserProfile } from '@/contexts/UserProfileContext';

const DISMISSED_KEY = 'nutrilens_weekly_feedback_dismissed';

function formatWeekRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-primary bg-primary/10';
  if (score >= 60) return 'text-accent bg-accent/10';
  return 'text-destructive bg-destructive/10';
}

function scoreEmoji(score: number) {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  return '🔴';
}

function metricIcon(metric: string) {
  switch (metric) {
    case 'protein': return '🥩';
    case 'budget': return '💰';
    case 'meals': return '🍽️';
    case 'weight': return '⚖️';
    default: return '📊';
  }
}

export default function WeeklyFeedbackCard() {
  const { refreshProfile } = useUserProfile();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const s = getLatestSummary();
    if (!s) return;
    const dismissedWeek = localStorage.getItem(DISMISSED_KEY);
    if (dismissedWeek === s.weekStart) {
      setDismissed(true);
    }
    setSummary(s);
  }, []);

  if (!summary || dismissed) return null;

  const mealPct = summary.mealsPlanned > 0 ? Math.round((summary.mealsLogged / summary.mealsPlanned) * 100) : 0;
  const proteinPct = summary.proteinTarget > 0 ? Math.round((summary.proteinConsumed / summary.proteinTarget) * 100) : 0;
  const budgetPct = summary.budget > 0 ? Math.round((summary.spent / summary.budget) * 100) : 0;

  const handleFix = () => {
    const result = autoFixNextWeek(summary);
    if (result.applied) {
      result.changes.forEach(c => toast.success(`✅ ${c}`));
      setSummary({ ...summary, autoFixApplied: true });
      refreshProfile(); // Sync profile context with updated targets
    } else {
      toast.info('No adjustments needed — you\'re on track!');
    }
  };

  const handleShare = () => {
    const text = [
      `📊 Weekly Progress (${formatWeekRange(summary.weekStart, summary.weekEnd)})`,
      `Score: ${summary.adherenceScore}%`,
      `Meals: ${summary.mealsLogged}/${summary.mealsPlanned}`,
      `Protein: ${summary.proteinConsumed}g / ${summary.proteinTarget}g`,
      `Budget: ₹${summary.spent} / ₹${summary.budget}`,
      summary.weightChange !== null ? `Weight: ${summary.weightChange > 0 ? '+' : ''}${summary.weightChange}kg` : '',
      `💡 ${summary.insight}`,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text).then(() => toast.success('Summary copied!')).catch(() => {});
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, summary.weekStart);
    setDismissed(true);
  };

  return (
    <div className="card-elevated p-4 space-y-3 animate-slide-up">
      {/* Hook Mode */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{metricIcon(summary.dominantMetric)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">
              Week of {formatWeekRange(summary.weekStart, summary.weekEnd)}
            </p>
            <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
              {summary.insight}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor(summary.adherenceScore)}`}>
            {scoreEmoji(summary.adherenceScore)} {summary.adherenceScore}%
          </span>
          <button onClick={handleDismiss}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-semibold text-primary"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Hide details' : 'See why →'}
      </button>

      {/* Expanded Breakdown */}
      {expanded && (
        <div className="space-y-3 pt-1 animate-fade-in">
          {/* Metric bars */}
          <div className="space-y-2.5">
            <MetricBar label="Meals logged" value={mealPct} detail={`${summary.mealsLogged}/${summary.mealsPlanned}`} />
            <MetricBar label="Protein target" value={proteinPct} detail={`${summary.proteinConsumed}g / ${summary.proteinTarget}g`} />
            <MetricBar label="Budget spent" value={budgetPct} detail={`₹${summary.spent} / ₹${summary.budget}`} inverted />
            {summary.weightChange !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Weight change</span>
                <span className={`font-semibold ${
                  summary.weightChange < 0 ? 'text-primary' : summary.weightChange > 0 ? 'text-destructive' : 'text-foreground'
                }`}>
                  {summary.weightChange > 0 ? '+' : ''}{summary.weightChange}kg
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {!summary.autoFixApplied ? (
              <Button size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={handleFix}>
                <Zap className="w-3.5 h-3.5" /> Fix Next Week Plan
              </Button>
            ) : (
              <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                <TrendingUp className="w-3.5 h-3.5" /> Plan adjusted for next week
              </div>
            )}
            <Button size="sm" variant="outline" className="h-9 text-xs gap-1" onClick={handleShare}>
              <Share2 className="w-3.5 h-3.5" /> Share
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBar({ label, value, detail, inverted }: { label: string; value: number; detail: string; inverted?: boolean }) {
  const clamped = Math.min(100, Math.max(0, value));
  // For budget, >100% is bad
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
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${Math.min(100, clamped)}%` }}
        />
      </div>
    </div>
  );
}
