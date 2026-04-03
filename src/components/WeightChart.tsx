import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { getWeightHistory, getProfile } from '@/lib/store';
import { getActivePlanRaw } from '@/lib/event-plan-service';

interface Props {
  refreshKey?: number; // change to trigger re-render
}

export default function WeightChart({ refreshKey }: Props) {
  const profile = getProfile();
  const history = useMemo(() => getWeightHistory(30), [refreshKey]);

  if (history.length === 0) {
    return (
      <div className="card-elevated p-4 text-center">
        <p className="text-sm text-muted-foreground">No weight entries yet. Log your weight to see trends!</p>
      </div>
    );
  }

  const weights = history.map(h => h.weight);
  const minW = Math.min(...weights) - 2;
  const maxW = Math.max(...weights) + 2;
  const goalWeight = profile?.targetWeight || 0;
  const range = maxW - minW || 1;

  const latest = weights[weights.length - 1];
  const first = weights[0];
  const diff = latest - first;
  const TrendIcon = diff < -0.1 ? TrendingDown : diff > 0.1 ? TrendingUp : Minus;
  const trendColor = diff < -0.1 ? 'text-primary' : diff > 0.1 ? 'text-destructive' : 'text-muted-foreground';

  // Build SVG path
  const chartW = 300;
  const chartH = 80;
  const points = history.map((h, i) => {
    const x = history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * chartW;
    const y = chartH - ((h.weight - minW) / range) * chartH;
    return { x, y };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Goal line Y
  const goalY = goalWeight > 0 && goalWeight >= minW && goalWeight <= maxW
    ? chartH - ((goalWeight - minW) / range) * chartH
    : null;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-foreground">Weight Trend</h3>
        <div className="flex items-center gap-1.5">
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          <span className={`text-xs font-bold ${trendColor}`}>
            {diff > 0 ? '+' : ''}{diff.toFixed(1)} {history[0].unit}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">{history[0].date.slice(5)}</span>
        <span className="text-lg font-bold text-foreground">{latest} <span className="text-xs text-muted-foreground">{history[history.length - 1].unit}</span></span>
        <span className="text-[10px] text-muted-foreground">{history[history.length - 1].date.slice(5)}</span>
      </div>

      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-20" preserveAspectRatio="none">
        {/* Goal line */}
        {goalY !== null && (
          <>
            <line x1="0" y1={goalY} x2={chartW} y2={goalY} stroke="hsl(var(--accent))" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            <text x={chartW - 2} y={goalY - 3} textAnchor="end" fontSize="7" fill="hsl(var(--accent))" opacity="0.8">Goal</text>
          </>
        )}
        {/* Weight line */}
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}
