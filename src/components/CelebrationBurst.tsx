import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  'hsl(var(--coral))',
  'hsl(var(--violet))',
  'hsl(var(--gold))',
];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
  drift: number;
}

type Intensity = 'sparkle' | 'burst' | 'confetti';

interface CelebrationBurstProps {
  show: boolean;
  intensity?: Intensity;
  duration?: number;
  colors?: string[];
}

const PARTICLE_COUNTS: Record<Intensity, number> = {
  sparkle: 15,
  burst: 30,
  confetti: 55,
};

function generateParticles(count: number, palette: string[]): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: palette[Math.floor(Math.random() * palette.length)],
    delay: Math.random() * 0.5,
    rotation: Math.random() * 720 - 360,
    size: Math.random() * 6 + 3,
    drift: (Math.random() - 0.5) * 120,
  }));
}

export default function CelebrationBurst({
  show,
  intensity = 'burst',
  duration = 2800,
  colors = COLORS,
}: CelebrationBurstProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (show) {
      setParticles(generateParticles(PARTICLE_COUNTS[intensity], colors));
      setVisible(true);
      const t = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(t);
    }
  }, [show, intensity, duration, colors]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                y: -10,
                x: `${p.x}vw`,
                opacity: 1,
                rotate: 0,
                scale: 1,
              }}
              animate={{
                y: '100vh',
                x: `calc(${p.x}vw + ${p.drift}px)`,
                opacity: 0,
                rotate: p.rotation,
                scale: intensity === 'sparkle' ? 0.3 : 0.5,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: intensity === 'sparkle' ? 1.8 : 2.5,
                delay: p.delay,
                ease: 'easeIn',
              }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size * (Math.random() > 0.5 ? 1 : 2.5),
                borderRadius: p.size > 6 ? '50%' : '1px',
                backgroundColor: p.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
