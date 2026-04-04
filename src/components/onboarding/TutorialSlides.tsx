import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import MonikaGuide from './MonikaGuide';

interface TutorialSlidesProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: Camera,
    emoji: '📸',
    title: 'Snap a Photo',
    description: 'Point your camera at any meal — our AI identifies every item and logs nutrition instantly.',
    gradient: 'from-primary/20 to-secondary/10',
    accentColor: 'hsl(var(--primary))',
    particles: ['🍛', '🥗', '🍳'],
  },
  {
    icon: Mic,
    emoji: '🎙️',
    title: 'Log with Voice',
    description: 'Just say "I had 2 rotis and dal" — the AI handles portions, calories, and macros.',
    gradient: 'from-accent/20 to-gold/10',
    accentColor: 'hsl(var(--accent))',
    particles: ['💬', '🗣️', '✨'],
  },
  {
    icon: BarChart3,
    emoji: '📊',
    title: 'Track Everything',
    description: 'Calories, macros, budget, weight, water — smart insights that adapt to your habits.',
    gradient: 'from-secondary/20 to-mint/10',
    accentColor: 'hsl(var(--secondary))',
    particles: ['📈', '🎯', '⚡'],
  },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: 'easeOut' as const } },
  exit: (dir: number) => ({ x: dir < 0 ? 40 : -40, opacity: 0, transition: { duration: 0.15 } }),
};

function FloatingParticle({ emoji, delay, x, y }: { emoji: string; delay: number; x: number; y: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0.5, 1.2, 0.5],
        y: [0, -20, -40],
        x: [0, x * 0.5, x],
      }}
      transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute text-xl pointer-events-none"
      style={{ left: `${50 + y}%`, top: '40%' }}
    >
      {emoji}
    </motion.span>
  );
}

export default function TutorialSlides({ onComplete }: TutorialSlidesProps) {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      setDir(1);
      setCurrent(c => c + 1);
    } else {
      onComplete();
    }
  };

  const slide = SLIDES[current];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 relative overflow-hidden">
      {/* Animated background gradient */}
      <motion.div
        key={`bg-${current}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle 300px at 50% 35%, ${slide.accentColor.replace(')', ' / 0.06)')}, transparent)`,
        }}
      />

      <MonikaGuide
        message={
          current === 0
            ? "Hi! I'm Monika, your AI nutrition partner. Let me show you around."
            : current === 1
            ? "You can literally just talk to me — how cool is that?"
            : "I'll be your personal nutrition tracker and coach."
        }
        mood={current === 0 ? 'waving' : current === 1 ? 'excited' : 'celebrating'}
      />

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={current}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="w-full max-w-sm relative"
        >
          {/* Animated illustration container */}
          <motion.div
            className={`relative w-36 h-36 mx-auto rounded-3xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-8 overflow-visible`}
          >
            {/* Pulsing ring */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl border-2 border-primary/20"
            />

            {/* Floating particles around the icon */}
            {slide.particles.map((p, i) => (
              <FloatingParticle
                key={`${current}-${i}`}
                emoji={p}
                delay={i * 0.6}
                x={[-30, 30, -20][i]}
                y={[-15, 15, 0][i]}
              />
            ))}

            {/* Main emoji with bounce */}
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="text-6xl relative z-10"
            >
              {slide.emoji}
            </motion.span>

            {/* Decorative dots */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-[-8px]"
            >
              <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-primary/40" />
              <div className="absolute bottom-0 right-0 w-1 h-1 rounded-full bg-accent/40" />
            </motion.div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-display font-bold text-foreground mb-3 tracking-tight">{slide.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
              {slide.description}
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Animated dots */}
      <div className="flex gap-2.5 mb-10">
        {SLIDES.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === current ? 28 : 8,
              height: 8,
              backgroundColor: i === current ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              borderRadius: 4,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        ))}
      </div>

      {/* CTA button with shimmer */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={goNext}
        className="w-full max-w-sm py-4 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 relative overflow-hidden shadow-fab"
      >
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent skew-x-12"
        />
        {current === SLIDES.length - 1 ? (
          <>Get Started <ArrowRight className="w-4 h-4" /></>
        ) : (
          <>Continue <Sparkles className="w-3.5 h-3.5" /></>
        )}
      </motion.button>

      {/* Skip */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onComplete}
        className="mt-4 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors"
      >
        Skip
      </motion.button>
    </div>
  );
}
