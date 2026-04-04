import { memo, useEffect, useState, useRef } from 'react';
import { getRingGradientColors, getRingStatusLabel } from '@/lib/meal-state-service';
import { DayState } from '@/lib/calorie-engine';
import { getActivePlan } from '@/lib/event-plan-service';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  dayState: DayState;
  proteinRemaining?: number;
}

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      const current = Math.round(start + diff * eased);
      setVal(current);
      if (pct < 1) requestAnimationFrame(step);
      else ref.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

export default memo(function CalorieRing({ dayState, proteinRemaining }: Props) {
  const { totalConsumed, totalAllowed, totalBurned, remaining, adjustedTarget } = dayState;

  const progress = totalAllowed > 0 ? Math.min(1, totalConsumed / totalAllowed) : 0;
  const progressPct = Math.round(progress * 100);
  const displayRemaining = Math.max(0, remaining);
  const size = 180;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - progress);

  const [gradStart, gradEnd] = getRingGradientColors(progressPct);

  const animatedRemaining = useCountUp(displayRemaining);
  const animatedConsumed = useCountUp(totalConsumed);
  const animatedBurned = useCountUp(totalBurned);

  // Spring-animated ring offset
  const springOffset = useSpring(circumference, { stiffness: 120, damping: 25 });
  useEffect(() => { springOffset.set(targetOffset); }, [targetOffset, springOffset]);

  // Day status
  let dayLabel = 'On track';
  let dayColor = 'text-status-ontrack';
  if (remaining < -100) {
    dayLabel = 'Over target';
    dayColor = 'text-status-danger';
  } else if (remaining < 100) {
    dayLabel = 'Close to limit';
    dayColor = 'text-status-warning';
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="glass-card p-6 relative overflow-hidden"
    >
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(circle at 30% 50%, hsl(var(--primary) / 0.06) 0%, transparent 60%)`
      }} />

      <div className="flex items-center gap-6 relative z-10">
        {/* Ring */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Breathing glow filter */}
            <defs>
              <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradStart} />
                <stop offset="100%" stopColor={gradEnd} />
              </linearGradient>
            </defs>
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
            {/* Glow layer */}
            <motion.circle
              cx={size/2} cy={size/2} r={radius} fill="none"
              stroke="url(#calorieGrad)" strokeWidth={stroke + 6}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: springOffset }}
              filter="url(#ringGlow)"
              className="animate-breathe"
              opacity={0.4}
            />
            {/* Main arc */}
            <motion.circle
              cx={size/2} cy={size/2} r={radius} fill="none"
              stroke="url(#calorieGrad)" strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: springOffset }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-foreground">{animatedRemaining}</span>
            <span className="text-[11px] text-muted-foreground font-medium mt-0.5">kcal remaining</span>
            {proteinRemaining != null && proteinRemaining > 0 && (
              <span className="text-[10px] font-semibold text-coral mt-1">💪 {proteinRemaining}g protein left</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Eaten</span>
              <span className="text-sm font-bold text-foreground">{animatedConsumed}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-coral"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, totalAllowed > 0 ? (totalConsumed / totalAllowed) * 100 : 0)}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.3 }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Burned</span>
              <span className="text-sm font-bold text-foreground">{animatedBurned}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-mint"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (totalBurned / 500) * 100)}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.4 }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Allowed</span>
              <span className="text-sm font-bold text-primary">{totalAllowed}</span>
            </div>
            {totalBurned > 0 && (
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {adjustedTarget} base + {totalBurned} burned
              </p>
            )}
            {getActivePlan() && (
              <p className="text-[8px] font-bold text-primary mt-0.5">🎯 Plan Target</p>
            )}
            <p className={`text-[10px] font-semibold mt-1 ${dayColor}`}>
              {dayLabel}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
