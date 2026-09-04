import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error("Error caught by boundary:", error, errorInfo);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", this.props.className)}>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Something went wrong</h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button onClick={() => this.reset()}>Try Again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
  className?: string;
}

function AsyncErrorBoundary({ children, fallback, onError, className }: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={onError}
      className={className}
    >
      {children}
    </ErrorBoundary>
  );
}

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

function SectionErrorBoundary({ children, title, className }: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className={cn("rounded-lg border border-destructive/50 p-4", className)}>
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium">{title || "Error loading section"}</h4>
              <p className="text-xs text-muted-foreground">Try refreshing the page</p>
            </div>
          </div>
        </div>
      }
      className={className}
    >
      {children}
    </ErrorBoundary>
  );
}

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  className?: string;
}

function PageErrorBoundary({ children, className }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className={cn("flex min-h-[400px] flex-col items-center justify-center px-4", className)}>
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-10 w-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold">Oops! Something went wrong</h2>
          <p className="mb-6 text-center text-muted-foreground max-w-md">
            We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Go Home
            </Button>
          </div>
        </div>
      }
      className={className}
    >
      {children}
    </ErrorBoundary>
  );
}

export { ErrorBoundary, AsyncErrorBoundary, SectionErrorBoundary, PageErrorBoundary };
