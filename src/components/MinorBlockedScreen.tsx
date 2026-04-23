import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

interface Props {
  /** Optional: caller can override copy. */
  age?: number | null;
  onBack?: () => void;
}

/**
 * Shown when a user under 13 attempts to sign up.
 * Empathetic copy, no shaming, clear next steps. No data is saved.
 */
export default function MinorBlockedScreen({ age, onBack }: Props) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            We can't sign you up just yet
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            NutriLens AI is built for people aged <strong className="text-foreground">13 and older</strong>.
            Nutrition and body-composition tracking isn't appropriate for younger kids,
            and we'd rather get this right than risk your health.
          </p>
        </div>

        <div className="card-elevated p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-foreground">What you can do</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <li>• Talk to a parent or guardian about healthy eating habits.</li>
            <li>• Ask your school nurse or family doctor for nutrition guidance.</li>
            <li>• Come back when you're 13+ — we'll be here.</li>
          </ul>
        </div>

        <p className="text-[11px] text-muted-foreground">
          No account or personal data has been saved. See our{' '}
          <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
        </p>

        {onBack && (
          <button
            onClick={onBack}
            className="w-full py-3 rounded-xl bg-card border border-border text-foreground text-sm font-medium"
          >
            Go back
          </button>
        )}
      </div>
    </div>
  );
}
