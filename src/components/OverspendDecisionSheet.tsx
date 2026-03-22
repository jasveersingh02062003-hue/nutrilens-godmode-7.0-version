import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { getOverspendOptions, applyDecision, type OverspendOption } from '@/lib/decision-engine';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  mealCost: number;
}

export default function OverspendDecisionSheet({ open, onClose, mealCost }: Props) {
  const options = getOverspendOptions(mealCost);

  const handleSelect = (option: OverspendOption) => {
    const message = applyDecision(option.id);
    toast.info(message);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-base">⚠️ Budget Alert</SheetTitle>
          <SheetDescription className="text-sm">
            This ₹{mealCost} meal is a big chunk of your daily budget. What do you want to do?
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2 pt-2 pb-6">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className="w-full text-left p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{opt.emoji}</span>
                <span className="font-semibold text-sm text-foreground">{opt.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-7">{opt.impact}</p>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
