import { Component, type ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { onReset: () => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center py-12">
          <div className="max-w-md w-full bg-white dark:bg-surface-900 rounded-2xl shadow-soft dark:shadow-dark-soft border border-red-200 dark:border-red-800/50 p-6 text-center">
            <AlertCircle className="mx-auto text-red-500 dark:text-red-400 mb-4" size={40} />
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
              Qualcosa è andato storto
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
              {this.state.error?.message || 'Si è verificato un errore imprevisto.'}
            </p>
            <button
              onClick={this.handleReset}
              className="btn-primary"
            >
              <RefreshCw size={16} />
              Riprova
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function QueryErrorBoundary({
  children,
  fallback,
}: ErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner onReset={reset} fallback={fallback}>
          {children}
        </ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}
