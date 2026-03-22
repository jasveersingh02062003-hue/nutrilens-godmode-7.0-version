// ═══════════════════════════════════════════════════
// Validation Feedback UI Component
// ═══════════════════════════════════════════════════
// Displays validation issues, suggestions, and override actions.

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { ValidationResult, ValidationIssue, ValidationSuggestion, IssueSeverity } from '@/lib/validation-engine';
import { recordOverride } from '@/lib/validation-engine';

interface Props {
  result: ValidationResult;
  onSuggestionAction?: (suggestion: ValidationSuggestion) => void;
  compact?: boolean;
}

const SEVERITY_STYLES: Record<IssueSeverity, { bg: string; border: string; text: string; iconColor: string }> = {
  block: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    text: 'text-destructive',
    iconColor: 'text-destructive',
  },
  critical: {
    bg: 'bg-destructive/5',
    border: 'border-destructive/20',
    text: 'text-destructive/90',
    iconColor: 'text-destructive',
  },
  warning: {
    bg: 'bg-accent/5',
    border: 'border-accent/20',
    text: 'text-accent',
    iconColor: 'text-accent',
  },
  hint: {
    bg: 'bg-muted/50',
    border: 'border-border',
    text: 'text-muted-foreground',
    iconColor: 'text-muted-foreground',
  },
};

function IssueIcon({ severity }: { severity: IssueSeverity }) {
  const cls = `w-4 h-4 ${SEVERITY_STYLES[severity].iconColor}`;
  if (severity === 'block' || severity === 'critical') return <ShieldAlert className={cls} />;
  if (severity === 'warning') return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

function IssueCard({
  issue,
  onDismiss,
  compact,
}: {
  issue: ValidationIssue;
  onDismiss: (ruleId: string) => void;
  compact?: boolean;
}) {
  const style = SEVERITY_STYLES[issue.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${style.bg} ${style.border}`}
    >
      <span className="text-sm mt-0.5 shrink-0">{issue.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-medium leading-relaxed ${style.text}`}>
          {issue.message}
        </p>
        {!compact && issue.suggestedFix && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            💡 {issue.suggestedFix}
          </p>
        )}
      </div>
      {issue.severity !== 'block' && (
        <button
          onClick={() => {
            recordOverride(issue.ruleId);
            onDismiss(issue.ruleId);
          }}
          className="w-5 h-5 rounded flex items-center justify-center shrink-0 hover:bg-muted"
          title="Dismiss this warning"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}

function SuggestionChip({
  suggestion,
  onAction,
}: {
  suggestion: ValidationSuggestion;
  onAction?: (s: ValidationSuggestion) => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => onAction?.(suggestion)}
      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 active:bg-primary/20 transition-colors"
    >
      <span className="text-sm">{suggestion.emoji}</span>
      <div className="text-left">
        <span className="text-[11px] text-foreground font-medium whitespace-nowrap">{suggestion.text}</span>
        <span className="text-[9px] text-muted-foreground ml-1 whitespace-nowrap">{suggestion.detail}</span>
      </div>
    </motion.button>
  );
}

export default function ValidationFeedback({ result, onSuggestionAction, compact = false }: Props) {
  const [dismissedRules, setDismissedRules] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const visibleIssues = result.issues.filter(i => !dismissedRules.has(i.ruleId));
  const blocks = visibleIssues.filter(i => i.severity === 'block');
  const criticals = visibleIssues.filter(i => i.severity === 'critical');
  const warnings = visibleIssues.filter(i => i.severity === 'warning');
  const hints = visibleIssues.filter(i => i.severity === 'hint');

  if (visibleIssues.length === 0 && result.suggestions.length === 0) return null;

  const handleDismiss = (ruleId: string) => {
    setDismissedRules(prev => new Set(prev).add(ruleId));
  };

  // In compact mode, just show count + first issue
  if (compact && visibleIssues.length > 0) {
    const topIssue = blocks[0] || criticals[0] || warnings[0] || hints[0];
    if (!topIssue) return null;

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${SEVERITY_STYLES[topIssue.severity].bg} ${SEVERITY_STYLES[topIssue.severity].border}`}>
        <span className="text-sm">{topIssue.icon}</span>
        <p className={`text-[11px] font-medium flex-1 ${SEVERITY_STYLES[topIssue.severity].text}`}>
          {topIssue.message}
        </p>
        {visibleIssues.length > 1 && (
          <span className="text-[10px] text-muted-foreground shrink-0">+{visibleIssues.length - 1} more</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toggle header if many issues */}
      {visibleIssues.length > 2 && (
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {visibleIssues.length} validation {visibleIssues.length === 1 ? 'issue' : 'issues'}
          {blocks.length > 0 && ` (${blocks.length} blocking)`}
        </button>
      )}

      {/* Issues */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Blocks first */}
            {blocks.map(issue => (
              <IssueCard key={issue.ruleId + (issue.itemId || '')} issue={issue} onDismiss={handleDismiss} compact={compact} />
            ))}
            {/* Then criticals */}
            {criticals.map(issue => (
              <IssueCard key={issue.ruleId + (issue.itemId || '')} issue={issue} onDismiss={handleDismiss} compact={compact} />
            ))}
            {/* Then warnings */}
            {warnings.map(issue => (
              <IssueCard key={issue.ruleId + (issue.itemId || '')} issue={issue} onDismiss={handleDismiss} compact={compact} />
            ))}
            {/* Hints (collapsed if >2 other issues) */}
            {(blocks.length + criticals.length + warnings.length < 2) && hints.map(issue => (
              <IssueCard key={issue.ruleId + (issue.itemId || '')} issue={issue} onDismiss={handleDismiss} compact={compact} />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Suggestions */}
      {result.suggestions.length > 0 && expanded && (
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">Suggestions</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {result.suggestions.map(s => (
              <SuggestionChip key={s.id} suggestion={s} onAction={onSuggestionAction} />
            ))}
          </div>
        </div>
      )}

      {/* Block warning */}
      {blocks.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30">
          <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-[11px] font-semibold text-destructive">
            Cannot save – fix {blocks.length} blocking {blocks.length === 1 ? 'issue' : 'issues'} above
          </p>
        </div>
      )}
    </div>
  );
}
