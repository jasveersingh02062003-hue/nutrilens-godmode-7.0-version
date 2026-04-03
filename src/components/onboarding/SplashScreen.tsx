import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const isFirstLaunch = !scopedGet('nutrilens_splash_shown');
  const duration = isFirstLaunch ? 2000 : 400;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      scopedSet('nutrilens_splash_shown', 'true');
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          {/* Subtle radial glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-primary/8 blur-[80px]" />
          </div>

          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: isFirstLaunch ? 0.6 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-fab">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
          </motion.div>

          {/* Brand name */}
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: isFirstLaunch ? 0.6 : 0.2,
              delay: isFirstLaunch ? 0.15 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-3xl font-display font-bold text-foreground tracking-tight"
          >
            Nutri<span className="text-primary">Lens</span>{' '}
            <span className="text-primary">AI</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: isFirstLaunch ? 0.5 : 0.2,
              delay: isFirstLaunch ? 0.5 : 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mt-3 text-sm text-muted-foreground font-mono tracking-wide"
          >
            ₹ → Protein → Insight
          </motion.p>

          {/* Loading dots for first launch */}
          {isFirstLaunch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="flex gap-1.5 mt-8"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
