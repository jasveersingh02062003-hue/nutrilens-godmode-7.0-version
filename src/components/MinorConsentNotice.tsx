import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  age: number;
  consent: boolean;
  onConsentChange: (next: boolean) => void;
}

/**
 * Shown to 13-17 year-olds during signup. Clearly lists what is restricted
 * and what's still available, then captures the parental-awareness consent.
 * Without the consent box ticked, signup CTA stays disabled.
 */
export default function MinorConsentNotice({ age, consent, onConsentChange }: Props) {
  return (
    <div className="card-elevated p-4 space-y-3 border border-accent/40 bg-accent/5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4.5 h-4.5 text-accent" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            You're {age} — here's how the app changes for you
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            We restrict certain features for users under 18 to keep you safe.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-[11px]">
        <div className="rounded-lg bg-muted/40 p-2.5">
          <p className="font-semibold text-foreground mb-1">✅ You can use</p>
          <p className="text-muted-foreground leading-relaxed">
            Meal logging, water tracking, gym workouts, basic nutrition tips, streaks.
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5">
          <p className="font-semibold text-foreground mb-1">🚫 Hidden / disabled</p>
          <p className="text-muted-foreground leading-relaxed">
            PCOS scoring, blood-report insights, deadline-driven transformation
            plans, aggressive calorie deficits. Minimum daily intake is set
            to <strong className="text-foreground">1,600 kcal</strong>.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer select-none pt-1">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => onConsentChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
        />
        <span className="leading-relaxed">
          A parent or guardian knows I'm using this app, and I will consult a doctor
          before making major changes to my diet. I've read the{' '}
          <Link to="/terms" target="_blank" className="text-primary underline">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.
        </span>
      </label>
    </div>
  );
}
