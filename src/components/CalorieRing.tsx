import { getRingGradientColors, getRingStatusLabel } from '@/lib/meal-state-service';
import { calculateBurnBreakdown } from '@/lib/burn-service';
import { BurnedData } from '@/lib/store';

interface Props {
  eaten: number;
  burned: number;
  goal: number;
  burnedData?: BurnedData;
}

export default function CalorieRing({ eaten, burned, goal, burnedData }: Props) {
  // Use effective burn if burnedData is provided
  const effectiveBurn = burnedData
    ? calculateBurnBreakdown(burnedData).effectiveBurn
    : burned;

  const net = eaten - effectiveBurn;
  const remaining = Math.max(0, goal - net);
  const progress = Math.min(1, net / goal);
  const progressPct = Math.round(progress * 100);
  const size = 180;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const [gradStart, gradEnd] = getRingGradientColors(progressPct);
  const statusInfo = getRingStatusLabel(progressPct);

  // Day status based on remaining
  const dayRemaining = goal - net;
  let dayLabel = 'On track';
  let dayColor = 'text-status-ontrack';
  if (dayRemaining < -100) {
    dayLabel = 'Over target';
    dayColor = 'text-status-danger';
  } else if (dayRemaining < 100) {
    dayLabel = 'Close to limit';
    dayColor = 'text-status-warning';
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-6">
        {/* Ring */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
            <circle
              cx={size/2} cy={size/2} r={radius} fill="none"
              stroke="url(#calorieGrad)" strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
            />
            <defs>
              <linearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradStart} />
                <stop offset="100%" stopColor={gradEnd} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-foreground">{remaining}</span>
            <span className="text-[11px] text-muted-foreground font-medium mt-0.5">kcal remaining</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Eaten</span>
              <span className="text-sm font-bold text-foreground">{eaten}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-coral transition-all duration-700" style={{ width: `${Math.min(100, (eaten / goal) * 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Burned</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-foreground">{effectiveBurn}</span>
                {burnedData && effectiveBurn !== burned && (
                  <span className="text-[9px] text-muted-foreground line-through">{burned}</span>
                )}
              </div>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-mint transition-all duration-700" style={{ width: `${Math.min(100, (effectiveBurn / 500) * 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Goal</span>
              <span className="text-sm font-bold text-primary">{goal}</span>
            </div>
            {/* Day status label */}
            <p className={`text-[10px] font-semibold mt-1 ${dayColor}`}>
              {dayLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
