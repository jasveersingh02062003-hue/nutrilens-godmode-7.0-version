import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, X, RefreshCw } from 'lucide-react';

export interface WarningMessage {
  icon: string;
  text: string;
  condition?: string;
  itemId?: string;
  itemName?: string;
}

export type WarningSeverity = 'high' | 'medium' | 'low';
export type WarningType = 'allergen' | 'health' | 'combined';

interface Props {
  type: WarningType;
  severity: WarningSeverity;
  title: string;
  messages: WarningMessage[];
  onDismiss?: () => void;
  onRemoveItem?: (itemId: string) => void;
  onFindAlternative?: () => void;
  className?: string;
}

const severityStyles: Record<WarningSeverity, { container: string; text: string; badge: string }> = {
  high: {
    container: 'bg-destructive/10 border-destructive/30',
    text: 'text-destructive',
    badge: 'bg-destructive/15 border-destructive/20 text-destructive',
  },
  medium: {
    container: 'bg-orange-500/10 border-orange-500/30',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-500/15 border-orange-500/20 text-orange-600 dark:text-orange-400',
  },
  low: {
    container: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-500/15 border-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  },
};

export default function AnimatedWarningBanner({
  type,
  severity,
  title,
  messages,
  onDismiss,
  onRemoveItem,
  onFindAlternative,
  className = '',
}: Props) {
  const styles = severityStyles[severity];
  const IconComponent = severity === 'high' ? ShieldAlert : AlertTriangle;

  if (messages.length === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: -10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: -10 }}
      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      className={`rounded-xl border p-3.5 space-y-2 ${styles.container} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
          >
            <IconComponent className={`w-5 h-5 ${styles.text} ${severity === 'high' ? 'animate-pulse' : ''}`} />
          </motion.div>
          <span className={`text-sm font-bold ${styles.text}`}>{title}</span>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="w-6 h-6 rounded-md hover:bg-background/50 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-1.5">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between gap-2 bg-background/50 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <span className="text-sm">{msg.icon}</span>
              <span className="text-xs font-medium text-foreground">{msg.text}</span>
              {msg.condition && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${styles.badge}`}>
                  {msg.condition}
                </span>
              )}
            </div>
            {onRemoveItem && msg.itemId && (
              <button
                onClick={() => onRemoveItem(msg.itemId!)}
                className={`text-[10px] font-semibold ${styles.text} hover:underline shrink-0`}
              >
                Remove
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Find alternative button */}
      {onFindAlternative && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={onFindAlternative}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Find Safe Alternative
        </motion.button>
      )}
    </motion.div>
  );
}
