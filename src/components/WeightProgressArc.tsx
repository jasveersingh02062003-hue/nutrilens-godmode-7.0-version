import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, Target } from 'lucide-react';
import { getProfile } from '@/lib/store';
import { getWeightEntries } from '@/lib/weight-history';

interface Props {
  refreshKey: number;
}

export default function WeightProgressArc({ refreshKey }: Props) {
  const data = useMemo(() => {
    const profile = getProfile();
    const entries = getWeightEntries();
    if (!profile || entries.length === 0) return null;

    const startWeight = profile.weightKg;
    const targetWeight = profile.targetWeight || startWeight;
    const currentWeight = entries[entries.length - 1].weight;
    const unit = entries[entries.length - 1].unit || 'kg';

    const totalToLose = startWeight - targetWeight;
    const lost = startWeight - currentWeight;
    const progress = totalToLose !== 0 ? Math.max(0, Math.min(1, lost / totalToLose)) : (currentWeight === targetWeight ? 1 : 0);

    return { startWeight, currentWeight, targetWeight, unit, progress, totalToLose, lost };
  }, [refreshKey]);

  if (!data) return null;

  const radius = 80;
  const stroke = 10;
  const cx = 100;
  const cy = 95;
  // Arc from 150° to 390° (240° sweep)
  const startAngle = 150;
  const sweepAngle = 240;
  const endAngle = startAngle + sweepAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (angle: number) => ({
    x: cx + radius * Math.cos(toRad(angle)),
    y: cy + radius * Math.sin(toRad(angle)),
  });

  const start = arcPath(startAngle);
  const end = arcPath(endAngle);
  const circumference = 2 * Math.PI * radius * (sweepAngle / 360);
  const progressOffset = circumference * (1 - data.progress);

  const largeArc = sweepAngle > 180 ? 1 : 0;
  const d = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;

  const isLoss = data.lost > 0;
  const isGain = data.lost < 0;
  const TrendIcon = isLoss ? TrendingDown : isGain ? TrendingUp : Minus;

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Weight Journey</h3>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: 200, height: 170 }}>
          <svg width="200" height="170" viewBox="0 0 200 170">
            {/* Track */}
            <path
              d={d}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Progress */}
            <motion.path
              d={d}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: progressOffset }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
            {/* Start label */}
            <text x={arcPath(startAngle).x - 8} y={arcPath(startAngle).y + 20} className="fill-muted-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
              {data.startWeight}
            </text>
            {/* End/target label */}
            <text x={arcPath(endAngle).x - 16} y={arcPath(endAngle).y + 20} className="fill-muted-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
              {data.targetWeight}
            </text>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 12 }}>
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
              className="text-3xl font-extrabold text-foreground"
            >
              {data.currentWeight}
            </motion.span>
            <span className="text-[10px] text-muted-foreground font-semibold">{data.unit} now</span>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="flex items-center justify-between mt-1 px-2">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground font-medium">Start</p>
          <p className="text-sm font-bold text-foreground">{data.startWeight} {data.unit}</p>
        </div>
        <div className="flex flex-col items-center">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
            isLoss ? 'bg-primary/10 text-primary' : isGain ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
          }`}>
            <TrendIcon className="w-3 h-3" />
            {isLoss ? '-' : isGain ? '+' : ''}{Math.abs(data.lost).toFixed(1)} {data.unit}
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5">{Math.round(data.progress * 100)}% to goal</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground font-medium">Goal</p>
          <p className="text-sm font-bold text-foreground">{data.targetWeight} {data.unit}</p>
        </div>
      </div>
    </div>
  );
}
