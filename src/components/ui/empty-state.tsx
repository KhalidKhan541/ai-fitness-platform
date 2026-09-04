import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  image?: string;
  className?: string;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  image,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {image && (
        <img src={image} alt="" className="mb-6 h-32 w-32 object-contain" />
      )}
      {icon && !image && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button variant={action.variant || "default"} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface NotFoundStateProps {
  title?: string;
  description?: string;
  className?: string;
}

function NotFoundState({
  title = "Page not found",
  description = "The page you're looking for doesn't exist or has been moved.",
  className,
}: NotFoundStateProps) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      }
      title={title}
      description={description}
      action={{
        label: "Go Home",
        onClick: () => (window.location.href = "/"),
      }}
      secondaryAction={{
        label: "Go Back",
        onClick: () => window.history.back(),
      }}
      className={className}
    />
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({
  title = "Something went wrong",
  description,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      }
      title={title}
      description={description || error?.message || "An unexpected error occurred."}
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  );
}

function WorkoutEmptyState({ onCreateWorkout }: { onCreateWorkout: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      }
      title="No workouts yet"
      description="Start your fitness journey by creating your first workout."
      action={{
        label: "Create Workout",
        onClick: onCreateWorkout,
      }}
    />
  );
}

function NutritionEmptyState({ onLogMeal }: { onLogMeal: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 11-3.348-2.339l.75-1.5m-1.5-1.5l-1.5-.75A3.354 3.354 0 018.25 9.75l.75 1.5" />
        </svg>
      }
      title="No meals logged"
      description="Track your nutrition by logging your meals throughout the day."
      action={{
        label: "Log Meal",
        onClick: onLogMeal,
      }}
    />
  );
}

export { EmptyState, NotFoundState, ErrorState, WorkoutEmptyState, NutritionEmptyState };
