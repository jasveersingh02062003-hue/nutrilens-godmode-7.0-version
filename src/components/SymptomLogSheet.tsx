import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SymptomLog, saveSymptomLog, getSymptomLog } from '@/lib/symptom-service';

const SYMPTOM_FIELDS = [
  { key: 'energy', label: 'Energy', low: '😴', high: '⚡' },
  { key: 'mood', label: 'Mood', low: '☹️', high: '😊' },
  { key: 'bloating', label: 'Bloating', low: '✅', high: '💨' },
  { key: 'skin', label: 'Skin', low: '✨', high: '🌋' },
  { key: 'hunger', label: 'Hunger', low: '🍽️', high: '🍔' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  onSaved?: () => void;
}

export default function SymptomLogSheet({ open, onClose, date, onSaved }: Props) {
  const existing = getSymptomLog(date);
  const [log, setLog] = useState<Partial<SymptomLog>>(existing || { date });

  const set = (key: string, val: any) => setLog(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    saveSymptomLog({ date, ...log } as SymptomLog);
    onSaved?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base font-bold">How are you feeling?</SheetTitle>
          <p className="text-[11px] text-muted-foreground">{new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {SYMPTOM_FIELDS.map(({ key, label, low, high }, idx) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {low} → {high}
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => set(key, n as 1|2|3|4|5)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      (log as any)[key] === n
                        ? n <= 2 ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : n >= 4 ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-accent/10 text-accent border-accent/30'
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Sleep */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Sleep (hours)</span>
              <span className="text-xs text-muted-foreground">🌙</span>
            </div>
            <div className="flex gap-2">
              {[4, 5, 6, 7, 8, 9].map(n => (
                <button
                  key={n}
                  onClick={() => set('sleep', n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    log.sleep === n
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card border-border hover:border-primary/20'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Notes */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <span className="text-sm font-semibold text-foreground mb-2 block">Notes (optional)</span>
            <textarea
              value={log.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="How did you feel after meals today?"
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50 resize-none"
            />
          </motion.div>

          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition-transform"
          >
            <Save className="w-4 h-4" /> Save Symptom Log
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
