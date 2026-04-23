import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { attemptModuleImportRecovery, clearRuntimeCaches, isRecoverableModuleError } from '@/lib/module-recovery';
import { Sentry } from '@/lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  recovering: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, recovering: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // If it's a recoverable module error, mark as recovering (don't show error UI yet)
    if (isRecoverableModuleError(error)) {
      return { hasError: true, error, recovering: true };
    }
    return { hasError: true, error, recovering: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isRecoverableModuleError(error)) {
      console.warn('[ErrorBoundary] Recoverable module load error, attempting auto-recovery.');
      const recovered = attemptModuleImportRecovery('error-boundary');
      if (recovered) return; // Page will reload
      // Max retries exhausted — show error UI
      this.setState({ recovering: false });
      return;
    }

    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    try {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
    } catch {
      // never let monitoring break the boundary
    }
  }

  handleReload = async () => {
    await clearRuntimeCaches();
    window.location.reload();
  };

  render() {
    // While recovering (auto-reload in progress), show a spinner, not the error
    if (this.state.recovering) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Updating app files…</p>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Please reload the app.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground/60 font-mono bg-muted/30 rounded-lg p-2 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
