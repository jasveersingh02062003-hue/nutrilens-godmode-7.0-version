import { useState, useMemo } from 'react';
import { X, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSymptomLog } from '@/lib/symptom-service';
import { getTodayDateKey, isDailyHidden, setDailyHidden } from '@/lib/daily-visibility';
import SymptomLogSheet from '@/components/SymptomLogSheet';

export default function SymptomReminderCard() {
  const todayKey = getTodayDateKey();
  const alreadyLogged = useMemo(() => !!getSymptomLog(todayKey), [todayKey]);
  const [dismissed, setDismissed] = useState(() => isDailyHidden('nutrilens_symptom_reminder_hidden', todayKey));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [logged, setLogged] = useState(alreadyLogged);

  const handleDismiss = () => {
    setDismissed(true);
    setDailyHidden('nutrilens_symptom_reminder_hidden', todayKey);
  };

  const handleSaved = () => {
    setLogged(true);
    setDailyHidden('nutrilens_symptom_reminder_hidden', todayKey);
  };

  if (logged || dismissed) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="relative rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-background/60 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 pr-4">
              <p className="text-xs font-medium text-foreground leading-relaxed">
                📋 Don't forget to log how you're feeling today. Tracking symptoms helps find food triggers!
              </p>
              <button
                onClick={() => setSheetOpen(true)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20 hover:bg-primary/15 active:scale-[0.97] transition-all"
              >
                📝 Log Symptoms
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SymptomLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={todayKey}
        onSaved={handleSaved}
      />
    </>
  );
}
