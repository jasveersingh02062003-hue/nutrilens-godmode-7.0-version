import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const pageVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
};

const pageTransition = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 28,
};

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      layout={false}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}
