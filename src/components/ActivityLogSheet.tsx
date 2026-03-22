import { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ACTIVITY_TYPES, calculateCalories, getMetForIntensity } from '@/lib/activities';
import { addActivity, addActivityForDate, ActivityEntry } from '@/lib/store';
import { handleExerciseAdjustment } from '@/lib/exercise-adjustment';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  weightKg: number;
  targetDate?: string;
}

export default function ActivityLogSheet({ open, onClose, onSaved, weightKg, targetDate }: Props) {
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [selected, setSelected] = useState(ACTIVITY_TYPES[0]);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate');

  const met = getMetForIntensity(selected, intensity);
  const estCalories = calculateCalories(met, weightKg, duration);

  const handleSelect = (a: typeof ACTIVITY_TYPES[0]) => {
    setSelected(a);
    setStep('details');
  };

  const handleSave = () => {
    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      type: selected.id,
      duration,
      intensity,
      calories: estCalories,
      met,
      source: 'manual',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    if (targetDate) {
      addActivityForDate(targetDate, entry);
    } else {
      addActivity(entry);
    }
    // Trigger exercise-aware meal adjustment
    const adjResult = handleExerciseAdjustment(entry, targetDate);
    if (adjResult) {
      if (adjResult.distribution.length > 0) {
        const mealNames = adjResult.distribution.map(d => d.mealType).join(', ');
        const lateNote = adjResult.wasLateLogged ? ' (late-log: reduced impact)' : '';
        toast.success(`🏋️ +${adjResult.addedCalories} kcal added to ${mealNames}${lateNote}`);
      } else if (adjResult.recoverySnack && adjResult.recoverySnack > 0) {
        toast.success(`🥤 +${adjResult.recoverySnack} kcal recovery snack available`);
      } else if (adjResult.carriedForward && adjResult.carriedForward > 0) {
        toast.success(`📅 +${adjResult.carriedForward} kcal carried to tomorrow`);
      }
    }
    onSaved();
    handleClose();
  };

  const handleClose = () => {
    setStep('select');
    setDuration(30);
    setIntensity('moderate');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-0">
        <SheetHeader className="p-5 pb-3 flex flex-row items-center justify-between">
          <SheetTitle className="text-base font-bold">
            {step === 'select' ? 'Add Activity' : selected.name}
          </SheetTitle>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </SheetHeader>

        {step === 'select' ? (
          <div className="px-5 pb-6 grid grid-cols-3 gap-2.5">
            {ACTIVITY_TYPES.map(a => (
              <button
                key={a.id}
                onClick={() => handleSelect(a)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors active:scale-95"
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{a.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 pb-6 space-y-5">
            {/* Activity header */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <span className="text-3xl">{selected.icon}</span>
              <div>
                <p className="font-bold text-sm text-foreground">{selected.name}</p>
                <button onClick={() => setStep('select')} className="text-[11px] text-primary font-semibold">Change activity</button>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Duration (minutes)</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setDuration(Math.max(5, duration - 5))} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center active:scale-95">
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold text-foreground">{duration}</span>
                  <span className="text-xs text-muted-foreground ml-1">min</span>
                </div>
                <button onClick={() => setDuration(Math.min(300, duration + 5))} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center active:scale-95">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Intensity */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Intensity</label>
              <div className="flex gap-2">
                {(['light', 'moderate', 'intense'] as const).map(i => (
                  <button
                    key={i}
                    onClick={() => setIntensity(i)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      intensity === i
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated calories */}
            <div className="p-4 rounded-xl bg-coral/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Estimated calories burned</p>
              <p className="text-3xl font-bold text-coral">{estCalories}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">MET: {met.toFixed(1)} × {weightKg}kg × {duration}min</p>
            </div>

            {/* Save */}
            <button onClick={handleSave} className="btn-primary w-full text-center">
              Save Activity
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
