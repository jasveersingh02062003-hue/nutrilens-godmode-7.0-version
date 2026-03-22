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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pt-5 pb-2"
    >
      {/* Thin Apple-style progress line */}
      <div className="relative h-[3px] rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 25 }}
        />
      </div>
      <div className="flex justify-between items-center mt-2.5">
        <p className="text-[11px] text-muted-foreground font-medium tracking-wide">
          {stepName}
        </p>
        <p className="text-[11px] text-muted-foreground font-mono font-medium">
          {current}/{total}
        </p>
      </div>
    </motion.div>
  );
}
