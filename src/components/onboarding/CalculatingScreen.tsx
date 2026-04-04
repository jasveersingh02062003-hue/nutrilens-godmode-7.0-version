import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalculatingScreenProps {
  onComplete: () => void;
}

const PHASES = [
  { text: 'Analyzing your body metrics', icon: '📏', sub: 'BMI, BMR, body composition' },
  { text: 'Calculating metabolic rate', icon: '⚡', sub: 'Basal + activity-adjusted TDEE' },
  { text: 'Adjusting for health conditions', icon: '🎯', sub: 'Personalized macro ratios' },
  { text: 'Building your nutrition plan', icon: '✨', sub: 'Meal timing & calorie targets' },
  { text: 'Almost ready', icon: '🎊', sub: 'Finalizing your personalized plan' },
];

function ScanLine({ progress }: { progress: number }) {
  return (
    <motion.div
      animate={{ rotate: progress * 3.6 }}
      transition={{ duration: 0.1 }}
      className="absolute inset-0"
      style={{ transformOrigin: 'center center' }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-1/2 origin-bottom"
        style={{
          background: 'linear-gradient(to top, hsl(var(--primary) / 0.6), transparent)',
        }}
      />
    </motion.div>
  );
}

function FloatingDot({ delay, angle, radius }: { delay: number; angle: number; radius: number }) {
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0],
      }}
      transition={{ duration: 2, delay, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute w-1.5 h-1.5 rounded-full bg-primary/50"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    />
  );
}

export default function CalculatingScreen({ onComplete }: CalculatingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);

  const dots = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: i * 30,
      delay: i * 0.15,
      radius: 85 + (i % 3) * 8,
    })), []);

  useEffect(() => {
    const duration = 3200;
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
        setTimeout(onComplete, 600);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  const circumference = 2 * Math.PI * 62;
  const phase = PHASES[phaseIdx];

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 relative overflow-hidden">
      {/* Animated background gradients */}
      <motion.div
        animate={{
          background: [
            'radial-gradient(circle 300px at 50% 40%, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
            'radial-gradient(circle 350px at 45% 45%, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
            'radial-gradient(circle 300px at 55% 40%, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0"
      />

      {/* Progress ring with futuristic layers */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative w-48 h-48 mb-10"
      >
        {/* Outer glow ring */}
        <motion.div
          animate={{
            boxShadow: [
              '0 0 30px 8px hsl(var(--primary) / 0.1)',
              '0 0 50px 15px hsl(var(--primary) / 0.2)',
              '0 0 30px 8px hsl(var(--primary) / 0.1)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-2 rounded-full"
        />

        {/* Floating dots around the ring */}
        {dots.map(dot => (
          <FloatingDot key={dot.id} {...dot} />
        ))}

        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          {/* Outer decorative ring */}
          <circle
            cx="70" cy="70" r="68"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.5}
          />
          {/* Main track */}
          <circle
            cx="70" cy="70" r="62"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="3"
          />
          {/* Progress arc */}
          <motion.circle
            cx="70" cy="70" r="62"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * progress) / 100}
            className="transition-all duration-75"
          />
          {/* Inner ring */}
          <circle
            cx="70" cy="70" r="55"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" />
            </linearGradient>
          </defs>
        </svg>

        {/* Scan line */}
        <div className="absolute inset-6 rounded-full overflow-hidden">
          <ScanLine progress={progress} />
        </div>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={Math.round(progress)}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.08 }}
            className="text-4xl font-mono font-bold text-foreground tracking-tighter"
          >
            {Math.round(progress)}
            <span className="text-base text-muted-foreground">%</span>
          </motion.span>
        </div>

        {/* Tick marks around the ring */}
        {[0, 25, 50, 75].map(tick => (
          <motion.div
            key={tick}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: progress >= tick ? 1 : 0.3 }}
            className="absolute w-1 h-3 bg-primary/60 rounded-full"
            style={{
              left: '50%',
              top: '0%',
              transformOrigin: '50% 96px',
              transform: `translateX(-50%) rotate(${tick * 3.6}deg)`,
            }}
          />
        ))}
      </motion.div>

      {/* Phase text with emoji animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phaseIdx}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="text-center"
        >
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5 }}
            className="text-3xl inline-block mb-3"
          >
            {phase.icon}
          </motion.span>
          <p className="text-base font-semibold text-foreground tracking-tight">
            {phase.text}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {phase.sub}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Phase progress pills */}
      <div className="flex gap-2 mt-8">
        {PHASES.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === phaseIdx ? 24 : 6,
              backgroundColor: i <= phaseIdx
                ? 'hsl(var(--primary))'
                : 'hsl(var(--muted))',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="h-1.5 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}
