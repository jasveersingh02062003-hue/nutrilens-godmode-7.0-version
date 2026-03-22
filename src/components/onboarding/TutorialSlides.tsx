import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, BarChart3, ArrowRight } from 'lucide-react';
import MonikaGuide from './MonikaGuide';

interface TutorialSlidesProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: Camera,
    emoji: '📸',
    title: 'Snap a Photo',
    description: 'Take a photo of any meal — I\'ll identify every item and log the calories, macros, and more.',
    iconBg: 'bg-muted',
  },
  {
    icon: Mic,
    emoji: '🎙️',
    title: 'Log with Voice',
    description: 'Just tell me what you ate — "I had 2 rotis and dal" — and I\'ll handle the rest.',
    iconBg: 'bg-muted',
  },
  {
    icon: BarChart3,
    emoji: '📊',
    title: 'Track Everything',
    description: 'Calories, macros, budget, weight, water — I track it all and give you smart insights.',
    iconBg: 'bg-muted',
  },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 120 : -120, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
  exit: (dir: number) => ({ x: dir < 0 ? 120 : -120, opacity: 0, transition: { duration: 0.2 } }),
};

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
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
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
          className="w-full max-w-sm"
        >
          {/* Minimal illustration */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 300 }}
            className={`w-28 h-28 mx-auto rounded-full ${slide.iconBg} flex items-center justify-center mb-8`}
          >
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="text-5xl"
            >
              {slide.emoji}
            </motion.span>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-display font-bold text-foreground mb-3 tracking-tight">{slide.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
              {slide.description}
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Minimal dots */}
      <div className="flex gap-2 mb-10">
        {SLIDES.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === current ? 20 : 6,
              backgroundColor: i === current ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="h-1.5 rounded-full"
          />
        ))}
      </div>

      {/* Single CTA */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={goNext}
        className="w-full max-w-sm py-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-all active:opacity-90"
      >
        {current === SLIDES.length - 1 ? (
          <>Get Started <ArrowRight className="w-4 h-4" /></>
        ) : (
          'Continue'
        )}
      </motion.button>

      {/* Skip */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onComplete}
        className="mt-4 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors"
      >
        Skip
      </motion.button>
    </div>
  );
}
