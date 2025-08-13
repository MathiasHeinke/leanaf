import React from 'react';
import { useToast } from '@/hooks/use-toast';

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
  retryCount: number;
}

export class AuthErrorBoundary extends React.Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      retryCount: 0 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log auth-specific errors
    console.error('Auth Error Boundary caught:', error, errorInfo);
    
    // Special handling for React Hook Error #310
    if (error.message.includes('Cannot update a component') || 
        error.message.includes('rendered fewer hooks')) {
      console.error('React Hook Error detected - likely auth state management issue');
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Force page reload as last resort
      window.location.reload();
    }
  };

  handleAuthReset = () => {
    try {
      // Clear all auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error resetting auth state:', error);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or use provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container mx-auto px-4 py-6">
          <div className="glass-card border border-border/40 rounded-xl p-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-foreground">
              Authentifizierungsfehler
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Es ist ein Problem bei der Anmeldung aufgetreten. 
              {this.state.retryCount < this.maxRetries 
                ? ' Versuche es erneut oder setze die Anmeldung zurück.'
                : ' Bitte lade die Seite neu.'
              }
            </p>
            
            {this.state.error && (
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Technische Details</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="mt-4 flex gap-2">
              {this.state.retryCount < this.maxRetries ? (
                <>
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
                  >
                    Erneut versuchen ({this.maxRetries - this.state.retryCount} verbleibend)
                  </button>
                  <button
                    onClick={this.handleAuthReset}
                    className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm"
                  >
                    Anmeldung zurücksetzen
                  </button>
                </>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
                >
                  Seite neu laden
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}