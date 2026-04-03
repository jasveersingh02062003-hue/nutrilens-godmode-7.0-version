import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Footprints, Plus, Minus } from 'lucide-react';
import { getTodayKey } from '@/lib/store';
import type { ExerciseTime } from '@/lib/event-plan-service';

interface Props {
  exerciseTime: ExerciseTime;
}

const STEP_GOALS: Record<ExerciseTime, number> = {
  none: 8000,
  '10min': 10000,
  '30min': 10000,
  '1hour': 12000,
};

const EXERCISE_TIPS: Record<ExerciseTime, string> = {
  none: 'Focus on walking — split into 2 walks',
  '10min': '+ 5-min stretching or bodyweight squats',
  '30min': '+ 10-min walk + 10-min circuit + stretching',
  '1hour': '+ Full workout session today',
};

export default function ActivityTracker({ exerciseTime }: Props) {
  const storageKey = `nutrilens_steps_${getTodayKey()}`;
  const goal = STEP_GOALS[exerciseTime];

  const [steps, setSteps] = useState(() => {
    try { return parseInt(localStorage.getItem(storageKey) || '0', 10); }
    catch { return 0; }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(steps));
  }, [steps, storageKey]);

  const progress = Math.min(100, Math.round((steps / goal) * 100));

  const addSteps = (amount: number) => {
    setSteps(prev => Math.max(0, prev + amount));
  };

  return (
    <div className="card-subtle p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Footprints className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Steps</p>
        </div>
        <span className="text-xs text-muted-foreground">{EXERCISE_TIPS[exerciseTime]}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 relative flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-muted" />
            <motion.circle
              cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-primary"
              strokeDasharray="94.25"
              strokeDashoffset={94.25 - (progress / 100) * 94.25}
              strokeLinecap="round"
              initial={{ strokeDashoffset: 94.25 }}
              animate={{ strokeDashoffset: 94.25 - (progress / 100) * 94.25 }}
              transition={{ duration: 0.6 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-foreground">{progress}%</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-lg font-bold text-foreground">{steps.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">of {goal.toLocaleString()} steps</p>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => addSteps(-500)}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
          >
            <Minus className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => addSteps(1000)}
            className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"
          >
            <Plus className="w-3 h-3 text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}
