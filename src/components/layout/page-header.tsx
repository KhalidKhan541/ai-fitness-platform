import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

function PageHeader({
  title,
  description,
  icon,
  breadcrumbs,
  actions,
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4 pb-6", className)} {...props}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-4 w-4" />}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className={cn(index === breadcrumbs.length - 1 && "text-foreground font-medium")}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              {icon}
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

interface PageHeaderActionProps {
  children: React.ReactNode;
  className?: string;
}

function PageHeaderAction({ children, className }: PageHeaderActionProps) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}

interface PageHeaderTab {
  label: string;
  value: string;
  icon?: React.ReactNode;
  count?: number;
}

interface PageHeaderTabsProps {
  tabs: PageHeaderTab[];
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

function PageHeaderTabs({ tabs, value, onValueChange, className }: PageHeaderTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onValueChange?.(tab.value)}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
            value === tab.value
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export { PageHeader, PageHeaderAction, PageHeaderTabs };
