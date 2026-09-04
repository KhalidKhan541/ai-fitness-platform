import * as React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

function Breadcrumb({ items, separator = <ChevronRight className="h-4 w-4" />, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <ol className="flex items-center gap-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-muted-foreground/50" aria-hidden="true">
                {separator}
              </span>
            )}
            {item.href && !item.current ? (
              <a
                href={item.href}
                className={cn(
                  "flex items-center gap-1 hover:text-foreground transition-colors",
                  item.current && "font-medium text-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </a>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1",
                  item.current && "font-medium text-foreground"
                )}
                aria-current={item.current ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface CollapsibleBreadcrumbProps {
  items: BreadcrumbItem[];
  maxItems?: number;
  className?: string;
}

function CollapsibleBreadcrumb({ items, maxItems = 3, className }: CollapsibleBreadcrumbProps) {
  if (items.length <= maxItems) {
    return <Breadcrumb items={items} className={className} />;
  }

  const firstItems = items.slice(0, 1);
  const lastItems = items.slice(-(maxItems - 2));
  const hiddenCount = items.length - maxItems;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <ol className="flex items-center gap-1.5">
        {firstItems.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <a
              href={item.href}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              {item.icon}
              {item.label}
            </a>
            <span className="text-muted-foreground/50" aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Show {hiddenCount} more items</span>
          </button>
          <span className="text-muted-foreground/50" aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </span>
        </li>
        {lastItems.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-muted-foreground/50" aria-hidden="true">
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
            {item.href && !item.current ? (
              <a
                href={item.href}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {item.icon}
                {item.label}
              </a>
            ) : (
              <span className={cn("flex items-center gap-1", item.current && "font-medium text-foreground")}>
                {item.icon}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export { Breadcrumb, CollapsibleBreadcrumb };
