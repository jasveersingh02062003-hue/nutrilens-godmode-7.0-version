import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { attemptModuleImportRecovery, clearRuntimeCaches, isRecoverableModuleError } from '@/lib/module-recovery';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isRecoverableModuleError(error)) {
      console.warn('[ErrorBoundary] Recoverable module load error detected, attempting recovery.');
      if (attemptModuleImportRecovery('error-boundary')) return;
    }

    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = async () => {
    await clearRuntimeCaches();
    window.location.reload();
  };

  render() {
    const isModuleLoadError = this.state.error ? isRecoverableModuleError(this.state.error) : false;

    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-lg font-bold text-foreground">
              {isModuleLoadError ? 'Refreshing app files' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isModuleLoadError
                ? 'The app detected stale files after an update. It will auto-recover, or you can reload now.'
                : 'An unexpected error occurred. Please reload the app.'}
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
