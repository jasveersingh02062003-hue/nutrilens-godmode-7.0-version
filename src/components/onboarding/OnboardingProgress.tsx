import { motion } from 'framer-motion';

interface OnboardingProgressProps {
  current: number;
  total: number;
  stepName: string;
}

export default function OnboardingProgress({ current, total, stepName }: OnboardingProgressProps) {
  const progress = (current / total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 pt-5 pb-2"
    >
      {/* Premium progress bar with gradient fill and glow */}
      <div className="relative h-[4px] rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        />
        {/* Shimmer effect on the progress bar */}
        <motion.div
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          className="absolute top-0 h-full w-1/4 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
          style={{ width: `${Math.max(progress * 0.3, 10)}%` }}
        />
        {/* Glow dot at the tip */}
        <motion.div
          animate={{ left: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary"
          style={{
            boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.4)',
          }}
        />
      </div>
      <div className="flex justify-between items-center mt-2.5">
        <motion.p
          key={stepName}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[11px] text-muted-foreground font-medium tracking-wide"
        >
          {stepName}
        </motion.p>
        <p className="text-[11px] text-muted-foreground font-mono font-medium">
          {current}/{total}
        </p>
      </div>
    </motion.div>
  );
}
