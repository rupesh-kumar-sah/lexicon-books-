import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const showDetails = import.meta.env.DEV && this.state.error;
      return (
        <main className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
          <section className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 text-center" role="alert" aria-live="assertive">
            <div className="w-16 h-16 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The page could not be displayed safely. Try again, or reload the application if the issue continues.
            </p>
            {showDetails && (
              <details className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
                <summary className="cursor-pointer text-sm font-semibold text-amber-900">Development error details</summary>
                <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-5 text-amber-950">
                  {this.state.error?.message}
                </pre>
              </details>
            )}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                Reload application
              </button>
            </div>
          </section>
        </main>
      );
    }

    return (this as any).props.children;
  }
}
