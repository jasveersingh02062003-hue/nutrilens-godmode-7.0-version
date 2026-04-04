import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

// Floating particle for the background
function FloatingOrb({ delay, x, y, size, color }: { delay: number; x: number; y: number; size: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.6, 0.3, 0.6, 0],
        scale: [0.5, 1, 0.8, 1, 0.5],
        x: [0, 20, -15, 10, 0],
        y: [0, -30, -15, -40, -60],
      }}
      transition={{ duration: 4, delay, ease: 'easeInOut' }}
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: color,
        filter: `blur(${size * 0.3}px)`,
      }}
    />
  );
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const isFirstLaunch = !scopedGet('nutrilens_splash_shown');
  const duration = isFirstLaunch ? 3000 : 500;

  const orbs = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 30 + Math.random() * 40,
      size: 6 + Math.random() * 14,
      delay: 0.3 + Math.random() * 1.2,
      color: [
        'hsl(var(--primary) / 0.5)',
        'hsl(var(--accent) / 0.4)',
        'hsl(var(--secondary) / 0.4)',
        'hsl(var(--mint) / 0.3)',
      ][Math.floor(Math.random() * 4)],
    })), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      scopedSet('nutrilens_splash_shown', 'true');
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return createPortal(
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* Animated gradient mesh background */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              animate={{
                background: [
                  'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
                  'radial-gradient(ellipse 70% 60% at 45% 45%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
                  'radial-gradient(ellipse 60% 50% at 55% 55%, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0"
            />
            <motion.div
              animate={{
                background: [
                  'radial-gradient(circle 200px at 30% 70%, hsl(var(--accent) / 0.06) 0%, transparent 70%)',
                  'radial-gradient(circle 250px at 35% 65%, hsl(var(--accent) / 0.1) 0%, transparent 70%)',
                  'radial-gradient(circle 200px at 30% 70%, hsl(var(--accent) / 0.06) 0%, transparent 70%)',
                ],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0"
            />
          </motion.div>

          {/* Floating particles */}
          {isFirstLaunch && orbs.map(orb => (
            <FloatingOrb key={orb.id} {...orb} />
          ))}

          {/* Logo mark with glow ring */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{
              duration: isFirstLaunch ? 0.8 : 0.3,
              ease: [0.16, 1, 0.3, 1],
              type: 'spring',
              stiffness: 200,
              damping: 18,
            }}
            className="relative mb-8"
          >
            {/* Glow ring */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px 4px hsl(var(--primary) / 0.2)',
                  '0 0 40px 8px hsl(var(--primary) / 0.35)',
                  '0 0 20px 4px hsl(var(--primary) / 0.2)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-fab"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-9 h-9 text-primary-foreground" />
              </motion.div>
            </motion.div>

            {/* Orbiting dot */}
            {isFirstLaunch && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-[-12px]"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent" />
              </motion.div>
            )}
          </motion.div>

          {/* Brand name with letter stagger */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: isFirstLaunch ? 0.7 : 0.25,
              delay: isFirstLaunch ? 0.3 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-4xl font-display font-bold text-foreground tracking-tight"
          >
            Nutri<span className="text-primary">Lens</span>{' '}
            <motion.span
              className="text-primary inline-block"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              AI
            </motion.span>
          </motion.h1>

          {/* Tagline with typewriter feel */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: isFirstLaunch ? 0.5 : 0.2,
              delay: isFirstLaunch ? 0.6 : 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mt-4 text-sm text-muted-foreground font-mono tracking-wider"
          >
            ₹ → Protein → Insight
          </motion.p>

          {/* Animated loading bar */}
          {isFirstLaunch && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 1.0, duration: 0.3 }}
              className="mt-10 w-32 h-1 rounded-full bg-muted overflow-hidden origin-left"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    , document.body
  );
}
