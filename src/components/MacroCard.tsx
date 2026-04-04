import { memo, useEffect, useState, useRef } from 'react';
import { Flame, Wheat, Droplets } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  label: string;
  current: number;
  goal: number;
  variant: 'coral' | 'primary' | 'gold';
  icon: string;
  index?: number;
}

const iconMap = {
  coral: Flame,
  primary: Wheat,
  gold: Droplets,
};

const colorMap = {
  coral: 'bg-coral',
  primary: 'bg-primary',
  gold: 'bg-accent',
};

const bgMap = {
  coral: 'bg-coral/10',
  primary: 'bg-primary/10',
  gold: 'bg-accent/10',
};

const textMap = {
  coral: 'text-coral',
  primary: 'text-primary',
  gold: 'text-accent',
};

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const start = ref.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(start + diff * eased));
      if (pct < 1) requestAnimationFrame(step);
      else ref.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

export default memo(function MacroCard({ label, current, goal, variant, index = 0 }: Props) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const Icon = iconMap[variant];
  const animatedCurrent = useCountUp(current);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30, delay: index * 0.08 }}
      className="glass-card p-3.5 flex-1 min-w-0"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20, delay: index * 0.08 + 0.15 }}
          className={`w-7 h-7 rounded-lg ${bgMap[variant]} flex items-center justify-center`}
        >
          <Icon className={`w-3.5 h-3.5 ${textMap[variant]}`} />
        </motion.div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{animatedCurrent}<span className="text-xs font-medium text-muted-foreground ml-0.5">/{goal}g</span></p>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden relative">
        <motion.div
          className={`h-full rounded-full ${colorMap[variant]}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: index * 0.08 + 0.2 }}
        />
        {/* Shimmer overlay */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-bar" />
        </div>
      </div>
    </motion.div>
  );
});
