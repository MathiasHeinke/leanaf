import React from 'react';
import { authLogger } from '@/lib/authLogger';

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
}

export class AuthErrorBoundary extends React.Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔧 AUTH ERROR BOUNDARY: Critical React error caught:', error, errorInfo);
    
    // Log to auth debug system
    authLogger.log({
      event: 'REACT_ERROR',
      stage: 'errorBoundary',
      details: {
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack
      }
    });

    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="glass-card border border-destructive/40 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-destructive">🔧 JavaScript Fehler in Auth-Komponente</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Ein kritischer Fehler verhindert die Anmeldung. Technische Details:
            </p>
            <div className="mt-4 p-3 bg-destructive/10 rounded text-xs font-mono">
              <div><strong>Fehler:</strong> {this.state.error?.message}</div>
              {this.state.error?.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Stack Trace</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                </details>
              )}
              {this.state.errorInfo?.componentStack && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Component Stack</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                </details>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center rounded-md bg-destructive text-destructive-foreground px-4 py-2"
              >
                Seite neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}