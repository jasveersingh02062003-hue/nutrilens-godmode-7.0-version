import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CalculatingScreenProps {
  onComplete: () => void;
}

const PHASES = [
  { text: 'Analyzing your body metrics', icon: '📏' },
  { text: 'Calculating metabolic rate', icon: '⚡' },
  { text: 'Adjusting for your goals', icon: '🎯' },
  { text: 'Building your nutrition plan', icon: '✨' },
  { text: 'Almost ready', icon: '🎊' },
];

export default function CalculatingScreen({ onComplete }: CalculatingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const duration = 2800;
    const interval = 30;
    const steps = duration / interval;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const pct = Math.min((current / steps) * 100, 100);
      setProgress(pct);
      setPhaseIdx(Math.min(Math.floor(pct / 20), PHASES.length - 1));

      if (current >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 500);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  const circumference = 2 * Math.PI * 58;

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6">
      {/* Apple-style progress ring */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative w-40 h-40 mb-10"
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64" cy="64" r="58"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="4"
          />
          <motion.circle
            cx="64" cy="64" r="58"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * progress) / 100}
            className="transition-all duration-75"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-mono font-bold text-foreground tracking-tighter">
            {Math.round(progress)}
            <span className="text-lg text-muted-foreground">%</span>
          </span>
        </div>
      </motion.div>

      {/* Phase text */}
      <motion.div
        key={phaseIdx}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-base font-semibold text-foreground tracking-tight">
          {PHASES[phaseIdx].text}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          Personalizing your experience
        </p>
      </motion.div>
    </div>
  );
}
