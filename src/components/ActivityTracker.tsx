import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Footprints, Plus, Minus, ChevronDown, ChevronUp, Check, Dumbbell } from 'lucide-react';
import { getTodayKey } from '@/lib/store';
import { differenceInDays } from 'date-fns';
import type { ExerciseTime } from '@/lib/event-plan-service';

interface Props {
  exerciseTime: ExerciseTime;
  planStartDate?: string;
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

const MICRO_WORKOUTS = [
  { id: 'squats', label: 'Air Squats / Lunges', duration: '2-3 min', group: 'Lower Body' },
  { id: 'pushups', label: 'Wall Push-ups / Band Rows', duration: '3 min', group: 'Upper Body' },
  { id: 'plank', label: 'Plank / Side Plank', duration: '3 min', group: 'Core' },
  { id: 'glute_bridge', label: 'Glute Bridge Hold', duration: '1 min', group: 'Posterior Chain' },
];

const WEEKLY_TIPS = [
  'Week 1: Focus on form — do each exercise slowly',
  'Week 2: Add 5 reps per set',
  'Week 3: Add 1 extra set per exercise',
  'Week 4: Hold planks 10s longer, squats 5 more reps',
];

export default function ActivityTracker({ exerciseTime, planStartDate }: Props) {
  const storageKey = `nutrilens_steps_${getTodayKey()}`;
  const workoutKey = `nutrilens_microworkout_${getTodayKey()}`;
  const goal = STEP_GOALS[exerciseTime];

  const [steps, setSteps] = useState(() => {
    try { return parseInt(scopedGet(storageKey) || '0', 10); }
    catch { return 0; }
  });

  const [workoutsExpanded, setWorkoutsExpanded] = useState(false);
  const [completedWorkouts, setCompletedWorkouts] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(scopedGet(workoutKey) || '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    scopedSet(storageKey, String(steps));
  }, [steps, storageKey]);

  useEffect(() => {
    scopedSet(workoutKey, JSON.stringify(completedWorkouts));
  }, [completedWorkouts, workoutKey]);

  const progress = Math.min(100, Math.round((steps / goal) * 100));

  const addSteps = (amount: number) => {
    setSteps(prev => Math.max(0, prev + amount));
  };

  const toggleWorkout = (id: string) => {
    setCompletedWorkouts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate current week for progression tip
  const weekNumber = planStartDate
    ? Math.min(4, Math.ceil((differenceInDays(new Date(), new Date(planStartDate)) + 1) / 7))
    : 1;
  const weekTip = WEEKLY_TIPS[weekNumber - 1] || WEEKLY_TIPS[0];
  const completedWorkoutCount = MICRO_WORKOUTS.filter(w => completedWorkouts[w.id]).length;

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

      {/* Micro-Workouts Section */}
      {exerciseTime !== 'none' && (
        <>
          <button
            onClick={() => setWorkoutsExpanded(!workoutsExpanded)}
            className="w-full flex items-center justify-between pt-2 border-t border-border"
          >
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-foreground">Micro-Workouts</p>
              <span className="text-[10px] text-primary font-semibold">{completedWorkoutCount}/{MICRO_WORKOUTS.length}</span>
            </div>
            {workoutsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>

          {workoutsExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5 overflow-hidden"
            >
              <p className="text-[9px] text-primary font-medium px-1">💡 {weekTip}</p>
              {MICRO_WORKOUTS.map(w => (
                <motion.button
                  key={w.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleWorkout(w.id)}
                  className={`w-full flex items-center gap-2.5 py-2 px-2 rounded-xl text-left transition-colors ${
                    completedWorkouts[w.id] ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    completedWorkouts[w.id] ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  }`}>
                    {completedWorkouts[w.id] && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs ${completedWorkouts[w.id] ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {w.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground ml-1">({w.duration})</span>
                  </div>
                  <span className="text-[8px] text-muted-foreground uppercase">{w.group}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
