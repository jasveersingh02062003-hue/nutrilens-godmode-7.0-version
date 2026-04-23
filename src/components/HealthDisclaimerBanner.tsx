import { useState, useEffect } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  /** Storage key suffix — allows mounting on multiple surfaces with independent dismissal */
  surface?: string;
  /** Compact one-line variant (no icon, smaller padding) */
  compact?: boolean;
}

/**
 * Per-session dismissible health/medical disclaimer.
 * Required for DPDP + liability protection on health-coaching surfaces.
 */
export default function HealthDisclaimerBanner({ surface = 'global', compact = false }: Props) {
  const storageKey = `nl_health_disclaimer_dismissed_${surface}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(storageKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    try { sessionStorage.setItem(storageKey, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            role="note"
            aria-label="Medical disclaimer"
            className={`flex items-center gap-2.5 rounded-2xl bg-muted/60 border border-border ${
              compact ? 'px-3 py-1.5' : 'px-3 py-2'
            }`}
          >
            {!compact && <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <p className={`flex-1 ${compact ? 'text-[10px]' : 'text-[11px]'} text-muted-foreground leading-snug`}>
              NutriLens offers general wellness guidance, <span className="font-semibold text-foreground">not medical advice</span>. Consult a qualified doctor for any health decisions.
            </p>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss disclaimer"
              className="shrink-0 w-6 h-6 rounded-md hover:bg-background/60 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
