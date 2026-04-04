import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Star } from 'lucide-react';
import MonikaGuide from './MonikaGuide';

interface CompletionScreenProps {
  name: string;
  onGoHome: () => void;
}

const CONFETTI_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  'hsl(var(--coral))',
  'hsl(var(--violet))',
  'hsl(var(--gold))',
];

function ConfettiParticle({ delay, x, color, size, rotation }: {
  delay: number; x: number; color: string; size: number; rotation: number;
}) {
  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: [null, 500 + Math.random() * 300],
        x: [null, x + (Math.random() - 0.5) * 200],
        opacity: [1, 1, 0],
        rotate: [0, rotation],
        scale: [1, 0.5],
      }}
      transition={{ duration: 3 + Math.random(), delay, ease: 'easeOut' }}
      className="absolute top-0"
      style={{
        width: size,
        height: size * (Math.random() > 0.5 ? 1 : 2.5),
        borderRadius: size > 5 ? '50%' : '1px',
        backgroundColor: color,
      }}
    />
  );
}

function FloatingRing({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.3, 0],
        scale: [0.5, 1.5, 2],
      }}
      transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeOut' }}
      className="absolute rounded-full border border-primary/20"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
      }}
    />
  );
}

export default function CompletionScreen({ name, onGoHome }: CompletionScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const confetti = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.8,
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 3 + Math.random() * 6,
      rotation: 360 + Math.random() * 720,
    })), []);

  const rings = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      delay: i * 0.5,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      size: 40 + Math.random() * 60,
    })), []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 relative overflow-hidden">
      {/* Animated background */}
      <motion.div
        animate={{
          background: [
            'radial-gradient(circle 400px at 50% 40%, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
            'radial-gradient(circle 500px at 45% 45%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
            'radial-gradient(circle 400px at 55% 40%, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0"
      />

      {/* Expanding rings */}
      {rings.map(ring => (
        <FloatingRing key={ring.id} {...ring} />
      ))}

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confetti.map(p => (
            <ConfettiParticle key={p.id} {...p} />
          ))}
        </div>
      )}

      <MonikaGuide
        message={`${name}, you're all set! Let's start this journey together. 🎉`}
        mood="celebrating"
      />

      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="text-center mb-10 relative"
      >
        {/* Celebration emoji with glow */}
        <motion.div className="relative inline-block mb-5">
          <motion.div
            animate={{
              boxShadow: [
                '0 0 20px 8px hsl(var(--accent) / 0.1)',
                '0 0 40px 16px hsl(var(--accent) / 0.2)',
                '0 0 20px 8px hsl(var(--accent) / 0.1)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="text-5xl"
            >
              🎊
            </motion.div>
          </motion.div>

          {/* Floating stars */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{
                y: [-5, -20, -5],
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
              className="absolute"
              style={{
                left: `${20 + i * 30}%`,
                top: `${10 + i * 15}%`,
              }}
            >
              <Star className="w-3 h-3 text-accent fill-accent" />
            </motion.div>
          ))}
        </motion.div>

        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Welcome Aboard</h1>
        <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
          Your personalized nutrition plan is ready. Time to make every meal count.
        </p>
      </motion.div>

      {/* Feature preview cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-2.5 mb-10"
      >
        {[
          { emoji: '📸', text: 'Snap meals to log instantly', gradient: 'from-primary/5 to-transparent' },
          { emoji: '🧠', text: 'AI-powered nutrition insights', gradient: 'from-accent/5 to-transparent' },
          { emoji: '📊', text: 'Track progress over time', gradient: 'from-secondary/5 to-transparent' },
        ].map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -24, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 300, damping: 25 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-3 bg-gradient-to-r ${item.gradient} bg-card border border-border rounded-2xl px-4 py-4`}
          >
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
              className="text-xl"
            >
              {item.emoji}
            </motion.span>
            <span className="text-sm font-medium text-foreground">{item.text}</span>
            <Sparkles className="w-3 h-3 text-muted-foreground ml-auto" />
          </motion.div>
        ))}
      </motion.div>

      {/* CTA with shimmer */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        whileTap={{ scale: 0.97 }}
        onClick={onGoHome}
        className="w-full max-w-sm py-4 rounded-full bg-primary text-primary-foreground text-base font-bold flex items-center justify-center gap-2 relative overflow-hidden shadow-fab"
      >
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent skew-x-12"
        />
        Continue <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
