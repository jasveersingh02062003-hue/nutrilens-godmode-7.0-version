import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, X, Dumbbell } from 'lucide-react';
import { getDailyLog, saveDailyLog, toLocalDateKey } from '@/lib/store';
import { toast } from 'sonner';

const EXERCISE_PRESETS = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Pull-ups', 'Lat Pulldown', 'Bicep Curl', 'Tricep Dip', 'Leg Press',
  'Lunges', 'Plank', 'Crunches', 'Shoulder Press', 'Cable Fly',
];

interface WorkoutEntry {
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
}

interface WorkoutLoggerProps {
  open: boolean;
  onClose: () => void;
  date?: string;
}

export default function WorkoutLogger({ open, onClose, date }: WorkoutLoggerProps) {
  const today = date || toLocalDateKey(new Date());
  const [entries, setEntries] = useState<WorkoutEntry[]>([
    { exercise: '', sets: 3, reps: 10, weight: 0 },
  ]);
  const [showPresets, setShowPresets] = useState<number | null>(null);

  const updateEntry = (idx: number, field: keyof WorkoutEntry, value: string | number) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    setEntries(prev => [...prev, { exercise: '', sets: 3, reps: 10, weight: 0 }]);
  };

  const removeEntry = (idx: number) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const valid = entries.filter(e => e.exercise.trim());
    if (valid.length === 0) {
      toast.error('Add at least one exercise');
      return;
    }

    const log = getDailyLog(today);
    if (!log.gym) {
      log.gym = { attended: true, durationMinutes: 0, caloriesBurned: 0, intensity: 'moderate' };
    }
    log.gym.workouts = [...(log.gym.workouts || []), ...valid];
    saveDailyLog(log);
    toast.success(`💪 ${valid.length} exercise(s) logged!`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" /> Log Your Lifts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-muted/30 space-y-2 relative">
              {entries.length > 1 && (
                <button onClick={() => removeEntry(idx)} className="absolute top-2 right-2 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="relative">
                <Input
                  placeholder="Exercise name"
                  value={entry.exercise}
                  onChange={e => {
                    updateEntry(idx, 'exercise', e.target.value);
                    setShowPresets(e.target.value ? null : idx);
                  }}
                  onFocus={() => !entry.exercise && setShowPresets(idx)}
                  className="text-sm"
                />
                {showPresets === idx && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-32 overflow-y-auto">
                    {EXERCISE_PRESETS.map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          updateEntry(idx, 'exercise', name);
                          setShowPresets(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Sets</label>
                  <Input
                    type="number"
                    min={1}
                    value={entry.sets}
                    onChange={e => updateEntry(idx, 'sets', parseInt(e.target.value) || 1)}
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Reps</label>
                  <Input
                    type="number"
                    min={1}
                    value={entry.reps}
                    onChange={e => updateEntry(idx, 'reps', parseInt(e.target.value) || 1)}
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Weight (kg)</label>
                  <Input
                    type="number"
                    min={0}
                    value={entry.weight}
                    onChange={e => updateEntry(idx, 'weight', parseFloat(e.target.value) || 0)}
                    className="text-sm h-8"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addEntry}
            className="w-full py-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5 hover:bg-muted/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Exercise
          </button>

          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            Save Workout
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
