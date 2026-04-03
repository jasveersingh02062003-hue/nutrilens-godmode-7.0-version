import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EXAMPLES = [
  { name: 'Soya Chunks', pes: 4.33, color: 'hsl(var(--primary))', label: 'Excellent Value', emoji: '🌱' },
  { name: 'Paneer', pes: 0.45, color: 'hsl(45, 93%, 47%)', label: 'Average Value', emoji: '🧀' },
  { name: 'Biryani', pes: 0.13, color: 'hsl(0, 84%, 60%)', label: 'Poor Value', emoji: '🍛' },
];

interface Props {
  onDismiss: () => void;
}

export default function PESFeatureFlex({ onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % EXAMPLES.length);
    }, 3000);
    const taglineTimer = setTimeout(() => setShowTagline(true), 1500);
    return () => { clearInterval(timer); clearTimeout(taglineTimer); };
  }, []);

  const current = EXAMPLES[index];
  const circumference = 2 * Math.PI * 54;
  const normalized = Math.min(current.pes / 5, 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, hsl(220, 20%, 8%) 0%, hsl(240, 15%, 14%) 50%, hsl(260, 12%, 10%) 100%)' }}
    >
      {/* Ambient glow */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="absolute w-72 h-72 rounded-full blur-[80px]"
        style={{ background: current.color }}
      />

      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em] mb-8"
      >
        Food Value Intelligence
      </motion.p>

      {/* PES Ring */}
      <div className="relative w-44 h-44 mb-6">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(0, 0%, 20%)" strokeWidth="6" />
          <motion.circle
            cx="60" cy="60" r="54" fill="none"
            stroke={current.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference * (1 - normalized) }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={index}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="text-3xl"
            >
              {current.emoji}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Food info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-2"
        >
          <p className="text-white text-lg font-bold">{current.name}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <motion.span
              className="text-2xl font-black"
              style={{ color: current.color }}
            >
              {current.pes.toFixed(2)}
            </motion.span>
            <span className="text-white/40 text-sm font-medium">protein/₹</span>
          </div>
          <motion.span
            className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: current.color + '22', color: current.color }}
          >
            {current.label}
          </motion.span>
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      <div className="flex gap-2 mt-4 mb-8">
        {EXAMPLES.map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            animate={{
              background: i === index ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 35%)',
              scale: i === index ? 1.3 : 1,
            }}
          />
        ))}
      </div>

      {/* Tagline */}
      <AnimatePresence>
        {showTagline && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/60 text-sm text-center max-w-[280px] leading-relaxed mb-10 px-4"
          >
            We don't just track food — we tell you if it's{' '}
            <span className="text-white font-semibold">worth your money</span>.
          </motion.p>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          scopedSet('pes_flex_seen', 'true');
          onDismiss();
        }}
        className="px-8 py-3.5 rounded-2xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }}
      >
        Experience Food Value Intelligence
      </motion.button>
    </motion.div>
  );
}
