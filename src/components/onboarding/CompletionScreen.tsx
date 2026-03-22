import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import MonikaGuide from './MonikaGuide';

interface CompletionScreenProps {
  name: string;
  onGoHome: () => void;
}

function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ['hsl(var(--foreground))', 'hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--muted-foreground))'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 4 + Math.random() * 4;

  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0 }}
      animate={{
        y: [null, 400 + Math.random() * 200],
        x: [null, x + (Math.random() - 0.5) * 120],
        opacity: [1, 1, 0],
        rotate: [0, 360 + Math.random() * 360],
      }}
      transition={{ duration: 2.5 + Math.random(), delay, ease: 'easeOut' }}
      className="absolute top-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

export default function CompletionScreen({ name, onGoHome }: CompletionScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const confettiParticles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
  }));

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 relative overflow-hidden">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confettiParticles.map(p => (
            <ConfettiParticle key={p.id} delay={p.delay} x={p.x} />
          ))}
        </div>
      )}

      <MonikaGuide
        message={`${name}, you're all set! Let's start this journey together.`}
        mood="celebrating"
      />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="text-center mb-10"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="text-6xl mb-5"
        >
          🎊
        </motion.div>

        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Welcome Aboard</h1>
        <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
          Your personalized nutrition plan is ready. Time to make every meal count.
        </p>
      </motion.div>

      {/* Feature preview */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-2.5 mb-10"
      >
        {[
          { emoji: '📸', text: 'Snap meals to log instantly' },
          { emoji: '🧠', text: 'AI-powered nutrition insights' },
          { emoji: '📊', text: 'Track progress over time' },
        ].map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5"
          >
            <span className="text-lg">{item.emoji}</span>
            <span className="text-sm font-medium text-foreground">{item.text}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        whileTap={{ scale: 0.98 }}
        onClick={onGoHome}
        className="w-full max-w-sm py-4 rounded-full bg-primary text-primary-foreground text-base font-semibold flex items-center justify-center gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
