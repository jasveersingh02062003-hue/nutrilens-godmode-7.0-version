import { Stethoscope, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onAcknowledge: () => void;
  onCancel: () => void;
  /** Optional contextual title, e.g. "Before viewing your blood report". */
  title?: string;
}

/**
 * Reusable "Consult a Doctor" gate shown before any clinical data surface.
 * P0-4 safeguard — required for DPDP Act / app-store compliance.
 */
export default function MedicalDisclaimerModal({
  open,
  onAcknowledge,
  onCancel,
  title = 'A quick health note',
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden gap-0">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-7 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-card shadow-sm flex items-center justify-center mb-4 border border-border">
            <Stethoscope className="w-7 h-7 text-primary" />
          </div>
          <DialogHeader className="text-left space-y-1.5">
            <DialogTitle className="text-base font-bold text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              NutriLens helps you spot patterns in your food and health data — but we are{' '}
              <span className="font-semibold text-foreground">not a doctor</span>.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center mt-0.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">Please consult your doctor</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Lab values, PCOS scores, and symptom insights need a qualified physician's interpretation based on your full medical history.
              </p>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-muted/60 border border-border">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Don't change your diet, medication, or supplements based on what you see here without speaking to a healthcare professional first.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-1 flex flex-col gap-2">
          <button
            onClick={onAcknowledge}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98] transition-transform shadow-sm"
          >
            I understand — continue
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-2xl text-muted-foreground text-xs font-medium active:scale-[0.98] transition-transform"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
