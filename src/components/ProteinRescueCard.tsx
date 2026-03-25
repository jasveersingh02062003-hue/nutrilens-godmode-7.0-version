import { useState } from 'react';
import { checkProteinRescue, dismissProteinRescue, applyRescueOption, type ProteinRescueOption } from '@/lib/protein-rescue';
import { type UserProfile } from '@/lib/store';
import { toast } from 'sonner';
import { ShieldAlert, Plus, X } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onApplied: () => void;
}

export default function ProteinRescueCard({ profile, onApplied }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const rescue = checkProteinRescue(profile);

  if (!rescue.needed || dismissed) return null;

  const handleApply = (option: ProteinRescueOption) => {
    applyRescueOption(option);
    toast.success(`Added ${option.name} to dinner (+${option.protein}g protein)`);
    onApplied();
    setDismissed(true);
  };

  const handleDismiss = () => {
    dismissProteinRescue();
    setDismissed(true);
  };

  return (
    <div className="card-elevated p-4 border-2 border-destructive/20 bg-destructive/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">🚨 Protein Rescue Mode</p>
            <p className="text-[10px] text-muted-foreground">{rescue.remaining}g protein still needed today</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-muted">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">Quick high-protein options under ₹40:</p>

      <div className="space-y-2">
        {rescue.options.map(option => (
          <button
            key={option.id}
            onClick={() => handleApply(option)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left active:scale-[0.98]"
          >
            <span className="text-xl">{option.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{option.name}</p>
              <p className="text-[10px] text-muted-foreground">
                +{option.protein}g protein · {option.calories} kcal · ₹{option.cost}
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 text-primary" />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleDismiss}
        className="w-full mt-2 py-2 text-[11px] text-muted-foreground font-medium"
      >
        Maybe later (reminds in 1 hour)
      </button>
    </div>
  );
}
