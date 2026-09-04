import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  label?: string;
  className?: string;
}

function Divider({ orientation = "horizontal", label, className }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div className={cn("flex items-center", className)}>
        <Separator orientation="vertical" className="h-full" />
        {label && (
          <span className="px-2 text-xs text-muted-foreground">{label}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Separator className="flex-1" />
      {label && (
        <span className="absolute left-1/2 -translate-x-1/2 bg-background px-3 text-xs text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

export { Separator, Divider };
