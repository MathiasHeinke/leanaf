import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorId = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error('🚨 Dashboard Error Boundary:', error, { errorId });
    
    return { 
      hasError: true, 
      error, 
      errorId 
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Dashboard Error Details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorId: '' });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-lg mx-auto border-destructive/50 bg-destructive/5">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Dashboard Fehler</CardTitle>
              <CardDescription>
                Ein unerwarteter Fehler ist aufgetreten. Das Dashboard konnte nicht geladen werden.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <div className="font-mono">Error ID: {this.state.errorId}</div>
                {this.state.error && (
                  <div className="mt-2">
                    <strong>Details:</strong> {this.state.error.message}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} variant="default" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Dashboard neu laden
                </Button>
                
                <Button onClick={this.handleReload} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Seite neu laden
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Zur Startseite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}