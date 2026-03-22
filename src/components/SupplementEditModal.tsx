import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2 } from 'lucide-react';
import { SupplementEntry, deleteSupplement } from '@/lib/store';

interface Props {
  open: boolean;
  supplement: SupplementEntry | null;
  onClose: () => void;
  onEdit: (s: SupplementEntry) => void;
  onDeleted: () => void;
}

export default function SupplementEditModal({ open, supplement, onClose, onEdit, onDeleted }: Props) {
  if (!open || !supplement) return null;

  const handleDelete = () => {
    deleteSupplement(supplement.id);
    onDeleted();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          <div className="px-5 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Supplement Details</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Info */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <span className="text-3xl">{supplement.icon}</span>
              <div>
                <p className="text-sm font-bold text-foreground">{supplement.name}</p>
                {supplement.brand && <p className="text-[11px] text-muted-foreground">{supplement.brand}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {supplement.dosage} {supplement.unit} · {supplement.time}
                </p>
              </div>
            </div>

            {(supplement.calories > 0 || supplement.protein > 0) && (
              <div className="flex gap-2">
                {[
                  { label: 'Cal', val: supplement.calories, color: 'primary' },
                  { label: 'Protein', val: supplement.protein, color: 'coral' },
                  { label: 'Carbs', val: supplement.carbs, color: 'secondary' },
                  { label: 'Fat', val: supplement.fat, color: 'accent' },
                ].map(m => (
                  <div key={m.label} className="flex-1 p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs font-bold text-foreground">{m.val}{m.label === 'Cal' ? '' : 'g'}</p>
                    <p className="text-[9px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { onEdit(supplement); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
