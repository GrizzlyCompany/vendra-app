"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeString, safeJsonStringify } from "@/lib/safe";

/**
 * Props for the ErrorBoundary component
 */
interface Props {
  /** Child components to wrap with error boundary */
  children: ReactNode;
  /** Custom fallback UI to display when error occurs */
  fallback?: ReactNode;
  /** Optional callback fired when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

/**
 * ErrorBoundary component that catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 *
 * Features:
 * - Automatic error logging with detailed context
 * - Retry mechanism with exponential backoff
 * - Development error details display
 * - Production-ready error reporting hooks
 * - Unique error IDs for tracking
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  /**
   * Constructor initializes the error boundary state
   * @param props - Component props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      retryCount: 0
    };
  }

  /**
   * Static method to update state when an error occurs
   * @param error - The error that was thrown
   * @returns Partial state update with error information
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Lifecycle method called when a child component throws an error
   * Collects comprehensive error information and triggers error reporting
   * @param error - The error that was thrown
   * @param errorInfo - Additional information about the error including component stack
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails = {
      message: safeString(error.message, 'Unknown error'),
      stack: safeString(error.stack, 'No stack trace'),
      componentStack: safeString(errorInfo.componentStack, 'No component stack'),
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    };

    console.error("ErrorBoundary caught an error:", errorDetails);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(errorDetails);
    }

    this.setState({ errorInfo });
  }

  /**
   * Logs error details to external error tracking service
   * @param errorDetails - Comprehensive error information object
   * @private
   */
  private async logErrorToService(errorDetails: any) {
    try {
      // In a real app, this would send to your error tracking service
      // Example: Sentry, LogRocket, Bugsnag, etc.
      console.log('Would log to error service:', errorDetails);
    } catch (loggingError) {
      console.error('Failed to log error to service:', loggingError);
    }
  }

  /**
   * Handles retry attempts after an error occurs
   * Implements exponential backoff and prevents infinite retry loops
   */
  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    // Prevent infinite retry loops
    if (newRetryCount > 5) {
      console.error('Maximum retry attempts reached');
      return;
    }

    // Add progressive delay for retries
    const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 5000);

    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: newRetryCount
      });
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  /**
   * Cleanup method to clear any pending retry timeouts
   */
  componentWillUnmount() {
    // Clean up retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-900">
                Algo salió mal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                Ha ocurrido un error inesperado. Por favor, intenta nuevamente.
                {this.state.retryCount > 0 && (
                  <span className="block text-sm mt-1">
                    Intentos de recuperación: {this.state.retryCount}/5
                  </span>
                )}
              </p>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Detalles del error (desarrollo)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                      {safeString(this.state.error.message, 'No error message')}
                    </pre>
                    {this.state.error.stack && (
                      <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-xs text-blue-600 bg-blue-50 p-2 rounded overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
              <Button 
                onClick={this.handleRetry} 
                className="w-full"
                disabled={this.state.retryCount >= 5}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {this.state.retryCount >= 5 
                  ? 'Máximo de intentos alcanzado' 
                  : 'Intentar nuevamente'
                }
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
