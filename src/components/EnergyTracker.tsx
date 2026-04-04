import { useState } from 'react';
import { motion } from 'framer-motion';
import { Battery, X } from 'lucide-react';
import { getProfile, getDailyLog, saveDailyLog, toLocalDateKey } from '@/lib/store';

interface EnergyTrackerProps {
  onRefresh?: () => void;
}

const ENERGY_LABELS = ['😴', '😐', '🙂', '😊', '🔥'];
const ENERGY_TEXT = ['Very Low', 'Low', 'Okay', 'Good', 'Great'];

export default function EnergyTracker({ onRefresh }: EnergyTrackerProps) {
  const today = toLocalDateKey(new Date());
  const log = getDailyLog(today);
  const [dismissed, setDismissed] = useState(false);
  const [saved, setSaved] = useState(!!log.energyLevel);

  if (dismissed || saved) return null;

  const handleSelect = (level: 1 | 2 | 3 | 4 | 5) => {
    const updated = { ...log, energyLevel: level };
    saveDailyLog(updated);
    setSaved(true);
    onRefresh?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Battery className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">How's your energy? ⚡</p>
            <p className="text-[10px] text-muted-foreground">Helps us optimize your meals</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 justify-center">
        {([1, 2, 3, 4, 5] as const).map(level => (
          <button
            key={level}
            onClick={() => handleSelect(level)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="text-2xl">{ENERGY_LABELS[level - 1]}</span>
            <span className="text-[9px] text-muted-foreground font-medium">{ENERGY_TEXT[level - 1]}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
