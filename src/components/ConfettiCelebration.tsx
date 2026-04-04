import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const COLORS = [
  'hsl(152, 55%, 42%)',  // primary
  'hsl(38, 70%, 55%)',   // accent/gold
  'hsl(170, 35%, 48%)',  // secondary/mint
  'hsl(256, 50%, 60%)',  // violet
  'hsl(8, 80%, 62%)',    // coral
  'hsl(4, 70%, 58%)',    // destructive
];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.6,
    rotation: Math.random() * 720 - 360,
    size: Math.random() * 6 + 4,
  }));
}

export default function ConfettiCelebration({ show }: { show: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setParticles(generateParticles(50));
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
              animate={{ y: '100vh', opacity: 0, rotate: p.rotation, scale: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, delay: p.delay, ease: 'easeIn' }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: p.size > 7 ? '50%' : '1px',
                backgroundColor: p.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
    , document.body
  );
}
