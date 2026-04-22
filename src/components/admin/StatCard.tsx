import { Card } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number | null; // % change vs previous window
  spark?: number[];
  hint?: string;
  accent?: string; // tailwind text color class for icon
}

export function StatCard({ label, value, icon: Icon, delta, spark, hint, accent = 'text-primary' }: StatCardProps) {
  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));
  const deltaPos = (delta ?? 0) > 0;
  const deltaNeg = (delta ?? 0) < 0;
  const DeltaIcon = delta == null ? Minus : deltaPos ? TrendingUp : deltaNeg ? TrendingDown : Minus;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </div>
          <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
          {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        <Icon className={`w-4 h-4 shrink-0 ${accent}`} />
      </div>

      <div className="flex items-end justify-between mt-2 gap-2">
        {delta != null && (
          <div
            className={`text-[10px] font-semibold flex items-center gap-0.5 ${
              deltaPos ? 'text-green-600' : deltaNeg ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            <DeltaIcon className="w-3 h-3" />
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
        {sparkData.length > 1 && (
          <div className="flex-1 h-7 -mr-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
