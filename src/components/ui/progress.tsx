import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  label?: string;
  indeterminate?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      variant = "default",
      size = "default",
      showLabel = false,
      label,
      indeterminate = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variantColors = {
      default: "bg-primary",
      success: "bg-green-500",
      warning: "bg-yellow-500",
      destructive: "bg-destructive",
      info: "bg-blue-500",
    };

    const sizeStyles = {
      sm: "h-1.5",
      default: "h-2.5",
      lg: "h-4",
    };

    return (
      <div className="w-full space-y-1">
        {(showLabel || label) && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label || "Progress"}</span>
            {!indeterminate && <span>{Math.round(percentage)}%</span>}
          </div>
        )}
        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-secondary",
            sizeStyles[size],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "h-full transition-all duration-300",
              variantColors[variant],
              indeterminate && "w-full animate-indeterminate"
            )}
            style={!indeterminate ? { width: `${percentage}%` } : undefined}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = "Progress";

interface CircularProgressProps extends React.SVGAttributes<SVGSVGElement> {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  showLabel?: boolean;
  label?: string;
}

function CircularProgress({
  value = 0,
  max = 100,
  size = 48,
  strokeWidth = 4,
  variant = "default",
  showLabel = true,
  label,
  className,
  ...props
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: "text-primary",
    success: "text-green-500",
    warning: "text-yellow-500",
    destructive: "text-destructive",
    info: "text-blue-500",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} {...props}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-300 -rotate-90 origin-center", variantColors[variant])}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium">{label || `${Math.round(percentage)}%`}</span>
        </div>
      )}
    </div>
  );
}

interface StepProgressProps {
  steps: { label: string; completed?: boolean; current?: boolean }[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function StepProgress({ steps, orientation = "horizontal", className }: StepProgressProps) {
  return (
    <div
      className={cn(
        orientation === "horizontal" ? "flex items-center" : "flex flex-col",
        className
      )}
    >
      {steps.map((step, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center",
            orientation === "horizontal" ? "flex-1" : "",
            orientation === "vertical" && "py-2"
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium",
                step.completed
                  ? "bg-primary border-primary text-primary-foreground"
                  : step.current
                  ? "border-primary text-primary"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {step.completed ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                "text-sm",
                step.current && "font-medium",
                step.completed ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                orientation === "horizontal" ? "flex-1 h-0.5 mx-4" : "h-4 w-0.5 ml-4",
                step.completed ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export { Progress, CircularProgress, StepProgress };
