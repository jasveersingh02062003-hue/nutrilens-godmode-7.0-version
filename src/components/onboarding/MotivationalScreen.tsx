import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import MonikaGuide from './MonikaGuide';

interface MotivationalScreenProps {
  name: string;
  goal: string;
  healthConditions: string[];
  onDismiss: () => void;
}

function getMessage(name: string, goal: string, conditions: string[]): string {
  const hasConditions = conditions.length > 0;
  const conditionText = conditions.map(c => c.replace(/_/g, ' ')).join(', ');

  if (hasConditions) {
    if (goal === 'lose') {
      return `${name}, we've tailored your plan for ${conditionText}. You won't lose weight by skipping meals. Eat right, stay consistent, and trust the process.`;
    }
    return `${name}, your plan is customized for ${conditionText}. Consistency is your superpower — keep logging, keep improving.`;
  }

  switch (goal) {
    case 'lose':
      return `You're all set, ${name}. You won't lose weight by skipping meals. Eat at the right time, stay consistent, and let's reach your goals together.`;
    case 'gain':
      return `Time to build, ${name}. Hit your protein targets daily and don't skip meals — your muscles need fuel.`;
    default:
      return `Great job, ${name}. Staying consistent is the key. Keep logging your meals and we'll keep you on track.`;
  }
}

export default function MotivationalScreen({ name, goal, healthConditions, onDismiss }: MotivationalScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6">
      <MonikaGuide
        message={getMessage(name, goal, healthConditions)}
        mood="celebrating"
      />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="text-center mb-10 mt-4"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="text-6xl mb-5"
        >
          {goal === 'lose' ? '🔥' : goal === 'gain' ? '💪' : '💚'}
        </motion.div>

        <h1 className="text-2xl font-display font-bold text-foreground mb-2 tracking-tight">You're All Set</h1>
        <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
          Your personalized nutrition plan is ready. Let's make every meal count.
        </p>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm space-y-2.5 mb-10"
      >
        {[
          { emoji: '📸', text: 'Snap your meals to log instantly' },
          { emoji: '🎯', text: 'Hit your daily targets consistently' },
          { emoji: '📊', text: 'Track progress and celebrate wins' },
        ].map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
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
        transition={{ delay: 0.8 }}
        whileTap={{ scale: 0.98 }}
        onClick={onDismiss}
        className="w-full max-w-sm py-4 rounded-full bg-primary text-primary-foreground text-base font-semibold flex items-center justify-center gap-2"
      >
        Got it — Let's Go <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
